'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { detectTier } from '@/lib/quality'
import { useSpatial } from '@/lib/store/spatial'

const SceneRoot = dynamic(() => import('./SceneRoot'), { ssr: false })

/** Boots after first paint (blueprint 8.3): tier detection decides whether the
    room exists at all. Low tier + `?motion=off` + reduced-motion never mount it. */
export function SceneCanvas() {
  const [booted, setBooted] = useState(false)
  const canvasReady = useSpatial((s) => s.canvasReady)
  const setTier = useSpatial((s) => s.setTier)

  useEffect(() => {
    const boot = () => {
      const tier = detectTier()
      setTier(tier)
      if (tier !== 'Low') setBooted(true)
    }
    const schedule =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(boot, { timeout: 2500 })
        : window.setTimeout(boot, 400)
    return () => {
      if (typeof window.cancelIdleCallback === 'function') cancelIdleCallback(schedule)
      else window.clearTimeout(schedule)
    }
  }, [setTier])

  if (!booted) return null
  return (
    <div className={`scene-canvas ${canvasReady ? 'on' : ''}`} aria-hidden="true">
      <SceneRoot />
    </div>
  )
}
