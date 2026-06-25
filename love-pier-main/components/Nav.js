import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { LANG_OPTIONS } from '../lib/langOptions'
import { useLanguage } from '../lib/language'

const COPY = {
  en: {
    navItems: [
      { href: '/', label: 'Home' },
      { href: '/menu', label: 'Menu' },
      { href: '/gallery', label: 'Gallery' },
      { href: '/events', label: 'Events' },
      { href: '/activities', label: 'Activities' },
      { href: '/promotion', label: 'Promotion' },
      { href: '/about', label: 'About Us' },
      { href: '/contact', label: 'Contact' },
    ],
    reserve: 'Reserve',
  },
  th: {
    navItems: [
      { href: '/', label: 'หน้าหลัก' },
      { href: '/menu', label: 'เมนู' },
      { href: '/gallery', label: 'แกลเลอรี' },
      { href: '/events', label: 'อีเวนต์' },
      { href: '/activities', label: 'กิจกรรม' },
      { href: '/promotion', label: 'โปรโมชัน' },
      { href: '/about', label: 'เกี่ยวกับเรา' },
      { href: '/contact', label: 'ติดต่อ' },
    ],
    reserve: 'จองโต๊ะ',
  },
  zh: {
    navItems: [
      { href: '/', label: '首页' },
      { href: '/menu', label: '菜单' },
      { href: '/gallery', label: '图库' },
      { href: '/events', label: '活动' },
      { href: '/activities', label: '水上活动' },
      { href: '/promotion', label: '优惠' },
      { href: '/about', label: '关于我们' },
      { href: '/contact', label: '联系' },
    ],
    reserve: '预订',
  },
}

function LangFlagDropdown({ lang, setLang }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const current = LANG_OPTIONS.find((o) => o.value === lang) || LANG_OPTIONS[0]

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${current.label}`}
        className="flex items-center gap-2 border border-black/[0.12] bg-[rgba(245,243,239,0.92)] px-2.5 py-1.5 hover:border-ink/40 focus:outline-none focus:border-ink transition-colors cursor-pointer"
      >
        <span className="text-[17px] leading-none">{current.flag}</span>
        <span className="text-[11px] font-semibold tracking-[0.08em] text-ink leading-none">{current.code}</span>
        <span className="text-[7px] text-muted leading-none" aria-hidden>▼</span>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Language"
          className="absolute left-0 top-full z-[110] mt-1 min-w-[80px] border border-black/10 bg-bg py-1 shadow-[0_8px_24px_rgba(0,0,0,0.1)]"
        >
          {LANG_OPTIONS.map(({ value, flag, label, code }) => (
            <li key={value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={lang === value}
                aria-label={label}
                title={label}
                onClick={() => {
                  setLang(value)
                  setOpen(false)
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 transition-colors cursor-pointer ${
                  lang === value
                    ? 'bg-[#fffdf6] shadow-[inset_0_-2px_0_0_#c9a84c]'
                    : 'hover:bg-black/[0.04]'
                }`}
              >
                <span className="text-[17px] leading-none">{flag}</span>
                <span className="text-[11px] font-semibold tracking-[0.08em] text-ink leading-none">{code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Nav({ onOpenMenu }) {
  const { pathname } = useRouter()
  const { lang, setLang } = useLanguage()
  const dict = COPY[lang] || COPY.en
  const linkClass = (href) =>
    `shrink-0 text-[13px] lg:text-[14px] tracking-[0.12em] lg:tracking-[0.15em] uppercase whitespace-nowrap transition-colors duration-200 ${
      pathname === href ? 'text-ink' : 'text-muted hover:text-ink'
    }`

  return (
    <nav className="w-full sticky top-0 z-[100] border-b border-black/10 bg-[rgba(245,243,239,0.96)] backdrop-blur-sm">
      {/* Row 1 — Logo centered, lang left (desktop), hamburger right (mobile) */}
      <div className="relative flex items-center justify-center px-4 pt-3 pb-2 sm:px-6 lg:px-10">
        {/* Logo — center */}
        <Link href="/" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/uploads/logo-8dc1f126.png"
            alt="Love Pier Beach Cafe"
            className="h-12 sm:h-14 lg:h-16 w-auto mix-blend-multiply block"
          />
        </Link>

        {/* Hamburger (mobile only) — left */}
        <div className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 md:hidden">
          <button
            type="button"
            onClick={onOpenMenu}
            className="flex flex-col justify-center items-center gap-[5px] bg-transparent border border-black/[0.12] w-9 h-9 shrink-0 hover:border-ink transition-colors"
            aria-label="Open menu"
          >
            <span className="block w-4 h-px bg-ink" />
            <span className="block w-4 h-px bg-ink" />
            <span className="block w-4 h-px bg-ink" />
          </button>
        </div>

        {/* Lang flag (mobile only) — right */}
        <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 md:hidden">
          <LangFlagDropdown lang={lang} setLang={setLang} />
        </div>
      </div>

      {/* Row 2 — Nav links + Reserve + Lang (desktop only) */}
      <div className="hidden md:flex items-center justify-center gap-4 lg:gap-6 px-4 pb-3 sm:px-6 lg:px-10">
        {dict.navItems.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item.href)}>
            {item.label}
          </Link>
        ))}
        <span className="w-px h-3 bg-black/[0.12] shrink-0" />
        <Link
          href="/reservation"
          className={`shrink-0 text-[11px] lg:text-[12px] tracking-[0.14em] uppercase whitespace-nowrap px-4 py-2 border transition-colors duration-200 ${
            pathname === '/reservation'
              ? 'border-gold/50 bg-[#fffdf6] text-ink'
              : 'border-black/[0.12] bg-white/60 text-ink hover:border-gold/40 hover:bg-[#fffdf6]'
          }`}
        >
          {dict.reserve}
        </Link>
        <span className="w-px h-3 bg-black/[0.12] shrink-0" />
        <LangFlagDropdown lang={lang} setLang={setLang} />
      </div>
    </nav>
  )
}
