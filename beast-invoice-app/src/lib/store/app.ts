'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { seedData, today, addDays, uid } from '../seed'
import { calcTotals, servicePrice } from '../totals'
import type { Client, Invoice, InvoiceLine, Part, Service, Settings, Vehicle, Draft } from '../types'

export type AppMode = 'local' | 'server'
export type AuthStatus = 'unknown' | 'ok' | 'login'

interface AppState {
  hydrated: boolean
  mode: AppMode
  authStatus: AuthStatus
  syncError: string | null
  settings: Settings
  clients: Client[]
  vehicles: Vehicle[]
  services: Service[]
  parts: Part[]
  invoices: Invoice[]
  draft: Draft | null
  setHydrated: () => void
  bootstrap: () => Promise<void>
  login: (passphrase: string) => Promise<boolean>
  logout: () => Promise<void>
  updateSettings: (patch: Partial<Settings>) => void
  startDraft: (clientId?: string) => void
  discardDraft: () => void
  setDraftClient: (clientId: string) => void
  setDraftVehicle: (vehicleId: string) => void
  toggleService: (serviceId: string) => void
  setPartQty: (partId: string, qty: number) => void
  setDiscount: (pct: number) => void
  setDraftNotes: (customer: string, internal: string) => void
  finalizeDraft: (status: 'Draft' | 'Sent') => Promise<Invoice | null>
  markPaid: (invoiceId: string) => Promise<void>
  addClient: (input: { name: string; phone?: string; tier?: Client['tier']; vehicleDesc?: string; plate?: string }) => Promise<void>
  addService: (input: { name: string; cat?: string; mode: 'flat' | 'hours'; price?: number; hours?: number }) => Promise<void>
  addPart: (input: { name: string; pn?: string; brand?: string; price?: number; stock?: number }) => Promise<void>
  resetDemo: () => void
}

function seedInitial() {
  const d = seedData()
  return {
    settings: d.settings,
    clients: d.clients,
    vehicles: d.vehicles,
    services: d.services,
    parts: d.parts,
    invoices: d.invoices,
    draft: null as Draft | null,
  }
}

/* ---- server sync helpers ---- */

async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  if (res.status === 401) {
    useAppStore.setState({ authStatus: 'login' })
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(json.error ?? `Request failed (${res.status})`)
  }
  return (await res.json()) as T
}

let settingsTimer: ReturnType<typeof setTimeout> | null = null

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...seedInitial(),
      hydrated: false,
      mode: 'local',
      authStatus: 'unknown',
      syncError: null,
      setHydrated: () => set({ hydrated: true }),

      /** Decides the runtime mode: /api/state says 'server' (authed data or
          login) or 'local' (no DB configured / offline -> localStorage). */
      bootstrap: async () => {
        try {
          const res = await fetch('/api/state', { cache: 'no-store' })
          const json = (await res.json()) as {
            mode: AppMode; authed?: boolean; data?: Partial<AppState>; error?: string
          }
          if (json.mode === 'server') {
            if (json.data) {
              set({ mode: 'server', authStatus: 'ok', hydrated: true, syncError: null, ...json.data })
            } else if (res.ok) {
              set({ mode: 'server', authStatus: 'login', hydrated: true })
            } else {
              set({ mode: 'server', authStatus: 'ok', hydrated: true, syncError: json.error ?? 'Database error' })
            }
            return
          }
        } catch {
          /* network error or plain static host: local mode */
        }
        await Promise.resolve(useAppStore.persist.rehydrate())
        set({ mode: 'local', hydrated: true })
      },

      login: async (passphrase) => {
        try {
          await apiPost('/api/auth', { passphrase })
          await get().bootstrap()
          return get().authStatus === 'ok'
        } catch {
          return false
        }
      },

      logout: async () => {
        if (get().mode !== 'server') return
        await fetch('/api/auth', { method: 'DELETE' }).catch(() => {})
        set({ authStatus: 'login' })
      },

      updateSettings: (patch) => {
        set((s) => ({ settings: { ...s.settings, ...patch } }))
        if (get().mode !== 'server') return
        // debounce keystroke-level chatter into one POST
        if (settingsTimer) clearTimeout(settingsTimer)
        const payload = patch
        settingsTimer = setTimeout(() => {
          apiPost('/api/settings', payload)
            .then(() => useAppStore.setState({ syncError: null }))
            .catch((e: Error) => useAppStore.setState({ syncError: e.message }))
        }, 500)
      },

      startDraft: (clientId) =>
        set(() => ({
          draft: { lines: [], discountPct: 0, customerNote: '', internalNote: '', clientId },
        })),

      discardDraft: () => set({ draft: null }),

      setDraftClient: (clientId) =>
        set((s) => {
          if (!s.draft) return s
          const firstVehicle = s.vehicles.find((v) => v.clientId === clientId)
          return { draft: { ...s.draft, clientId, vehicleId: firstVehicle?.id } }
        }),

      setDraftVehicle: (vehicleId) =>
        set((s) => (s.draft ? { draft: { ...s.draft, vehicleId } } : s)),

      toggleService: (serviceId) =>
        set((s) => {
          if (!s.draft) return s
          const svc = s.services.find((x) => x.id === serviceId)
          if (!svc) return s
          const existing = s.draft.lines.find((l) => l.refId === serviceId)
          const lines: InvoiceLine[] = existing
            ? s.draft.lines.filter((l) => l.refId !== serviceId)
            : [...s.draft.lines, {
                type: 'labor', refId: svc.id, name: svc.name,
                qty: 1, unit: servicePrice(svc, s.settings.laborRate), taxable: true,
              }]
          return { draft: { ...s.draft, lines } }
        }),

      setPartQty: (partId, qty) =>
        set((s) => {
          if (!s.draft) return s
          const part = s.parts.find((p) => p.id === partId)
          if (!part) return s
          const rest = s.draft.lines.filter((l) => l.refId !== partId)
          if (qty > 0) {
            rest.push({
              type: 'part', refId: part.id, name: part.name, pn: part.pn,
              qty, unit: part.price, taxable: true,
            })
          }
          return { draft: { ...s.draft, lines: rest } }
        }),

      setDiscount: (pct) =>
        set((s) => (s.draft ? { draft: { ...s.draft, discountPct: pct } } : s)),

      setDraftNotes: (customerNote, internalNote) =>
        set((s) => (s.draft ? { draft: { ...s.draft, customerNote, internalNote } } : s)),

      finalizeDraft: async (status) => {
        const { draft, settings, invoices, clients, mode } = get()
        if (!draft || !draft.clientId) return null
        const client = clients.find((c) => c.id === draft.clientId)

        if (mode === 'server') {
          try {
            const json = await apiPost<{ invoice: Invoice }>('/api/invoices', {
              status,
              clientId: draft.clientId,
              vehicleId: draft.vehicleId,
              tier: client?.tier,
              lines: draft.lines,
              discountPct: draft.discountPct,
              customerNote: draft.customerNote,
              internalNote: draft.internalNote,
            })
            set({
              invoices: [json.invoice, ...invoices],
              settings: { ...settings, nextNumber: parseNext(json.invoice.number, settings.nextNumber) },
              draft: null,
              syncError: null,
            })
            return json.invoice
          } catch (e) {
            set({ syncError: e instanceof Error ? e.message : 'Could not save invoice' })
            return null
          }
        }

        // local mode: identical math to the server (lib/totals is the shared engine)
        const totals = calcTotals(draft.lines, draft.discountPct, settings.taxRate)
        const invoice: Invoice = {
          id: uid(),
          number: `INV-${new Date().getFullYear()}-${String(settings.nextNumber).padStart(4, '0')}`,
          status,
          clientId: draft.clientId,
          vehicleId: draft.vehicleId,
          created: today(),
          due: addDays(14),
          odometer: '',
          tier: client?.tier,
          lines: draft.lines,
          discountPct: draft.discountPct,
          customerNote: draft.customerNote,
          internalNote: draft.internalNote,
          totals,
        }
        set({
          invoices: [invoice, ...invoices],
          settings: { ...settings, nextNumber: settings.nextNumber + 1 },
          draft: null,
        })
        return invoice
      },

      markPaid: async (invoiceId) => {
        const { mode, invoices } = get()
        set((s) => ({
          invoices: s.invoices.map((i) => (i.id === invoiceId ? { ...i, status: 'Paid' as const } : i)),
        }))
        if (mode !== 'server') return
        try {
          const json = await apiPost<{ invoice: Invoice }>(`/api/invoices/${invoiceId}/pay`)
          set((s) => ({
            invoices: s.invoices.map((i) => (i.id === json.invoice.id ? json.invoice : i)),
            syncError: null,
          }))
        } catch (e) {
          set({
            invoices: invoices.map((i) => (i.id === invoiceId ? { ...i, status: 'Overdue' as const } : i)),
            syncError: e instanceof Error ? e.message : 'Payment update failed',
          })
        }
      },

      addClient: async (input) => {
        const { mode, clients, vehicles } = get()
        if (mode === 'server') {
          try {
            const json = await apiPost<{ client: Client; vehicle?: Vehicle }>('/api/clients', input)
            set((s) => ({
              clients: [...s.clients, json.client],
              vehicles: json.vehicle ? [...s.vehicles, json.vehicle] : s.vehicles,
              syncError: null,
            }))
            return
          } catch (e) {
            set({ syncError: e instanceof Error ? e.message : 'Could not add client' })
            return
          }
        }
        const client: Client = {
          id: uid(), name: input.name, phone: input.phone ?? '', email: '',
          address: '', tier: input.tier ?? 'Retail', notes: '', lastVisit: today(),
        }
        const newVehicles = [...vehicles]
        if (input.vehicleDesc) {
          newVehicles.push({
            id: uid(), clientId: client.id, desc: input.vehicleDesc, plate: input.plate ?? '',
            vin: '', odometer: 0, engine: '', color: '', watch: '',
          })
        }
        set({ clients: [...clients, client], vehicles: newVehicles })
      },

      addService: async (input) => {
        const { mode, services } = get()
        if (mode === 'server') {
          try {
            const json = await apiPost<{ service: Service }>('/api/catalog', { kind: 'service', data: input })
            set((s) => ({ services: [...s.services, json.service], syncError: null }))
            return
          } catch (e) {
            set({ syncError: e instanceof Error ? e.message : 'Could not add service' })
            return
          }
        }
        set({ services: [...services, {
          id: uid(), name: input.name, cat: input.cat ?? 'General', mode: input.mode,
          price: input.price, hours: input.hours,
        }] })
      },

      addPart: async (input) => {
        const { mode, parts } = get()
        if (mode === 'server') {
          try {
            const json = await apiPost<{ part: Part }>('/api/catalog', { kind: 'part', data: input })
            set((s) => ({ parts: [...s.parts, json.part], syncError: null }))
            return
          } catch (e) {
            set({ syncError: e instanceof Error ? e.message : 'Could not add part' })
            return
          }
        }
        set({ parts: [...parts, {
          id: uid(), name: input.name, pn: input.pn ?? '', brand: input.brand ?? '',
          price: input.price ?? 0, stock: input.stock ?? 0, fits: [],
        }] })
      },

      resetDemo: () => set((s) => ({ ...seedInitial(), hydrated: s.hydrated, mode: s.mode, authStatus: s.authStatus })),
    }),
    {
      name: 'beast_invoice_v1',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true, // Providers decides local vs server, then hydrates
      partialize: (s) => ({
        settings: s.settings,
        clients: s.clients,
        vehicles: s.vehicles,
        services: s.services,
        parts: s.parts,
        invoices: s.invoices,
        draft: s.draft,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    },
  ),
)

function parseNext(invoiceNumber: string, fallback: number): number {
  const m = invoiceNumber.match(/-(\d+)$/)
  return m ? Number(m[1]) + 1 : fallback + 1
}

export function draftTotals(state: Pick<AppState, 'draft' | 'settings'>) {
  return calcTotals(state.draft?.lines ?? [], state.draft?.discountPct ?? 0, state.settings.taxRate)
}

export function clientById(state: Pick<AppState, 'clients'>, id: string | undefined): Client | undefined {
  return id ? state.clients.find((c) => c.id === id) : undefined
}

export function vehicleById(state: Pick<AppState, 'vehicles'>, id: string | undefined): Vehicle | undefined {
  return id ? state.vehicles.find((v) => v.id === id) : undefined
}

export function partQtyInDraft(state: Pick<AppState, 'draft'>, partId: string): number {
  return state.draft?.lines.find((l) => l.refId === partId)?.qty ?? 0
}
