'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { seedData, today, addDays, uid } from '../seed'
import { calcTotals, servicePrice } from '../totals'
import type { Client, Invoice, InvoiceLine, Part, Service, Settings, Vehicle, Draft } from '../types'

interface AppState {
  hydrated: boolean
  settings: Settings
  clients: Client[]
  vehicles: Vehicle[]
  services: Service[]
  parts: Part[]
  invoices: Invoice[]
  draft: Draft | null
  setHydrated: () => void
  updateSettings: (patch: Partial<Settings>) => void
  startDraft: (clientId?: string) => void
  discardDraft: () => void
  setDraftClient: (clientId: string) => void
  setDraftVehicle: (vehicleId: string) => void
  toggleService: (serviceId: string) => void
  setPartQty: (partId: string, qty: number) => void
  setDiscount: (pct: number) => void
  setDraftNotes: (customer: string, internal: string) => void
  finalizeDraft: (status: 'Draft' | 'Sent') => Invoice | null
  markPaid: (invoiceId: string) => void
  addClient: (input: { name: string; phone?: string; tier?: Client['tier']; vehicleDesc?: string; plate?: string }) => void
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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...seedInitial(),
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

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

      finalizeDraft: (status) => {
        const { draft, settings, invoices, clients } = get()
        if (!draft || !draft.clientId) return null
        const totals = calcTotals(draft.lines, draft.discountPct, settings.taxRate)
        const client = clients.find((c) => c.id === draft.clientId)
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

      markPaid: (invoiceId) =>
        set((s) => ({
          invoices: s.invoices.map((i) => (i.id === invoiceId ? { ...i, status: 'Paid' as const } : i)),
        })),

      addClient: (input) =>
        set((s) => {
          const client: Client = {
            id: uid(),
            name: input.name,
            phone: input.phone ?? '',
            email: '',
            address: '',
            tier: input.tier ?? 'Retail',
            notes: '',
            lastVisit: today(),
          }
          const vehicles = [...s.vehicles]
          if (input.vehicleDesc) {
            vehicles.push({
              id: uid(), clientId: client.id, desc: input.vehicleDesc, plate: input.plate ?? '',
              vin: '', odometer: 0, engine: '', color: '', watch: '',
            })
          }
          return { clients: [...s.clients, client], vehicles }
        }),

      resetDemo: () => set((s) => ({ ...seedInitial(), hydrated: s.hydrated })),
    }),
    {
      name: 'beast_invoice_v1',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true, // rehydrated in Providers to avoid SSR mismatch
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

export function draftTotals(state: AppState) {
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
