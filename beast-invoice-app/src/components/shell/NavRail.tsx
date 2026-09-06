'use client'

import { FlagCheckered, GearSix, Package, PlusCircle, Receipt, SquaresFour, UsersThree } from '@phosphor-icons/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { href: '/', label: 'Dashboard', icon: SquaresFour },
  { href: '/invoice/new', label: 'New Invoice', icon: PlusCircle },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
  { href: '/clients', label: 'Clients', icon: UsersThree },
  { href: '/catalog', label: 'Catalog', icon: Package },
]

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

/** Desktop nav rail (64px, single line, height within cap). The builder's
    focused-mode progress strip lands with the Stage build (S2). */
export function NavRail() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Primary"
      className="fixed left-0 top-0 z-40 hidden h-full w-16 flex-col items-center gap-1 border-r border-line bg-bg-0/70 py-4 backdrop-blur-md lg:flex"
    >
      <Link href="/" title="High Performance Garage" className="mb-4">
        <FlagCheckered size={26} weight="fill" className="text-accent" />
        <span className="sr-only">Beast Invoice home</span>
      </Link>
      {ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          title={label}
          className={`nav-item justify-center px-0 ${isActive(pathname, href) ? 'active' : ''}`}
        >
          <Icon size={22} className="nav-ico" />
          <span className="sr-only">{label}</span>
        </Link>
      ))}
      <div className="mt-auto">
        <Link
          href="/settings"
          title="Settings"
          className={`nav-item justify-center px-0 ${isActive(pathname, '/settings') ? 'active' : ''}`}
        >
          <GearSix size={22} className="nav-ico" />
          <span className="sr-only">Settings</span>
        </Link>
      </div>
    </nav>
  )
}
