import Link from 'next/link'
import { useRouter } from 'next/router'
import { LANG_OPTIONS } from '../lib/langOptions'
import { useLanguage } from '../lib/language'

const COPY = {
  en: {
    language: 'Language',
    navItems: [
      { href: '/',           label: 'Home' },
      { href: '/menu',       label: 'Menu' },
      { href: '/gallery',    label: 'Gallery' },
      { href: '/reservation',label: 'Reservation' },
      { href: '/events',     label: 'Events & Activities' },
      { href: '/promotion',  label: 'Promotion' },
      { href: '/about',      label: 'About Us' },
      { href: '/location',   label: 'Location' },
      { href: '/contact',    label: 'Contact' },
    ],
    visit: 'Visit',
    hours: 'Hours',
    contact: 'Contact',
    address: '800 108 Saensuk<br/>Mueang Chonburi, Chonburi 20130',
    hoursValue: 'Open daily (except Wed) · 09:00-18:00',
  },
  th: {
    language: 'ภาษา',
    navItems: [
      { href: '/',           label: 'หน้าหลัก' },
      { href: '/menu',       label: 'เมนู' },
      { href: '/gallery',    label: 'แกลเลอรี' },
      { href: '/reservation',label: 'จองโต๊ะ' },
      { href: '/events',     label: 'อีเวนต์และกิจกรรม' },
      { href: '/promotion',  label: 'โปรโมชัน' },
      { href: '/about',      label: 'เกี่ยวกับเรา' },
      { href: '/location',   label: 'ที่ตั้ง' },
      { href: '/contact',    label: 'ติดต่อ' },
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
      { href: '/',           label: '首页' },
      { href: '/menu',       label: '菜单' },
      { href: '/gallery',    label: '图库' },
      { href: '/reservation',label: '预订' },
      { href: '/events',     label: '活动与盛事' },
      { href: '/promotion',  label: '优惠' },
      { href: '/about',      label: '关于我们' },
      { href: '/location',   label: '地址' },
      { href: '/contact',    label: '联系' },
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
      <div className="shrink-0 px-4 py-3 sm:px-6 lg:px-10 lg:py-[14px] flex items-center justify-between border-b border-white/[0.08] gap-3">
        <Link href="/" onClick={onClose} className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/uploads/logo-8dc1f126.png" alt="Love Pier" className="h-9 sm:h-10 lg:h-11 block" style={{ filter: 'invert(1) brightness(2) opacity(0.85)' }} />
        </Link>
        <button onClick={onClose} className="ml-auto bg-transparent border border-white/[0.15] w-9 h-9 sm:w-[38px] sm:h-[38px] flex items-center justify-center text-white/70 text-lg hover:border-white hover:text-white transition-colors shrink-0" aria-label="Close menu">✕</button>
      </div>
      {/* body */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 md:items-stretch content-start md:content-center px-4 py-5 sm:px-6 sm:py-7 md:px-8 md:py-8 lg:px-10 lg:py-10 gap-6 sm:gap-8 md:gap-10 lg:gap-14 xl:gap-20 overflow-y-auto overscroll-contain">
        <nav className="flex min-w-0 flex-col gap-0 sm:gap-0.5 md:justify-center md:py-4">
          <div className="mb-6 pb-6 border-b border-white/[0.08]">
            <h4 className="text-[10px] tracking-[0.35em] uppercase text-white/40 mb-3">{dict.language}</h4>
            <div className="flex items-center border border-white/[0.2] w-fit">
              {LANG_OPTIONS.map(({ value, flag, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLang(value)}
                  aria-label={label}
                  aria-pressed={lang === value}
                  title={label}
                  className={`px-3 py-2 text-[20px] leading-none transition-colors cursor-pointer ${
                    lang === value
                      ? 'bg-white/95 shadow-[inset_0_-2px_0_0_#c9a84c]'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  {flag}
                </button>
              ))}
            </div>
          </div>
          {dict.navItems.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`font-display font-light leading-[1.05] tracking-[-0.02em] flex items-baseline gap-3 sm:gap-4 md:gap-5 transition-all duration-200 hover:text-bg hover:translate-x-1 sm:hover:translate-x-2 text-[clamp(26px,7.2vw,40px)] sm:text-[clamp(30px,5.5vw,48px)] lg:text-[clamp(34px,3.8vw,56px)] ${pathname === item.href ? 'text-gold' : 'text-white/45'}`}
            >
              <span className="font-sans text-[10px] sm:text-[11px] tracking-[0.2em] font-light text-white/30 -translate-y-1 sm:-translate-y-2 shrink-0">{String(i + 1).padStart(2, '0')}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <aside className="flex shrink-0 flex-col gap-5 border-t border-white/[0.08] pt-5 sm:gap-6 sm:pt-6 md:justify-center md:border-t-0 md:border-l md:pt-0 md:pl-8 lg:pl-12 xl:pl-16 md:gap-7">
          <div>
            <h4 className="text-[10px] tracking-[0.35em] uppercase text-white/40 mb-2.5">{dict.visit}</h4>
            <p className="text-[13px] text-white/70 leading-[1.8] font-light" dangerouslySetInnerHTML={{ __html: dict.address }} />
          </div>
          <div>
            <h4 className="text-[10px] tracking-[0.35em] uppercase text-white/40 mb-2.5">{dict.hours}</h4>
            <p className="text-[13px] text-white/70 leading-[1.8] font-light">{dict.hoursValue}</p>
          </div>
          <div>
            <h4 className="text-[10px] tracking-[0.35em] uppercase text-white/40 mb-2.5">{dict.contact}</h4>
            <p className="text-[13px] text-white/70 leading-[1.8] font-light">
              <a href="tel:0642523293" className="hover:text-gold transition-colors">064-252-3293</a><br/>
              <a href="mailto:cafe.lovepier@gmail.com" className="hover:text-gold transition-colors">cafe.lovepier@gmail.com</a>
            </p>
          </div>
        </aside>
      </div>
      {/* bottom */}
      <div className="shrink-0 px-4 py-4 sm:px-6 lg:px-10 lg:py-[18px] border-t border-white/[0.08] text-[10px] tracking-[0.2em] uppercase text-white/30">
        <div className="leading-relaxed">© 2026 Love Pier Beach Cafe</div>
      </div>
    </div>
  )
}
