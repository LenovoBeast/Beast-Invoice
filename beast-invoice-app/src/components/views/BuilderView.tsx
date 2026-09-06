'use client'

import { ArrowLeft, MagnifyingGlass, Minus, PaperPlaneRight, Plus, Printer, Warning, Wrench } from '@phosphor-icons/react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { calcTotals, servicePrice, servicePriceLabel } from '@/lib/totals'
import {
  clientById, partQtyInDraft, useAppStore, vehicleById,
} from '@/lib/store/app'
import type { Invoice, Totals } from '@/lib/types'
import { Money, StatusPill, TierPill } from '../ui/bits'

/** Workbench: the 5 stations stacked vertically (Flow mode; Stage scroll-pan
    lands in S2). Sticky totals rail on desktop, compact bar above the tab bar
    on mobile. Pick-don't-type everywhere: search, chips, steppers (contract A3). */
export function BuilderView() {
  const store = useAppStore()
  const { settings, clients, vehicles, services, parts, draft } = store
  const hydrated = store.hydrated
  const [finished, setFinished] = useState<Invoice | null>(null)
  const [finishing, setFinishing] = useState(false)

  async function finish(status: 'Draft' | 'Sent') {
    if (finishing) return
    setFinishing(true)
    const inv = await store.finalizeDraft(status)
    setFinishing(false)
    if (inv) setFinished(inv)
  }

  useEffect(() => {
    if (hydrated && !draft && !finished) store.startDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, draft, finished])

  const totals = useMemo(
    () => calcTotals(draft?.lines ?? [], draft?.discountPct ?? 0, settings.taxRate),
    [draft, settings.taxRate],
  )

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
        <div className="skel h-8 w-56" />
        <div className="skel mt-6 h-40" />
        <div className="skel mt-4 h-40" />
      </div>
    )
  }

  if (finished) {
    return <SuccessCard invoice={finished} onAnother={() => setFinished(null)} />
  }

  const client = clientById({ clients }, draft?.clientId)
  const vehicle = vehicleById({ vehicles }, draft?.vehicleId)

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-40 lg:grid-cols-[1fr_300px] lg:px-8 lg:pb-24">
      <div className="min-w-0">
        <header className="py-8">
          <h1 className="text-3xl font-bold">New invoice</h1>
          <p className="mt-1 text-sm text-muted">Pick, don&apos;t type. Totals update live.</p>
        </header>

        <section aria-label="Client and vehicle" className="glass p-5">
          <StationHead n={1} title="Client & vehicle" />
          {!client ? (
            <ClientPicker />
          ) : (
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold">{client.name}</span>
                <TierPill tier={client.tier} />
                <span className="text-sm text-muted">{client.phone}</span>
                <button type="button" className="btn btn-ghost ml-auto !py-1.5 !px-3 text-xs" onClick={() => store.setDraftClient('')}>
                  Change
                </button>
              </div>
              {vehicles.filter((v) => v.clientId === client.id).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {vehicles.filter((v) => v.clientId === client.id).map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className="chip"
                      aria-pressed={draft?.vehicleId === v.id}
                      onClick={() => store.setDraftVehicle(v.id)}
                    >
                      <Wrench size={14} />
                      {v.desc} · {v.plate}
                    </button>
                  ))}
                </div>
              )}
              {vehicle?.watch && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm">
                  <Warning size={18} className="mt-0.5 shrink-0 text-warn" />
                  <div className="grow">
                    <span className="text-warn">Watchlist: </span>
                    {vehicle.watch}
                    {vehicle.watch.toLowerCase().includes('pads') && (
                      <button
                        type="button"
                        className="btn btn-ghost ml-2 !py-1 !px-2.5 text-xs"
                        onClick={() => {
                          const rear = services.find((s) => s.name.toLowerCase().includes('rear'))
                          if (rear && !draft?.lines.some((l) => l.refId === rear.id)) store.toggleService(rear.id)
                        }}
                      >
                        Add rear brake job
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section aria-label="Services" className="glass mt-4 p-5">
          <StationHead n={2} title="Services" />
          <div className="flex flex-wrap gap-2">
            {services.map((s) => {
              const on = !!draft?.lines.some((l) => l.refId === s.id)
              return (
                <button key={s.id} type="button" className="chip" aria-pressed={on} onClick={() => store.toggleService(s.id)}>
                  {s.name}
                  <span className="chip-price money">{servicePrice(s, settings.laborRate).toFixed(0)}</span>
                </button>
              )
            })}
          </div>
          {draft && draft.lines.filter((l) => l.type === 'labor').length > 0 && (
            <ul className="mt-4 border-t border-line pt-2">
              {draft.lines.filter((l) => l.type === 'labor').map((l, i) => (
                <li key={`${l.refId}-${i}`} className="row-card flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{l.name}</span>
                  <span className="money shrink-0 text-muted">
                    {servicePriceLabel(services.find((s) => s.id === l.refId)!, settings.laborRate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <PartsStation />

        <section aria-label="Notes and discount" className="glass mt-4 p-5">
          <StationHead n={4} title="Notes & discount" />
          <div className="mb-3 flex flex-wrap gap-2">
            {[0, 5, 10, 15].map((p) => (
              <button key={p} type="button" className="chip" aria-pressed={draft?.discountPct === p} onClick={() => store.setDiscount(p)}>
                {p === 0 ? 'No discount' : `${p}%`}
              </button>
            ))}
          </div>
          <label className="block text-sm font-semibold" htmlFor="cust-note">Customer note (prints)</label>
          <textarea
            id="cust-note"
            className="input mt-1.5 min-h-16 resize-y"
            value={draft?.customerNote ?? ''}
            onChange={(e) => store.setDraftNotes(e.target.value, draft?.internalNote ?? '')}
          />
          <label className="mt-4 block text-sm font-semibold" htmlFor="int-note">Internal note (never prints)</label>
          <textarea
            id="int-note"
            className="input mt-1.5 min-h-16 resize-y"
            value={draft?.internalNote ?? ''}
            onChange={(e) => store.setDraftNotes(draft?.customerNote ?? '', e.target.value)}
          />
        </section>

        <section aria-label="Finish" className="glass mt-4 p-5" id="finish">
          <StationHead n={5} title="Finish" />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-primary"
              disabled={finishing || !draft?.clientId || draft.lines.length === 0}
              onClick={() => void finish('Sent')}
            >
              <PaperPlaneRight size={18} weight="bold" />
              {finishing ? 'Saving...' : 'Finish & Send'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={finishing || !draft?.clientId || draft.lines.length === 0}
              onClick={() => void finish('Draft')}
            >
              Save Draft
            </button>
          </div>
          {(!draft?.clientId || draft.lines.length === 0) && (
            <p className="mt-3 text-sm text-muted">Pick a client and at least one line to finish.</p>
          )}
        </section>
      </div>

      <TotalsRail totals={totals} laborCount={draft?.lines.filter((l) => l.type === 'labor').length ?? 0} partCount={draft?.lines.filter((l) => l.type === 'part').length ?? 0} />
    </div>
  )
}

function StationHead({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="mb-4 flex items-center gap-2.5 text-sm font-bold uppercase tracking-wider text-muted">
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line-strong money text-xs">{n}</span>
      {title}
    </h2>
  )
}

function ClientPicker() {
  const store = useAppStore()
  const [q, setQ] = useState('')
  const [quickAdd, setQuickAdd] = useState(false)
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = needle
      ? store.clients.filter((c) =>
          [c.name, c.phone, c.email].some((f) => f.toLowerCase().includes(needle)) ||
          store.vehicles.some((v) => v.clientId === c.id && (v.plate.toLowerCase().includes(needle) || v.desc.toLowerCase().includes(needle))))
      : store.clients
    return list.slice(0, 6)
  }, [q, store.clients, store.vehicles])

  return (
    <div>
      <div className="relative">
        <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className="input pl-10"
          placeholder="Search name, phone, plate, or vehicle"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search clients"
        />
      </div>
      <div className="mt-3">
        {results.map((c) => (
          <button key={c.id} type="button" className="row-card flex w-full items-center gap-3 text-left hover:bg-bg-2/60" onClick={() => store.setDraftClient(c.id)}>
            <div className="min-w-0 grow">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold">{c.name}</span>
                <TierPill tier={c.tier} />
              </div>
              <div className="truncate text-sm text-muted">
                {c.phone} · {store.vehicles.filter((v) => v.clientId === c.id).length} vehicle(s)
              </div>
            </div>
          </button>
        ))}
        {results.length === 0 && <p className="py-2 text-sm text-muted">No match. Use quick add below.</p>}
      </div>
      {quickAdd ? (
        <QuickAddForm onDone={() => setQuickAdd(false)} />
      ) : (
        <button type="button" className="btn btn-ghost mt-3 !py-1.5 !px-3 text-xs" onClick={() => setQuickAdd(true)}>
          <Plus size={14} /> Quick add client
        </button>
      )}
    </div>
  )
}

function QuickAddForm({ onDone }: { onDone: () => void }) {
  const addClient = useAppStore((s) => s.addClient)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [vehicleDesc, setVehicleDesc] = useState('')
  const [plate, setPlate] = useState('')
  return (
    <form
      className="mt-3 grid grid-cols-2 gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        addClient({ name: name.trim(), phone: phone.trim(), vehicleDesc: vehicleDesc.trim() || undefined, plate: plate.trim() })
        onDone()
      }}
    >
      <input className="input col-span-2" placeholder="Client name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Client name" required />
      <input className="input" placeholder="Phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Phone" />
      <input className="input" placeholder="Plate" value={plate} onChange={(e) => setPlate(e.target.value)} aria-label="Plate" />
      <input className="input col-span-2" placeholder="Vehicle (e.g. 2019 BMW M340i)" value={vehicleDesc} onChange={(e) => setVehicleDesc(e.target.value)} aria-label="Vehicle description" />
      <button type="submit" className="btn btn-primary col-span-2 !py-2 text-sm">Add client</button>
    </form>
  )
}

function PartsStation() {
  const store = useAppStore()
  const { parts, draft } = store
  const [q, setQ] = useState('')
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = needle
      ? parts.filter((p) => [p.name, p.pn, p.brand, ...p.fits].some((f) => f.toLowerCase().includes(needle)))
      : parts
    return list.slice(0, 8)
  }, [q, parts])

  return (
    <section aria-label="Parts" className="glass mt-4 p-5">
      <StationHead n={3} title="Parts" />
      <div className="relative">
        <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input className="input pl-10" placeholder="Search part name or number" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search parts" />
      </div>
      <div className="mt-3">
        {results.map((p) => {
          const qty = partQtyInDraft({ draft }, p.id)
          const low = qty > p.stock
          return (
            <div key={p.id} className="row-card flex items-center gap-3">
              <div className="min-w-0 grow">
                <div className="truncate font-semibold">{p.name}</div>
                <div className="truncate text-xs text-muted">
                  {p.brand} · {p.pn} · <Money value={p.price} />
                  {low && <span className="text-alert"> · over stock ({p.stock})</span>}
                </div>
              </div>
              <Stepper value={qty} onChange={(n) => store.setPartQty(p.id, n)} />
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className="btn btn-ghost !px-2.5 !py-1.5" aria-label="Decrease quantity" disabled={value === 0} onClick={() => onChange(value - 1)}>
        <Minus size={14} />
      </button>
      <span className="money w-7 text-center text-sm font-bold" aria-live="polite">{value}</span>
      <button type="button" className="btn btn-ghost !px-2.5 !py-1.5" aria-label="Increase quantity" onClick={() => onChange(value + 1)}>
        <Plus size={14} />
      </button>
    </div>
  )
}

function TotalsRail({ totals, laborCount, partCount }: { totals: Totals; laborCount: number; partCount: number }) {
  return (
    <>
      <aside className="sticky top-6 hidden h-fit lg:block" aria-label="Live totals">
        <div className="glass p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted">Live totals</h2>
          <dl className="space-y-2 text-sm">
            <Row label={`Labor (${laborCount})`} value={totals.labor} />
            <Row label={`Parts (${partCount})`} value={totals.parts} />
            <Row label="Discount" value={-totals.discount} muted={totals.discount === 0} />
            <Row label="Subtotal" value={totals.subtotal} />
            <Row label="Tax" value={totals.tax} />
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <span className="text-sm font-bold uppercase tracking-wider text-muted">Total</span>
            <Money value={totals.total} className="text-2xl font-bold" />
          </div>
        </div>
      </aside>
      <div className="fixed inset-x-0 bottom-[62px] z-30 border-t border-line bg-bg-0/90 px-4 py-2.5 backdrop-blur-md lg:hidden" style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom))' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-muted">Total </span>
            <Money value={totals.total} className="text-lg font-bold" />
          </div>
          <a href="#finish" className="btn btn-primary !py-2 text-sm">
            Review & Finish
          </a>
        </div>
      </div>
    </>
  )
}

function Row({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd><Money value={value} className={muted ? 'text-muted' : ''} /></dd>
    </div>
  )
}

function SuccessCard({ invoice, onAnother }: { invoice: Invoice; onAnother: () => void }) {
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="glass rise w-full p-8">
        <div className="mb-4 flex items-center justify-center gap-2">
          <span className="font-display text-xl font-bold">{invoice.number}</span>
          <StatusPill status={invoice.status} />
        </div>
        <p className="text-muted">Sealed and {invoice.status === 'Sent' ? 'sent' : 'saved'}. Totals are locked into the invoice.</p>
        <Money value={invoice.totals.total} className="my-6 block text-4xl font-bold" />
        <div className="flex flex-col gap-3">
          <Link href={`/invoices/${invoice.id}`} className="btn btn-primary">Open invoice</Link>
          <Link href="/invoices" className="btn btn-ghost">All invoices</Link>
          <button type="button" className="btn btn-ghost" onClick={onAnother}>
            <ArrowLeft size={16} /> Another invoice
          </button>
        </div>
        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted">
          <Printer size={14} /> Print / PDF lives on the invoice page
        </p>
      </div>
    </div>
  )
}
