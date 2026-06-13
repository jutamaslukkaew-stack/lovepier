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
      <div className="mt-8 sm:mt-10 pt-5 border-t border-white/[0.08] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="text-[10px] tracking-[0.08em] sm:tracking-[0.2em] text-white/30 uppercase leading-relaxed break-words">{copy.rights}</div>
        <div className="font-display text-base font-light text-white/50 tracking-[0.2em]">{copy.brand}</div>
      </div>
    </footer>
  )
}
