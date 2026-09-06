'use client'

import { create } from 'zustand'
import type { Tier, ZoneKey } from '@/lib/types'

/** Transient scene store: DISCRETE values only (blueprint 7). Continuous
    values (camera, pointer, scroll) live in module refs, never here. */
interface SpatialState {
  zone: ZoneKey
  tier: Tier
  canvasReady: boolean
  setZone: (zone: ZoneKey) => void
  setTier: (tier: Tier) => void
  setCanvasReady: (ready: boolean) => void
}

export const useSpatial = create<SpatialState>((set) => ({
  zone: 'reception',
  tier: 'Low',
  canvasReady: false,
  setZone: (zone) => set({ zone }),
  setTier: (tier) => set({ tier }),
  setCanvasReady: (canvasReady) => set({ canvasReady }),
}))
