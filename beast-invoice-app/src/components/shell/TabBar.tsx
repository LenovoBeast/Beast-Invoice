'use client'

import { GearSix, Package, PlusCircle, Receipt, SquaresFour, UsersThree } from '@phosphor-icons/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { href: '/', label: 'Home', icon: SquaresFour },
  { href: '/invoice/new', label: 'New', icon: PlusCircle },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
  { href: '/clients', label: 'Clients', icon: UsersThree },
  { href: '/catalog', label: 'Catalog', icon: Package },
  { href: '/settings', label: 'Settings', icon: GearSix },
]

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

/** Mobile bottom tab bar, 48px+ targets, safe-area aware. */
export function TabBar() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-bg-0/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      {ITEMS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={`tabbar-item ${isActive(pathname, href) ? 'active' : ''}`}>
          <Icon size={22} />
          {label}
        </Link>
      ))}
    </nav>
  )
}
