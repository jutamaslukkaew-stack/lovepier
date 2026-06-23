'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/admin', label: 'ภาพรวม', exact: true },
  { href: '/admin/menu', label: 'เมนูอาหาร' },
  { href: '/admin/categories', label: 'หมวดเมนู' },
]

export function AdminNav() {
  const pathname = usePathname() ?? ''
  return (
    <nav className="mx-auto max-w-6xl px-4">
      <ul className="flex gap-1 overflow-x-auto">
        {links.map((l) => {
          const active = l.exact ? pathname === l.href : pathname.startsWith(l.href)
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className={cn(
                  'inline-flex h-10 items-center border-b-2 px-3 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {l.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
