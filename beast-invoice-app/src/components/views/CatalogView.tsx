'use client'

import { MagnifyingGlass } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { useAppStore } from '@/lib/store/app'
import { servicePriceLabel } from '@/lib/totals'
import { Money, Skel } from '../ui/bits'

/** Parts wall + service rack, read-only in this slice. Editors (retire/restore,
    CSV import) land in Phase C per BEAST_BUILD_PLAN. */
export function CatalogView() {
  const hydrated = useAppStore((s) => s.hydrated)
  const services = useAppStore((s) => s.services)
  const parts = useAppStore((s) => s.parts)
  const laborRate = useAppStore((s) => s.settings.laborRate)
  const [sq, setSq] = useState('')
  const [pq, setPq] = useState('')

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
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted">Services ({services.length})</h2>
        <div className="relative">
          <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-10" placeholder="Filter services" value={sq} onChange={(e) => setSq(e.target.value)} aria-label="Filter services" />
        </div>
        <div className="mt-3">
          {svc.map((s) => (
            <div key={s.id} className="row-card flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">{s.name}</div>
                <div className="text-xs text-muted">{s.cat}</div>
              </div>
              <span className="money shrink-0 text-sm text-muted">{servicePriceLabel(s, laborRate)}</span>
            </div>
          ))}
          {svc.length === 0 && <p className="py-2 text-sm text-muted">No services match.</p>}
        </div>
      </section>

      <section aria-label="Parts" className="glass mt-4 p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted">Parts ({parts.length})</h2>
        <div className="relative">
          <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-10" placeholder="Filter parts by name, number, brand, or fit" value={pq} onChange={(e) => setPq(e.target.value)} aria-label="Filter parts" />
        </div>
        <div className="mt-3">
          {prt.map((p) => (
            <div key={p.id} className="row-card flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">{p.name}</div>
                <div className="truncate text-xs text-muted">
                  {p.brand} · {p.pn} · fits {p.fits.join(', ')}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <Money value={p.price} className="text-sm font-semibold" />
                <div className="text-xs text-muted">{p.stock} in stock</div>
              </div>
            </div>
          ))}
          {prt.length === 0 && <p className="py-2 text-sm text-muted">No parts match.</p>}
        </div>
      </section>
      <div className="pb-16" />
    </div>
  )
}
