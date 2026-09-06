'use client'

import { DownloadSimple, PlusCircle } from '@phosphor-icons/react'
import Link from 'next/link'
import { useMemo } from 'react'
import { money } from '@/lib/format'
import { clientById, useAppStore } from '@/lib/store/app'
import { Money, Skel, StatusPill } from '../ui/bits'

/** Reception (dashboard): text hero left, the showroom car owns the space
    behind it. Stats breathe on the plain layout, no card boxes. */
export function ReceptionView() {
  const hydrated = useAppStore((s) => s.hydrated)
  const settings = useAppStore((s) => s.settings)
  const clients = useAppStore((s) => s.clients)
  const vehicles = useAppStore((s) => s.vehicles)
  const services = useAppStore((s) => s.services)
  const parts = useAppStore((s) => s.parts)
  const invoices = useAppStore((s) => s.invoices)

  const stats = useMemo(() => {
    const drafts = invoices.filter((i) => i.status === 'Draft').length
    const sent = invoices.filter((i) => i.status === 'Sent').length
    const overdue = invoices.filter((i) => i.status === 'Overdue').length
    const outstanding = invoices
      .filter((i) => i.status !== 'Paid' && i.status !== 'Draft')
      .reduce((sum, i) => sum + i.totals.total, 0)
    return { drafts, sent, overdue, outstanding }
  }, [invoices])

  const recent = useMemo(
    () => invoices.slice().sort((a, b) => b.number.localeCompare(a.number)).slice(0, 6),
    [invoices],
  )

  function exportJson() {
    const data = { exportedAt: new Date().toISOString(), settings, clients, vehicles, services, parts, invoices }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'beast-invoice-export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
        <Skel className="h-10 w-72" />
        <Skel className="mt-3 h-5 w-96" />
        <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skel key={i} className="h-20" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 lg:px-8">
      <section className="flex min-h-[58dvh] flex-col items-start justify-center py-10">
        <h1 className="text-4xl font-bold md:text-5xl">Good day, crew.</h1>
        <p className="mt-3 max-w-[42ch] text-muted">
          Drafts are always saved. A repeat invoice takes about 60 seconds.
        </p>
        <Link href="/invoice/new" className="btn btn-primary mt-7">
          <PlusCircle size={18} weight="bold" />
          New Invoice
        </Link>
      </section>

      <section aria-label="Workshop stats" className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <div className="border-t border-line pt-4">
          <div className="text-3xl font-bold money">{stats.drafts}</div>
          <div className="mt-1 text-sm text-muted">Drafts</div>
        </div>
        <div className="border-t border-line pt-4">
          <div className="text-3xl font-bold money">{stats.sent}</div>
          <div className="mt-1 text-sm text-muted">Sent</div>
        </div>
        <div className="border-t border-line pt-4">
          <div className="text-3xl font-bold money text-alert">{stats.overdue}</div>
          <div className="mt-1 text-sm text-muted">Overdue</div>
        </div>
        <div className="border-t border-line pt-4">
          <Money value={stats.outstanding} className="text-3xl font-bold" />
          <div className="mt-1 text-sm text-muted">Outstanding</div>
        </div>
      </section>

      <section aria-label="Recent invoices" className="mt-14 pb-24 lg:pb-16">
        <h2 className="text-lg font-semibold">Recent invoices</h2>
        {recent.length === 0 ? (
          <div className="glass mt-4 p-8 text-center">
            <p className="text-muted">No invoices yet. The bench is ready.</p>
            <Link href="/invoice/new" className="btn btn-primary mt-4">
              <PlusCircle size={18} weight="bold" />
              New Invoice
            </Link>
          </div>
        ) : (
          <div className="glass mt-4 px-5 py-1">
            {recent.map((inv) => {
              const client = clientById({ clients }, inv.clientId)
              return (
                <Link key={inv.id} href={`/invoices/${inv.id}`} className="row-card flex items-center gap-3 hover:bg-bg-2/60">
                  <div className="min-w-0 grow">
                    <div className="truncate font-semibold">
                      {inv.number} · {client?.name ?? 'Unknown client'}
                    </div>
                    <div className="small text-sm text-muted">
                      {inv.created} · <Money value={inv.totals.total} />
                    </div>
                  </div>
                  <StatusPill status={inv.status} />
                </Link>
              )
            })}
          </div>
        )}
        <div className="mt-8 flex flex-wrap items-center gap-3 pb-10">
          <button type="button" onClick={exportJson} className="btn btn-ghost">
            <DownloadSimple size={18} />
            Export data (JSON)
          </button>
          <span className="text-sm text-muted">Demo data lives in this browser.</span>
        </div>
      </section>
    </div>
  )
}
