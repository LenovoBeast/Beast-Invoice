'use client'

import { MagnifyingGlass, Plus } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { useAppStore } from '@/lib/store/app'
import { servicePriceLabel } from '@/lib/totals'
import { Money, Skel } from '../ui/bits'

/** Parts wall + service rack. Starting from an empty cloud DB, quick-add is
    how the owner builds the price list (unlimited custom services, contract). */
export function CatalogView() {
  const hydrated = useAppStore((s) => s.hydrated)
  const services = useAppStore((s) => s.services)
  const parts = useAppStore((s) => s.parts)
  const laborRate = useAppStore((s) => s.settings.laborRate)
  const addService = useAppStore((s) => s.addService)
  const addPart = useAppStore((s) => s.addPart)
  const [sq, setSq] = useState('')
  const [pq, setPq] = useState('')
  const [showAddService, setShowAddService] = useState(false)
  const [showAddPart, setShowAddPart] = useState(false)

  const svc = useMemo(() => {
    const n = sq.trim().toLowerCase()
    return n ? services.filter((s) => [s.name, s.cat].some((f) => f.toLowerCase().includes(n))) : services
  }, [sq, services])

  const prt = useMemo(() => {
    const n = pq.trim().toLowerCase()
    return n ? parts.filter((p) => [p.name, p.pn, p.brand, ...p.fits].some((f) => f.toLowerCase().includes(n))) : parts
  }, [pq, parts])

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
        <Skel className="h-8 w-44" />
        <Skel className="mt-6 h-48" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <header className="py-4">
        <h1 className="text-3xl font-bold">Catalog</h1>
        <p className="mt-1 text-sm text-muted">Services and parts powering the builder. Labor rate: ${laborRate}/h.</p>
      </header>

      <section aria-label="Services" className="glass p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Services ({services.length})</h2>
          <button
            type="button"
            className="btn btn-ghost !py-1.5 !px-3 text-xs"
            aria-expanded={showAddService}
            onClick={() => setShowAddService((v) => !v)}
          >
            <Plus size={14} weight="bold" /> Add service
          </button>
        </div>
        {showAddService && (
          <AddServiceForm
            onAdd={async (input) => {
              await addService(input)
              setShowAddService(false)
            }}
          />
        )}
        <div className="relative mt-3">
          <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-10" placeholder="Filter services" value={sq} onChange={(e) => setSq(e.target.value)} aria-label="Filter services" />
        </div>
        <div className="mt-3">
          {svc.length === 0 ? (
            <p className="py-2 text-sm text-muted">
              {services.length === 0 ? 'No services yet. Add your first job with "Add service".' : 'No services match.'}
            </p>
          ) : (
            svc.map((s) => (
              <div key={s.id} className="row-card flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{s.name}</div>
                  <div className="text-xs text-muted">{s.cat}</div>
                </div>
                <span className="money shrink-0 text-sm text-muted">{servicePriceLabel(s, laborRate)}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section aria-label="Parts" className="glass mt-4 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Parts ({parts.length})</h2>
          <button
            type="button"
            className="btn btn-ghost !py-1.5 !px-3 text-xs"
            aria-expanded={showAddPart}
            onClick={() => setShowAddPart((v) => !v)}
          >
            <Plus size={14} weight="bold" /> Add part
          </button>
        </div>
        {showAddPart && (
          <AddPartForm
            onAdd={async (input) => {
              await addPart(input)
              setShowAddPart(false)
            }}
          />
        )}
        <div className="relative mt-3">
          <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-10" placeholder="Filter parts by name, number, brand, or fit" value={pq} onChange={(e) => setPq(e.target.value)} aria-label="Filter parts" />
        </div>
        <div className="mt-3">
          {prt.length === 0 ? (
            <p className="py-2 text-sm text-muted">
              {parts.length === 0 ? 'No parts yet. Add your first part above.' : 'No parts match.'}
            </p>
          ) : (
            prt.map((p) => (
              <div key={p.id} className="row-card flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className="truncate text-xs text-muted">
                    {p.brand} · {p.pn}
                    {p.fits.length > 0 ? ` · fits ${p.fits.join(', ')}` : ''}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <Money value={p.price} className="text-sm font-semibold" />
                  <div className="text-xs text-muted">{p.stock} in stock</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      <div className="pb-16" />
    </div>
  )
}

function AddServiceForm({ onAdd }: { onAdd: (input: { name: string; cat?: string; mode: 'flat' | 'hours'; price?: number; hours?: number }) => Promise<void> }) {
  const [name, setName] = useState('')
  const [cat, setCat] = useState('General')
  const [mode, setMode] = useState<'flat' | 'hours'>('flat')
  const [price, setPrice] = useState('')
  const [hours, setHours] = useState('')
  const num = (v: string) => {
    const n = parseFloat(v)
    return Number.isNaN(n) ? undefined : n
  }
  return (
    <form
      className="mb-3 grid grid-cols-2 gap-3 rounded-xl border border-line p-4 md:grid-cols-5"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!name.trim()) return
        await onAdd({
          name: name.trim(), cat: cat.trim() || 'General', mode,
          price: mode === 'flat' ? num(price) : undefined,
          hours: mode === 'hours' ? num(hours) : undefined,
        })
      }}
    >
      <label className="block md:col-span-2">
        <span className="mb-1.5 block text-sm font-semibold">Service name</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Oil change - synthetic" required />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Category</span>
        <input className="input" value={cat} onChange={(e) => setCat(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Pricing</span>
        <select className="input" value={mode} onChange={(e) => setMode(e.target.value as 'flat' | 'hours')}>
          <option value="flat">Flat price</option>
          <option value="hours">Hours × labor rate</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">{mode === 'flat' ? 'Price ($)' : 'Hours'}</span>
        <input
          className="input money"
          inputMode="decimal"
          value={mode === 'flat' ? price : hours}
          onChange={(e) => (mode === 'flat' ? setPrice(e.target.value) : setHours(e.target.value))}
        />
      </label>
      <div className="md:col-span-5">
        <button type="submit" className="btn btn-primary !py-2 text-sm">Add service</button>
      </div>
    </form>
  )
}

function AddPartForm({ onAdd }: { onAdd: (input: { name: string; pn?: string; brand?: string; price?: number; stock?: number }) => Promise<void> }) {
  const [name, setName] = useState('')
  const [pn, setPn] = useState('')
  const [brand, setBrand] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const num = (v: string) => {
    const n = parseFloat(v)
    return Number.isNaN(n) ? undefined : n
  }
  return (
    <form
      className="mb-3 grid grid-cols-2 gap-3 rounded-xl border border-line p-4 md:grid-cols-6"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!name.trim()) return
        await onAdd({ name: name.trim(), pn: pn.trim(), brand: brand.trim(), price: num(price), stock: num(stock) })
      }}
    >
      <label className="block md:col-span-2">
        <span className="mb-1.5 block text-sm font-semibold">Part name</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Front brake pads (OEM)" required />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Part number</span>
        <input className="input" value={pn} onChange={(e) => setPn(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Brand</span>
        <input className="input" value={brand} onChange={(e) => setBrand(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Price ($)</span>
        <input className="input money" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Stock</span>
        <input className="input money" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} />
      </label>
      <div className="md:col-span-6">
        <button type="submit" className="btn btn-primary !py-2 text-sm">Add part</button>
      </div>
    </form>
  )
}
