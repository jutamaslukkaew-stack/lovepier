import Head from 'next/head'
import { useState } from 'react'
import Footer from '../components/Footer'
import { FOOTER_TAGLINES } from '../lib/footerTagline'
import { useLanguage } from '../lib/language'

const TILE_SIZE = { col: 4, row: 2, mcol: 1, mrow: 1, layout: 'equal' }

const TILES = [
  {
    ...TILE_SIZE,
    id: 'sunset',
    cat: 'beach',
    pos: '52% 58%',
    src: '/uploads/gallery-sunset-sea.png',
    cap: { th: 'พระอาทิตย์ตกริมทะเล', en: 'Sunset by the shore', zh: '海边日落' },
  },
  {
    ...TILE_SIZE,
    id: 'interior-dining',
    cat: 'interior',
    pos: '48% 42%',
    src: '/uploads/gallery-interior-dining.png',
    cap: { th: 'โซนทานอาหาร', en: 'Dining area', zh: '用餐区' },
  },
  {
    ...TILE_SIZE,
    id: 'latte-table',
    cat: 'interior',
    pos: '38% 48%',
    src: '/uploads/gallery-latte-table.png',
    cap: { th: 'ลาเต้อาร์ตริมทะเล', en: 'Latte art by the pier', zh: '码头拉花拿铁' },
  },
  {
    ...TILE_SIZE,
    id: 'golden-water',
    cat: 'beach',
    pos: '44% 38%',
    src: '/uploads/gallery-golden-water.png',
    cap: { th: 'แสงทองบนผิวน้ำ', en: 'Golden light on the water', zh: '水面金光' },
  },
  {
    ...TILE_SIZE,
    id: 'beach-terrace',
    cat: 'beach',
    pos: '58% 32%',
    src: '/uploads/gallery-beach-terrace.png',
    cap: { th: 'เทอเรซกลางแจ้ง', en: 'Outdoor terrace', zh: '户外露台' },
  },
  {
    ...TILE_SIZE,
    id: 'matcha-forest',
    cat: 'food',
    pos: '50% 28%',
    src: '/uploads/gallery-matcha-forest.png',
    cap: { th: 'มัทฉะในสวนป่า', en: 'Matcha in the forest', zh: '森林抹茶' },
  },
  {
    ...TILE_SIZE,
    id: 'interior-moon-lamp',
    cat: 'interior',
    pos: '62% 22%',
    src: '/uploads/gallery-interior-moon-lamp.png',
    cap: { th: 'โคมไฟดวงจันทร์', en: 'Moon lamp ceiling', zh: '月亮灯饰' },
  },
  {
    ...TILE_SIZE,
    id: 'matcha-moss',
    cat: 'food',
    pos: '34% 52%',
    src: '/uploads/gallery-matcha-moss.png',
    cap: { th: 'มัทฉะช้าๆ กลางธรรมชาติ', en: 'Slow matcha, wild greens', zh: '自然里的抹茶' },
  },
  {
    ...TILE_SIZE,
    id: 'chicken-rice-plate',
    cat: 'food',
    pos: '46% 38%',
    src: '/uploads/gallery-chicken-rice-plate.png',
    cap: { th: 'ข้าวมันไก่สูตรต้นตำรับ', en: 'Signature chicken rice', zh: '招牌鸡油饭' },
  },
  {
    ...TILE_SIZE,
    id: 'beach-lawn',
    cat: 'beach',
    pos: '50% 45%',
    src: '/uploads/gallery-beach-lawn.png',
    cap: { th: 'สนามหญ้าริมทะเล', en: 'Beachside lawn', zh: '海边草坪' },
  },
  {
    ...TILE_SIZE,
    id: 'espresso-card',
    cat: 'food',
    pos: '50% 68%',
    src: '/uploads/gallery-espresso-card.png',
    cap: { th: 'เอสเพรสโซ่ Love Pier', en: 'Love Pier espresso', zh: 'Love Pier 浓缩' },
  },
  {
    ...TILE_SIZE,
    id: 'can-latte',
    cat: 'food',
    pos: '42% 36%',
    src: '/uploads/gallery-can-latte.png',
    cap: { th: 'กาแฟนมแคนสด', en: 'Iced latte in a can', zh: '罐装冰拿铁' },
  },
  {
    ...TILE_SIZE,
    id: 'matcha-can',
    cat: 'food',
    pos: '50% 32%',
    src: '/uploads/gallery-matcha-can.png',
    cap: { th: 'มัทฉะแคนซิกเนเจอร์', en: 'Signature matcha can', zh: '招牌抹茶罐' },
  },
  {
    ...TILE_SIZE,
    id: 'beach-surf-signs',
    cat: 'beach',
    pos: '48% 50%',
    src: '/uploads/gallery-beach-surf-signs.png',
    cap: { th: 'ริม Surf Pool', en: 'By the surf pool', zh: '冲浪池畔' },
  },
  {
    ...TILE_SIZE,
    id: 'can-citrus',
    cat: 'food',
    pos: '56% 44%',
    src: '/uploads/gallery-can-citrus.png',
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

  const visible = activeFilter ? TILES.filter((tile) => tile.cat === activeFilter) : TILES

  return (
    <>
      <Head>
        <title>{t.title}</title>
      </Head>

      <header className="px-4 pt-12 pb-8 text-center border-b border-black/10 reveal sm:px-6 lg:px-10 lg:pt-16 lg:pb-10">
        <div className="text-[10px] tracking-[0.4em] uppercase text-muted mb-3">{t.g}</div>
        <h1 className="font-display font-light leading-[0.95] text-ink tracking-[-0.02em] text-[clamp(48px,7vw,88px)]">
          {t.h.split('\n').map((l, i) => (
            <span key={i}>
              {l}
              {i === 0 ? <br /> : null}
            </span>
          ))}
        </h1>
        <p className="mt-4 text-sm text-[#666] font-light max-w-[580px] mx-auto leading-[1.8]">{t.d}</p>
      </header>

      <div className="flex gap-4 lg:gap-6 px-4 py-5 lg:py-8 border-b border-black/10 bg-bg flex-wrap reveal sm:px-6 sm:gap-3.5">
        {filters.map(({ label, cat }) => (
          <button
            key={label}
            type="button"
            onClick={() => setActiveFilter(cat)}
            className={`text-[11px] tracking-[0.25em] uppercase bg-transparent border-none px-0 py-1.5 border-b-2 cursor-pointer transition-colors ${
              activeFilter === cat ? 'text-ink border-gold' : 'text-[#aaa] border-transparent hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
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

      <section className="bg-ink text-bg px-4 py-14 text-center reveal sm:px-6 sm:py-14 lg:px-10 lg:py-20">
        <h2 className="font-display font-light mb-7 leading-[1.05] text-[clamp(40px,5vw,64px)]">{t.share}</h2>
        <p className="text-sm text-[rgba(245,243,239,0.6)] mb-8 max-w-[480px] mx-auto leading-[1.8]">{t.shareD}</p>
        <a
          href="https://www.instagram.com/lovepier.cafe"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-gold text-ink text-[11px] tracking-[0.25em] uppercase px-7 py-3.5 hover:bg-bg transition-colors duration-300"
        >
          @lovepier.cafe
        </a>
      </section>

      <Footer tagline={FOOTER_TAGLINES.gallery} />
    </>
  )
}
