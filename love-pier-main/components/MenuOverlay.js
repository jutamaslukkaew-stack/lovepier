import Link from 'next/link'
import { useRouter } from 'next/router'
import { LANG_OPTIONS } from '../lib/langOptions'
import { useLanguage } from '../lib/language'

const COPY = {
  en: {
    language: 'Language',
    navItems: [
      { href: '/',            label: 'Home' },
      { href: '/menu',        label: 'Menu' },
      { href: '/gallery',     label: 'Gallery' },
      { href: '/reservation', label: 'Reservation' },
      { href: '/events',      label: 'Events' },
      { href: '/activities',  label: 'Activities' },
      { href: '/promotion',   label: 'Promotion' },
      { href: '/about',       label: 'About Us' },
    ],
    visit: 'Location',
    hours: 'Hours',
    contact: 'Contact',
    address: '800 108 Saensuk<br/>Mueang Chonburi, Chonburi 20130',
    hoursValue: 'Open daily (except Wed) · 09:00-18:00',
  },
  th: {
    language: 'ภาษา',
    navItems: [
      { href: '/',            label: 'หน้าหลัก' },
      { href: '/menu',        label: 'เมนู' },
      { href: '/gallery',     label: 'แกลเลอรี' },
      { href: '/reservation', label: 'จองโต๊ะ' },
      { href: '/events',      label: 'อีเวนต์' },
      { href: '/activities',  label: 'กิจกรรม' },
      { href: '/promotion',   label: 'โปรโมชัน' },
      { href: '/about',       label: 'เกี่ยวกับเรา' },
    ],
    visit: 'ที่ตั้ง',
    hours: 'เวลาเปิดทำการ',
    contact: 'ติดต่อ',
    address: '800 108 แสนสุข<br/>อำเภอเมือง จังหวัดชลบุรี 20130',
    hoursValue: 'เปิดทุกวัน (ยกเว้นวันพุธ) · 09:00-18:00',
  },
  zh: {
    language: '语言',
    navItems: [
      { href: '/',            label: '首页' },
      { href: '/menu',        label: '菜单' },
      { href: '/gallery',     label: '图库' },
      { href: '/reservation', label: '预订' },
      { href: '/events',      label: '活动' },
      { href: '/activities',  label: '水上活动' },
      { href: '/promotion',   label: '优惠' },
      { href: '/about',       label: '关于我们' },
    ],
    visit: '地址',
    hours: '营业时间',
    contact: '联系方式',
    address: '800 108 Saensuk<br/>Mueang Chonburi, Chonburi 20130',
    hoursValue: '每日营业（周三除外） · 09:00-18:00',
  },
}

export default function MenuOverlay({ isOpen, onClose }) {
  const { pathname } = useRouter()
  const { lang, setLang } = useLanguage()
  const dict = COPY[lang] || COPY.en
  return (
    <div className={`menu-overlay${isOpen ? ' is-open' : ''}`} aria-hidden={!isOpen}>
      {/* top bar */}
      <div className="shrink-0 px-4 py-3 sm:px-6 flex items-center justify-between border-b border-white/[0.08] gap-3">
        <Link href="/" onClick={onClose} className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/uploads/logo-8dc1f126.webp" alt="Love Pier" className="h-9 block" style={{ filter: 'invert(1) brightness(2) opacity(0.85)' }} />
        </Link>
        <button onClick={onClose} className="ml-auto bg-transparent border border-white/[0.15] w-9 h-9 flex items-center justify-center text-white/70 hover:border-white hover:text-white transition-colors shrink-0" aria-label="Close menu">✕</button>
      </div>

      {/* body */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 md:items-center px-6 py-6 sm:px-8 sm:py-8 md:px-8 lg:px-10 gap-6 md:gap-10 lg:gap-14 overflow-y-auto overscroll-contain">

        {/* nav links */}
        <nav className="flex flex-col gap-0.5 sm:gap-1">
          {dict.navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`group font-display font-light leading-[1.2] tracking-[-0.01em] flex items-baseline gap-3 py-1 transition-all duration-150 hover:translate-x-1 text-[clamp(16px,3vw,22px)] sm:text-[clamp(17px,2.5vw,24px)] ${
                pathname === item.href ? 'text-gold' : 'text-white/50 hover:text-white/90'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* info aside */}
        <aside className="flex flex-col gap-4 border-t border-white/[0.08] pt-5 md:border-t-0 md:border-l md:pt-0 md:pl-8 lg:pl-12">
          <div>
            <h4 className="text-[9px] tracking-[0.35em] uppercase text-white/35 mb-1.5">{dict.visit}</h4>
            <p className="text-[12px] text-white/65 leading-[1.75] font-light" dangerouslySetInnerHTML={{ __html: dict.address }} />
          </div>
          <div>
            <h4 className="text-[9px] tracking-[0.35em] uppercase text-white/35 mb-1.5">{dict.hours}</h4>
            <p className="text-[12px] text-white/65 leading-[1.75] font-light">{dict.hoursValue}</p>
          </div>
          <div>
            <h4 className="text-[9px] tracking-[0.35em] uppercase text-white/35 mb-2.5">{dict.contact}</h4>
            <div className="flex gap-2.5 flex-wrap">
              <a href="tel:0642523293" aria-label="Phone" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-gold hover:text-white transition-all duration-200">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
              </a>
              <a href="mailto:lovepier.cafe@gmail.com" aria-label="Email" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-gold hover:text-white transition-all duration-200">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>
              </a>
              <a href="https://lin.ee/5A0tfSQ" target="_blank" rel="noopener noreferrer" aria-label="LINE" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-gold hover:text-white transition-all duration-200">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 3C6.5 3 2 6.6 2 11c0 4 3.6 7.3 8.5 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6 1.5-1.7 2.6-3.4 2.6-4.9 0-4.4-4.5-8-10-8z"/></svg>
              </a>
              <a href="https://www.instagram.com/lovepiercafe/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-gold hover:text-white transition-all duration-200">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
            </div>
          </div>
        </aside>
      </div>

      {/* bottom */}
      <div className="shrink-0 px-4 py-3 sm:px-6 border-t border-white/[0.08] text-[9px] tracking-[0.2em] uppercase text-white/25">
        © 2026 Love Pier Beach Cafe
      </div>
    </div>
  )
}
