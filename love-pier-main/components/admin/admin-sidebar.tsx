'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  ShoppingBag,
  UtensilsCrossed,
  FolderOpen,
  Tag,
  CalendarDays,
  Image,
  Waves,
  Menu,
  X,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin', label: 'ภาพรวม', icon: Home, exact: true },
  { href: '/admin/orders', label: 'ออเดอร์', icon: ShoppingBag },
  { href: '/admin/menu', label: 'เมนูอาหาร', icon: UtensilsCrossed },
  { href: '/admin/categories', label: 'หมวดเมนู', icon: FolderOpen },
  { href: '/admin/promotions', label: 'โปรโมชัน', icon: Tag },
  { href: '/admin/events', label: 'อีเวนต์', icon: CalendarDays },
  { href: '/admin/gallery', label: 'แกลเลอรี', icon: Image },
  { href: '/admin/activities', label: 'กิจกรรม', icon: Waves },
]

function NavLink({
  item,
  pathname,
  onClick,
  badge = 0,
}: {
  item: (typeof navItems)[number]
  pathname: string
  onClick?: () => void
  badge?: number
}) {
  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-white text-gray-900 font-medium shadow-sm'
          : 'text-gray-600 hover:bg-white hover:text-gray-900'
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {badge > 0 && (
        <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold leading-5 text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}

export function AdminSidebar({
  email,
  signOut,
  pendingOrders = 0,
}: {
  email: string
  signOut: () => Promise<void>
  pendingOrders?: number
}) {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-200">
        <p className="font-semibold text-gray-900 leading-none">Love Pier</p>
        <p className="text-xs text-gray-500 mt-0.5">Admin</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onClick={() => setOpen(false)}
            badge={item.href === '/admin/orders' ? pendingOrders : 0}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 px-3 py-3 space-y-1">
        <p className="truncate px-3 text-xs text-gray-500">{email}</p>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-white hover:text-gray-900 transition-colors"
          >
            <LogOut className="size-4 shrink-0" />
            ออกจากระบบ
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex h-12 items-center gap-3 border-b border-gray-200 bg-gray-50 px-4">
        <button
          onClick={() => setOpen(true)}
          className="rounded-md p-1.5 text-gray-600 hover:bg-gray-200"
          aria-label="เปิดเมนู"
        >
          <Menu className="size-5" />
        </button>
        <span className="font-semibold text-gray-900 text-sm">Love Pier Admin</span>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'md:hidden fixed inset-y-0 left-0 z-50 w-[220px] bg-gray-50 border-r border-gray-200 transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="font-semibold text-gray-900">Love Pier Admin</span>
          <button onClick={() => setOpen(false)} className="rounded-md p-1 text-gray-500 hover:text-gray-900">
            <X className="size-4" />
          </button>
        </div>
        <div className="h-[calc(100%-49px)]">{sidebarContent}</div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[220px] shrink-0 flex-col bg-gray-50 border-r border-gray-200 h-full">
        {sidebarContent}
      </aside>

      {/* Mobile top spacer so content isn't behind the bar */}
      <div className="md:hidden fixed top-12 left-0 right-0 bottom-0 pointer-events-none" />
    </>
  )
}
