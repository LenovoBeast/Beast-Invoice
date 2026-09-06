'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store/app'

/** Boot: ask /api/state which mode we are in. Server mode delivers the Turso
    snapshot (or the login gate); local mode falls back to localStorage. */
export function Providers({ children }: { children: React.ReactNode }) {
  const bootstrap = useAppStore((s) => s.bootstrap)
  useEffect(() => {
    void bootstrap()
  }, [bootstrap])
  return <>{children}</>
}
