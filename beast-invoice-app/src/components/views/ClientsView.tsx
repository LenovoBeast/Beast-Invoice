'use client'

import { Car, Plus, Warning } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { fmtDate } from '@/lib/format'
import { useAppStore } from '@/lib/store/app'
import type { Client } from '@/lib/types'
import { Skel, TierPill } from '../ui/bits'

/** Client bays: quick add + per-client cards with vehicle watchlists.
    "+ Invoice" seeds a draft and jumps straight to the bench. */
export function ClientsView() {
  const hydrated = useAppStore((s) => s.hydrated)
  const clients = useAppStore((s) => s.clients)
  const vehicles = useAppStore((s) => s.vehicles)
  const startDraft = useAppStore((s) => s.startDraft)
  const addClient = useAppStore((s) => s.addClient)
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)

  function newInvoice(clientId: string) {
    startDraft(clientId)
    router.push('/invoice/new')
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
        <Skel className="h-8 w-40" />
        <Skel className="mt-6 h-48" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="mt-1 text-sm text-muted">{clients.length} in this browser.</p>
        </div>
        <button type="button" className="btn btn-ghost" aria-expanded={showAdd} onClick={() => setShowAdd((v) => !v)}>
          <Plus size={16} weight="bold" /> Quick add
        </button>
      </header>

      {showAdd && (
        <QuickAdd
          onAdd={async (input) => {
            await addClient(input)
            setShowAdd(false)
          }}
        />
      )}

      {clients.length === 0 ? (
        <div className="glass mt-6 p-8 text-center text-muted">No clients yet. Quick add one above.</div>
      ) : (
        <div className="space-y-4 pb-16">
          {clients.map((c) => (
            <section key={c.id} className="glass p-5" aria-label={`Client ${c.name}`}>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">{c.name}</h2>
                <TierPill tier={c.tier} />
                <button type="button" className="btn btn-primary ml-auto !py-1.5 !px-3 text-xs" onClick={() => newInvoice(c.id)}>
                  <Plus size={14} weight="bold" /> Invoice
                </button>
              </div>
              <div className="mt-1 text-sm text-muted">
                {c.phone}
                {c.email ? ` · ${c.email}` : ''} · last visit {fmtDate(c.lastVisit)}
              </div>
              {vehicles.filter((v) => v.clientId === c.id).map((v) => (
                <div key={v.id} className="mt-2 text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <Car size={16} className="text-muted" />
                    {v.desc} · {v.plate}
                    {v.odometer ? ` · ${v.odometer.toLocaleString()} km` : ''}
                  </span>
                  {v.watch && (
                    <span className="mt-1 flex items-start gap-1.5 text-warn">
                      <Warning size={15} className="mt-0.5 shrink-0" /> {v.watch}
                    </span>
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function QuickAdd({ onAdd }: { onAdd: (input: Parameters<ReturnType<typeof useAppStore.getState>['addClient']>[0]) => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [tier, setTier] = useState<Client['tier']>('Retail')
  const [vehicleDesc, setVehicleDesc] = useState('')
  const [plate, setPlate] = useState('')
  return (
    <form
      className="glass mt-2 grid grid-cols-2 gap-3 p-5 md:grid-cols-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        onAdd({ name: name.trim(), phone: phone.trim(), tier, vehicleDesc: vehicleDesc.trim() || undefined, plate: plate.trim() })
      }}
    >
      <label className="block md:col-span-2">
        <span className="mb-1.5 block text-sm font-semibold">Client name</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Phone</span>
        <input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Tier</span>
        <select className="input" value={tier} onChange={(e) => setTier(e.target.value as Client['tier'])}>
          <option>Retail</option>
          <option>VIP</option>
          <option>Fleet</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Plate</span>
        <input className="input" value={plate} onChange={(e) => setPlate(e.target.value)} />
      </label>
      <label className="block md:col-span-4">
        <span className="mb-1.5 block text-sm font-semibold">Vehicle</span>
        <input className="input" placeholder="e.g. 2019 BMW M340i" value={vehicleDesc} onChange={(e) => setVehicleDesc(e.target.value)} />
      </label>
      <div className="flex items-end">
        <button type="submit" className="btn btn-primary w-full">Add client</button>
      </div>
    </form>
  )
}
