import Head from 'next/head'
import { useEffect, useRef, useState } from 'react'
import Footer from '../components/Footer'
import PageHero from '../components/PageHero'
import { FOOTER_TAGLINES } from '../lib/footerTagline'
import { useLanguage } from '../lib/language'

const TILE_SIZE = { col: 4, row: 2, mcol: 1, mrow: 1, layout: 'equal' }

const TILES = [
  {
    ...TILE_SIZE,
    id: 'sunset',
    cat: 'beach',
    pos: '52% 58%',
    src: '/uploads/gallery-sunset-sea.webp',
    cap: { th: 'พระอาทิตย์ตกริมทะเล', en: 'Sunset by the shore', zh: '海边日落' },
  },
  {
    ...TILE_SIZE,
    id: 'interior-dining',
    cat: 'interior',
    pos: '48% 42%',
    src: '/uploads/gallery-interior-dining.webp',
    cap: { th: 'โซนทานอาหาร', en: 'Dining area', zh: '用餐区' },
  },
  {
    ...TILE_SIZE,
    id: 'latte-table',
    cat: 'interior',
    pos: '38% 48%',
    src: '/uploads/gallery-latte-table.webp',
    cap: { th: 'ลาเต้อาร์ตริมทะเล', en: 'Latte art by the pier', zh: '码头拉花拿铁' },
  },
  {
    ...TILE_SIZE,
    id: 'golden-water',
    cat: 'beach',
    pos: '44% 38%',
    src: '/uploads/gallery-golden-water.webp',
    cap: { th: 'แสงทองบนผิวน้ำ', en: 'Golden light on the water', zh: '水面金光' },
  },
  {
    ...TILE_SIZE,
    id: 'beach-terrace',
    cat: 'beach',
    pos: '58% 32%',
    src: '/uploads/gallery-beach-terrace.webp',
    cap: { th: 'เทอเรซกลางแจ้ง', en: 'Outdoor terrace', zh: '户外露台' },
  },
  {
    ...TILE_SIZE,
    id: 'matcha-forest',
    cat: 'food',
    pos: '50% 28%',
    src: '/uploads/gallery-matcha-forest.webp',
    cap: { th: 'มัทฉะในสวนป่า', en: 'Matcha in the forest', zh: '森林抹茶' },
  },
  {
    ...TILE_SIZE,
    id: 'interior-moon-lamp',
    cat: 'interior',
    pos: '62% 22%',
    src: '/uploads/gallery-interior-moon-lamp.webp',
    cap: { th: 'โคมไฟดวงจันทร์', en: 'Moon lamp ceiling', zh: '月亮灯饰' },
  },
  {
    ...TILE_SIZE,
    id: 'matcha-moss',
    cat: 'food',
    pos: '34% 52%',
    src: '/uploads/gallery-matcha-moss.webp',
    cap: { th: 'มัทฉะช้าๆ กลางธรรมชาติ', en: 'Slow matcha, wild greens', zh: '自然里的抹茶' },
  },
  {
    ...TILE_SIZE,
    id: 'chicken-rice-plate',
    cat: 'food',
    pos: '46% 38%',
    src: '/uploads/gallery-chicken-rice-plate.webp',
    cap: { th: 'ข้าวมันไก่สูตรต้นตำรับ', en: 'Signature chicken rice', zh: '招牌鸡油饭' },
  },
  {
    ...TILE_SIZE,
    id: 'beach-lawn',
    cat: 'beach',
    pos: '50% 45%',
    src: '/uploads/gallery-beach-lawn.webp',
    cap: { th: 'สนามหญ้าริมทะเล', en: 'Beachside lawn', zh: '海边草坪' },
  },
  {
    ...TILE_SIZE,
    id: 'espresso-card',
    cat: 'food',
    pos: '50% 68%',
    src: '/uploads/gallery-espresso-card.webp',
    cap: { th: 'เอสเพรสโซ่ Love Pier', en: 'Love Pier espresso', zh: 'Love Pier 浓缩' },
  },
  {
    ...TILE_SIZE,
    id: 'can-latte',
    cat: 'food',
    pos: '42% 36%',
    src: '/uploads/gallery-can-latte.webp',
    cap: { th: 'กาแฟนมแคนสด', en: 'Iced latte in a can', zh: '罐装冰拿铁' },
  },
  {
    ...TILE_SIZE,
    id: 'matcha-can',
    cat: 'food',
    pos: '50% 32%',
    src: '/uploads/gallery-matcha-can.webp',
    cap: { th: 'มัทฉะแคนซิกเนเจอร์', en: 'Signature matcha can', zh: '招牌抹茶罐' },
  },
  {
    ...TILE_SIZE,
    id: 'beach-surf-signs',
    cat: 'beach',
    pos: '48% 50%',
    src: '/uploads/gallery-beach-surf-signs.webp',
    cap: { th: 'ริม Surf Pool', en: 'By the surf pool', zh: '冲浪池畔' },
  },
  {
    ...TILE_SIZE,
    id: 'can-citrus',
    cat: 'food',
    pos: '56% 44%',
    src: '/uploads/gallery-can-citrus.webp',
    cap: { th: 'คอฟฟี่ผสมส้ม', en: 'Citrus coffee blend', zh: '柑橘咖啡' },
  },
]

const FILTER_COPY = {
  th: [
    { label: 'ทั้งหมด', cat: null },
    { label: 'อาหารและเครื่องดื่ม', cat: 'food' },
    { label: 'ชายหาด', cat: 'beach' },
    { label: 'บรรยากาศร้าน', cat: 'interior' },
  ],
  zh: [
    { label: '全部', cat: null },
    { label: '餐饮', cat: 'food' },
    { label: '海边', cat: 'beach' },
    { label: '店内氛围', cat: 'interior' },
  ],
  en: [
    { label: 'All', cat: null },
    { label: 'Food & Drink', cat: 'food' },
    { label: 'Beach', cat: 'beach' },
    { label: 'Atmosphere', cat: 'interior' },
  ],
}

const PAGE_COPY = {
  th: {
    title: 'Gallery — Love Pier Beach Cafe',
    g: 'แกลเลอรี',
    h: 'ช่วงเวลา\nริมทะเล',
    d: 'บรรยากาศสุดพิเศษ - Love Pier Beach Cafe',
    share: 'ทุกภาพมีเรื่องราว',
    shareD: 'บันทึกช่วงเวลาดี ๆ แท็ก #lovepiercafe แบ่งปันความจำของคุณกับเรา',
  },
  zh: {
    title: 'Gallery — Love Pier Beach Cafe',
    g: '图库',
    h: '海边的\n日常片段',
    d: '咖啡、抹茶、金色波光与日落——Love Pier Beach Cafe 的真实瞬间。',
    share: '每张影像都有故事',
    shareD: '记录美好时刻，标记 #lovepiercafe，与我们分享您的回忆。',
  },
  en: {
    title: 'Gallery — Love Pier Beach Cafe',
    g: 'Gallery',
    h: 'Moments by\nthe shore',
    d: 'Coffee, matcha, golden water, and slow sunsets — captured at Love Pier Beach Cafe.',
    share: 'Every image has a story',
    shareD: 'Capture a good moment, tag #lovepiercafe, and share your memories with us.',
  },
}

function tileCaption(tile, lang) {
  return tile.cap[lang] || tile.cap.en
}

export default function Gallery() {
  const { lang } = useLanguage()
  const filters = FILTER_COPY[lang] || FILTER_COPY.en
  const t = PAGE_COPY[lang] || PAGE_COPY.en
  const [activeFilter, setActiveFilter] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const tabScrollRef = useRef(null)
  const [tabDotIndex, setTabDotIndex] = useState(0)
  const TAB_DOT_COUNT = filters.length
  useEffect(() => {
    const el = tabScrollRef.current
    if (!el) return
    const onScroll = () => {
      const ratio = el.scrollLeft / (el.scrollWidth - el.clientWidth || 1)
      setTabDotIndex(Math.round(ratio * (TAB_DOT_COUNT - 1)))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const filtered = activeFilter ? TILES.filter((tile) => tile.cat === activeFilter) : TILES
  const visible = showAll ? filtered : filtered.slice(0, 6)
  const hasMore = filtered.length > 6 && !showAll

  const SHOW_MORE = { th: 'ดูรูปทั้งหมด', en: 'See all photos', zh: '查看全部' }
  const showMoreLabel = SHOW_MORE[lang] || SHOW_MORE.en

  return (
    <>
      <Head>
        <title>{t.title}</title>
        <meta property="og:title" content="แกลเลอรี — Love Pier Beach Cafe" />
        <meta property="og:description" content="มุมถ่ายรูปปริมทะเล บรรยากาศดีทุกช่วงเวลา" />
        <meta property="og:image" content="https://www.lovepier.cafe/og-gallery.png" />
        <meta property="og:url" content="https://www.lovepier.cafe/gallery" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://www.lovepier.cafe/og-gallery.png" />
      </Head>

      <PageHero title={t.h.replace('\n', ' ')} />

      <div className="sticky top-[var(--nav-h,64px)] z-50 w-full bg-[#f5f2ee] border-b border-black/10">
        <div className="relative">
          <div ref={tabScrollRef} className="flex justify-center overflow-x-auto gap-2 px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filters.map(({ label, cat }) => (
              <button
                key={label}
                type="button"
                onClick={() => { setActiveFilter(cat); setShowAll(false) }}
                className={`shrink-0 px-4 py-1.5 rounded-full text-[11px] sm:text-xs tracking-[0.1em] uppercase font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  activeFilter === cat
                    ? 'bg-[#4a3520] text-white border-[#4a3520]'
                    : 'bg-[#4a3520]/[0.07] text-[#4a3520]/70 border-transparent hover:bg-[#4a3520]/15 hover:text-[#4a3520]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="lg:hidden pointer-events-none absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-[#f5f2ee] to-transparent" />
        </div>
        <div className="flex justify-center gap-1.5 pb-2">
          {Array.from({ length: TAB_DOT_COUNT }).map((_, i) => (
            <span key={i} className={`block rounded-full transition-all duration-300 ${i === tabDotIndex ? 'w-4 h-1.5 bg-[#4a3520]' : 'w-1.5 h-1.5 bg-[#4a3520]/30'}`} />
          ))}
        </div>
      </div>

      <div className="gallery-grid gallery-grid--equal reveal">
        {visible.map((tile) => (
          <div
            key={tile.id}
            className={`g-tile gallery-item gallery-item--${tile.layout}`}
            style={{
              '--col': tile.col,
              '--row': tile.row,
              '--mcol': tile.mcol,
              '--mrow': tile.mrow,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tile.src}
              alt={tileCaption(tile, lang)}
              style={{ objectPosition: tile.pos }}
            />
            <div className="g-tile-caption">{tileCaption(tile, lang)}</div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center py-10">
          <button
            onClick={() => setShowAll(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-full border border-[#4a3520]/30 text-[#4a3520] text-[12px] tracking-[0.15em] uppercase font-semibold hover:bg-[#4a3520] hover:text-white transition-all"
          >
            {showMoreLabel}
            <span className="text-base">↓</span>
          </button>
        </div>
      )}

      <section className="bg-ink text-bg px-4 py-14 text-center reveal sm:px-6 sm:py-14 lg:px-10 lg:py-20">
        <h2 className="font-display font-light mb-7 leading-[1.05] text-[clamp(40px,5vw,64px)]">{t.share}</h2>
        <p className="text-sm text-[rgba(245,243,239,0.6)] mb-8 max-w-[480px] mx-auto leading-[1.8]">{t.shareD}</p>
        <a
          href="https://www.instagram.com/lovepiercafe/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-gold text-ink text-[11px] tracking-[0.25em] uppercase px-7 py-3.5 hover:bg-bg transition-colors duration-300"
        >
          @lovepiercafe
        </a>
      </section>

      <Footer tagline={FOOTER_TAGLINES.gallery} />
    </>
  )
}
