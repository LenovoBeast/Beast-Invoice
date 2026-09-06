'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { shiftAccent } from '@/lib/motion'
import { useAppStore } from '@/lib/store/app'
import { useSpatial } from '@/lib/store/spatial'
import { zoneForPath } from '@/three/zones'
import { SceneCanvas } from '../canvas/SceneCanvas'
import { LoginGate } from './LoginGate'
import { NavRail } from './NavRail'
import { TabBar } from './TabBar'

/** The spatial shell: neon pools (z1), canvas (z2), DOM panels (z10), chrome (z40).
    Route changes publish the zone to the camera rig; accent changes re-tint the
    CSS vars and the shader uniforms in one 400ms motion (contract A7). */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const setZone = useSpatial((s) => s.setZone)
  const accentHex = useAppStore((s) => s.settings.accentHex)
  const mode = useAppStore((s) => s.mode)
  const authStatus = useAppStore((s) => s.authStatus)
  const syncError = useAppStore((s) => s.syncError)
  const prevAccent = useRef<string | null>(null)

  useEffect(() => {
    setZone(zoneForPath(pathname))
  }, [pathname, setZone])

  useEffect(() => {
    const root = document.documentElement
    const from = prevAccent.current ?? accentHex
    prevAccent.current = accentHex
    const apply = (hex: string) => {
      root.style.setProperty('--accent', hex)
      root.style.setProperty('--accent-dim', `${hex}59`)
    }
    apply(from)
    if (from.toLowerCase() !== accentHex.toLowerCase()) shiftAccent(from, accentHex, apply)
  }, [accentHex])

  if (mode === 'server' && authStatus === 'login') {
    return (
      <>
        <div className="neon-pools" aria-hidden="true" />
        <SceneCanvas />
        <LoginGate />
      </>
    )
  }

  return (
    <>
      <div className="neon-pools" aria-hidden="true" />
      <SceneCanvas />
      <NavRail />
      {syncError && (
        <div
          role="status"
          className="glass fixed left-1/2 top-3 z-50 -translate-x-1/2 border-warn/40 px-4 py-2 text-sm text-warn"
        >
          Sync issue: {syncError}
        </div>
      )}
      <main className="zone-main lg:pl-20">{children}</main>
      <TabBar />
    </>
  )
}
