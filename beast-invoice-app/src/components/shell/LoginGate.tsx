'use client'

import { FlagCheckered } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { useAppStore } from '@/lib/store/app'

/** Single-user passphrase gate (BEAST_BUILD_PLAN §6). Rendered instead of the
    app until the signed session cookie exists. */
export function LoginGate() {
  const login = useAppStore((s) => s.login)
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!passphrase || busy) return
    setBusy(true)
    setError(false)
    const ok = await login(passphrase)
    setBusy(false)
    if (!ok) {
      setError(true)
      setPassphrase('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/95 px-4">
      <form onSubmit={onSubmit} className="glass w-full max-w-sm p-8 text-center">
        <FlagCheckered size={30} weight="fill" className="mx-auto text-accent" />
        <h1 className="mt-4 text-xl font-bold">Beast Invoice</h1>
        <p className="mt-1 text-sm text-muted">This workshop is private. Enter the shop passphrase.</p>
        <input
          type="password"
          className="input mt-6 text-center"
          autoFocus
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="Passphrase"
          aria-label="Passphrase"
          aria-invalid={error}
        />
        {error && (
          <p className="mt-2 text-sm text-alert" role="alert">
            Wrong passphrase.
          </p>
        )}
        <button type="submit" className="btn btn-primary mt-5 w-full" disabled={busy || !passphrase}>
          {busy ? 'Checking...' : 'Unlock'}
        </button>
      </form>
    </div>
  )
}
