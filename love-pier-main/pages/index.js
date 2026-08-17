import { and, asc, eq } from 'drizzle-orm'
import Head from 'next/head'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import Footer from '../components/Footer'
import EventCard from '../components/events/EventCard'
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
    tagline: ['Beach Vibes,', 'Cafe by The Sea,', 'คาเฟ่บรรยากาศดีริมทะเล'],
    about1: '<strong>LOVE PIER BEACH CAFE</strong> คาเฟ่ริมชายหาดบางแสน ที่อยากให้ทุกช่วงเวลาของคุณพิเศษกว่าที่เคย',
    about2: 'ที่นี่ไม่ใช่แค่คาเฟ่ริมทะเล แต่คือพื้นที่พักใจริมชายหาด สำหรับคนที่อยากหลบความวุ่นวาย มานั่งรับลม ฟังเสียงคลื่น และปล่อยเวลาให้เดินช้าลง ท่ามกลางบรรยากาศอบอุ่น โรแมนติก และวิวทะเลบางแสนที่สวยในแบบเรียบง่าย',
    about3: 'LOVE PIER BEACH CAFE ถูกออกแบบให้เป็นจุดนัดพบของความทรงจำ ไม่ว่าจะมานั่งจิบเครื่องดื่มแก้วโปรด ทานอาหารมื้อสบาย ๆ เก็บภาพกับมุมท่าเรือริมทะเล หรือใช้เวลาสนุกไปกับกิจกรรมกลางแจ้งริมชายหาด ทั้งเล่นเซิร์ฟ พายเรือ และกิจกรรมทางน้ำที่ทำให้วันพักผ่อนมีชีวิตชีวามากขึ้น',
    about4: 'ในช่วงเย็น แสงพระอาทิตย์ที่ค่อย ๆ ลับขอบฟ้า เสียงคลื่นเบา ๆ และลมทะเลที่พัดผ่าน จะทำให้ทุกมื้อธรรมดากลายเป็นช่วงเวลาที่น่าจดจำ เพราะบางครั้งความสุขก็ไม่ได้ต้องการอะไรมากไปกว่า วิวสวย ๆ เครื่องดื่มดี ๆ กิจกรรมสนุก ๆ และใครสักคนที่นั่งอยู่ข้างกัน<br /><br /><strong class="italic text-gold-deep font-normal tracking-[0.12em]">LOVE PIER BEACH CAFE</strong> คาเฟ่ริมทะเลบางแสน สำหรับมื้อพิเศษ วันพักผ่อน กิจกรรมริมชายหาด และความทรงจำดี ๆ ของคุณ',
    address: 'ที่อยู่',
    addressValue: '800 108 แสนสุข\nอำเภอเมือง จังหวัดชลบุรี 20130',
    hoursCompact: 'เปิดทุกวัน (ยกเว้นวันพุธ) · 09:00-18:00',
    contact: 'ติดต่อ',
    follow: 'ติดตาม',
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
    eventsEmpty: 'ยังไม่มีอีเวนต์ที่กำลังจะมาถึง',
    eventsEmptySub: 'อีเวนต์รอบใหม่จะขึ้นที่นี่ทันทีที่ประกาศ — ระหว่างนี้ดูอีเวนต์ที่ผ่านมาได้',
    rewardsEyebrow: 'LOVE PIER REWARDS',
    rewardsTitle: 'อิ่มอร่อยทุกครั้ง ได้แต้มกลับไปทุกมื้อ',
    rewardsIntro: 'เพิ่มเพื่อน LINE Official ของร้านก่อนสั่งซื้อ เพื่อเริ่มสะสมคะแนนและรับส่วนลดเพิ่มจากโปรโมชันอื่นได้',
    rewardsSpend: 'ทุกยอดใช้จ่าย',
    rewardsPoints: 'รับทันที',
    rewardsValue: 'ใช้ลดได้',
    rewardsSpendValue: '100 บาท',
    rewardsPointsValue: '5 คะแนน',
    rewardsValueValue: '5 บาท',
    rewardsNote: '1 คะแนน = ส่วนลด 1 บาท · คะแนนใช้เป็นส่วนลด On Top ในออเดอร์ถัดไปได้',
    rewardsCta: 'เพิ่ม LINE ร้าน · รับแต้ม',
    rewardsCtaNote: 'เพิ่มเพื่อนแล้วเข้าสู่ระบบ LINE ตอนสั่งซื้อ เพื่อให้คะแนนเข้าบัญชีของคุณ',
  },
  en: {
    title: 'Love Pier Beach Cafe — Home',
    city: 'chonburi . thailand',
    hoursLabel: 'Hours',
    tagline: ['Beach Vibes,', 'Cafe by The Sea,', 'Singapore Chicken Rice'],
    about1: 'Love Pier Cafe is a beachside cafe in Bangsaen where every meal feels more special.',
    about2: 'Enjoy <em class="italic text-gold-deep">Singaporean and Hainanese chicken rice (original recipes)</em>, paired with signature drinks inspired by <em class="italic text-gold-deep">Nong Mon khao lam</em>, reimagined with a softer, modern touch.',
    about3: 'Sit by the sea breeze, listen to the gentle waves, and capture memories at our romantic pier stretching out toward the water.',
    about4: 'Some beautiful moments only need great food, a favorite drink, and someone special to watch the sunset with<br />at <strong class="italic text-gold-deep font-normal tracking-[0.12em]">LOVE PIER BEACH CAFE</strong>.',
    address: 'Address',
    addressValue: '800 108 Saensuk\nMueang Chonburi, Chonburi 20130',
    hoursCompact: 'Open daily (except Wednesday) · 09:00-18:00',
    contact: 'Contact',
    follow: 'Follow',
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
    eventsEmpty: 'No upcoming events yet',
    eventsEmptySub: 'The next one appears here as soon as it is announced — meanwhile, browse past events.',
    rewardsEyebrow: 'LOVE PIER REWARDS',
    rewardsTitle: 'Every visit tastes better with rewards',
    rewardsIntro: 'Add our LINE Official account before ordering to collect points and stack your reward with other promotions.',
    rewardsSpend: 'Every spend',
    rewardsPoints: 'Earn',
    rewardsValue: 'Redeem for',
    rewardsSpendValue: '฿100',
    rewardsPointsValue: '5 points',
    rewardsValueValue: '฿5 off',
    rewardsNote: '1 point = ฿1 discount · Redeem as an on-top discount on your next order',
    rewardsCta: 'Add LINE · Get points',
    rewardsCtaNote: 'Add us, then sign in with LINE when ordering so points reach your account.',
  },
  zh: {
    title: 'Love Pier Beach Cafe — 首页',
    city: 'chonburi . thailand',
    hoursLabel: '营业时间',
    tagline: ['海边氛围,', '海边咖啡馆,', '新加坡鸡饭'],
    about1: 'Love Pier Cafe 是邦盛海边的一家咖啡馆，让每一餐都比以往更特别。',
    about2: '品尝<em class="italic text-gold-deep">"新加坡鸡饭与海南鸡饭（传统原味）"</em>，再搭配受<em class="italic text-gold-deep">"农蒙竹筒糯米饭"</em>启发的招牌饮品，把邦盛在地风味以更细腻的方式重新呈现。',
    about3: '在温暖的海边氛围里吹着海风、听着轻柔浪声，也在通往海面的浪漫码头留下属于你的回忆。',
    about4: '有些美好时刻，其实只需要好食物、喜欢的那杯饮品，以及一起看夕阳的人。<br />就在 <strong class="italic text-gold-deep font-normal tracking-[0.12em]">LOVE PIER BEACH CAFE</strong>。',
    address: '地址',
    addressValue: '800 108 Saensuk\nMueang Chonburi, Chonburi 20130',
    hoursCompact: '每日营业（周三除外） · 09:00-18:00',
    contact: '联系',
    follow: '关注我们',
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
    eventsEmpty: '暂无即将到来的活动',
    eventsEmptySub: '新活动一经公布就会显示在这里 — 期间可查看过往活动。',
    rewardsEyebrow: 'LOVE PIER REWARDS',
    rewardsTitle: '每次消费，都有积分回馈',
    rewardsIntro: '下单前添加本店 LINE 官方账号，即可累积积分，并与其他优惠叠加使用。',
    rewardsSpend: '每消费',
    rewardsPoints: '立即获得',
    rewardsValue: '可抵扣',
    rewardsSpendValue: '฿100',
    rewardsPointsValue: '5 积分',
    rewardsValueValue: '฿5',
    rewardsNote: '1 积分 = ฿1 优惠 · 下次订单可作为额外折扣使用',
    rewardsCta: '添加 LINE · 领取积分',
    rewardsCtaNote: '添加好友后，下单时使用 LINE 登录，积分将自动存入您的账户。',
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
        {sub ? <p className="text-[13px] tracking-[0.03em] text-muted-strong leading-relaxed">{sub}</p> : <span />}
        {moreLabel && moreHref ? (
          <Link
            href={moreHref}
            className="shrink-0 inline-flex items-center min-h-[24px] text-[13px] tracking-[0.03em] text-gold-deep hover:text-ink transition-colors whitespace-nowrap rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a3520]"
          >
            {moreLabel} <span aria-hidden="true" className="ml-1">→</span>
          </Link>
        ) : null}
      </div>
    </div>
  )
}

// Drinks / food / sweets are the same section three times over. Rendering them
// from one definition also means the empty case is handled once: when the query
// returns nothing the whole panel is dropped, rather than leaving a heading and
// a "view all" link stranded above an empty grid.
function MenuHighlights({ items, lang, href, title, sub, moreLabel, tone }) {
  if (!items || items.length === 0) return null
  return (
    <ScrollStackPanel tone={tone}>
      <section className="px-4 py-12 sm:px-6 lg:px-10 lg:py-16 reveal border-t border-black/10">
        <SectionHeader title={title} sub={sub} moreLabel={moreLabel} moreHref={href} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {items.map((item) => (
            <Link
              key={item.id}
              href={href}
              className="rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4a3520]"
            >
              <MenuCard item={item} lang={lang} />
            </Link>
          ))}
        </div>
      </section>
    </ScrollStackPanel>
  )
}

// One CTA rendered in two places (beside the tagline on desktop, after the copy
// on narrow screens) — kept as a single definition so the two never drift.
function MenuCta({ lang }) {
  return (
    <Link
      href="/menu"
      className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#4a3520] text-[rgba(245,243,239,0.95)] hover:bg-[#3a2818] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a3520]"
    >
      <span className="text-[13px] sm:text-[14px] tracking-[0.15em] uppercase font-light">
        {lang === 'th' ? 'ดูเมนู อาหาร เครื่องดื่ม ขนม' : lang === 'zh' ? '查看菜单' : 'View Menu'}
      </span>
      <span aria-hidden="true" className="text-base transition-transform duration-200 group-hover:translate-x-1">→</span>
    </Link>
  )
}

function RewardsSection({ t }) {
  const rewards = [
    { label: t.rewardsSpend, value: t.rewardsSpendValue },
    { label: t.rewardsPoints, value: t.rewardsPointsValue },
    { label: t.rewardsValue, value: t.rewardsValueValue },
  ]

  return (
    <ScrollStackPanel tone="white">
      <section id="rewards" className="relative scroll-mt-32 overflow-hidden border-t border-black/10 bg-[#f5f1eb] px-4 py-14 sm:px-8 sm:py-20 lg:px-14 lg:py-24 reveal">
        <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-[#b18a54]/20" />
        <div aria-hidden="true" className="absolute -right-10 -top-10 h-44 w-44 rounded-full border border-[#b18a54]/25" />
        <div className="relative mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] lg:items-center lg:gap-16">
            <div>
              <p className="mb-4 text-[10px] font-semibold tracking-[0.32em] text-gold-deep">{t.rewardsEyebrow}</p>
              <h2 className="max-w-3xl font-display text-[clamp(34px,5vw,66px)] font-light leading-[1.05] tracking-[-0.02em] text-ink">{t.rewardsTitle}</h2>
              <p className="mt-5 max-w-2xl text-[14px] font-light leading-[1.9] text-[#555] sm:text-[15px]">{t.rewardsIntro}</p>

              <div className="mt-9 grid grid-cols-3 overflow-hidden rounded-2xl border border-black/10 bg-white/70">
                {rewards.map((item, index) => (
                  <div key={item.label} className={`px-3 py-5 sm:px-6 sm:py-7 ${index ? 'border-l border-black/10' : ''}`}>
                    <span className="block text-[9px] uppercase tracking-[0.16em] text-muted-strong sm:text-[10px]">{item.label}</span>
                    <strong className="mt-2 block font-display text-[clamp(19px,3.2vw,34px)] font-normal leading-none text-gold-deep">{item.value}</strong>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-muted-strong sm:text-[12px]">{t.rewardsNote}</p>
            </div>

            <div className="rounded-[28px] border border-black/10 bg-[#fffdf8] p-6 shadow-[0_24px_70px_rgba(74,53,32,0.08)] sm:p-8">
              <div className="flex items-center gap-4 border-b border-black/10 pb-6">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#06C755] text-white shadow-[0_8px_24px_rgba(6,199,85,0.2)]">
                  <svg aria-hidden="true" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.5 3 2 6.6 2 11c0 4 3.6 7.3 8.5 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6 1.5-1.7 2.6-3.4 2.6-4.9 0-4.4-4.5-8-10-8z" /></svg>
                </span>
                <div>
                  <span className="block text-[10px] tracking-[0.2em] text-muted-strong">LINE OFFICIAL</span>
                  <strong className="mt-1 block text-[17px] font-medium text-ink">@lovepier.cafe</strong>
                </div>
              </div>
              <p className="py-6 text-[13px] font-light leading-[1.8] text-[#555]">{t.rewardsCtaNote}</p>
              <a
                href="https://lin.ee/5A0tfSQ"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[#06C755] px-6 text-[13px] font-semibold tracking-[0.04em] text-white transition-all hover:-translate-y-0.5 hover:bg-[#05b94e] hover:shadow-[0_10px_30px_rgba(6,199,85,0.24)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#06C755]"
              >
                {t.rewardsCta}
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </ScrollStackPanel>
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
          <span className="text-muted-strong text-xs tracking-widest uppercase">No image</span>
        </div>
      )}
      <div className="font-display text-[18px] sm:text-[20px] font-light text-ink leading-snug line-clamp-2 flex-1 mt-3">{name}</div>
      <div className="font-display text-[16px] text-gold-deep mt-2">{price}{priceMax}</div>
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

function HeroSlideshow({ t }) {
  const [current, setCurrent] = useState(0)
  const [fading, setFading] = useState(false)
  // Auto-advance is decorative: it stops while the visitor is reading (hover or
  // keyboard focus) and never runs at all under prefers-reduced-motion, so the
  // hero is not an unstoppable moving target (WCAG 2.2.2).
  const [paused, setPaused] = useState(false)

  const goTo = (i) => {
    setFading(true)
    setTimeout(() => { setCurrent(i); setFading(false) }, 600)
  }

  useEffect(() => {
    if (paused) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const timer = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setCurrent((c) => (c + 1) % HERO_SLIDES.length)
        setFading(false)
      }, 600)
    }, 4500)
    return () => clearInterval(timer)
  }, [paused])

  return (
    <div
      className="relative w-full bg-[#e8e4de] reveal-img overflow-hidden aspect-[4/5] sm:aspect-[3/2] lg:aspect-[16/7]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {HERO_SLIDES.map((slide, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={slide.src}
          // Decorative: the <h1> below already names the place, so repeating it
          // on five stacked images would just be screen-reader noise.
          alt=""
          src={slide.src}
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
      {/* dot indicators — the dot stays 6px, but each button carries a 24×40px
          hit area so it is actually tappable on a phone */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-row" style={{ zIndex: 4 }}>
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`ภาพที่ ${i + 1} จาก ${HERO_SLIDES.length}`}
            aria-current={i === current ? 'true' : undefined}
            className="w-6 h-10 flex items-center justify-center border-0 bg-transparent cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(245,243,239,0.9)]"
          >
            <span
              className="w-1.5 h-1.5 rounded-full transition-all duration-300"
              style={{ background: i === current ? 'rgba(245,243,239,0.9)' : 'rgba(245,243,239,0.35)' }}
            />
          </button>
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

  // Lightbox is a modal: Escape closes it, arrows page through it, and the page
  // behind it stops scrolling (reusing the same body class the nav overlay uses).
  useEffect(() => {
    if (!evLbImages) return
    const onKey = (e) => {
      if (e.key === 'Escape') setEvLbImages(null)
      else if (e.key === 'ArrowRight') setEvLbIdx((i) => Math.min(i + 1, evLbImages.length - 1))
      else if (e.key === 'ArrowLeft') setEvLbIdx((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    document.body.classList.add('menu-open')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('menu-open')
    }
  }, [evLbImages])

  const renderLines = (text) => text.split('\n').map((line, idx, arr) => (
    <span key={`${line}-${idx}`}>{line}{idx < arr.length - 1 ? <br /> : null}</span>
  ))

  const titleKey = lang === 'th' ? 'titleTh' : lang === 'zh' ? 'titleZh' : 'titleEn'
  const descKey  = lang === 'th' ? 'descriptionTh' : lang === 'zh' ? 'descriptionZh' : 'descriptionEn'
  const perLabel = lang === 'th' ? 'คน' : lang === 'zh' ? '人' : 'person'
  const freeLabel = lang === 'th' ? 'ฟรี' : lang === 'zh' ? '免费' : 'Free'

  // The section is headed "อีเวนต์ที่กำลังจะมาถึง", so it must only carry events
  // that have not finished yet — an event runs until endDate (or its single
  // eventDate) — soonest first. Anything already over belongs on /events under
  // Past Events, not on the home page.
  const todayStr = new Date().toISOString().slice(0, 10)
  const upcomingEvents = dbEvents
    .filter((e) => e.isActive)
    .filter((e) => {
      const effectiveEnd = e.endDate || e.eventDate
      return effectiveEnd ? effectiveEnd >= todayStr : false
    })
    .sort((a, b) => (a.endDate || a.eventDate).localeCompare(b.endDate || b.eventDate))

  const eventsItems = upcomingEvents
    .slice(0, 3)
    .map((ev) => {
        const d = formatEventDate(ev.eventDate, lang)
        const fullTitle = ev[titleKey] || ev.titleEn
        const em = ev.titleEm || ''
        const titleMain = em && fullTitle.endsWith(em) ? fullTitle.slice(0, -em.length).trim() : fullTitle
        const dateStr = d.dateFull ? `${d.dateFull} ${d.year} · ${ev.timeRange}` : ev.timeRange
        const priceStr = ev.price != null ? `฿${ev.price.toLocaleString()} / ${perLabel}` : freeLabel
        return {
          id: ev.id,
          tag: ev.location || 'Love Pier',
          title: titleMain,
          titleEm: em,
          date: dateStr,
          // Short form for the poster cards, which have no room for the time range.
          dateShort: d.dateFull ? `${d.dateFull} ${d.year}` : '',
          location: ev.location,
          fullTitle,
          desc: ev[descKey] || ev.descriptionEn,
          price: priceStr,
          img: ev.imageUrl || '',
          images: (ev.albumImages && ev.albumImages.length > 0) ? ev.albumImages : (ev.imageUrl ? [ev.imageUrl] : []),
        }
      })

  // Nearest event leads at full width; any others follow as poster cards, so
  // every upcoming event stays visible instead of being hidden behind a slide.
  const [leadEvent, ...restEvents] = eventsItems

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
        <HeroSlideshow t={t} />

        {/* Tagline + About */}
        <div className="bg-[#e8e4de] px-8 sm:px-14 lg:px-20 py-16 sm:py-20 lg:py-28 border-b border-black/10">
          <div className="lg:grid lg:grid-cols-2 lg:gap-20 lg:items-start">
            {/* Left col: tagline + button */}
            <div className="lg:sticky lg:top-24">
              <h2 className="font-display font-light leading-[1.25] text-ink tracking-[-0.02em] text-[clamp(26px,3.8vw,54px)]">
                {t.tagline[0]}<br/>
                {t.tagline[1]}<br/>
                <em className="not-italic text-gold-deep whitespace-nowrap">{t.tagline[2]}</em>
              </h2>
              <div className="mt-10 hidden lg:flex">
                <MenuCta lang={lang} />
              </div>
            </div>
            {/* Right col: about text */}
            <div className="mt-10 lg:mt-0 text-sm leading-[1.9] text-[#555] font-light">
              <p className="mb-4" dangerouslySetInnerHTML={{ __html: t.about1 }} />
              <p dangerouslySetInnerHTML={{ __html: `${t.about2} ${t.about3} ${t.about4}` }} />
            </div>
          </div>
          {/* Same CTA, placed after the copy on narrow screens */}
          <div className="mt-10 flex justify-center lg:hidden">
            <MenuCta lang={lang} />
          </div>
        </div>

      </ScrollStackPanel>

      {/* ── 2. LOVE PIER REWARDS ───────────────────────────────────────── */}
      <RewardsSection t={t} />

      {/* ── 3. GALLERY STRIP ────────────────────────────────────────────── */}
      <ScrollStackPanel tone="white">
        <section className="py-10 sm:py-14 reveal border-t border-black/10">
          <div className="px-4 sm:px-6 lg:px-10 flex items-end justify-between mb-6">
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-gold-deep mb-1">{t.gallerySub}</p>
              <h2 className="font-display font-light text-ink text-[clamp(28px,5vw,42px)] leading-none">{t.galleryTitle}</h2>
            </div>
            <Link href="/gallery" className="text-[11px] tracking-[0.2em] uppercase text-muted-strong hover:text-ink transition-colors inline-flex items-center min-h-[24px] gap-1.5 shrink-0 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a3520]">{t.galleryMore} <span aria-hidden="true">→</span></Link>
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
      <MenuHighlights items={featuredDrinks} lang={lang} href="/menu#menu-section-coffee"
        title={t.drinksTitle} sub={t.drinksSub} moreLabel={t.drinksMore} />

      {/* ── 5. FOOD ─────────────────────────────────────────────────────── */}
      <MenuHighlights items={featuredFood} lang={lang} href="/menu#menu-section-food" tone="white"
        title={t.foodTitle} sub={t.foodSub} moreLabel={t.foodMore} />

      {/* ── 6. SWEETS ───────────────────────────────────────────────────── */}
      <MenuHighlights items={featuredSweets} lang={lang} href="/menu#menu-section-sweets"
        title={t.sweetsTitle} sub={t.sweetsSub} moreLabel={t.sweetsMore} />

      {/* ── 7. ACTIVITIES ───────────────────────────────────────────────── */}
      <ScrollStackPanel tone="white">
        <section className="px-4 py-12 sm:px-6 lg:px-10 lg:py-16 reveal border-t border-black/10 bg-[#f5f1eb]">
          <SectionHeader title={t.activitiesTitle} sub={t.activitiesSub} moreLabel={t.activitiesMore} moreHref="/activities" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {t.activitiesItems.map((act) => (
              <div key={act.name} className="border border-black/10 bg-white px-4 py-5 flex flex-col gap-2">
                <span className="text-[11px] tracking-[0.1em] uppercase font-semibold text-ink leading-snug">{act.name}</span>
                <span className="text-[10px] text-muted-strong">{act.detail}</span>
                <span className="font-display text-[18px] text-gold-deep mt-auto">{act.price}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[
              { src: '/uploads/events-surf-pool.webp', alt: 'Surf Pool' },
              { src: '/uploads/events-kayak.webp', alt: 'Kayak' },
              { src: '/uploads/events-skimboard.webp', alt: 'Skimboard' },
              { src: '/uploads/events-jet-ski.webp', alt: 'Jet Ski' },
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
          {eventsItems.length === 0 ? (
            // The section always holds its place; when nothing is upcoming it
            // says so rather than falling back to an event that already happened.
            <div className="border border-black/10 rounded-xl px-6 py-10 sm:py-14 text-center">
              <p className="font-display font-light text-ink text-[clamp(20px,2.6vw,28px)] leading-snug">{t.eventsEmpty}</p>
              <p className="mt-2 text-[13px] text-muted-strong leading-relaxed max-w-[420px] mx-auto">{t.eventsEmptySub}</p>
              <Link
                href="/events"
                className="mt-6 inline-flex items-center gap-2 min-h-[24px] text-[13px] tracking-[0.03em] text-gold-deep hover:text-ink transition-colors rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a3520]"
              >
                {t.eventsMore} <span aria-hidden="true">→</span>
              </Link>
            </div>
          ) : (
          <>
            {/* Lead: the nearest event, full width */}
            <div className="group grid grid-cols-1 sm:grid-cols-[300px_1fr] lg:grid-cols-[420px_1fr] gap-0 border border-black/10 overflow-hidden hover:border-black/25 transition-colors">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {leadEvent.img && (
                <div className="relative overflow-hidden">
                  <img
                    src={leadEvent.img}
                    alt={leadEvent.fullTitle}
                    loading="lazy"
                    srcSet={getSrcSet(leadEvent.img)}
                    sizes="(min-width: 1024px) 420px, (min-width: 640px) 300px, 100vw"
                    onClick={() => { if (leadEvent.images?.length) { setEvLbImages(leadEvent.images); setEvLbIdx(0) } }}
                    className={`w-full h-48 sm:h-full object-cover [filter:saturate(0.72)] group-hover:[filter:saturate(1)] transition-[filter] duration-500 ${leadEvent.images?.length ? 'cursor-zoom-in' : ''}`}
                  />
                  {leadEvent.images?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setEvLbImages(leadEvent.images); setEvLbIdx(0) }}
                      aria-label={`ดูรูปทั้งหมด ${leadEvent.images.length} รูป`}
                      className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/65 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M9 3H4.5A1.5 1.5 0 0 0 3 4.5V9M15 3h4.5A1.5 1.5 0 0 1 21 4.5V9M9 21H4.5A1.5 1.5 0 0 1 3 19.5V15M15 21h4.5a1.5 1.5 0 0 0 1.5-1.5V15" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
              <div className="px-6 py-6 sm:py-8 flex flex-col gap-3">
                <span className="text-[9px] tracking-[0.3em] uppercase text-gold-deep font-semibold">{leadEvent.tag}</span>
                <h3 className="font-display font-light text-[clamp(28px,4vw,44px)] leading-none text-ink">
                  {leadEvent.title} <em className="italic text-gold-deep">{leadEvent.titleEm}</em>
                </h3>
                <p className="text-[10px] tracking-[0.18em] uppercase text-muted-strong">{leadEvent.date}</p>
                <p className="text-[13px] text-[#555] font-light leading-relaxed mt-1">{leadEvent.desc}</p>
                <div className="mt-auto pt-3 border-t border-black/10 flex items-center justify-between">
                  <span className="font-display text-[18px] text-gold-deep">{leadEvent.price}</span>
                  <Link
                    href={`/events/${leadEvent.id}`}
                    className="inline-flex items-center min-h-[24px] text-[10px] tracking-[0.2em] uppercase text-muted-strong hover:text-ink transition-colors rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a3520]"
                  >
                    {lang === 'th' ? 'ดูรายละเอียด' : lang === 'zh' ? '查看详情' : 'View details'} <span aria-hidden="true" className="ml-1">→</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Any further upcoming events, as poster cards — same component the
                /events grid uses, so the two pages stay visually consistent. */}
            {restEvents.length > 0 && (
              <div className="mt-4 grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {restEvents.map((ev) => (
                  <EventCard
                    key={ev.id}
                    href={`/events/${ev.id}`}
                    imageUrl={ev.img}
                    title={ev.fullTitle}
                    dateLabel={ev.dateShort}
                    location={ev.location}
                  />
                ))}
              </div>
            )}
          </>
          )}
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
                <span className="block text-[9px] tracking-[0.35em] uppercase text-muted-strong mb-2">{t.address}</span>
                <div className="text-[13px] text-[#444] leading-[1.7] font-light">{renderLines(t.addressValue)}</div>
              </div>
              <div>
                <span className="block text-[9px] tracking-[0.35em] uppercase text-muted-strong mb-2">{t.hoursLabel}</span>
                <div className="text-[13px] text-[#444] leading-[1.7] font-light">{t.hoursCompact}</div>
              </div>
              <div>
                <span className="block text-[9px] tracking-[0.35em] uppercase text-muted-strong mb-2">{t.contact}</span>
                <div className="text-[13px] text-[#444] leading-[1.7] font-light flex flex-col items-start">
                  <a href="tel:0642523293" className="inline-flex items-center min-h-[24px] text-muted-strong hover:text-ink transition-colors rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a3520]">064-252-3293</a>
                  <a href="mailto:lovepier.cafe@gmail.com" className="inline-flex items-center min-h-[24px] text-muted-strong hover:text-ink transition-colors break-all rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a3520]">lovepier.cafe@gmail.com</a>
                </div>
              </div>
              <div>
                <span className="block text-[9px] tracking-[0.35em] uppercase text-muted-strong mb-2">{t.follow}</span>
                <div className="flex flex-col gap-2">
                  {[
                    { href: 'https://www.instagram.com/lovepiercafe/', label: 'Instagram', handle: 'lovepiercafe', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor"/></svg> },
                    { href: 'https://www.facebook.com/?locale=th_TH', label: 'Facebook', handle: 'lovepier.cafe', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.5h2.5l.5-3h-3V8.5c0-.9.3-1.5 1.6-1.5H17V4.3c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V10.5H8v3h2.5V21h3z"/></svg> },
                    { href: 'https://lin.ee/5A0tfSQ', label: 'LINE', handle: '@lovepier.cafe', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.5 3 2 6.6 2 11c0 4 3.6 7.3 8.5 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6 1.5-1.7 2.6-3.4 2.6-4.9 0-4.4-4.5-8-10-8z"/></svg> },
                    { href: 'https://www.tiktok.com/@lovepier.cafe2?_r=1&_t=ZS-97V9HaUa8jE', label: 'TikTok', handle: 'lovepier.cafe', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.8a4.3 4.3 0 0 1-2.6-1.6 4.3 4.3 0 0 1-.8-2.2h-3v12c0 1-.8 1.9-1.9 1.9a1.9 1.9 0 0 1-1.9-1.9c0-1 .8-1.9 1.9-1.9.2 0 .4 0 .6.1V9.1a5 5 0 0 0-.6 0 5 5 0 1 0 5 5V8.4a7.4 7.4 0 0 0 4.3 1.4V6.7a4.4 4.4 0 0 1-1-.9z"/></svg> },
                  ].map(({ href, label, handle, icon }) => (
                    <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="flex flex-row items-center gap-3 group">
                      <span className="text-muted-strong border border-black/[0.12] p-2 hover:border-ink hover:text-ink hover:bg-ink group-hover:[&_svg]:text-bg transition-all flex items-center justify-center w-9 h-9 shrink-0">{icon}</span>
                      <span className="text-[13px] text-muted-strong group-hover:text-ink transition-colors whitespace-nowrap">{handle}</span>
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
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-black"
          onClick={() => setEvLbImages(null)}
          role="dialog"
          aria-modal="true"
          aria-label="รูปภาพอีเวนต์"
        >
          <button
            type="button"
            onClick={() => setEvLbImages(null)}
            aria-label="ปิด"
            className="absolute top-4 right-4 z-20 w-11 h-11 flex items-center justify-center rounded-full bg-black/50 text-white/80 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-5 h-5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
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
            <img
              src={evLbImages[evLbIdx]}
              alt={`รูปที่ ${evLbIdx + 1} จาก ${evLbImages.length}`}
              className="absolute inset-0 w-full h-full object-contain"
            />
            {evLbIdx > 0 && (
              <button
                type="button"
                aria-label="รูปก่อนหน้า"
                onClick={e => { e.stopPropagation(); setEvLbIdx(i => i - 1) }}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-black/35 hover:bg-black/55 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M15 5l-7 7 7 7" /></svg>
              </button>
            )}
            {evLbIdx < evLbImages.length - 1 && (
              <button
                type="button"
                aria-label="รูปถัดไป"
                onClick={e => { e.stopPropagation(); setEvLbIdx(i => i + 1) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-black/35 hover:bg-black/55 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M9 5l7 7-7 7" /></svg>
              </button>
            )}
          </div>
          <div className="shrink-0 py-2 flex justify-center" onClick={e => e.stopPropagation()}>
            {evLbImages.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setEvLbIdx(i)}
                aria-label={`ไปที่รูปที่ ${i + 1}`}
                aria-current={i === evLbIdx ? 'true' : undefined}
                className="w-6 h-10 flex items-center justify-center bg-transparent border-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <span className={`w-1.5 h-1.5 rounded-full transition-colors ${i === evLbIdx ? 'bg-gold' : 'bg-white/30'}`} />
              </button>
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
