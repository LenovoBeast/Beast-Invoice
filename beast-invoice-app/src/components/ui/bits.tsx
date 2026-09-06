'use client'

import { useAppStore } from '@/lib/store/app'
import { money } from '@/lib/format'
import type { InvoiceStatus } from '@/lib/types'

export function Money({ value, className = '' }: { value: number; className?: string }) {
  return <span className={`money ${className}`}>{money(value)}</span>
}

export function StatusPill({ status }: { status: InvoiceStatus }) {
  return <span className={`pill pill-${status.toLowerCase()}`}>{status}</span>
}

export function TierPill({ tier }: { tier: string }) {
  return <span className={`pill ${tier === 'VIP' ? 'pill-vip' : ''}`} style={{ textTransform: 'none' }}>{tier}</span>
}

export function Skel({ className = '' }: { className?: string }) {
  return <div className={`skel ${className}`} />
}
