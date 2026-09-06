'use client'

import { ArrowClockwise } from '@phosphor-icons/react'
import { useState } from 'react'
import { useAppStore } from '@/lib/store/app'
import { Skel } from '../ui/bits'

const ACCENT_PRESETS = [
  { hex: '#ff2d3f', name: 'Racing Red' },
  { hex: '#ff8a3d', name: 'Ember' },
  { hex: '#3ddc84', name: 'Pit Green' },
  { hex: '#2d7dff', name: 'Cobalt' },
]

/** Office: branding, rates, and the accent picker that re-tints UI focus rings,
    neon glow, and the 3D materials together (contract A7). Commits are live,
    matching the mockup's instant-restyle behavior. */
export function SettingsView() {
  const hydrated = useAppStore((s) => s.hydrated)
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const resetDemo = useAppStore((s) => s.resetDemo)
  const [resetConfirm, setResetConfirm] = useState(false)

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 lg:px-8">
        <Skel className="h-8 w-40" />
        <Skel className="mt-6 h-64" />
      </div>
    )
  }

  const num = (v: string) => {
    const n = parseFloat(v)
    return Number.isNaN(n) ? 0 : n
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
      <header className="py-4">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted">Branding restyles the invoice, the neon, and the showroom instantly.</p>
      </header>

      <form className="glass p-5" onSubmit={(e) => e.preventDefault()}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Workshop name">
            <input className="input" value={settings.name} onChange={(e) => updateSettings({ name: e.target.value })} />
          </Field>
          <Field label="Slogan">
            <input className="input" value={settings.slogan} onChange={(e) => updateSettings({ slogan: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input className="input" inputMode="tel" value={settings.phone} onChange={(e) => updateSettings({ phone: e.target.value })} />
          </Field>
          <Field label="Address">
            <input className="input" value={settings.address} onChange={(e) => updateSettings({ address: e.target.value })} />
          </Field>
          <Field label="Tax rate (%)">
            <input className="input money" inputMode="decimal" value={settings.taxRate} onChange={(e) => updateSettings({ taxRate: num(e.target.value) })} />
          </Field>
          <Field label="Default labor rate ($/h)">
            <input className="input money" inputMode="decimal" value={settings.laborRate} onChange={(e) => updateSettings({ laborRate: num(e.target.value) })} />
          </Field>
          <Field label="Invoice footer / payment terms" full>
            <textarea className="input min-h-20 resize-y" value={settings.footer} onChange={(e) => updateSettings({ footer: e.target.value })} />
          </Field>
        </div>

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold">Accent color</legend>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {ACCENT_PRESETS.map((p) => (
              <button
                key={p.hex}
                type="button"
                title={p.name}
                aria-pressed={settings.accentHex.toLowerCase() === p.hex.toLowerCase()}
                className="chip"
                onClick={() => updateSettings({ accentHex: p.hex })}
              >
                <span className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ background: p.hex }} />
                {p.name}
              </button>
            ))}
            <label className="chip cursor-pointer">
              Custom
              <input
                type="color"
                className="h-5 w-8 cursor-pointer border-0 bg-transparent p-0"
                value={settings.accentHex}
                onChange={(e) => updateSettings({ accentHex: e.target.value })}
                aria-label="Custom accent color"
              />
            </label>
          </div>
        </fieldset>
      </form>

      <section className="glass mt-4 p-5" aria-label="Demo data">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Demo data</h2>
        <p className="mt-2 text-sm text-muted">Restore the seeded workshop. Everything you added in this browser is replaced.</p>
        {resetConfirm ? (
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                resetDemo()
                setResetConfirm(false)
              }}
            >
              Yes, reset everything
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setResetConfirm(false)}>Cancel</button>
          </div>
        ) : (
          <button type="button" className="btn btn-ghost mt-3" onClick={() => setResetConfirm(true)}>
            <ArrowClockwise size={16} /> Reset demo
          </button>
        )}
      </section>
      <div className="pb-16" />
    </div>
  )
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? 'md:col-span-2' : ''}`}>
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  )
}
