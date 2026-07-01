import { and, asc, eq } from 'drizzle-orm'
import Head from 'next/head'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import Footer from '../components/Footer'
import { ScrollStack, ScrollStackPanel } from '../components/ScrollStack'
import { db } from '../lib/db'
import { categories, events as eventsTable, menuItems } from '../lib/db/schema'
import { useLanguage } from '../lib/language'

function getSrcSet(url) {
  if (!url || !url.includes('-960w.webp')) return undefined
  const base = url.replace('-960w.webp', '')
  return `${base}-480w.webp 480w, ${base}-960w.webp 960w, ${base}-1440w.webp 1440w`
}

function formatEventDate(dateStr, lang) {
  if (!dateStr) return { dateFull: '', year: '' }
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDate()
  const year = d.getFullYear()
  if (lang === 'th') {
    const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
    const weekdays = ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.']
    return { dateFull: `${weekdays[d.getDay()]} ${day} ${months[d.getMonth()]}`, year: String(year) }
  }
  if (lang === 'zh') {
    const weekdays = ['周日','周一','周二','周三','周四','周五','周六']
    return { dateFull: `${d.getMonth()+1}月${day}日 ${weekdays[d.getDay()]}`, year: String(year) }
  }
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  return { dateFull: `${weekdays[d.getDay()]} ${day} ${months[d.getMonth()]}`, year: String(year) }
}

// ── copy ──────────────────────────────────────────────────────────────────────
const COPY = {
  th: {
    title: 'Love Pier Beach Cafe — หน้าหลัก',
    city: 'chonburi . thailand',
    hoursLabel: 'เวลาเปิดทำการ',
    hoursValue: 'เปิดทุกวัน (ยกเว้นวันพุธ) 09:00-18:00',
    location: 'ที่ตั้ง',
    locationValue: '800 108 แสนสุข\nอำเภอเมือง จังหวัดชลบุรี 20130',
    exploreMenu: 'ดูเมนู',
    tagline: ['Beach Vibes,', 'Cafe by The Sea,', 'คาเฟ่บรรยากาศดีริมทะเล'],
    since: 'ตั้งแต่ปี 2026',
    about1: '<strong>LOVE PIER BEACH CAFE</strong> คาเฟ่ริมชายหาดบางแสน ที่อยากให้ทุกช่วงเวลาของคุณพิเศษกว่าที่เคย',
    about2: 'ที่นี่ไม่ใช่แค่คาเฟ่ริมทะเล แต่คือพื้นที่พักใจริมชายหาด สำหรับคนที่อยากหลบความวุ่นวาย มานั่งรับลม ฟังเสียงคลื่น และปล่อยเวลาให้เดินช้าลง ท่ามกลางบรรยากาศอบอุ่น โรแมนติก และวิวทะเลบางแสนที่สวยในแบบเรียบง่าย',
    about3: 'LOVE PIER BEACH CAFE ถูกออกแบบให้เป็นจุดนัดพบของความทรงจำ ไม่ว่าจะมานั่งจิบเครื่องดื่มแก้วโปรด ทานอาหารมื้อสบาย ๆ เก็บภาพกับมุมท่าเรือริมทะเล หรือใช้เวลาสนุกไปกับกิจกรรมกลางแจ้งริมชายหาด ทั้งเล่นเซิร์ฟ พายเรือ และกิจกรรมทางน้ำที่ทำให้วันพักผ่อนมีชีวิตชีวามากขึ้น',
    about4: 'ในช่วงเย็น แสงพระอาทิตย์ที่ค่อย ๆ ลับขอบฟ้า เสียงคลื่นเบา ๆ และลมทะเลที่พัดผ่าน จะทำให้ทุกมื้อธรรมดากลายเป็นช่วงเวลาที่น่าจดจำ เพราะบางครั้งความสุขก็ไม่ได้ต้องการอะไรมากไปกว่า วิวสวย ๆ เครื่องดื่มดี ๆ กิจกรรมสนุก ๆ และใครสักคนที่นั่งอยู่ข้างกัน<br /><br /><strong class="italic text-gold font-normal tracking-[0.12em]">LOVE PIER BEACH CAFE</strong> คาเฟ่ริมทะเลบางแสน สำหรับมื้อพิเศษ วันพักผ่อน กิจกรรมริมชายหาด และความทรงจำดี ๆ ของคุณ',
    address: 'ที่อยู่',
    addressValue: '800 108 แสนสุข\nอำเภอเมือง จังหวัดชลบุรี 20130',
    hoursCompact: 'เปิดทุกวัน (ยกเว้นวันพุธ) · 09:00-18:00',
    contact: 'ติดต่อ',
    follow: 'ติดตาม',
    openInMaps: 'เปิดใน Google Maps',
    // new sections
    galleryTitle: 'บรรยากาศ',
    gallerySub: 'ริมทะเล บางแสน',
    galleryMore: 'ดูแกลเลอรีทั้งหมด',
    drinksTitle: 'เครื่องดื่มแนะนำ',
    drinksSub: 'กาแฟ · มัทฉะ · อิตาเลียนโซดา',
    drinksMore: 'ดูเมนูเครื่องดื่มทั้งหมด',
    foodTitle: 'อาหารแนะนำ',
    foodSub: 'ข้าวมันไก่ · อาหารเช้า',
    foodMore: 'ดูเมนูอาหารทั้งหมด',
    sweetsTitle: 'ของหวาน',
    sweetsSub: 'เค้กและพายโฮมเมด',
    sweetsMore: 'ดูของหวานทั้งหมด',
    activitiesTitle: 'กิจกรรมทางน้ำ',
    activitiesSub: 'The Symphony Club · บางเสร่ ศรีราชา',
    activitiesMore: 'ดูราคาทั้งหมด',
    activitiesItems: [
      { name: 'Surf Pool', detail: 'บุคคล · 1 ชม.', price: '฿1,200' },
      { name: 'Kayak ธรรมดา', detail: '1 ชม.', price: '฿400' },
      { name: 'SUP Board', detail: '1 ชม.', price: '฿400' },
      { name: 'Jet Ski', detail: '1 ชม.', price: '฿3,700' },
    ],
    eventsTitle: 'อีเวนต์ที่กำลังจะมาถึง',
    eventsSub: 'กิจกรรมพิเศษประจำเดือน',
    eventsMore: 'ดูอีเวนต์ทั้งหมด',
    eventsItems: [
      {
        tag: 'The Symphony Club',
        title: 'Flow', titleEm: 'Sunset',
        date: 'ส. 27 มิ.ย. 2026 · 16:00–20:00',
        desc: 'Surf Pool · Skimboard · Kayak · SUP Board อาหาร เครื่องดื่ม และสินค้าพาร์ทเนอร์ตลอดงาน รับริสแบนด์และเครื่องดื่มกระป๋องฟรี 1 แก้ว',
        price: '฿500 / คน',
        img: '/uploads/events-flow-sunset.webp',
        images: [
          '/uploads/events-flow-sunset.webp',
          '/uploads/events-surf-pool.webp',
          '/uploads/events-skimboard.webp',
          '/uploads/events-kayak.webp',
          '/uploads/events-jet-ski.webp',
        ],
      },
    ],
  },
  en: {
    title: 'Love Pier Beach Cafe — Home',
    city: 'chonburi . thailand',
    hoursLabel: 'Hours',
    hoursValue: 'Open daily (except Wednesday) 09:00-18:00',
    location: 'Location',
    locationValue: '800 108 Saensuk\nMueang Chonburi, Chonburi 20130',
    exploreMenu: 'Explore Menu',
    tagline: ['Beach Vibes,', 'Cafe by The Sea,', 'Singapore Chicken Rice'],
    since: 'Since 2026',
    about1: 'Love Pier Cafe is a beachside cafe in Bangsaen where every meal feels more special.',
    about2: 'Enjoy <em class="italic text-gold">Singaporean and Hainanese chicken rice (original recipes)</em>, paired with signature drinks inspired by <em class="italic text-gold">Nong Mon khao lam</em>, reimagined with a softer, modern touch.',
    about3: 'Sit by the sea breeze, listen to the gentle waves, and capture memories at our romantic pier stretching out toward the water.',
    about4: 'Some beautiful moments only need great food, a favorite drink, and someone special to watch the sunset with<br />at <strong class="italic text-gold font-normal tracking-[0.12em]">LOVE PIER BEACH CAFE</strong>.',
    address: 'Address',
    addressValue: '800 108 Saensuk\nMueang Chonburi, Chonburi 20130',
    hoursCompact: 'Open daily (except Wednesday) · 09:00-18:00',
    contact: 'Contact',
    follow: 'Follow',
    openInMaps: 'Open in Google Maps',
    galleryTitle: 'Gallery',
    gallerySub: 'By the sea, Bangsaen',
    galleryMore: 'View full gallery',
    drinksTitle: 'Signature Drinks',
    drinksSub: 'Coffee · Matcha · Italian Soda',
    drinksMore: 'View all drinks',
    foodTitle: 'Recommended Food',
    foodSub: 'Chicken Rice · Breakfast All Day',
    foodMore: 'View full food menu',
    sweetsTitle: 'Sweet Desserts',
    sweetsSub: 'House-made cakes & pies',
    sweetsMore: 'View all desserts',
    activitiesTitle: 'Water Activities',
    activitiesSub: 'The Symphony Club · Bangsra, Sriracha',
    activitiesMore: 'View full pricing',
    activitiesItems: [
      { name: 'Surf Pool', detail: 'Individual · 1 hr', price: '฿1,200' },
      { name: 'Kayak', detail: '1 hr', price: '฿400' },
      { name: 'SUP Board', detail: '1 hr', price: '฿400' },
      { name: 'Jet Ski', detail: '1 hr', price: '฿3,700' },
    ],
    eventsTitle: 'Upcoming Events',
    eventsSub: 'Special monthly activities',
    eventsMore: 'View all events',
    eventsItems: [
      {
        tag: 'The Symphony Club',
        title: 'Flow', titleEm: 'Sunset',
        date: 'SAT 27 JUN 2026 · 16:00–20:00',
        desc: 'Surf Pool · Skimboard · Kayak · SUP Board. Free wristband and one canned drink.',
        price: '฿500 / person',
        img: '/uploads/events-flow-sunset.webp',
        images: ['/uploads/events-flow-sunset.webp','/uploads/events-surf-pool.webp','/uploads/events-skimboard.webp','/uploads/events-kayak.webp','/uploads/events-jet-ski.webp'],
      },
    ],
  },
  zh: {
    title: 'Love Pier Beach Cafe — 首页',
    city: 'chonburi . thailand',
    hoursLabel: '营业时间',
    hoursValue: '每日营业（周三除外） 09:00-18:00',
    location: '地址',
    locationValue: '800 108 Saensuk\nMueang Chonburi, Chonburi 20130',
    exploreMenu: '查看菜单',
    tagline: ['海边氛围,', '海边咖啡馆,', '新加坡鸡饭'],
    since: '自 2026 年起',
    about1: 'Love Pier Cafe 是邦盛海边的一家咖啡馆，让每一餐都比以往更特别。',
    about2: '品尝<em class="italic text-gold">"新加坡鸡饭与海南鸡饭（传统原味）"</em>，再搭配受<em class="italic text-gold">"农蒙竹筒糯米饭"</em>启发的招牌饮品，把邦盛在地风味以更细腻的方式重新呈现。',
    about3: '在温暖的海边氛围里吹着海风、听着轻柔浪声，也在通往海面的浪漫码头留下属于你的回忆。',
    about4: '有些美好时刻，其实只需要好食物、喜欢的那杯饮品，以及一起看夕阳的人。<br />就在 <strong class="italic text-gold font-normal tracking-[0.12em]">LOVE PIER BEACH CAFE</strong>。',
    address: '地址',
    addressValue: '800 108 Saensuk\nMueang Chonburi, Chonburi 20130',
    hoursCompact: '每日营业（周三除外） · 09:00-18:00',
    contact: '联系',
    follow: '关注我们',
    openInMaps: '在 Google 地图中打开',
    galleryTitle: '环境照片',
    gallerySub: '海边 · 邦盛',
    galleryMore: '查看全部图库',
    drinksTitle: '推荐饮品',
    drinksSub: '咖啡 · 抹茶 · 意式苏打',
    drinksMore: '查看全部饮品',
    foodTitle: '推荐餐食',
    foodSub: '鸡饭 · 全天早餐',
    foodMore: '查看全部餐食',
    sweetsTitle: '甜点',
    sweetsSub: '自制蛋糕与派点',
    sweetsMore: '查看全部甜点',
    activitiesTitle: '水上活动',
    activitiesSub: 'The Symphony Club · 邦斯拉，西拉查',
    activitiesMore: '查看全部价格',
    activitiesItems: [
      { name: 'Surf Pool 冲浪池', detail: '个人 · 1小时', price: '฿1,200' },
      { name: '皮划艇 Kayak', detail: '1小时', price: '฿400' },
      { name: 'SUP Board 立桨', detail: '1小时', price: '฿400' },
      { name: '摩托艇 Jet Ski', detail: '1小时', price: '฿3,700' },
    ],
    eventsTitle: '即将到来的活动',
    eventsSub: '每月特别活动',
    eventsMore: '查看全部活动',
    eventsItems: [
      {
        tag: 'The Symphony Club',
        title: 'Flow', titleEm: 'Sunset',
        date: '2026年6月27日（周六） 16:00–20:00',
        desc: 'Surf Pool · Skimboard · Kayak · SUP Board。免费腕带及一罐饮料。',
        price: '฿500 / 人',
        img: '/uploads/events-flow-sunset.webp',
        images: ['/uploads/events-flow-sunset.webp','/uploads/events-surf-pool.webp','/uploads/events-skimboard.webp','/uploads/events-kayak.webp','/uploads/events-jet-ski.webp'],
      },
    ],
  },
}

const GALLERY_PHOTOS = [
  { src: '/uploads/gallery-beach-terrace.webp', alt: 'beach terrace', wide: false },
  { src: '/uploads/gallery-sunset-sea.webp', alt: 'sunset sea', wide: true },
  { src: '/uploads/gallery-matcha-forest.webp', alt: 'matcha drink', wide: false },
  { src: '/uploads/gallery-interior-dining.webp', alt: 'interior dining', wide: true },
  { src: '/uploads/gallery-chicken-rice-plate.webp', alt: 'chicken rice', wide: false },
  { src: '/uploads/gallery-sunset-boat.webp', alt: 'sunset boat', wide: true },
  { src: '/uploads/gallery-latte-table.webp', alt: 'latte on table', wide: false },
  { src: '/uploads/gallery-beach-lawn.webp', alt: 'beach lawn', wide: true },
]

// ── components ────────────────────────────────────────────────────────────────
function SectionHeader({ title, sub, moreLabel, moreHref }) {
  return (
    <div className="mb-6 sm:mb-8">
      <h2 className="font-display font-light text-ink text-[clamp(28px,4vw,48px)] leading-none tracking-[-0.01em]">{title}</h2>
      <div className="flex items-center justify-between mt-2 gap-4">
        {sub ? <p className="text-[13px] tracking-[0.03em] text-muted leading-relaxed">{sub}</p> : <span />}
        {moreLabel && moreHref ? (
          <Link href={moreHref} className="shrink-0 text-[13px] tracking-[0.03em] text-gold hover:text-ink transition-colors whitespace-nowrap">
            {moreLabel} →
          </Link>
        ) : null}
      </div>
    </div>
  )
}

function MenuCard({ item, lang }) {
  const nameField = lang === 'th' ? 'nameTh' : lang === 'zh' ? 'nameZh' : 'nameEn'
  const name = item[nameField] || item.nameEn
  const price = item.price ? `฿${Number(item.price).toLocaleString()}` : ''
  const priceMax = item.priceMax ? `–฿${Number(item.priceMax).toLocaleString()}` : ''
  return (
    <div className="flex flex-col h-full group">
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt={name}
          loading="lazy"
          srcSet={getSrcSet(item.imageUrl)}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 25vw, 50vw"
          className="w-full aspect-[4/5] object-cover rounded-2xl [filter:saturate(0.75)] group-hover:[filter:saturate(1)] transition-[filter] duration-500"
        />
      ) : (
        <div className="w-full aspect-[4/5] bg-[#e8e4de] flex items-center justify-center">
          <span className="text-[#b0aa9e] text-xs tracking-widest uppercase">No image</span>
        </div>
      )}
      <div className="font-display text-[18px] sm:text-[20px] font-light text-ink leading-snug line-clamp-2 flex-1 mt-3">{name}</div>
      <div className="font-display text-[16px] text-gold mt-2">{price}{priceMax}</div>
    </div>
  )
}

// ── hero slideshow ────────────────────────────────────────────────────────────
const HERO_SLIDES = [
  { src: '/uploads/home-hero.webp', pos: '50% 40%' },
  { src: '/uploads/home-love-pier-exterior.webp', pos: '50% 50%' },
  { src: '/uploads/gallery-beach-terrace.webp', pos: '50% 50%' },
  { src: '/uploads/gallery-sunset-sea.webp', pos: '50% 60%' },
  { src: '/uploads/home-cafe-exterior.webp', pos: '50% 50%' },
]

function HeroSlideshow({ t, renderLines }) {
  const [current, setCurrent] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setCurrent((c) => (c + 1) % HERO_SLIDES.length)
        setFading(false)
      }, 600)
    }, 4500)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative w-full bg-[#e8e4de] reveal-img overflow-hidden aspect-[4/5] sm:aspect-[3/2] lg:aspect-[16/7]">
      {HERO_SLIDES.map((slide, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={slide.src}
          src={slide.src}
          alt="Love Pier Beach Cafe"
          loading={i === 0 ? 'eager' : 'lazy'}
          fetchPriority={i === 0 ? 'high' : 'auto'}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[600ms]"
          style={{
            objectPosition: slide.pos,
            filter: 'saturate(0.75)',
            opacity: i === current ? (fading ? 0 : 1) : 0,
            zIndex: i === current ? 1 : 0,
          }}
        />
      ))}
      {/* gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" style={{ zIndex: 2 }} />
      {/* text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4" style={{ zIndex: 3 }}>
        <div className="text-[10px] tracking-[0.45em] uppercase text-[rgba(245,243,239,0.7)] mb-4">{t.city}</div>
        <h1 className="font-display font-light text-[rgba(245,243,239,0.95)] tracking-[-0.02em] drop-shadow-[0_2px_16px_rgba(0,0,0,0.4)]">
          <span className="block leading-[0.95] text-[clamp(48px,9vw,110px)]">Love Pier</span>
          <span className="block leading-[1.2] text-[clamp(15px,2.6vw,32px)]">Beach Cafe</span>
        </h1>
      </div>
      {/* dot indicators */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-row gap-1.5" style={{ zIndex: 4 }}>
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { setFading(true); setTimeout(() => { setCurrent(i); setFading(false) }, 600) }}
            className="w-1.5 h-1.5 rounded-full transition-all duration-300 border-0 cursor-pointer"
            style={{ background: i === current ? 'rgba(245,243,239,0.9)' : 'rgba(245,243,239,0.35)' }}
          />
        ))}
      </div>
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────
export default function Home({ featuredDrinks, featuredFood, featuredSweets, dbEvents = [] }) {
  const { lang } = useLanguage()
  const t = COPY[lang] || COPY.en
  const [evLbImages, setEvLbImages] = useState(null) // array of image URLs
  const [evLbIdx, setEvLbIdx] = useState(0)
  const evTouchX = useRef(null)

  const renderLines = (text) => text.split('\n').map((line, idx, arr) => (
    <span key={`${line}-${idx}`}>{line}{idx < arr.length - 1 ? <br /> : null}</span>
  ))

  const titleKey = lang === 'th' ? 'titleTh' : lang === 'zh' ? 'titleZh' : 'titleEn'
  const descKey  = lang === 'th' ? 'descriptionTh' : lang === 'zh' ? 'descriptionZh' : 'descriptionEn'
  const perLabel = lang === 'th' ? 'คน' : lang === 'zh' ? '人' : 'person'
  const freeLabel = lang === 'th' ? 'ฟรี' : lang === 'zh' ? '免费' : 'Free'

  const activeEvents = dbEvents.filter((e) => e.isActive)
  const eventsItems = activeEvents.length > 0
    ? activeEvents.slice(0, 3).map((ev) => {
        const d = formatEventDate(ev.eventDate, lang)
        const fullTitle = ev[titleKey] || ev.titleEn
        const em = ev.titleEm || ''
        const titleMain = em && fullTitle.endsWith(em) ? fullTitle.slice(0, -em.length).trim() : fullTitle
        const dateStr = d.dateFull ? `${d.dateFull} ${d.year} · ${ev.timeRange}` : ev.timeRange
        const priceStr = ev.price != null ? `฿${ev.price.toLocaleString()} / ${perLabel}` : freeLabel
        return {
          tag: ev.location || 'Love Pier',
          title: titleMain,
          titleEm: em,
          date: dateStr,
          desc: ev[descKey] || ev.descriptionEn,
          price: priceStr,
          img: ev.imageUrl || '',
          images: ev.imageUrl ? [ev.imageUrl] : [],
        }
      })
    : t.eventsItems

  return (
    <>
      <Head>
        <title>{t.title}</title>
        <meta property="og:title" content="Love Pier Beach Cafe — คาเฟ่ริมทะเลบางแสน" />
        <meta property="og:description" content="Beach Vibes • Cafe by the Sea — บางแสน ชลบุรี" />
        <meta property="og:image" content="https://www.lovepier.cafe/og-home.png" />
        <meta property="og:url" content="https://www.lovepier.cafe/" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://www.lovepier.cafe/og-home.png" />
      </Head>

      <ScrollStack>

      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      <ScrollStackPanel>
        {/* Hero slideshow with text overlay */}
        <HeroSlideshow t={t} renderLines={renderLines} />

        {/* Tagline + About */}
        <div className="bg-[#e8e4de] px-8 sm:px-14 lg:px-20 py-16 sm:py-20 lg:py-28 border-b border-black/10">
          <div className="lg:grid lg:grid-cols-2 lg:gap-20 lg:items-start">
            {/* Left col: tagline + button */}
            <div className="lg:sticky lg:top-24">
              <h2 className="font-display font-light leading-[1.25] text-ink tracking-[-0.02em] text-[clamp(26px,3.8vw,54px)]">
                {t.tagline[0]}<br/>
                {t.tagline[1]}<br/>
                <em className="not-italic text-gold whitespace-nowrap">{t.tagline[2]}</em>
              </h2>
              <div className="mt-10 hidden lg:flex">
                <Link href="/menu" className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#4a3520] text-[rgba(245,243,239,0.95)] hover:bg-[#3a2818] transition-colors duration-200">
                  <span className="text-[13px] sm:text-[14px] tracking-[0.15em] uppercase font-light">
                    {lang === 'th' ? 'ดูเมนู อาหาร เครื่องดื่ม ขนม' : lang === 'zh' ? '查看菜单' : 'View Menu'}
                  </span>
                  <span className="text-base transition-transform duration-200 group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </div>
            {/* Right col: about text */}
            <div className="mt-10 lg:mt-0 text-sm leading-[1.9] text-[#555] font-light">
              <p className="mb-4" dangerouslySetInnerHTML={{ __html: t.about1 }} />
              <p dangerouslySetInnerHTML={{ __html: `${t.about2} ${t.about3} ${t.about4}` }} />
            </div>
          </div>
          {/* Button for mobile/tablet */}
          <div className="mt-10 flex justify-center lg:hidden">
            <Link href="/menu" className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#4a3520] text-[rgba(245,243,239,0.95)] hover:bg-[#3a2818] transition-colors duration-200">
              <span className="text-[13px] sm:text-[14px] tracking-[0.15em] uppercase font-light">
                {lang === 'th' ? 'ดูเมนู อาหาร เครื่องดื่ม ขนม' : lang === 'zh' ? '查看菜单' : 'View Menu'}
              </span>
              <span className="text-base transition-transform duration-200 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>

      </ScrollStackPanel>

      {/* ── 3. GALLERY STRIP ────────────────────────────────────────────── */}
      <ScrollStackPanel tone="white">
        <section className="py-10 sm:py-14 reveal border-t border-black/10">
          <div className="px-4 sm:px-6 lg:px-10 flex items-end justify-between mb-6">
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-gold mb-1">{t.gallerySub}</p>
              <h2 className="font-display font-light text-ink text-[clamp(28px,5vw,42px)] leading-none">{t.galleryTitle}</h2>
            </div>
            <Link href="/gallery" className="text-[11px] tracking-[0.2em] uppercase text-[#888] hover:text-ink transition-colors flex items-center gap-1.5 shrink-0">{t.galleryMore} →</Link>
          </div>
          {/* Horizontal scroll strip — snap per card */}
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth snap-x snap-mandatory -mx-0 px-4 sm:px-6 lg:px-10 pb-1">
            {GALLERY_PHOTOS.map(({ src, alt, wide }) => (
              // eslint-disable-next-line @next/next/no-img-element
              <div key={src} className={`shrink-0 snap-start overflow-hidden rounded-xl ${wide ? 'w-[72vw] sm:w-[52vw] lg:w-[38vw]' : 'w-[52vw] sm:w-[36vw] lg:w-[26vw]'}`}>
                <img
                  src={src}
                  alt={alt}
                  loading="lazy"
                  className="w-full h-[58vw] sm:h-[42vw] lg:h-[32vw] max-h-[480px] object-cover [filter:saturate(0.68)_contrast(1.02)] hover:[filter:saturate(1)_contrast(1)] transition-[filter] duration-700"
                />
              </div>
            ))}
          </div>
        </section>
      </ScrollStackPanel>

      {/* ── 4. DRINKS ───────────────────────────────────────────────────── */}
      <ScrollStackPanel>
        <section className="px-4 py-12 sm:px-6 lg:px-10 lg:py-16 reveal border-t border-black/10">
          <SectionHeader title={t.drinksTitle} sub={t.drinksSub} moreLabel={t.drinksMore} moreHref="/menu#menu-section-coffee" />
          {featuredDrinks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {featuredDrinks.map((item) => (
                <Link key={item.id} href="/menu#menu-section-coffee">
                  <MenuCard item={item} lang={lang} />
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      </ScrollStackPanel>

      {/* ── 5. FOOD ─────────────────────────────────────────────────────── */}
      <ScrollStackPanel tone="white">
        <section className="px-4 py-12 sm:px-6 lg:px-10 lg:py-16 reveal border-t border-black/10">
          <SectionHeader title={t.foodTitle} sub={t.foodSub} moreLabel={t.foodMore} moreHref="/menu#menu-section-food" />
          {featuredFood.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {featuredFood.map((item) => (
                <Link key={item.id} href="/menu#menu-section-food">
                  <MenuCard item={item} lang={lang} />
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      </ScrollStackPanel>

      {/* ── 6. SWEETS ───────────────────────────────────────────────────── */}
      <ScrollStackPanel>
        <section className="px-4 py-12 sm:px-6 lg:px-10 lg:py-16 reveal border-t border-black/10">
          <SectionHeader title={t.sweetsTitle} sub={t.sweetsSub} moreLabel={t.sweetsMore} moreHref="/menu#menu-section-sweets" />
          {featuredSweets.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {featuredSweets.map((item) => (
                <Link key={item.id} href="/menu#menu-section-sweets">
                  <MenuCard item={item} lang={lang} />
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      </ScrollStackPanel>

      {/* ── 7. ACTIVITIES ───────────────────────────────────────────────── */}
      <ScrollStackPanel tone="white">
        <section className="px-4 py-12 sm:px-6 lg:px-10 lg:py-16 reveal border-t border-black/10 bg-[#f5f1eb]">
          <SectionHeader title={t.activitiesTitle} sub={t.activitiesSub} moreLabel={t.activitiesMore} moreHref="/activities" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {t.activitiesItems.map((act) => (
              <div key={act.name} className="border border-black/10 bg-white px-4 py-5 flex flex-col gap-2">
                <span className="text-[11px] tracking-[0.1em] uppercase font-semibold text-ink leading-snug">{act.name}</span>
                <span className="text-[10px] text-muted">{act.detail}</span>
                <span className="font-display text-[18px] text-gold mt-auto">{act.price}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[
              { src: '/uploads/events-surf-pool.webp', alt: 'surf pool' },
              { src: '/uploads/events-kayak.webp', alt: 'kayak' },
              { src: '/uploads/events-skimboard.webp', alt: 'skimboard' },
              { src: '/uploads/events-jet-ski.webp', alt: 'jet ski' },
            ].map(({ src, alt }) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt={alt} loading="lazy" className="w-full aspect-square object-cover rounded-xl [filter:saturate(0.75)] hover:[filter:saturate(1)] transition-[filter] duration-500" />
            ))}
          </div>
        </section>
      </ScrollStackPanel>

      {/* ── 8. EVENTS ───────────────────────────────────────────────────── */}
      <ScrollStackPanel>
        <section className="px-4 py-12 sm:px-6 lg:px-10 lg:py-16 reveal border-t border-black/10">
          <SectionHeader title={t.eventsTitle} sub={t.eventsSub} moreLabel={t.eventsMore} moreHref="/events" />
          <div className="space-y-4">
            {eventsItems.map((ev) => (
              <div key={ev.title + ev.date} className="group grid grid-cols-1 sm:grid-cols-[300px_1fr] lg:grid-cols-[420px_1fr] gap-0 border border-black/10 overflow-hidden hover:border-black/25 transition-colors">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {ev.img && (
                  <div className="relative overflow-hidden">
                    <img
                      src={ev.img}
                      alt={ev.title}
                      loading="lazy"
                      srcSet={getSrcSet(ev.img)}
                      sizes="(min-width: 1024px) 420px, (min-width: 640px) 300px, 100vw"
                      onClick={() => { if (ev.images?.length) { setEvLbImages(ev.images); setEvLbIdx(0) } }}
                      className={`w-full h-48 sm:h-full object-cover [filter:saturate(0.72)] group-hover:[filter:saturate(1)] transition-[filter] duration-500 ${ev.images?.length ? 'cursor-zoom-in' : ''}`}
                    />
                    {ev.images?.length > 1 && (
                      <button
                        onClick={() => { setEvLbImages(ev.images); setEvLbIdx(0) }}
                        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white text-[13px] leading-none"
                      >⛶</button>
                    )}
                  </div>
                )}
                <div className="px-6 py-6 sm:py-8 flex flex-col gap-3">
                  <span className="text-[9px] tracking-[0.3em] uppercase text-gold font-semibold">{ev.tag}</span>
                  <h3 className="font-display font-light text-[clamp(28px,4vw,44px)] leading-none text-ink">
                    {ev.title} <em className="italic text-gold">{ev.titleEm}</em>
                  </h3>
                  <p className="text-[10px] tracking-[0.18em] uppercase text-muted">{ev.date}</p>
                  <p className="text-[13px] text-[#555] font-light leading-relaxed mt-1">{ev.desc}</p>
                  <div className="mt-auto pt-3 border-t border-black/10 flex items-center justify-between">
                    <span className="font-display text-[18px] text-gold">{ev.price}</span>
                    <Link href="/events" className="text-[10px] tracking-[0.2em] uppercase text-muted hover:text-ink transition-colors">More →</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </ScrollStackPanel>

      {/* ── 9. MAP + FOOTER ─────────────────────────────────────────────── */}
      <ScrollStackPanel>
        <div className="reveal border-t border-black/10 bg-bg px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-8 lg:gap-12 items-start">
            {/* Map */}
            <div className="relative overflow-hidden rounded-xl border border-black/10 bg-[#d9d7d1]" style={{ aspectRatio: '16/9' }}>
              <div className="absolute inset-0 opacity-55" style={{ backgroundImage:'linear-gradient(rgba(255,255,255,0.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.3) 1px,transparent 1px)', backgroundSize:'44px 44px' }}></div>
              <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.96 }} viewBox="0 0 1200 320" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="1200" height="320" fill="#d9d7d1" />
                <path d="M0 0 H430 C470 35, 472 82, 448 116 C430 143, 430 172, 448 201 C471 239, 468 287, 430 320 H0 Z" fill="#9fc4ce" />
                <path d="M430 0 C470 35, 472 82, 448 116 C430 143, 430 172, 448 201 C471 239, 468 287, 430 320" fill="none" stroke="#c9a96e" strokeWidth="10" opacity="0.36" />
                <path d="M160 -20 V360" stroke="#b8b1a8" strokeWidth="8" />
                <path d="M640 -20 V360" stroke="#b4ada4" strokeWidth="9" />
                <path d="M960 -20 V360" stroke="#b4ada4" strokeWidth="9" />
                <path d="M-20 86 H1220" stroke="#b9b2a9" strokeWidth="7" />
                <path d="M-20 214 H1220" stroke="#b9b2a9" strokeWidth="6" />
                <g stroke="#b2aca2" strokeWidth="4" fill="none" opacity="0.95">
                  <path d="M520 62 L580 62 L580 122 L700 122 L700 84 L760 84" />
                  <path d="M548 154 L618 154 L618 198 L710 198" />
                  <path d="M520 246 L606 246 L606 286 L742 286" />
                  <path d="M792 52 L842 52 L842 132 L932 132 L932 92 L1010 92" />
                  <path d="M794 176 L860 176 L860 236 L938 236 L938 270 L1032 270" />
                  <path d="M690 236 L732 236 L732 270 L780 270" />
                </g>
                <g stroke="#94bcc7" strokeWidth="4" fill="none" opacity="0.82">
                  <path d="M474 134 C512 150, 538 166, 560 188 C584 212, 604 238, 626 264" />
                  <path d="M516 106 C546 116, 572 132, 598 158" />
                </g>
                <g fontFamily="Jost, sans-serif" fontSize="11" letterSpacing="1" fill="#736e66" opacity="0.78">
                  <text x="72" y="52">GULF OF THAILAND</text>
                  <text x="742" y="58">SAENSUK ROAD</text>
                  <text x="986" y="166" transform="rotate(-90 986,166)">SUKHUMVIT ROAD</text>
                  <text x="700" y="304">MUEANG CHONBURI</text>
                </g>
              </svg>
              <a href="https://maps.app.goo.gl/CYDRrd6hoxRv7z4j8" target="_blank" rel="noopener noreferrer" aria-label="Open Love Pier Beach Cafe in Google Maps" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 group max-w-[90%]">
                <div className="w-5 h-5 rounded-full bg-ink group-hover:scale-110 transition-transform" style={{ boxShadow:'0 0 0 6px rgba(26,26,26,0.12),0 0 0 12px rgba(26,26,26,0.06)' }}></div>
                <div className="text-[10px] sm:text-[11px] tracking-[0.16em] sm:tracking-[0.2em] uppercase text-[#444] bg-[rgba(245,243,239,0.9)] px-3 py-1 group-hover:bg-[rgba(245,243,239,1)] transition-colors text-center">Love Pier Beach Cafe</div>
              </a>
            </div>

            {/* Info */}
            <div className="flex flex-col gap-6 lg:py-2">
              <div>
                <span className="block text-[9px] tracking-[0.35em] uppercase text-[#bbb] mb-2">{t.address}</span>
                <div className="text-[13px] text-[#444] leading-[1.7] font-light">{renderLines(t.addressValue)}</div>
              </div>
              <div>
                <span className="block text-[9px] tracking-[0.35em] uppercase text-[#bbb] mb-2">{t.hoursLabel}</span>
                <div className="text-[13px] text-[#444] leading-[1.7] font-light">{t.hoursCompact}</div>
              </div>
              <div>
                <span className="block text-[9px] tracking-[0.35em] uppercase text-[#bbb] mb-2">{t.contact}</span>
                <div className="text-[13px] text-[#444] leading-[1.7] font-light">
                  <a href="tel:0642523293" className="text-muted hover:text-ink transition-colors">064-252-3293</a><br/>
                  <a href="mailto:lovepier.cafe@gmail.com" className="text-muted hover:text-ink transition-colors break-all">lovepier.cafe@gmail.com</a>
                </div>
              </div>
              <div>
                <span className="block text-[9px] tracking-[0.35em] uppercase text-[#bbb] mb-2">{t.follow}</span>
                <div className="flex flex-col gap-2">
                  {[
                    { href: 'https://www.instagram.com/lovepiercafe/', label: 'Instagram', handle: 'lovepiercafe', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor"/></svg> },
                    { href: 'https://www.facebook.com/?locale=th_TH', label: 'Facebook', handle: 'lovepier.cafe', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.5h2.5l.5-3h-3V8.5c0-.9.3-1.5 1.6-1.5H17V4.3c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V10.5H8v3h2.5V21h3z"/></svg> },
                    { href: 'https://lin.ee/5A0tfSQ', label: 'LINE', handle: '@lovepier.cafe', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.5 3 2 6.6 2 11c0 4 3.6 7.3 8.5 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6 1.5-1.7 2.6-3.4 2.6-4.9 0-4.4-4.5-8-10-8z"/></svg> },
                    { href: 'https://www.tiktok.com/@lovepier.cafe2?_r=1&_t=ZS-97V9HaUa8jE', label: 'TikTok', handle: 'lovepier.cafe', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.8a4.3 4.3 0 0 1-2.6-1.6 4.3 4.3 0 0 1-.8-2.2h-3v12c0 1-.8 1.9-1.9 1.9a1.9 1.9 0 0 1-1.9-1.9c0-1 .8-1.9 1.9-1.9.2 0 .4 0 .6.1V9.1a5 5 0 0 0-.6 0 5 5 0 1 0 5 5V8.4a7.4 7.4 0 0 0 4.3 1.4V6.7a4.4 4.4 0 0 1-1-.9z"/></svg> },
                  ].map(({ href, label, handle, icon }) => (
                    <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="flex flex-row items-center gap-3 group">
                      <span className="text-muted border border-black/[0.12] p-2 hover:border-ink hover:text-ink hover:bg-ink group-hover:[&_svg]:text-bg transition-all flex items-center justify-center w-9 h-9 shrink-0">{icon}</span>
                      <span className="text-[13px] text-[#888] group-hover:text-ink transition-colors whitespace-nowrap">{handle}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </ScrollStackPanel>

      </ScrollStack>

      {/* Event image lightbox */}
      {evLbImages && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex flex-col bg-black" onClick={() => setEvLbImages(null)}>
          <button onClick={() => setEvLbImages(null)} className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white/80 hover:text-white text-xl leading-none">✕</button>
          <div
            className="relative flex-1 min-h-0 w-full"
            onClick={e => e.stopPropagation()}
            onTouchStart={e => { evTouchX.current = e.touches[0].clientX }}
            onTouchEnd={e => {
              if (evTouchX.current === null) return
              const dx = evTouchX.current - e.changedTouches[0].clientX
              if (dx > 45) setEvLbIdx(i => Math.min(i + 1, evLbImages.length - 1))
              else if (dx < -45) setEvLbIdx(i => Math.max(i - 1, 0))
              evTouchX.current = null
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={evLbImages[evLbIdx]} alt="" className="absolute inset-0 w-full h-full object-contain" />
            {evLbIdx > 0 && <button onClick={e => { e.stopPropagation(); setEvLbIdx(i => i - 1) }} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-black/35 hover:bg-black/55 text-white text-2xl">‹</button>}
            {evLbIdx < evLbImages.length - 1 && <button onClick={e => { e.stopPropagation(); setEvLbIdx(i => i + 1) }} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-black/35 hover:bg-black/55 text-white text-2xl">›</button>}
          </div>
          <div className="shrink-0 py-4 flex justify-center gap-1.5" onClick={e => e.stopPropagation()}>
            {evLbImages.map((_, i) => (
              <button key={i} onClick={() => setEvLbIdx(i)} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === evLbIdx ? 'bg-gold' : 'bg-white/30'}`} />
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// ── server-side data ──────────────────────────────────────────────────────────
export async function getServerSideProps() {
  const cats = await db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder))

  const allItems = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.isAvailable, true), eq(menuItems.isDeleted, false)))
    .orderBy(asc(menuItems.sortOrder))

  const catMap = Object.fromEntries(cats.map((c) => [c.slug, c.id]))

  const drinkIds = ['coffee', 'matcha', 'non-coffee'].map((s) => catMap[s]).filter(Boolean)
  const foodIds  = ['chicken-rice', 'breakfast'].map((s) => catMap[s]).filter(Boolean)
  const sweetIds = ['sweets'].map((s) => catMap[s]).filter(Boolean)

  const withImg = allItems.filter((i) => i.imageUrl)
  const pick = (ids, limit) =>
    withImg.filter((i) => ids.includes(i.categoryId)).slice(0, limit)

  const ser = (items) =>
    items.map((i) => ({
      id: i.id,
      nameTh: i.nameTh,
      nameEn: i.nameEn,
      nameZh: i.nameZh,
      price: i.price != null ? String(i.price) : null,
      priceMax: i.priceMax != null ? String(i.priceMax) : null,
      imageUrl: i.imageUrl,
      badge: i.badge,
      isFeatured: i.isFeatured,
    }))

  let dbEvents = []
  try {
    const evRows = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.isActive, true))
      .orderBy(asc(eventsTable.sortOrder))
    dbEvents = evRows.map((r) => ({
      ...r,
      eventDate: r.eventDate ?? null,
      createdAt: r.createdAt ? r.createdAt.toISOString() : null,
    }))
  } catch { /* fallback to empty */ }

  return {
    props: {
      featuredDrinks: ser(pick(drinkIds, 4)),
      featuredFood:   ser(pick(foodIds, 4)),
      featuredSweets: ser(pick(sweetIds, 4)),
      dbEvents,
    },
  }
}
