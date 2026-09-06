'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store/app'

/** Client-side rehydration gate (blueprint 7): the persisted store hydrates
    after mount so SSR never mismatches; views show designed skeletons until then. */
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    Promise.resolve(useAppStore.persist.rehydrate()).then(() => {
      useAppStore.setState({ hydrated: true })
    })
  }, [])
  return <>{children}</>
}
