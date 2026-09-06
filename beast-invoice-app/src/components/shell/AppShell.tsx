'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { shiftAccent } from '@/lib/motion'
import { useAppStore } from '@/lib/store/app'
import { useSpatial } from '@/lib/store/spatial'
import { zoneForPath } from '@/three/zones'
import { SceneCanvas } from '../canvas/SceneCanvas'
import { NavRail } from './NavRail'
import { TabBar } from './TabBar'

/** The spatial shell: neon pools (z1), canvas (z2), DOM panels (z10), chrome (z40).
    Route changes publish the zone to the camera rig; accent changes re-tint the
    CSS vars and the shader uniforms in one 400ms motion (contract A7). */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const setZone = useSpatial((s) => s.setZone)
  const accentHex = useAppStore((s) => s.settings.accentHex)
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

  return (
    <>
      <div className="neon-pools" aria-hidden="true" />
      <SceneCanvas />
      <NavRail />
      <main className="zone-main lg:pl-20">{children}</main>
      <TabBar />
    </>
  )
}
