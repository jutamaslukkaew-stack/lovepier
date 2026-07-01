import { and, asc, eq } from 'drizzle-orm'
import Head from 'next/head'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Footer from '../components/Footer'
import { FOOTER_TAGLINES } from '../lib/footerTagline'
import { useLanguage } from '../lib/language'
import { useCart } from '../lib/cart'
import { db } from '../lib/db'
import { categories, menuItems } from '../lib/db/schema'

// ── helpers ───────────────────────────────────────────────────────────────────
function getSrcSet(url) {
  if (!url || !url.includes('-960w.webp')) return undefined
  const base = url.replace('-960w.webp', '')
  return `${base}-480w.webp 480w, ${base}-960w.webp 960w, ${base}-1440w.webp 1440w`
}

const COFFEE_PRICE_KEYS = ['hot', 'iced', 'blended']
const COFFEE_PRICE_LABELS = {
  th: { hot: 'ร้อน', iced: 'เย็น', blended: 'ปั่น' },
  en: { hot: 'Hot', iced: 'Iced', blended: 'Frappe' },
  zh: { hot: '热', iced: '冰', blended: '冰沙' },
}

function formatMenuPrice(price) {
  if (!price) return '–'
  if (price === 'Free') return 'Free'
  return `฿${price}`
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ items, index, onIndexChange, onClose }) {
  const hasPrev = index > 0
  const hasNext = index < items.length - 1
  const goPrev = useCallback(() => { onIndexChange((i) => (i > 0 ? i - 1 : i)) }, [onIndexChange])
  const goNext = useCallback(() => { onIndexChange((i) => (i < items.length - 1 ? i + 1 : i)) }, [onIndexChange, items.length])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose, goPrev, goNext])

  const touchX = useRef(null)
  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (dx > 45) goPrev()
    else if (dx < -45) goNext()
    touchX.current = null
  }

  const current = items[index]
  if (!current) return null

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-black" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white/80 hover:text-white text-xl leading-none"
        aria-label="Close"
      >✕</button>
      <div className="relative flex-1 min-h-0 w-full" onClick={(e) => e.stopPropagation()} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.image} alt={current.name} loading="eager" className="absolute inset-0 w-full h-full object-contain" />
        {hasPrev && (
          <button type="button" onClick={(e) => { e.stopPropagation(); goPrev() }} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-black/35 hover:bg-black/55 text-white text-2xl leading-none" aria-label="Previous">‹</button>
        )}
        {hasNext && (
          <button type="button" onClick={(e) => { e.stopPropagation(); goNext() }} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-black/35 hover:bg-black/55 text-white text-2xl leading-none" aria-label="Next">›</button>
        )}
      </div>
      <div className="shrink-0 px-6 pt-6 pb-8 text-center border-t border-white/10" onClick={(e) => e.stopPropagation()}>
        <p className="text-white text-3xl sm:text-4xl font-semibold tracking-wide leading-tight">{current.name}</p>
        {current.priceText ? <p className="mt-2 text-[#e3c77a] text-2xl sm:text-3xl tabular-nums font-semibold">{current.priceText}</p> : null}
        {current.description ? <p className="mt-3 mx-auto text-white/80 text-xl sm:text-2xl font-light leading-relaxed" style={{ maxWidth: '400px' }}>{current.description}</p> : null}
      </div>
    </div>,
    document.body
  )
}

// ── MenuCard ──────────────────────────────────────────────────────────────────
const CARD_COPY = {
  th: { add: 'เพิ่มลงตะกร้า', added: 'เพิ่มแล้ว ✓' },
  en: { add: 'Add to Cart', added: 'Added ✓' },
  zh: { add: '加入购物车', added: '已添加 ✓' },
}

function MenuCard({ id, name, badge, desc, price, prices, image, lang, onImageClick }) {
  const { addItem, openCart } = useCart()
  const [flash, setFlash] = useState(false)
  const t = CARD_COPY[lang] || CARD_COPY.en

  const displayPrice = prices ? Object.values(prices).find(Boolean) : price

  function handleAdd() {
    addItem({ id, name, price: displayPrice, image })
    setFlash(true)
    setTimeout(() => setFlash(false), 1200)
    openCart()
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.08)] flex flex-col">
      <div className="relative bg-[#f2ede6]" style={{ paddingTop: '75%' }}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={name}
            onClick={onImageClick}
            loading="lazy"
            srcSet={getSrcSet(image)}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className={`absolute inset-0 w-full h-full object-cover object-center ${onImageClick ? 'cursor-zoom-in' : ''}`}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-20">☕</div>
        )}
        {image && onImageClick && (
          <button onClick={onImageClick} className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white text-[15px] leading-none" aria-label="ดูรูปเต็ม">⛶</button>
        )}
        {badge && (
          <span className="absolute top-2.5 left-2.5 bg-[#4a3520] text-white text-[9px] tracking-[0.15em] uppercase font-semibold px-2 py-0.5 rounded-full">{badge}</span>
        )}
      </div>
      <div className="p-3.5 flex flex-col flex-1 gap-1.5">
        <h3 className="font-display text-[15px] font-medium text-ink leading-snug line-clamp-2">{name}</h3>
        {desc && <p className="text-[11px] text-black/50 font-light leading-relaxed line-clamp-2">{desc}</p>}
        {prices && (
          <p className="text-[10px] text-black/40 font-light">
            {COFFEE_PRICE_KEYS.filter((k) => prices[k]).map((k, i, arr) => (
              <span key={k}>{COFFEE_PRICE_LABELS[lang]?.[k] ?? k} ฿{prices[k]}{i < arr.length - 1 ? ' · ' : ''}</span>
            ))}
          </p>
        )}
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="font-semibold text-[15px] text-ink tabular-nums">
            {displayPrice ? `฿${Math.round(parseFloat(displayPrice))}` : '–'}
          </span>
          <button
            onClick={handleAdd}
            disabled={!displayPrice || displayPrice === 'Free'}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              flash ? 'bg-[#3a2818] text-white' : 'bg-[#4a3520] text-white hover:bg-[#3a2818]'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {flash ? t.added : t.add}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Section panel ─────────────────────────────────────────────────────────────
function MenuPanel({ section, items, globalIndexMap, onImageClick }) {
  const { lang } = useLanguage()
  if (!section) return null
  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
      {section.subtitle ? (
        <p className="text-[11px] sm:text-xs italic text-[#888] font-light leading-relaxed mb-5 max-w-xl">{section.subtitle}</p>
      ) : null}
      <div className={`grid grid-cols-2 gap-3 sm:gap-4 lg:gap-5 ${items.length >= 3 ? 'lg:grid-cols-3' : items.length === 2 ? 'lg:grid-cols-2' : ''}`}>
        {items.map((item) => {
          const key = `${section.cat}-${item.num}`
          return (
            <MenuCard
              key={key}
              id={key}
              lang={lang}
              {...item}
              onImageClick={item.image && onImageClick ? () => onImageClick(globalIndexMap?.[key] ?? 0) : undefined}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── copy ──────────────────────────────────────────────────────────────────────
const SECTION_COPY = {
  th: {
    coffee: { title: 'กาแฟ', subtitle: 'ร้อน · เย็น · ปั่น — ราคาตามเมนู' },
    matcha: { title: 'มัทฉะ', subtitle: 'มัทฉะเกรดพรีเมี่ยม ตีฟองทีละแก้ว หอมนุ่มละมุน' },
    nonCoffee: { title: 'เครื่องดื่ม', subtitle: 'ชาไทย ช็อกโกแลต และเครื่องดื่มปั่น — ไม่มีกาแฟ' },
    italianSoda: { title: 'อิตาเลี่ยนโซดา', subtitle: 'โซดาผสมผลไม้และน้ำผึ้ง สดชื่น' },
    other: { title: 'อื่นๆ', subtitle: 'น้ำดื่ม น้ำแร่ และเครื่องดื่มอัดลม' },
    chickenRice: { title: 'ข้าวมันไก่', subtitle: 'ไก่ต้มนุ่ม ข้าวมันหอม น้ำจิ้มสูตรเด็ด 3 แบบ' },
    breakfast: { title: 'อาหารเช้า', subtitle: 'จานเบาและแซนด์วิช เสิร์ฟได้ทุกเวลา' },
    sweets: { title: 'ของหวาน', subtitle: 'เค้กและพายโฮมเมด หวานกำลังดี' },
  },
  en: {
    coffee: { title: 'Coffee', subtitle: 'Hot, iced, and frappe — prices per menu.' },
    matcha: { title: 'Matcha', subtitle: 'Stone-ground matcha whisked to order.' },
    nonCoffee: { title: 'Non Coffee', subtitle: 'Thai tea, chocolate, and frappes.' },
    italianSoda: { title: 'Italian Soda', subtitle: 'Sparkling sodas with fruit and honey.' },
    other: { title: 'Other', subtitle: 'Water, soft drinks, and essentials.' },
    chickenRice: { title: 'Chicken Rice', subtitle: 'Tender poached chicken with fragrant rice.' },
    breakfast: { title: 'Breakfast', subtitle: 'Light plates and sandwiches — served all day.' },
    sweets: { title: 'Desserts', subtitle: 'House-made cakes and pies.' },
  },
  zh: {
    coffee: { title: '咖啡', subtitle: '热饮 · 冰饮 · 冰沙' },
    matcha: { title: '抹茶', subtitle: '石磨抹茶现点现打' },
    nonCoffee: { title: '饮品', subtitle: '泰茶、巧克力与冰沙' },
    italianSoda: { title: '气泡苏打', subtitle: '气泡苏打配水果与蜂蜜' },
    other: { title: '其他', subtitle: '饮用水、矿泉水与汽水' },
    chickenRice: { title: '鸡饭', subtitle: '嫩滑白切鸡、香鸡油饭' },
    breakfast: { title: '早餐', subtitle: '轻食与三明治' },
    sweets: { title: '甜品', subtitle: '自制蛋糕与派点' },
  },
}

const BADGE_COPY = {
  th: { Signature: 'เมนูแนะนำ' },
  zh: { Signature: '招牌' },
  en: {},
}

const SLUG_TO_CAT = {
  'chicken-rice': 'chickenRice',
  'breakfast': 'breakfast',
  'coffee': 'coffee',
  'matcha': 'matcha',
  'non-coffee': 'nonCoffee',
  'italian-soda': 'italianSoda',
  'other': 'other',
  'sweets': 'sweets',
}

function buildMenuData(dbData, lang) {
  const nameField = lang === 'th' ? 'nameTh' : lang === 'zh' ? 'nameZh' : 'nameEn'
  const descField = lang === 'th' ? 'descriptionTh' : lang === 'zh' ? 'descriptionZh' : 'descriptionEn'
  return dbData.map((cat, idx) => {
    const catKey = SLUG_TO_CAT[cat.slug] || cat.slug
    const copy = SECTION_COPY[lang]?.[catKey] || {}
    return {
      num: String(idx + 1).padStart(2, '0'),
      cat: catKey,
      title: copy.title ?? cat[nameField] ?? cat.nameEn,
      subtitle: copy.subtitle ?? '',
      items: cat.items.map((item, i) => ({
        num: String(i + 1).padStart(2, '0'),
        name: item[nameField] || item.nameEn,
        desc: item[descField] || item.descriptionEn || '',
        price: item.price === '0' ? 'Free' : (item.price ?? ''),
        badge: item.badge ? (BADGE_COPY[lang]?.[item.badge] ?? item.badge) : null,
        image: item.imageUrl ?? null,
      })),
    }
  })
}

// ── Promotion data (same as menu page) ───────────────────────────────────────
const PROMO_DEALS = {
  th: {
    note: 'ราคาอ้างอิงจากเมนูปัจจุบัน · ใช้ทานที่ร้าน · ไม่รวมกับโปรอื่น',
    viewAll: 'ดูโปรทั้งหมด',
    deals: [
      { badge: 'ข้าวมันไก่', title: 'เซตใหญ่ + เครื่องดื่มฟรี', price: '฿550', orig: '฿670', disc: 'ฟรี 1 แก้ว', desc: 'เซตข้าวมันไก่ขนาดใหญ่ (เมนู ฿550) รับเครื่องดื่มเย็น 1 แก้วฟรี', img: '/uploads/promotion-large-chicken-rice-set.webp' },
      { badge: 'ข้าวมันไก่', title: 'เซตกลาง + ลาเต้เย็น ฿50', price: '฿330', orig: '฿400', disc: '−18%', desc: 'เซตขนาดกลาง (฿280) + ลาเต้เย็นเพิ่มเพียง ฿50 (ปกติในเมนู ฿120)', img: '/uploads/promotion-medium-set-iced-latte.webp' },
      { badge: 'ซิกเนเจอร์', title: 'ถาดซิกเนเจอร์ + ชาไทย 2 แก้ว', price: '฿670', orig: '฿870', disc: '−23%', desc: 'ข้าวมันไก่ซิกเนเจอร์เสิร์ฟเป็นถาด (฿670) พร้อมชาไทยพรีเมียม 2 แก้วฟรี', img: '/uploads/promotion-signature-tray.webp' },
      { badge: 'บรันช์', title: 'Pier Breakfast + กาแฟร้อนฟรี', price: '฿280', orig: '฿370', disc: 'ฟรีกาแฟ', desc: 'จาน Pier Breakfast (฿280) รับอเมริกาโน่ร้อนฟรี 1 แก้ว (เมนู ฿90)', img: '/uploads/promotion-pier-breakfast.webp' },
      { badge: 'มัทฉะ', title: 'มัทฉะลาเต้ + ทาร์ตไข่', price: '฿185', orig: '฿205', disc: '−10%', desc: 'มัทฉะลาเต้ (฿150) + ทาร์ตไข่ (฿55) ในราคาชุดเดียว', img: '/uploads/promotion-matcha-tart.webp' },
      { badge: 'คอมโบ', title: 'เซตเล็ก + ชาไทยพรีเมียม', price: '฿220', orig: '฿250', disc: '−12%', desc: 'เซตข้าวมันไก่เล็ก (฿150) + ชาไทยพรีเมียม (฿100) จ่ายรวม ฿220', img: '/uploads/promotion-small-set-thai-tea.webp' },
    ],
  },
  zh: {
    note: '价格以当前菜单为准 · 仅限堂食 · 不可与其他优惠同享',
    viewAll: '查看全部优惠',
    deals: [
      { badge: '鸡饭', title: '大份套餐 + 免费饮品', price: '฿550', orig: '฿670', disc: '赠 1 杯', desc: '大份混合鸡饭套餐（菜单 ฿550）赠冰饮 1 杯', img: '/uploads/promotion-large-chicken-rice-set.webp' },
      { badge: '鸡饭', title: '中份套餐 + 冰拿铁 ฿50', price: '฿330', orig: '฿400', disc: '−18%', desc: '中份套餐（฿280）+ 冰拿铁仅需加 ฿50', img: '/uploads/promotion-medium-set-iced-latte.webp' },
      { badge: '招牌', title: '招牌鸡饭盘 + 泰茶 2 杯', price: '฿670', orig: '฿870', disc: '−23%', desc: '招牌鸡饭大盘（฿670）附赠泰式奶茶 2 杯', img: '/uploads/promotion-signature-tray.webp' },
      { badge: '早午餐', title: 'Pier Breakfast + 免费热美式', price: '฿280', orig: '฿370', disc: '赠咖啡', desc: 'Pier Breakfast 招牌盘（฿280）赠热美式 1 杯', img: '/uploads/promotion-pier-breakfast.webp' },
      { badge: '抹茶', title: '抹茶拿铁 + 蛋挞', price: '฿185', orig: '฿205', disc: '−10%', desc: '抹茶拿铁（฿150）+ 蛋挞（฿55）组合价', img: '/uploads/promotion-matcha-tart.webp' },
      { badge: '组合', title: '小份套餐 + 泰式奶茶', price: '฿220', orig: '฿250', disc: '−12%', desc: '小份鸡饭套餐（฿150）+ 泰式奶茶（฿100）合计 ฿220', img: '/uploads/promotion-small-set-thai-tea.webp' },
    ],
  },
  en: {
    note: 'Prices match the menu · Dine-in only · One promo per order',
    viewAll: 'View all promotions',
    deals: [
      { badge: 'Chicken rice', title: 'Large set + free drink', price: '฿550', orig: '฿670', disc: 'Free drink', desc: 'Large mixed chicken rice set (menu ฿550) — get one free iced drink (up to ฿120)', img: '/uploads/promotion-large-chicken-rice-set.webp' },
      { badge: 'Chicken rice', title: 'Medium set + iced latte ฿50', price: '฿330', orig: '฿400', disc: '−18%', desc: 'Medium set (฿280) + iced latte for only ฿50 add-on (menu price ฿120)', img: '/uploads/promotion-medium-set-iced-latte.webp' },
      { badge: 'Signature', title: 'Signature tray + 2 Thai teas', price: '฿670', orig: '฿870', disc: '−23%', desc: 'Signature chicken rice tray (฿670) with 2 free premium Thai teas (฿100 each)', img: '/uploads/promotion-signature-tray.webp' },
      { badge: 'Brunch', title: 'Pier Breakfast + free hot coffee', price: '฿280', orig: '฿370', disc: 'Free coffee', desc: 'Pier Breakfast plate (฿280) with a free hot Americano (menu ฿90)', img: '/uploads/promotion-pier-breakfast.webp' },
      { badge: 'Matcha', title: 'Matcha latte + egg tart', price: '฿185', orig: '฿205', disc: '−10%', desc: 'Matcha latte (฿150) + egg tart (฿55) as a combo', img: '/uploads/promotion-matcha-tart.webp' },
      { badge: 'Combo', title: 'Small set + Thai tea', price: '฿220', orig: '฿250', disc: '−12%', desc: 'Small chicken rice set (฿150) + premium Thai tea (฿100) total ฿220', img: '/uploads/promotion-small-set-thai-tea.webp' },
    ],
  },
}

const PROMO_TAB_LABEL = { th: 'โปรโมชั่น', en: 'Promotion', zh: '优惠' }

const PROMO_CARD_COPY = {
  th: { add: 'เพิ่มลงตะกร้า', added: 'เพิ่มแล้ว ✓' },
  en: { add: 'Add to Cart', added: 'Added ✓' },
  zh: { add: '加入购物车', added: '已添加 ✓' },
}

function PromoCard({ deal, lang, onImageClick }) {
  const { addItem, openCart } = useCart()
  const [flash, setFlash] = useState(false)
  const t = PROMO_CARD_COPY[lang] || PROMO_CARD_COPY.en

  function handleAdd() {
    const rawPrice = deal.price.replace('฿', '')
    addItem({ id: `promo-${deal.title}`, name: deal.title, price: rawPrice, image: deal.img })
    setFlash(true)
    setTimeout(() => setFlash(false), 1200)
    openCart()
  }

  return (
    <div className="border border-black/10 rounded-xl overflow-hidden bg-white flex flex-col">
      {deal.img ? (
        <div className="relative bg-[#f2ede6]" style={{ paddingTop: '75%' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={deal.img} alt={deal.title} loading="lazy" srcSet={getSrcSet(deal.img)} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" onClick={onImageClick} className={`absolute inset-0 w-full h-full object-cover object-center ${onImageClick ? 'cursor-zoom-in' : ''}`} />
          {onImageClick && (
            <button onClick={onImageClick} className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white text-[15px] leading-none" aria-label="ดูรูปเต็ม">⛶</button>
          )}
        </div>
      ) : null}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-2 gap-2">
          <span className="text-[9px] tracking-[0.18em] uppercase text-gold font-medium">{deal.badge}</span>
          <span className="text-[11px] font-semibold text-[#c0392b] tabular-nums shrink-0">{deal.disc}</span>
        </div>
        <h3 className="text-[13px] font-semibold tracking-[0.06em] uppercase text-ink leading-snug mb-1.5">{deal.title}</h3>
        <p className="text-[11px] text-[#888] font-light leading-relaxed flex-1 mb-3">{deal.desc}</p>
        <div className="flex items-center justify-between pt-3 border-t border-black/10 gap-2">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[17px] text-gold tabular-nums">{deal.price}</span>
            <span className="text-[11px] text-[#bbb] line-through tabular-nums">{deal.orig}</span>
          </div>
          <button
            onClick={handleAdd}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0 ${
              flash ? 'bg-[#3a2818] text-white' : 'bg-[#4a3520] text-white hover:bg-[#3a2818]'
            }`}
          >
            {flash ? t.added : t.add}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeliveryPromotionPanel({ lang, promoStartIdx, onImageClick }) {
  const t = PROMO_DEALS[lang] || PROMO_DEALS.en
  return (
    <div className="px-4 sm:px-6 lg:px-10 py-7 sm:py-9">
      <div className="flex items-baseline justify-between mb-6 gap-4">
        <p className="text-[10px] tracking-[0.16em] uppercase text-muted">{t.note}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {t.deals.map((deal, i) => (
          <PromoCard key={i} deal={deal} lang={lang} onImageClick={deal.img && onImageClick ? () => onImageClick(promoStartIdx + i) : undefined} />
        ))}
      </div>
    </div>
  )
}

// tabs are built dynamically from menuData so new DB categories auto-appear

const PAGE_COPY = {
  th: { title: 'เดลิเวอรี่ — Love Pier Beach Cafe', hero: 'เดลิเวอรี่', cart: 'ตะกร้า' },
  en: { title: 'Delivery — Love Pier Beach Cafe', hero: 'Delivery', cart: 'Cart' },
  zh: { title: '外卖 — Love Pier Beach Cafe', hero: '外卖', cart: '购物车' },
}

// ── page ──────────────────────────────────────────────────────────────────────
export default function Delivery({ dbMenuData }) {
  const { lang } = useLanguage()
  const { totalQty, openCart } = useCart()
  const t = PAGE_COPY[lang] || PAGE_COPY.en
  const menuData = useMemo(() => buildMenuData(dbMenuData, lang), [dbMenuData, lang])

  // tabs: promotion first, then all DB categories
  const tabs = useMemo(() => [
    { id: 'promotion', label: PROMO_TAB_LABEL[lang] || PROMO_TAB_LABEL.en },
    ...menuData.map((s) => ({ id: s.cat, label: s.title })),
  ], [menuData, lang])

  const [activeAnchor, setActiveAnchor] = useState(tabs[0]?.id ?? '')
  const [globalLbIndex, setGlobalLbIndex] = useState(-1)
  const tabScrollRef = useRef(null)

  const { globalGallery, globalIndexMap, promoStartIdx } = useMemo(() => {
    const promoDeals = (PROMO_DEALS[lang] || PROMO_DEALS.en).deals
    const gallery = promoDeals.filter(d => d.img).map(d => ({
      key: `promo-${d.title}`,
      image: d.img,
      name: d.title,
      description: d.desc,
      priceText: d.price,
    }))
    const promoStart = 0
    const indexMap = {}
    menuData.forEach((section) => {
      section.items.forEach((item) => {
        if (item.image) {
          const key = `${section.cat}-${item.num}`
          indexMap[key] = gallery.length
          gallery.push({ key, image: item.image, name: item.name, description: item.desc, priceText: item.price && item.price !== 'Free' ? `฿${Math.round(parseFloat(item.price))}` : '' })
        }
      })
    })
    return { globalGallery: gallery, globalIndexMap: indexMap, promoStartIdx: promoStart }
  }, [menuData, lang])

  useEffect(() => {
    const observers = []
    const allIds = ['promotion', ...menuData.map((s) => s.cat)]
    allIds.forEach((id) => {
      const el = document.getElementById(`delivery-section-${id}`)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveAnchor(id) },
        { rootMargin: '-40% 0px -55% 0px' }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach((o) => o.disconnect())
  }, [menuData])

  function scrollTo(id) {
    const el = document.getElementById(`delivery-section-${id}`)
    if (!el) return
    const navH = document.querySelector('nav')?.offsetHeight ?? 0
    const barH = 52
    const y = el.getBoundingClientRect().top + window.scrollY - navH - barH - 8
    window.scrollTo({ top: y, behavior: 'smooth' })
  }

  return (
    <>
      <Head>
        <title>{t.title}</title>
        <meta property="og:title" content={t.title} />
        <meta property="og:description" content="สั่งอาหารและเครื่องดื่ม Love Pier Beach Cafe" />
        <meta property="og:image" content="https://www.lovepier.cafe/og-menu.png" />
        <meta property="og:url" content="https://www.lovepier.cafe/delivery" />
        <meta property="og:type" content="website" />
      </Head>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#2c1f0e]" style={{ height: 'clamp(200px, 40vw, 320px)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/uploads/home-cafe-interior.webp"
          alt="Love Pier Delivery"
          loading="eager"
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 px-6 text-center">
          <p className="text-white/70 text-[10px] tracking-[0.3em] uppercase font-light mb-2">Love Pier Beach Cafe</p>
          <h1 className="font-display font-light text-white leading-[0.95] tracking-[-0.02em] text-[clamp(36px,7vw,64px)]">
            {t.hero}
          </h1>
        </div>
      </section>

      {/* Sticky tab bar — all categories from DB */}
      <div className="sticky top-[var(--nav-h,64px)] z-50 w-full bg-[#f5f2ee] border-b border-black/10">
        <div className="relative">
          <div ref={tabScrollRef} className="flex overflow-x-auto gap-2 px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollTo(id)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-[11px] sm:text-xs tracking-[0.1em] uppercase font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeAnchor === id
                    ? 'bg-[#4a3520] text-white'
                    : 'bg-[#4a3520]/[0.07] text-[#4a3520]/70 hover:bg-[#4a3520]/15 hover:text-[#4a3520]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="lg:hidden pointer-events-none absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-[#f5f2ee] to-transparent" />
        </div>
      </div>

      {/* Menu content — promotion first, then all sections from DB */}
      <div className="w-full bg-white">
        <div id="delivery-section-promotion" className="border-b border-black/10">
          <div className="px-4 sm:px-6 lg:px-10 pt-8 pb-2">
            <h2 className="font-display font-light text-[clamp(28px,4vw,48px)] tracking-[-0.02em] text-ink leading-none">{PROMO_TAB_LABEL[lang] || PROMO_TAB_LABEL.en}</h2>
            <div className="mt-3 w-10 h-px bg-gold/60" />
          </div>
          <DeliveryPromotionPanel lang={lang} promoStartIdx={promoStartIdx} onImageClick={setGlobalLbIndex} />
        </div>
        {menuData.map((section) => (
          <div key={section.cat} id={`delivery-section-${section.cat}`} className="border-b border-black/10">
            <div className="px-4 sm:px-6 lg:px-10 pt-8 pb-2">
              <h2 className="font-display font-light text-[clamp(28px,4vw,48px)] tracking-[-0.02em] text-ink leading-none">{section.title}</h2>
              <div className="mt-3 w-10 h-px bg-gold/60" />
            </div>
            <MenuPanel section={section} items={section.items} globalIndexMap={globalIndexMap} onImageClick={setGlobalLbIndex} />
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {globalLbIndex >= 0 && (
        <Lightbox
          items={globalGallery}
          index={globalLbIndex}
          onIndexChange={setGlobalLbIndex}
          onClose={() => setGlobalLbIndex(-1)}
        />
      )}

      {/* Floating cart */}
      {totalQty > 0 && (
        <button
          onClick={openCart}
          className="fixed bottom-6 right-5 z-[170] flex items-center gap-2 bg-[#4a3520] text-white px-4 py-3 rounded-full shadow-lg font-semibold text-[13px] hover:bg-[#3a2818] transition-colors active:scale-95"
        >
          <span>🛒</span>
          <span>{t.cart}</span>
          <span className="bg-white text-[#4a3520] text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{totalQty}</span>
        </button>
      )}

      <Footer tagline={FOOTER_TAGLINES.menu} />
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

  const items = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.isAvailable, true), eq(menuItems.isDeleted, false)))
    .orderBy(asc(menuItems.sortOrder))

  const dbMenuData = cats.map((cat) => ({
    id: cat.id,
    slug: cat.slug,
    nameTh: cat.nameTh,
    nameEn: cat.nameEn,
    nameZh: cat.nameZh,
    items: items
      .filter((i) => i.categoryId === cat.id)
      .map((i) => ({
        id: i.id,
        nameTh: i.nameTh,
        nameEn: i.nameEn,
        nameZh: i.nameZh,
        descriptionTh: i.descriptionTh,
        descriptionEn: i.descriptionEn,
        descriptionZh: i.descriptionZh,
        price: i.price != null ? String(i.price) : null,
        priceMax: i.priceMax != null ? String(i.priceMax) : null,
        badge: i.badge,
        imageUrl: i.imageUrl,
        isFeatured: i.isFeatured,
      })),
  }))

  return { props: { dbMenuData } }
}
