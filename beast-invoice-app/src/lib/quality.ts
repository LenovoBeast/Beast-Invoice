import type { Tier } from './types'

/** Quality tiering per BEAST_3D_BLUEPRINT.md 4.6.
    Offline-safe heuristics first (the garage Wi-Fi rule: no CDN benchmark fetch
    in the critical path); detect-gpu with vendored benchmarks can refine this
    during hardening. `?motion=off` forces Low for CI smoke tests. */
export function motionForcedOff(): boolean {
  if (typeof window === 'undefined') return true
  return new URLSearchParams(window.location.search).get('motion') === 'off'
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export function detectTier(): Tier {
  if (typeof window === 'undefined') return 'Low'
  if (motionForcedOff() || prefersReducedMotion()) return 'Low'
  if (window.matchMedia('(prefers-reduced-data: reduce)').matches) return 'Low'
  if (!hasWebGL()) return 'Low'
  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = nav.hardwareConcurrency ?? 4
  const mem = nav.deviceMemory ?? 4
  if (cores <= 2 || mem <= 2) return 'Low'
  const small = Math.min(window.screen.width, window.screen.height) < 720
  const coarse = window.matchMedia('(pointer: coarse)').matches
  if (!coarse && !small && cores >= 8 && mem >= 8) return 'High'
  return 'Mid'
}
