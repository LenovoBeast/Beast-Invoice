'use client'

import { ArrowLeft, CheckCircle, Printer } from '@phosphor-icons/react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { money } from '@/lib/format'
import { clientById, useAppStore, vehicleById } from '@/lib/store/app'
import { Money, Skel, StatusPill } from '../ui/bits'

/** Invoice detail: dark glass review on screen; the print pipeline renders a
    separate light `#print-area` sheet (frozen legacy design, A2). */
export function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const hydrated = useAppStore((s) => s.hydrated)
  const invoice = useAppStore((s) => s.invoices.find((i) => i.id === id))
  const settings = useAppStore((s) => s.settings)
  const clients = useAppStore((s) => s.clients)
  const vehicles = useAppStore((s) => s.vehicles)
  const markPaid = useAppStore((s) => s.markPaid)

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 lg:px-8">
        <Skel className="h-8 w-56" />
        <Skel className="mt-6 h-64" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="no-print mx-auto max-w-3xl px-4 py-16 lg:px-8">
        <div className="glass p-8 text-center">
          <p className="font-semibold">Invoice not found.</p>
          <p className="mt-1 text-sm text-muted">It may have been removed from this browser.</p>
          <Link href="/invoices" className="btn btn-ghost mt-5">
            <ArrowLeft size={16} /> All invoices
          </Link>
        </div>
      </div>
    )
  }

  const client = clientById({ clients }, invoice.clientId)
  const vehicle = vehicleById({ vehicles }, invoice.vehicleId)
  const payable = invoice.status === 'Sent' || invoice.status === 'Overdue'

  return (
    <>
      <div className="no-print mx-auto max-w-3xl px-4 py-8 lg:px-8">
        <Link href="/invoices" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft size={16} /> All invoices
        </Link>

        <header className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">{invoice.number}</h1>
          <StatusPill status={invoice.status} />
        </header>
        <p className="mt-1 text-sm text-muted">
          Created {invoice.created} · Due {invoice.due}
          {invoice.tier ? ` · ${invoice.tier} tier` : ''}
        </p>

        <section className="glass mt-5 p-5" aria-label="Client and vehicle">
          <div className="font-semibold">{client?.name ?? 'Unknown client'}</div>
          <div className="mt-0.5 text-sm text-muted">
            {client?.phone} · {client?.address || 'No address on file'}
          </div>
          {vehicle && (
            <div className="mt-1 text-sm text-muted">
              {vehicle.desc} · {vehicle.plate}
              {vehicle.odometer ? ` · ${vehicle.odometer.toLocaleString()} km` : ''}
            </div>
          )}
        </section>

        <section className="glass mt-4 px-5 py-1" aria-label="Lines">
          {invoice.lines.map((l, i) => (
            <div key={`${l.refId ?? 'adhoc'}-${i}`} className="row-card flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">{l.name}</div>
                <div className="text-xs text-muted">
                  {l.type === 'labor' ? 'Labor' : 'Part'}
                  {l.pn ? ` · ${l.pn}` : ''} · <Money value={l.unit} /> each
                </div>
              </div>
              <div className="shrink-0 text-right">
                <Money value={l.qty * l.unit} className="font-semibold" />
                <div className="text-xs text-muted">×{l.qty}</div>
              </div>
            </div>
          ))}
        </section>

        <section className="glass mt-4 p-5" aria-label="Totals">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Labor</dt><dd><Money value={invoice.totals.labor} /></dd></div>
            <div className="flex justify-between"><dt className="text-muted">Parts</dt><dd><Money value={invoice.totals.parts} /></dd></div>
            <div className="flex justify-between"><dt className="text-muted">Discount ({invoice.discountPct}%)</dt><dd><Money value={-invoice.totals.discount} /></dd></div>
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd><Money value={invoice.totals.subtotal} /></dd></div>
            <div className="flex justify-between"><dt className="text-muted">Tax</dt><dd><Money value={invoice.totals.tax} /></dd></div>
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <span className="text-sm font-bold uppercase tracking-wider text-muted">Total</span>
            <Money value={invoice.totals.total} className="text-2xl font-bold" />
          </div>
        </section>

        {(invoice.customerNote || invoice.internalNote) && (
          <section className="glass mt-4 p-5" aria-label="Notes">
            {invoice.customerNote && (
              <p className="text-sm"><span className="font-semibold">Customer note: </span>{invoice.customerNote}</p>
            )}
            {invoice.internalNote && (
              <p className="mt-2 text-sm"><span className="font-semibold">Internal note: </span>{invoice.internalNote}</p>
            )}
          </section>
        )}

        <div className="mt-5 flex flex-wrap gap-3 pb-16">
          {payable && (
            <button type="button" className="btn btn-primary" onClick={() => void markPaid(invoice.id)}>
              <CheckCircle size={18} weight="bold" />
              Record payment
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
            <Printer size={18} />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Print-only sheet: light legacy design, invisible on screen (A2) */}
      <div id="print-area" aria-hidden="true">
        <div className="inv">
          <div className="inv-top">
            <div className="inv-brand">
              <div className="b1">B</div>
              <div>
                <h2>{settings.name}</h2>
                <div className="small">{settings.slogan}</div>
              </div>
            </div>
            <div className="inv-meta">
              <h3>INVOICE</h3>
              <div>{invoice.number}</div>
              <div className="small">Created {invoice.created} · Due {invoice.due}</div>
            </div>
          </div>
          <div className="inv-cols">
            <div>
              <b>Billed to</b>
              <div className="small">
                {client?.name}
                {client?.phone ? <><br />{client.phone}</> : null}
                {client?.address ? <><br />{client.address}</> : null}
              </div>
            </div>
            <div>
              <b>Vehicle</b>
              <div className="small">
                {vehicle ? <>{vehicle.desc} · {vehicle.plate}{invoice.odometer ? ` · ${invoice.odometer}` : ''}</> : 'No vehicle on file'}
              </div>
            </div>
          </div>
          <table className="ilines">
            <thead>
              <tr>
                <th>Description</th>
                <th className="r">Qty</th>
                <th className="r">Unit</th>
                <th className="r">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((l, i) => (
                <tr key={`${l.refId ?? 'adhoc'}-${i}`}>
                  <td>
                    {l.name}
                    {l.pn ? <span className="small"> · {l.pn}</span> : null}
                  </td>
                  <td className="r">{l.qty}</td>
                  <td className="r">{money(l.unit)}</td>
                  <td className="r">{money(l.qty * l.unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="inv-tot">
            <div className="totline"><span className="lab">Labor</span><span className="val">{money(invoice.totals.labor)}</span></div>
            <div className="totline"><span className="lab">Parts</span><span className="val">{money(invoice.totals.parts)}</span></div>
            <div className="totline discount"><span className="lab">Discount ({invoice.discountPct}%)</span><span className="val">-{money(invoice.totals.discount)}</span></div>
            <div className="totline"><span className="lab">Subtotal</span><span className="val">{money(invoice.totals.subtotal)}</span></div>
            <div className="totline"><span className="lab">Tax</span><span className="val">{money(invoice.totals.tax)}</span></div>
            <div className="totline total"><span>TOTAL</span><span className="val">{money(invoice.totals.total)}</span></div>
          </div>
          {invoice.customerNote && <div className="inv-notes">{invoice.customerNote}</div>}
          <div className="inv-foot">
            <span>{settings.footer}</span>
            <span>{settings.name}{settings.phone ? ` · ${settings.phone}` : ''}</span>
          </div>
          {invoice.status === 'Paid' && <div className="stamp">PAID</div>}
        </div>
      </div>
    </>
  )
}
