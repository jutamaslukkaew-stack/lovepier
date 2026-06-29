import { useLanguage } from '../lib/language'
import { FOOTER_TAGLINE_DEFAULT, footerTaglineSizeClass } from '../lib/footerTagline'

export default function Footer({ tagline }) {
  const { lang } = useLanguage()
  const raw = tagline || FOOTER_TAGLINE_DEFAULT
  const html = raw.replace(/<em>/g, '<em class="italic text-gold">')
  const sizeClass = footerTaglineSizeClass(raw)
  const copy = lang === 'th'
    ? { rights: '© 2026 Love Pier Beach Cafe · สงวนลิขสิทธิ์', brand: 'เลิฟ เพียร์' }
    : lang === 'zh'
      ? { rights: '© 2026 Love Pier Beach Cafe · 版权所有', brand: 'Love Pier' }
      : { rights: '© 2026 Love Pier Beach Cafe · All Rights Reserved', brand: 'Love Pier' }
  return (
    <footer className="bg-ink px-4 pt-12 pb-8 overflow-hidden reveal sm:px-6 sm:pt-14 sm:pb-10 lg:px-10 lg:pt-16">
      <div
        className={`font-display font-light text-bg tracking-[-0.03em] leading-[0.9] whitespace-nowrap overflow-hidden max-w-full ${sizeClass}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {/* Contact & social icons */}
      <div className="mt-8 sm:mt-10 flex gap-3">
        <a href="tel:0642523293" aria-label="Phone" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:bg-gold hover:text-white transition-all duration-200">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
        </a>
        <a href="mailto:lovepier.cafe@gmail.com" aria-label="Email" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:bg-gold hover:text-white transition-all duration-200">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>
        </a>
        <a href="https://lin.ee/5A0tfSQ" target="_blank" rel="noopener noreferrer" aria-label="LINE" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:bg-gold hover:text-white transition-all duration-200">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 3C6.5 3 2 6.6 2 11c0 4 3.6 7.3 8.5 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6 1.5-1.7 2.6-3.4 2.6-4.9 0-4.4-4.5-8-10-8z"/></svg>
        </a>
        <a href="https://www.instagram.com/lovepiercafe/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:bg-gold hover:text-white transition-all duration-200">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
        </a>
        <a href="https://www.tiktok.com/@lovepier.cafe2?_r=1&_t=ZS-97V9HaUa8jE" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:bg-gold hover:text-white transition-all duration-200">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M16.6 5.8a4.3 4.3 0 0 1-2.6-1.6 4.3 4.3 0 0 1-.8-2.2h-3v12c0 1-.8 1.9-1.9 1.9a1.9 1.9 0 0 1-1.9-1.9c0-1 .8-1.9 1.9-1.9.2 0 .4 0 .6.1V9.1a5 5 0 0 0-.6 0 5 5 0 1 0 5 5V8.4a7.4 7.4 0 0 0 4.3 1.4V6.7a4.4 4.4 0 0 1-1-.9z"/></svg>
        </a>
      </div>
      <div className="mt-5 pt-5 border-t border-white/[0.08] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="text-[10px] tracking-[0.08em] sm:tracking-[0.2em] text-white/30 uppercase leading-relaxed break-words">{copy.rights}</div>
        <div className="font-display text-base font-light text-white/50 tracking-[0.2em]">{copy.brand}</div>
      </div>
    </footer>
  )
}
