'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { clientById, useAppStore, vehicleById } from '@/lib/store/app'
import type { InvoiceStatus } from '@/lib/types'
import { Money, Skel, StatusPill } from '../ui/bits'

const FILTERS = ['All', 'Draft', 'Sent', 'Paid', 'Overdue'] as const
type Filter = (typeof FILTERS)[number]

/** Archive: status filters + slot rows. The envelope-open 3D receive variant
    lands with the Finale port (S4); today opening goes straight to detail. */
export function ArchiveView() {
  const hydrated = useAppStore((s) => s.hydrated)
  const invoices = useAppStore((s) => s.invoices)
  const clients = useAppStore((s) => s.clients)
  const vehicles = useAppStore((s) => s.vehicles)
  const [filter, setFilter] = useState<Filter>('All')

  const list = useMemo(() => {
    const sorted = invoices.slice().sort((a, b) => b.number.localeCompare(a.number))
    return filter === 'All' ? sorted : sorted.filter((i) => i.status === filter)
  }, [invoices, filter])

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
        <Skel className="h-8 w-48" />
        <Skel className="mt-6 h-40" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <header className="py-4">
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="mt-1 text-sm text-muted">{invoices.length} total in this browser.</p>
      </header>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="glass mt-6 p-8 text-center text-muted">
          {filter === 'All' ? 'No invoices yet. The bench is ready.' : `No ${filter.toLowerCase()} invoices.`}
        </div>
      ) : (
        <div className="glass mt-6 px-5 py-1">
          {list.map((inv) => {
            const client = clientById({ clients }, inv.clientId)
            const vehicle = vehicleById({ vehicles }, inv.vehicleId)
            return (
              <Link key={inv.id} href={`/invoices/${inv.id}`} className="row-card flex items-center gap-3 hover:bg-bg-2/60">
                <div className="min-w-0 grow">
                  <div className="truncate font-semibold">
                    {inv.number} · {client?.name ?? 'Unknown client'}
                  </div>
                  <div className="truncate text-sm text-muted">
                    {inv.created}
                    {vehicle ? ` · ${vehicle.plate}` : ''}
                  </div>
                </div>
                <Money value={inv.totals.total} className="shrink-0 font-semibold" />
                <StatusPill status={inv.status} />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
