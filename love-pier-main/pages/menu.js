import { and, asc, eq } from 'drizzle-orm'
import Head from 'next/head'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Footer from '../components/Footer'
import { FOOTER_TAGLINES } from '../lib/footerTagline'
import { useLanguage } from '../lib/language'
import { useCart } from '../lib/cart'
import { db } from '../lib/db'
import { categories, menuItems } from '../lib/db/schema'

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

const COFFEE_ADDONS_COPY = {
  en: [
    { name: 'Add an Extra Shot', price: '35' },
    { name: 'Milk Oat', price: '20' },
  ],
  th: [
    { name: 'เพิ่มเอสเพรสโซ่ช็อต', price: '35' },
    { name: 'เปลี่ยนนมข้าวโอ๊ต', price: '20' },
  ],
  zh: [
    { name: '加一份浓缩', price: '35' },
    { name: '换燕麦奶', price: '20' },
  ],
}

function formatMenuPrice(price) {
  if (!price) return '–'
  if (price === 'Free') return 'Free'
  return `฿${price}`
}

function CoffeePriceHeader({ priceLabels }) {
  return (
    <div aria-hidden className="flex justify-end gap-5 sm:gap-6 pb-3 -mb-1 pr-0.5">
      {COFFEE_PRICE_KEYS.map((key) => (
        <span
          key={key}
          className="font-sans text-[9px] tracking-[0.14em] uppercase text-muted w-10 text-center shrink-0"
        >
          {priceLabels[key]}
        </span>
      ))}
    </div>
  )
}

function getLightboxPrice(item, showDrinkPrices, priceLabels) {
  return item.prices && showDrinkPrices && priceLabels
    ? COFFEE_PRICE_KEYS.filter((k) => item.prices[k]).map((k) => `${priceLabels[k]} ฿${item.prices[k]}`).join('  ·  ')
    : formatMenuPrice(item.price)
}

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
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
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
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black"
      onClick={onClose}
    >
      {/* close */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white/80 hover:text-white text-xl leading-none"
        aria-label="Close"
      >✕</button>

      {/* image — flex-1 so it fills available space, object-contain shows full image */}
      <div
        className="relative flex-1 min-h-0 w-full"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.image}
          alt={current.name}
          loading="eager"
          className="absolute inset-0 w-full h-full object-contain"
        />
        {hasPrev && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goPrev() }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-black/35 hover:bg-black/55 text-white text-2xl leading-none"
            aria-label="Previous"
          >‹</button>
        )}
        {hasNext && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goNext() }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-black/35 hover:bg-black/55 text-white text-2xl leading-none"
            aria-label="Next"
          >›</button>
        )}
      </div>

      {/* info panel — fixed height below image */}
      <div
        className="shrink-0 px-6 pt-6 pb-8 text-center border-t border-white/10"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: 'system-ui,-apple-system,sans-serif' }}
      >
        <p className="text-white text-3xl sm:text-4xl font-semibold tracking-wide leading-tight">{current.name}</p>
        {current.priceText ? (
          <p className="mt-2 text-[#e3c77a] text-2xl sm:text-3xl tabular-nums font-semibold">{current.priceText}</p>
        ) : null}
        {current.description ? (
          <p className="mt-3 mx-auto text-white/80 text-xl sm:text-2xl font-light leading-relaxed" style={{ maxWidth: '400px' }}>
            {current.description}
          </p>
        ) : null}
      </div>
    </div>,
    document.body
  )
}

const CARD_COPY = {
  th: { add: 'เพิ่มลงตะกร้า', added: 'เพิ่มแล้ว ✓' },
  en: { add: 'Add to Cart', added: 'Added ✓' },
  zh: { add: '加入购物车', added: '已添加 ✓' },
}

function mockRating(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return (4.4 + (h % 6) * 0.1).toFixed(1)
}

function mockSold(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 17 + name.charCodeAt(i)) & 0xffff
  return 12 + (h % 80)
}

function MenuCard({ id, name, badge, desc, price, prices, image, lang, onImageClick }) {
  const { addItem, openCart } = useCart()
  const [flash, setFlash] = useState(false)
  const t = CARD_COPY[lang] || CARD_COPY.en

  const displayPrice = prices
    ? Object.values(prices).find(Boolean)
    : price

  function handleAdd() {
    addItem({ id, name, price: displayPrice, image })
    setFlash(true)
    setTimeout(() => setFlash(false), 1200)
    openCart()
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.08)] flex flex-col">
      {/* image area — portrait 3:4 */}
      <div className="relative bg-[#f2ede6]" style={{ paddingTop: '133.33%' }}>
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
          <button
            onClick={onImageClick}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white text-[15px] leading-none"
            aria-label="ดูรูปเต็ม"
          >⛶</button>
        )}
        {badge && (
          <span className="absolute top-2.5 left-2.5 bg-[#4a3520] text-white text-[9px] tracking-[0.15em] uppercase font-semibold px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>

      {/* content */}
      <div className="p-3.5 flex flex-col flex-1 gap-1.5">
        <h3 className="font-display text-[15px] font-medium text-ink leading-snug line-clamp-2">{name}</h3>
        {desc && (
          <p className="text-[11px] text-black/50 font-light leading-relaxed line-clamp-2">{desc}</p>
        )}
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
              flash
                ? 'bg-[#3a2818] text-white'
                : 'bg-[#4a3520] text-white hover:bg-[#3a2818]'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {flash ? t.added : t.add}
          </button>
        </div>
      </div>
    </div>
  )
}

function CoffeeAddOns({ items }) {
  return (
    <div className="mt-6 pt-5 border-t border-dotted border-black/15 space-y-3">
      {items.map((item) => (
        <div key={item.name} className="flex items-baseline gap-2 text-[11px] sm:text-xs font-light text-[#666]">
          <span className="shrink-0 uppercase tracking-[0.06em]">{item.name}</span>
          <span className="flore-menu-leader flex-1 min-w-[12px] mb-[3px]" aria-hidden />
          <span className="font-display text-[15px] text-gold tabular-nums shrink-0">฿{item.price}</span>
        </div>
      ))}
    </div>
  )
}

function MatchaTasteNotes({ notes }) {
  return (
    <div className="mt-6 pt-5 border-t border-dotted border-black/15">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
        {notes.map((note) => (
          <div key={note.title} className="flex gap-3 items-start">
            <div className={`w-9 h-9 rounded-full shrink-0 mt-0.5 ring-1 ring-black/10 ${note.swatch}`} aria-hidden />
            <div>
              <h3 className="text-[10px] tracking-[0.14em] uppercase text-[#888] font-light leading-snug mb-1.5">{note.title}</h3>
              <p className="text-[11px] sm:text-xs text-[#666] font-light leading-[1.75]">{note.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const TIERED_PRICE_CATEGORIES = []

const PRICE_LIST_LABEL = { th: 'รายการราคา', en: 'Price List', zh: '价目表' }

function PriceListSection({ items, lang }) {
  const label = PRICE_LIST_LABEL[lang] || PRICE_LIST_LABEL.en
  const listItems = items.filter((i) => i.price && i.price !== 'Free' && parseFloat(i.price) > 0)
  if (!listItems.length) return null
  return (
    <div className="mt-7 pt-6 border-t border-black/10">
      <h4 className="text-[9px] tracking-[0.25em] uppercase text-[#888] mb-4">{label}</h4>
      <div className="space-y-2.5">
        {listItems.map((item) => (
          <div key={item.num} className="flex items-baseline gap-2">
            <span className="shrink-0 text-[12px] sm:text-[13px] font-light text-ink leading-snug">{item.name}</span>
            {item.desc && (
              <span className="shrink-0 text-[10px] text-black/40 font-light">({item.desc})</span>
            )}
            <span className="flore-menu-leader flex-1 min-w-[12px] mb-[3px]" aria-hidden />
            <span className="shrink-0 font-semibold text-[13px] text-ink tabular-nums">
              {item.prices
                ? Object.values(item.prices).filter(Boolean).map((p, i, arr) => `฿${p}${i < arr.length - 1 ? ' / ' : ''}`).join('')
                : `฿${Math.round(parseFloat(item.price))}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FloreMenuPanel({ section, items, menuAddOns, tasteNotes, globalIndexMap, onImageClick, showPriceList }) {
  const { lang } = useLanguage()

  if (!section) return null
  return (
    <div className="flore-menu-panel px-6 sm:px-10 lg:px-12 py-7 sm:py-9">
      {section.subtitle ? (
        <p className="text-[11px] sm:text-xs italic text-[#888] font-light leading-relaxed mb-5 max-w-xl">
          {section.subtitle}
        </p>
      ) : null}
      <div className={`grid grid-cols-1 gap-4 lg:gap-6 ${items.length >= 3 ? 'lg:grid-cols-3' : items.length === 2 ? 'lg:grid-cols-2' : ''}`}>
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
      {showPriceList ? <PriceListSection items={items} lang={lang} /> : null}
      {menuAddOns?.length ? <CoffeeAddOns items={menuAddOns} /> : null}
      {tasteNotes?.length ? <MatchaTasteNotes notes={tasteNotes} /> : null}
    </div>
  )
}

function FloreSignaturePanel({ menuData, globalIndexMap, onImageClick }) {
  const { lang } = useLanguage()
  const allItems = menuData.flatMap((section) =>
    section.items.filter((item) => item.badge).map((item) => ({ section, item }))
  )

  return (
    <div className="flore-menu-panel px-6 sm:px-10 lg:px-12 py-7 sm:py-9">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {allItems.map(({ section, item }) => {
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

const MENU_DATA = [
  {
    num: '01', cat: 'chickenRice', title: 'Singapore', titleEm: 'Chicken Rice', bg: false,
    subtitle: 'Tender poached chicken with fragrant chicken rice, three signature sauces, and warm chicken soup.',
    items: [
      { num:'01', name:'Set — Mixed Chicken · Small', desc:'1 plate of rice · mixed parts', price:'150', image:'/menu/food-set-small.webp' },
      { num:'02', name:'Set — Mixed Chicken · Medium', desc:'2 plates of rice · mixed parts', price:'280', image:'/menu/chicken-rice-full-set.webp' },
      { num:'03', name:'Set — Mixed Chicken · Large', desc:'4 plates of rice · mixed parts', price:'550', image:'/menu/food-set-large.webp' },
      { num:'04', name:'Signature Chicken Rice Tray', badge:'Signature', desc:'4 plates of rice · thigh or breast', price:'670', image:'/menu/singaporean-chicken-rice.webp' },
      { num:'05', name:'Sesame Oil Liver', desc:'Plate', price:'150', image:'/menu/food-sesame-oil-liver.webp' },
      { num:'06', name:'Boiled Chicken Blood', desc:'Plate', price:'100', image:'/menu/food-chicken-blood.webp' },
      { num:'07', name:'Chicken Rice', desc:'Bowl', price:'35', image:'/menu/food-chicken-rice-bowl.webp' },
      { num:'08', name:'Orange Chili Ginger Sauce', desc:'Small jar', price:'25', image:'/menu/food-orange-chili-sauce.webp' },
      { num:'09', name:'Ginger Oil Sauce', desc:'Small jar', price:'25', image:'/menu/food-ginger-oil-sauce.webp' },
      { num:'10', name:'Soybean Paste Dipping Sauce', desc:'Soybean paste, ginger, fresh chili · small jar', price:'25', image:'/menu/food-soybean-paste-sauce.webp' },
      { num:'11', name:'Dine-in Dipping Sauces', desc:'Various sauces for dine-in', price:'Free', image:'/menu/food-dipping-sauces.webp' },
    ],
  },
  {
    num: '02', cat: 'breakfast', title: 'Breakfast', titleEm: 'all day', bg: false,
    subtitle: 'Light plates and sandwiches — served from open to close.',
    items: [
      { num:'01', name:'Pier Breakfast Plate', badge:'Signature', price:'280', image:'/menu/food-pier-breakfast.webp' },
      { num:'02', name:'Smoked Salmon Sandwich', price:'240' },
      { num:'03', name:'Chicken & Avocado Ciabatta', price:'220' },
      { num:'04', name:'Eggs Benedict', price:'260' },
      { num:'05', name:'Coconut Granola Bowl', price:'220' },
    ],
  },
  {
    num: '03', cat: 'coffee', title: 'Coffee', titleEm: '', bg: false,
    subtitle: 'Hot, iced, and frappe — prices per menu.',
    items: [
      { num:'01', name:'Americano', prices:{ hot:'90', iced:'100', blended:null }, image:'/menu/real-americano.webp' },
      { num:'02', name:'Espresso', prices:{ hot:'80', iced:'120', blended:'135' }, image:'/menu/real-espresso.webp' },
      { num:'03', name:'Cappuccino', prices:{ hot:'90', iced:'120', blended:'135' }, image:'/menu/real-cappuccino.webp' },
      { num:'04', name:'Latte', prices:{ hot:'90', iced:'120', blended:'135' }, image:'/menu/real-latte.webp' },
      { num:'05', name:'Mocca', prices:{ hot:'90', iced:'120', blended:'135' }, image:'/menu/drink-mocca-2.webp' },
      { num:'06', name:'Caramel Macchiato', prices:{ hot:'100', iced:'130', blended:'145' }, image:'/menu/caramel-macchiato.webp' },
      { num:'07', name:'Dirty', badge:'Signature', price:'179', prices:{ hot:null, iced:'179', blended:null }, image:'/menu/real-dirty-coffee.webp' },
      { num:'08', name:'Soft Coffee Latte', prices:{ hot:null, iced:'150', blended:null }, image:'/menu/soft-coffee-latte.webp' },
      { num:'09', name:'Yuzu Black Coffee', prices:{ hot:null, iced:'140', blended:null }, image:'/menu/yuzu-americano.webp' },
      { num:'10', name:'Orange Black Coffee', prices:{ hot:null, iced:'140', blended:null }, image:'/menu/real-orange-americano.webp' },
      { num:'11', name:'Coconut Coffee', prices:{ hot:null, iced:'140', blended:null }, image:'/menu/real-coconut-americano.webp' },
    ],
  },
  {
    num: '04', cat: 'matcha', title: 'Matcha', titleEm: '', bg: true,
    subtitle: 'Stone-ground matcha whisked to order — pure, creamy, and gently sweet.',
    items: [
      { num:'00', name:'แป้ง', badge:'Signature', desc:'Matcha x Khao Lam Latte', price:'179', image:'/menu/real-pang-signature.webp' },
      { num:'01', name:'Pure Matcha', price:'140', image:'/menu/real-pure-matcha.webp' },
      { num:'02', name:'Matcha Latte', price:'150', image:'/menu/real-matcha-latte.webp' },
      { num:'03', name:'Dirty Matcha', price:'150', image:'/menu/real-dirty-matcha-v2.webp' },
      { num:'04', name:'Coconut Matcha', price:'150', image:'/menu/real-matcha-coconut.webp' },
      { num:'05', name:'Orange Matcha', price:'150', image:'/menu/real-matcha-yuzu.webp' },
      { num:'06', name:'Matcha Yuzu', price:'150', image:'/menu/matcha-orange.webp' },
      { num:'07', name:'Soft Matcha', price:'160', image:'/menu/real-soft-matcha.webp' },
    ],
  },
  {
    num: '05', cat: 'nonCoffee', title: 'Non Coffee', titleEm: '', bg: true,
    subtitle: 'Thai tea, chocolate, and creamy frappes — no espresso.',
    items: [
      { num:'01', name:'Premium Thai Tea', price:'100', image:'/menu/real-thai-tea.webp' },
      { num:'02', name:'Thai Tea Frappe', price:'120', image:'/menu/real-thai-tea-frappe.webp' },
      { num:'03', name:'Chocolate', price:'100', image:'/menu/real-chocolate.webp' },
      { num:'04', name:'Chocolate Frappe', price:'120', image:'/menu/drink-chocolate-frappe.webp' },
      { num:'05', name:'Coconut Milk Frappe', price:'120', image:'/menu/coconut-milk-smoothie.webp' },
    ],
  },
  {
    num: '06', cat: 'italianSoda', title: 'Italian Soda', titleEm: '', bg: false,
    subtitle: 'Sparkling sodas with fruit, honey, and coastal brightness.',
    items: [
      { num:'01', name:'Lemon Honey Soda', price:'120', image:'/menu/honey-lemon-soda.webp' },
      { num:'02', name:'Yuzu Soda', price:'120', image:'/menu/yuzu-soda.webp' },
      { num:'03', name:'Strawberry Soda', price:'120', image:'/menu/strawberry-soda.webp' },
      { num:'04', name:'Lychee Soda', price:'120' },
      { num:'05', name:'Blue Ocean Soda', price:'120', image:'/menu/blue-ocean-soda.webp' },
    ],
  },
  {
    num: '07', cat: 'other', title: 'Other', titleEm: '', bg: true,
    subtitle: 'Still and sparkling water, soft drinks, and everyday essentials.',
    items: [
      { num:'01', name:'Purra Water', price:'20' },
      { num:'02', name:'Evian Mineral Water', price:'60' },
      { num:'03', name:'Coke', price:'40' },
      { num:'04', name:'Coke Zero', price:'40' },
    ],
  },
  {
    num: '08', cat: 'sweets', title: 'Sweet', titleEm: 'Desserts', bg: false,
    subtitle: 'House-made cakes, pies, and classics to close the meal.',
    items: [
      { num:'01', name:'Coconut Cake', price:'150', image:'/menu/dessert-coconut-cake.webp' },
      { num:'02', name:'Strawberry Cheese Pie', price:'189', image:'/menu/dessert-strawberry-cheese-pie.webp' },
      { num:'03', name:'Blueberry Cheese Pie', price:'189', image:'/menu/dessert-blueberry-cheese-pie.webp' },
      { num:'04', name:'Chocolate Cake', price:'140', image:'/menu/dessert-chocolate-cake.webp' },
      { num:'05', name:'Banoffee', price:'150', image:'/menu/dessert-banoffee.webp' },
      { num:'06', name:'Red Velvet Cake', price:'130', image:'/menu/dessert-red-velvet.webp' },
      { num:'07', name:'Orange Cake', price:'90', image:'/menu/dessert-orange-cake.webp' },
      { num:'08', name:'Egg Tart', price:'55', image:'/menu/dessert-egg-tart.webp' },
      { num:'09', name:'Tiramisu', price:'150', image:'/menu/dessert-tiramisu.webp' },
      { num:'10', name:'Strawberry Shortcake', price:'150', image:'/menu/dessert-strawberry-shortcake.webp' },
    ],
  },
]

const SECTION_COPY = {
  th: {
    coffee: { title: 'กาแฟ', titleEm: '', subtitle: 'ร้อน · เย็น · ปั่น — ราคาตามเมนู' },
    matcha: { title: 'มัทฉะ', titleEm: '', subtitle: 'มัทฉะเกรดพรีเมี่ยม ตีฟองทีละแก้ว หอมนุ่มละมุน' },
    nonCoffee: { title: 'เครื่องดื่ม', titleEm: '', subtitle: 'ชาไทย ช็อกโกแลต และเครื่องดื่มปั่น — ไม่มีกาแฟ' },
    italianSoda: { title: 'อิตาเลี่ยนโซดา', titleEm: '', subtitle: 'โซดาผสมผลไม้และน้ำผึ้ง สดชื่นเหมาะกับอากาศริมทะเล' },
    other: { title: 'อื่นๆ', titleEm: '', subtitle: 'น้ำดื่ม น้ำแร่ และเครื่องดื่มอัดลม' },
    chickenRice: { title: 'อาหาร', titleEm: '', subtitle: 'ไก่ต้มนุ่ม ข้าวมันหอม น้ำจิ้มสูตรเด็ด 3 แบบ และซุปไก่ร้อนๆ' },
    breakfast: { title: 'อาหารเช้า', titleEm: '', subtitle: 'จานเบาและแซนด์วิช เสิร์ฟได้ทุกเวลา สบายๆ ริมทะเล' },
    sweets: { title: 'ของหวาน', titleEm: '', subtitle: 'เค้กและพายโฮมเมด หวานกำลังดีปิดมื้ออย่างลงตัว' },
  },
  zh: {
    coffee: { title: '咖啡', titleEm: '', subtitle: '热饮 · 冰饮 · 冰沙 — 价格见菜单。' },
    matcha: { title: '抹茶', titleEm: '', subtitle: '石磨抹茶现点现打，香气清甜，口感细腻。' },
    nonCoffee: { title: '饮品', titleEm: '', subtitle: '泰茶、巧克力与冰沙饮品，不含咖啡。' },
    italianSoda: { title: '气泡苏打', titleEm: '', subtitle: '气泡苏打配水果与蜂蜜，清爽顺口。' },
    other: { title: '其他', titleEm: '', subtitle: '饮用水、矿泉水与汽水。' },
    chickenRice: { title: '海南鸡饭', titleEm: '新加坡 / 海南', subtitle: '嫩滑白切鸡、香浓鸡油饭、三款招牌蘸料与热鸡汤。' },
    breakfast: { title: '早餐', titleEm: '', subtitle: '轻食与三明治，从早到晚都能点，海边吃更舒服。' },
    sweets: { title: '甜品', titleEm: '', subtitle: '自制蛋糕与派点，甜度适中，收尾刚好。' },
  },
}

const BREAKFAST_DESC_COPY = {
  en: {
    '01': { badge: 'Signature', desc: 'Two eggs any style, sourdough, avocado, smoked salmon, and garden greens.' },
    '02': { desc: 'Smoked salmon, cream cheese, cucumber, and dill on toasted sourdough.' },
    '03': { desc: 'Grilled chicken, avocado, tomato, and herb mayo on ciabatta.' },
    '04': { desc: 'Poached eggs, brioche, ham, and lemon hollandaise.' },
    '05': { desc: 'House granola, coconut yogurt, seasonal fruit, and honey.' },
  },
  th: {
    '01': { name: 'เพียร์เบรกฟาสต์เพลต', badge: 'เมนูแนะนำ', desc: 'ไข่ 2 ฟอง ซาวโดว์ อะโวคาโด แซลมอนรมควัน และผักสด' },
    '02': { name: 'แซนด์วิชแซลมอนรมควัน', desc: 'ครีมชีส แตงกวา ดิล บนขนมปังซาวโดว์ปิ้ง' },
    '03': { name: 'แซนด์วิชไก่อะโวคาโด', desc: 'ไก่ย่าง อะโวคาโด มะเขือเทศ มายองเนสสมุนไพร บนขนมปังเซียบัตตา' },
    '04': { name: 'เอ้กเบเนดิกต์', desc: 'ไข่ลวก บริยอช แฮม และซอสฮอลแลนเดส' },
    '05': { name: 'โคโคนัทกราโนล่าโบวล์', desc: 'กราโนล่าโฮมเมด โยเกิร์ตมะพร้าว ผลไม้ตามฤดูกาล และน้ำผึ้ง' },
  },
  zh: {
    '01': { badge: '招牌', desc: '两颗蛋、酸种面包、牛油果、烟熏三文鱼与鲜蔬。' },
    '02': { desc: '烟熏三文鱼、奶油芝士、黄瓜与莳萝，配烤酸种面包。' },
    '03': { desc: '烤鸡、牛油果、番茄与香草蛋黄酱，配夏巴塔。' },
    '04': { desc: '水波蛋、布里欧修、火腿与荷兰酱。' },
    '05': { desc: '自制麦片、椰子酸奶、时令水果与蜂蜜。' },
  },
}

const CHICKEN_RICE_DESC_COPY = {
  en: {
    '01': { desc: 'Tender poached chicken over pandan-scented rice cooked in chicken fat, with clear soup and three house sauces. Serves one.' },
    '02': { desc: 'Tender poached chicken, fragrant rice, clear soup, and three sauces — sized for two to share.' },
    '03': { desc: 'A generous family tray of poached chicken, fragrant rice, clear soup, and sauces — serves four.' },
    '04': { badge: 'Signature', desc: 'Premium thigh or breast on fragrant rice, with clear soup and three signature sauces — our signature tray.' },
    '05': { desc: 'Chicken liver gently poached in fragrant sesame oil and finished with spring onion — silky and aromatic.' },
    '06': { desc: 'Softly boiled chicken blood, clean and delicate — a classic Hainanese side.' },
    '07': { desc: 'Rice simmered in chicken fat, garlic, and pandan until fragrant and glossy.' },
    '08': { desc: 'Bright orange-chili sauce with garlic and ginger — tangy, spicy, and fresh.' },
    '09': { desc: 'Pounded young ginger in warm oil — mild, fragrant, and cooling.' },
    '10': { desc: 'Fermented soybean paste with ginger and fresh chili — savory and bold.' },
    '11': { desc: 'A trio of house dipping sauces, refilled freely for dine-in guests.' },
  },
  th: {
    '01': { name: 'เซต — ข้าวมันไก่ ขนาดเล็ก', desc: 'ไก่ต้มนุ่ม เสิร์ฟบนข้าวมันหุงกับน้ำมันไก่และใบเตย พร้อมซุปใสและน้ำจิ้ม 3 สูตร · สำหรับ 1 ท่าน' },
    '02': { name: 'เซต — ข้าวมันไก่ ขนาดกลาง', desc: 'ไก่ต้มนุ่ม ข้าวมันหอม ซุปใส และน้ำจิ้มครบ 3 สูตร · แบ่งทานได้ 2 ท่าน' },
    '03': { name: 'เซต — ข้าวมันไก่ ขนาดใหญ่', desc: 'ถาดใหญ่จัดเต็ม ไก่ต้ม ข้าวมันหอม ซุปใส และน้ำจิ้ม · สำหรับ 4 ท่าน' },
    '04': { name: 'ข้าวมันไก่ซิกเนเจอร์ เสิร์ฟเป็นถาด', badge: 'เมนูแนะนำ', desc: 'น่องสะโพกหรือเนื้ออกคัดพิเศษ บนข้าวมันหอม พร้อมซุปใสและน้ำจิ้ม 3 สูตร · ถาดซิกเนเจอร์' },
    '05': { name: 'ตับน้ำมันงา', desc: 'ตับไก่ลวกในน้ำมันงาหอม โรยต้นหอม เนื้อนุ่มละมุนกลิ่นหอม' },
    '06': { name: 'เลือดไก่ต้ม', desc: 'เลือดไก่ต้มเนื้อนุ่ม สะอาด รสละมุน · เครื่องเคียงสไตล์ไหหลำ' },
    '07': { name: 'ข้าวมัน', desc: 'ข้าวหุงกับน้ำมันไก่ กระเทียม และใบเตย จนหอมเป็นมันวาว' },
    '08': { name: 'น้ำจิ้มพริกส้มขิง', desc: 'น้ำจิ้มพริกส้มผสมขิงและกระเทียม รสเปรี้ยวเผ็ดสดชื่น' },
    '09': { name: 'น้ำจิ้มน้ำมันขิง', desc: 'ขิงอ่อนโขลกกับน้ำมันอุ่น กลิ่นหอม รสนุ่มเย็น' },
    '10': { name: 'น้ำจิ้มเต้าเจี๊ยว + ขิง + พริกสด', desc: 'เต้าเจี้ยวหมักผสมขิงและพริกสด รสกลมกล่อมเข้มข้น' },
    '11': { name: 'น้ำจิ้มต่างๆ ทานที่ร้าน', desc: 'น้ำจิ้ม 3 สูตรของร้าน เติมได้ไม่อั้นสำหรับทานที่ร้าน' },
  },
  zh: {
    '01': { desc: '嫩滑白切鸡配香兰鸡油饭，附清汤与三款招牌蘸酱 · 一人份' },
    '02': { desc: '嫩滑白切鸡、香鸡油饭、清汤与三款蘸酱 · 适合两人分享' },
    '03': { desc: '丰盛家庭拼盘：白切鸡、香鸡油饭、清汤与蘸酱 · 四人份' },
    '04': { badge: '招牌', desc: '精选鸡腿或鸡胸配香鸡油饭，附清汤与三款招牌蘸酱 · 招牌拼盘' },
    '05': { desc: '鸡肝以香麻油轻煮，撒上葱花，滑嫩浓香' },
    '06': { desc: '白煮鸡血，软嫩干净，经典海南配菜' },
    '07': { desc: '米饭以鸡油、蒜与香兰焖煮至油亮喷香' },
    '08': { desc: '橘子辣椒姜蘸酱，蒜香浓郁，酸辣清新' },
    '09': { desc: '嫩姜捣入温油，温和清香' },
    '10': { desc: '发酵豆酱配姜与鲜辣椒，咸香浓郁' },
    '11': { desc: '三款招牌蘸酱，堂食免费续添' },
  },
}

const SWEETS_DESC_COPY = {
  en: {
    '01': { desc: 'Fluffy coconut sponge with cream and toasted coconut — light, tropical, and fragrant.' },
    '02': { desc: 'Cream cheese pie topped with fresh strawberries and glossy berry glaze.' },
    '03': { desc: 'Cream cheese pie with a thick blueberry compote — tangy, sweet, and rich.' },
    '04': { desc: 'Dark chocolate layer cake — moist, deep cocoa, and indulgent.' },
    '05': { desc: 'Banana, caramel, biscuit base, and whipped cream — classic banoffee in a glass.' },
    '06': { desc: 'Red velvet with cream cheese frosting — soft crumb, gentle cocoa, and balanced sweetness.' },
    '07': { desc: 'Orange layer cake with citrus glaze — bright, moist, and refreshing.' },
    '08': { desc: 'Golden egg tarts with buttery pastry and silky custard.' },
    '09': { desc: 'Espresso-soaked layers, mascarpone cream, and cocoa — smooth and aromatic.' },
  },
  th: {
    '01': { desc: 'เค้กมะพร้าวเนื้อนุ่ม ครีมหอมมะพร้าว โรยมะพร้าวคั่ว' },
    '02': { desc: 'ชีสพายครีมชีส ท็อปสตรอเบอร์รี่สด ซอสผลไม้เงาใส' },
    '03': { desc: 'ชีสพายครีมชีส ท็อปบลูเบอร์รี่เข้มข้น เปรี้ยวหวานกลมกล่อม' },
    '04': { desc: 'เค้กช็อกโกแลตชั้นละมุน โกโก้เข้ม หวานน้อยพอดี' },
    '05': { desc: 'บานอฟฟี่เลเยอร์กล้วย คาราเมล บิสกิต และวิปครีม' },
    '06': { desc: 'เรดเวลเวทนุ่ม ฟรอสติ้งครีมชีส รสกลมกล่อม' },
    '07': { desc: 'เค้กส้มชั้นนุ่ม น้ำส้มหอม เปรี้ยวหวานสดชื่น' },
    '08': { desc: 'ทาร์ตไข่กรอบนอก เนื้อคัสตาร์ดเนียน หอมเนย' },
    '09': { desc: 'ทีรามิสุชั้นเอสเพรสโซ ครีมมาสคาร์โพนี โรยโกโก้' },
  },
  zh: {
    '01': { desc: '椰香海绵蛋糕配奶油与烤椰丝，轻盈热带。' },
    '02': { desc: '芝士派配新鲜草莓与亮面莓果酱。' },
    '03': { desc: '芝士派配浓郁蓝莓酱，酸甜饱满。' },
    '04': { desc: '巧克力层蛋糕，湿润浓郁，可可香气足。' },
    '05': { desc: '香蕉焦糖、饼干底与鲜奶油，经典班夫风味。' },
    '06': { desc: '红丝绒配奶油芝士霜，口感柔软，甜度均衡。' },
    '07': { desc: '橙子层蛋糕配柑橘淋面，清新湿润。' },
    '08': { desc: '金黄蛋挞，酥皮黄油香，内馅丝滑。' },
    '09': { desc: '浓缩咖啡浸润层次，马斯卡彭奶油，可可香气。' },
  },
}

const DRINK_MENU_CATS = ['nonCoffee', 'italianSoda', 'other']

const DRINK_MENU_DESC_COPY = {
  nonCoffee: {
    en: {
      '01': { desc: 'Premium Thai tea, iced — rich, aromatic, and classic.' },
      '02': { desc: 'Thai tea blended smooth with ice.' },
      '03': { desc: 'Iced chocolate — deep cocoa, creamy finish.' },
      '04': { desc: 'Chocolate blended frappe — thick, cold, and indulgent.' },
      '05': { desc: 'Fresh coconut milk blended — creamy, tropical, lightly sweet.' },
    },
    th: {
      '01': { desc: 'ชาไทยพรีเมี่ยมเย็น หอมเครื่องเทศ รสเข้มกลมกล่อม' },
      '02': { desc: 'ชาไทยปั่น เนื้อเนียน เย็นจัด หวานมันกำลังดี' },
      '03': { desc: 'ช็อกโกแลตเย็น โกโก้เข้ม รสนุ่มครีมมี่' },
      '04': { desc: 'ช็อกโกแลตปั่น เนื้อหนา เย็นสดชื่น' },
      '05': { desc: 'มะพร้าวนมสดปั่น หอมมะพร้าว ครีมมี่ หวานน้อย' },
    },
    zh: {
      '01': { desc: '精品泰式冰茶，茶香浓郁，经典顺口。' },
      '02': { desc: '泰茶冰沙，细腻冰爽，甜润均衡。' },
      '03': { desc: '冰巧克力，可可浓郁，口感顺滑。' },
      '04': { desc: '巧克力冰沙，绵密冰爽，甜而不腻。' },
      '05': { desc: '鲜椰奶冰沙，椰香细腻，热带清甜。' },
    },
  },
  italianSoda: {
    en: {
      '01': { desc: 'Sparkling soda with lemon and honey — bright and gently sweet.' },
      '02': { desc: 'Yuzu soda with citrus pulp — tangy, aromatic, refreshing.' },
      '03': { desc: 'Strawberry soda — fruity, vibrant, and ice-cold.' },
      '04': { desc: 'Lychee soda — floral, sweet, and crystal clear.' },
      '05': { desc: 'Blue ocean soda — layered blue, tropical, and eye-catching.' },
    },
    th: {
      '01': { desc: 'โซดาเลมอนผสมน้ำผึ้ง เปรี้ยวหวานสดชื่น' },
      '02': { desc: 'โซดายูซุ กลิ่นส้มซ่า เนื้อผลสด ดื่มเย็นสดชื่น' },
      '03': { desc: 'โซดาสตรอเบอร์รี่ หอมผลไม้ สีสด รสหวานอมเปรี้ยว' },
      '04': { desc: 'โซดาลิ้นจี่ หอมดอกไม้ หวานกลมกล่อม' },
      '05': { desc: 'โซดาบลูโอเชียน ชั้นสีฟ้า หวานสดชื่น ดื่มง่าย' },
    },
    zh: {
      '01': { desc: '柠檬蜂蜜苏打，酸甜明亮，清爽顺口。' },
      '02': { desc: '柚子苏打，果香清新，冰爽解渴。' },
      '03': { desc: '草莓苏打，果味鲜明，冰凉甜美。' },
      '04': { desc: '荔枝苏打，花香清甜，透亮爽口。' },
      '05': { desc: '蓝色海洋苏打，层次分明，热带清爽。' },
    },
  },
  other: {
    en: {
      '01': { desc: 'Purra drinking water.' },
      '02': { desc: 'Evian mineral water.' },
      '03': { desc: 'Coca-Cola, chilled.' },
      '04': { desc: 'Coca-Cola Zero, chilled.' },
    },
    th: {
      '01': { desc: 'น้ำดื่มเพอร์ร่า' },
      '02': { desc: 'น้ำแร่เอเวียง' },
      '03': { desc: 'โค้กเย็น' },
      '04': { desc: 'โค้กซีโร่เย็น' },
    },
    zh: {
      '01': { desc: 'Purra 饮用水。' },
      '02': { desc: '依云矿泉水。' },
      '03': { desc: '冰镇可口可乐。' },
      '04': { desc: '冰镇零度可乐。' },
    },
  },
}

const COFFEE_DESC_COPY = {
  en: {
    '01': { desc: 'Espresso lengthened with hot water — clean, bright, and easy to sip.' },
    '02': { desc: 'A short, intense shot pulled fresh to order.' },
    '03': { desc: 'Classic espresso, steamed milk, and foam in equal parts.' },
    '04': { desc: 'Double espresso with steamed milk, smooth and mellow.' },
    '05': { desc: 'Espresso, chocolate, and steamed milk finished with cocoa.' },
    '06': { desc: 'Espresso marked with caramel and silky steamed milk.' },
    '07': { badge: 'Signature', desc: 'Chilled milk topped with hot espresso — layered, bold, and smooth.' },
    '08': { desc: 'Gentle espresso and milk, light-bodied and softly sweet.' },
    '09': { desc: 'Iced americano with yuzu — bright citrus over a clean coffee base.' },
    '10': { desc: 'Iced americano with fresh orange — fruity, tangy, and refreshing.' },
    '11': { desc: 'Iced americano with coconut — tropical, creamy, and beach-ready.' },
  },
  th: {
    '01': { desc: 'เอสเพรสโซผสมน้ำร้อน รสสะอาด หอมกลม ดื่มง่าย' },
    '02': { desc: 'ช็อตเข้มข้น ดึงสดทุกแก้ว' },
    '03': { desc: 'สูตรคลาสสิก เอสเพรสโซ นมสตีม และฟองนมสมดุล' },
    '04': { desc: 'ดับเบิลเอสเพรสโซกับนมสตีม นุ่มละมุน' },
    '05': { desc: 'เอสเพรสโซ ช็อกโกแลต และนม หอมเข้มโรยโกโก้' },
    '06': { desc: 'เอสเพรสโซ คาราเมล และนมสตีม หวานนุ่มกลมกล่อม' },
    '07': { badge: 'ซิกเนเจอร์', desc: 'นมเย็นท็อปด้วยเอสเพรสโซร้อน ชั้นชัด รสเข้มแต่ลื่น' },
    '08': { desc: 'กาแฟนมเนื้อเบา รสนุ่ม หวานน้อย ดื่มง่าย' },
    '09': { desc: 'อเมริกาโน่เย็นผสมยูซุ เปรี้ยวสดชื่น กลิ่นกาแฟสะอาด' },
    '10': { desc: 'อเมริกาโน่เย็นผสมน้ำส้มสด หอมเปรี้ยว สดชื่น' },
    '11': { desc: 'อเมริกาโน่เย็นผสมมะพร้าว หอมท็อปปิคอล นุ่มลื่น' },
  },
  zh: {
    '01': { desc: '浓缩加热水，口感干净明亮，顺口好饮。' },
    '02': { desc: '短萃浓烈，现点现做。' },
    '03': { desc: '经典浓缩、蒸奶与奶泡，比例均衡。' },
    '04': { desc: '双份浓缩配蒸奶，顺滑柔和。' },
    '05': { desc: '浓缩、巧克力与蒸奶，撒可可粉。' },
    '06': { desc: '浓缩、焦糖与蒸奶，香甜细腻。' },
    '07': { badge: '招牌', desc: '冰牛奶上浇热浓缩，层次分明。' },
    '08': { desc: '轻柔咖啡拿铁，口感轻盈、微甜顺口。' },
    '09': { desc: '冰美式配柚子，柑橘明亮，咖啡干净。' },
    '10': { desc: '冰美式配鲜橙汁，果香酸甜，清爽解渴。' },
    '11': { desc: '冰美式配椰子，热带椰香，顺滑耐喝。' },
  },
}

const MATCHA_TASTE_NOTES = {
  en: [
    {
      swatch: 'bg-[#b5d39a]',
      title: 'Premium Matcha from Japan — Yame City',
      desc: 'Creamy and mellow with rich, kusa mochi and buttery flavours evocative of walnuts and almonds.',
    },
    {
      swatch: 'bg-[#3a5630]',
      title: 'Premium Matcha from Japan',
      desc: 'Seaweed, roasted nut, umami salty, rich and creamy.',
    },
  ],
  th: [
    {
      swatch: 'bg-[#b5d39a]',
      title: 'มัทฉะพรีเมี่ยมจากประเทศญี่ปุ่น เมืองยาเมะ',
      desc: 'นุ่มครีมมี่ ละมุน เข้มข้น หอมหญ้าหนูหน้าและเนย โน้ตถั่ววอลนัทและอัลมอนด์',
    },
    {
      swatch: 'bg-[#3a5630]',
      title: 'มัทฉะพรีเมี่ยมจากประเทศญี่ปุ่น',
      desc: 'สาหร่าย ถั่วคั่ว อูมามิเค็ม เข้มข้นและครีมมี่',
    },
  ],
  zh: [
    {
      swatch: 'bg-[#b5d39a]',
      title: '日本精品抹茶 — 八女市',
      desc: '口感绵密柔和，带有糯米与黄油香气，并浮现核桃与杏仁的坚果韵。',
    },
    {
      swatch: 'bg-[#3a5630]',
      title: '日本精品抹茶',
      desc: '海苔、焙炒坚果、鲜咸旨味，浓郁而顺滑。',
    },
  ],
}

const MATCHA_DESC_COPY = {
  en: {
    '00': { desc: 'Matcha x Khao Lam Latte — our house signature blend.' },
    '01': { desc: 'Premium matcha whisked pure — rich, grassy, and clean.' },
    '02': { desc: 'Matcha with steamed milk, smooth and balanced.' },
    '03': { desc: 'Chilled milk topped with matcha — layered, bold, and smooth.' },
    '04': { desc: 'Matcha with coconut — creamy, tropical, and gently sweet.' },
    '05': { desc: 'Matcha with fresh orange — bright, tangy, and refreshing.' },
    '06': { desc: 'Matcha with yuzu — citrusy, aromatic, and crisp.' },
    '07': { desc: 'Soft matcha blend — light-bodied, mellow, and easy to drink.' },
  },
  th: {
    '00': { badge: 'ซิกเนเจอร์', desc: 'มัทฉะ x ข้าวหลามหนองมน ลาเต้ — สูตรซิกเนเจอร์เฉพาะร้าน' },
    '01': { desc: 'มัทฉะพรีเมียมตีฟองแบบเพียว หอมเขียว เข้มข้น รสสะอาด' },
    '02': { desc: 'มัทฉะผสมนมสตีม เนื้อนุ่ม รสกลมกล่อม' },
    '03': { desc: 'นมเย็นท็อปมัทฉะ ชั้นชัด รสเข้มแต่ลื่น' },
    '04': { desc: 'มัทฉะผสมมะพร้าว หอมครีมมี่ ท็อปปิคอลนุ่มละมุน' },
    '05': { desc: 'มัทฉะผสมส้มสด เปรี้ยวหอม สดชื่น' },
    '06': { desc: 'มัทฉะผสมยูซุ กลิ่นส้มซ่า สดกลมกล่อม' },
    '07': { desc: 'มัทฉะสูตรซอฟท์ เนื้อเบา หวานน้อย ดื่มง่าย' },
  },
  zh: {
    '00': { badge: '招牌', desc: '抹茶 x 烤糯米香拿铁 — 门店招牌特调，层次丰富、顺口耐喝。' },
    '01': { desc: '精品抹茶纯饮，茶香浓郁，口感干净。' },
    '02': { desc: '抹茶与蒸奶，顺滑平衡。' },
    '03': { desc: '冰牛奶上浇抹茶，层次分明。' },
    '04': { desc: '抹茶配椰子，椰香细腻，热带顺口。' },
    '05': { desc: '抹茶配鲜橙，果香酸甜，清爽解渴。' },
    '06': { desc: '抹茶配柚子，柑橘明亮，香气清新。' },
    '07': { desc: '轻柔抹茶，口感轻盈，微甜顺口。' },
  },
}

const ITEM_COPY = {
  th: {
    '32': { name: 'ปลากะพงย่าง', badge: 'ซิกเนเจอร์', desc: 'ปลากะพงย่างทั้งตัว หอมเนยสมุนไพร เสิร์ฟพร้อมมันฝรั่งและสลัดสด' },
    '33': { name: 'พาสตากุ้งเพียร์', desc: 'กุ้งลายเสือ มะเขือเทศเชอร์รี กระเทียม พริก และลิงกวีนี' },
    '34': { name: 'โบวล์ปลากะเพรา', desc: 'ปลากะพงทอด กะเพรา ข้าวหอมมะลิ และไข่ดาว' },
    '35': { name: 'ริซอตโตเห็ด', desc: 'พอร์ชินี เห็ดนางรม พาร์เมซาน และทรัฟเฟิลออยล์' },
    '36': { name: 'บีชบาร์บีคิวเพลต', desc: 'รวมย่าง ไก่ ข้าวโพด มันหวาน และสลอว์' },
    '37': { name: 'ส้มตำโบวล์', desc: 'มะละกอ ถั่วลิสง กุ้งแห้ง มะเขือเทศ และน้ำยำมะนาว' },
  },
  zh: {
    '32': { name: '香烤海鲈', badge: '招牌', desc: '整尾海鲈搭配柠檬香草黄油，鲜味层次更突出。' },
    '33': { name: 'Pier 大虾意面', desc: '虎虾、樱桃番茄、蒜香辣味与罗勒油。' },
    '34': { name: '罗勒鱼饭碗', desc: '脆煎海鲈配圣罗勒、茉莉香米与煎蛋。' },
    '35': { name: '蘑菇烩饭', desc: '牛肝菌、平菇、帕玛森与松露油。' },
    '36': { name: '海滩烧烤拼盘', desc: '烤鸡腿、玉米、红薯、卷心菜沙拉。' },
    '37': { name: '青木瓜沙拉碗', desc: '青木瓜、花生、虾米与青柠酱汁。' },
  },
}

const PROMO_DEALS = {
  th: {
    heading: 'โปรจากเมนู Love Pier',
    note: 'ราคาอ้างอิงจากเมนูปัจจุบัน · ใช้ทานที่ร้าน · ไม่รวมกับโปรอื่น',
    viewAll: 'ดูโปรทั้งหมด',
    deals: [
      { badge: 'ข้าวมันไก่', title: 'เซตใหญ่ + เครื่องดื่มฟรี', price: '฿550', orig: '฿670', disc: 'ฟรี 1 แก้ว', desc: 'เซตข้าวมันไก่ขนาดใหญ่ (เมนู ฿550) รับเครื่องดื่มเย็น 1 แก้วฟรี — เลือก Americano / Latte / ชาไทยพรีเมียม (สูงสุด ฿120)', validity: 'ทานที่ร้าน · ทุกวัน', img: '/uploads/promotion-large-chicken-rice-set.webp' },
      { badge: 'ข้าวมันไก่', title: 'เซตกลาง + ลาเต้เย็น ฿50', price: '฿330', orig: '฿400', disc: '−18%', desc: 'เซตขนาดกลาง (฿280) + ลาเต้เย็นเพิ่มเพียง ฿50 (ปกติในเมนู ฿120)', validity: 'ทานที่ร้าน · ทุกวัน', img: '/uploads/promotion-medium-set-iced-latte.webp' },
      { badge: 'ซิกเนเจอร์', title: 'ถาดซิกเนเจอร์ + ชาไทย 2 แก้ว', price: '฿670', orig: '฿870', disc: '−23%', desc: 'ข้าวมันไก่ซิกเนเจอร์เสิร์ฟเป็นถาด (฿670) พร้อมชาไทยพรีเมียม 2 แก้วฟรี (฿100/แก้ว)', validity: 'ทานที่ร้าน · แชร์ได้', img: '/uploads/promotion-signature-tray.webp' },
      { badge: 'บรันช์', title: 'Pier Breakfast + กาแฟร้อนฟรี', price: '฿280', orig: '฿370', disc: 'ฟรีกาแฟ', desc: 'จาน Pier Breakfast (฿280) รับอเมริกาโน่ร้อนฟรี 1 แก้ว (เมนู ฿90)', validity: 'ทานที่ร้าน · 09:00–18:00', img: '/uploads/promotion-pier-breakfast.webp' },
      { badge: 'มัทฉะ', title: 'มัทฉะลาเต้ + ทาร์ตไข่', price: '฿185', orig: '฿205', disc: '−10%', desc: 'มัทฉะลาเต้ (฿150) + ทาร์ตไข่ (฿55) ในราคาชุดเดียว', validity: 'ทานที่ร้าน · ทุกวัน', img: '/uploads/promotion-matcha-tart.webp' },
      { badge: 'คอมโบ', title: 'เซตเล็ก + ชาไทยพรีเมียม', price: '฿220', orig: '฿250', disc: '−12%', desc: 'เซตข้าวมันไก่เล็ก (฿150) + ชาไทยพรีเมียม (฿100) จ่ายรวม ฿220', validity: 'ทานที่ร้าน · มื้อเบา', img: '/uploads/promotion-small-set-thai-tea.webp' },
    ],
  },
  zh: {
    heading: 'Love Pier\n菜单优惠',
    note: '价格以当前菜单为准 · 仅限堂食 · 不可与其他优惠同享',
    viewAll: '查看全部优惠',
    deals: [
      { badge: '鸡饭', title: '大份套餐 + 免费饮品', price: '฿550', orig: '฿670', disc: '赠 1 杯', desc: '大份混合鸡饭套餐（菜单 ฿550）赠冰饮 1 杯', validity: '堂食 · 每日', img: '/uploads/promotion-large-chicken-rice-set.webp' },
      { badge: '鸡饭', title: '中份套餐 + 冰拿铁 ฿50', price: '฿330', orig: '฿400', disc: '−18%', desc: '中份套餐（฿280）+ 冰拿铁仅需加 ฿50', validity: '堂食 · 每日', img: '/uploads/promotion-medium-set-iced-latte.webp' },
      { badge: '招牌', title: '招牌鸡饭盘 + 泰茶 2 杯', price: '฿670', orig: '฿870', disc: '−23%', desc: '招牌鸡饭大盘（฿670）附赠泰式奶茶 2 杯', validity: '堂食 · 适合分享', img: '/uploads/promotion-signature-tray.webp' },
      { badge: '早午餐', title: 'Pier Breakfast + 免费热美式', price: '฿280', orig: '฿370', disc: '赠咖啡', desc: 'Pier Breakfast 招牌盘（฿280）赠热美式 1 杯', validity: '堂食 · 09:00–18:00', img: '/uploads/promotion-pier-breakfast.webp' },
      { badge: '抹茶', title: '抹茶拿铁 + 蛋挞', price: '฿185', orig: '฿205', disc: '−10%', desc: '抹茶拿铁（฿150）+ 蛋挞（฿55）组合价', validity: '堂食 · 每日', img: '/uploads/promotion-matcha-tart.webp' },
      { badge: '组合', title: '小份套餐 + 泰式奶茶', price: '฿220', orig: '฿250', disc: '−12%', desc: '小份鸡饭套餐（฿150）+ 泰式奶茶（฿100）合计 ฿220', validity: '堂食 · 轻食', img: '/uploads/promotion-small-set-thai-tea.webp' },
    ],
  },
  en: {
    heading: 'Promos from our menu',
    note: 'Prices match the menu · Dine-in only · One promo per order',
    viewAll: 'View all promotions',
    deals: [
      { badge: 'Chicken rice', title: 'Large set + free drink', price: '฿550', orig: '฿670', disc: 'Free drink', desc: 'Large mixed chicken rice set (menu ฿550) — get one free iced drink (up to ฿120)', validity: 'Dine-in · Daily', img: '/uploads/promotion-large-chicken-rice-set.webp' },
      { badge: 'Chicken rice', title: 'Medium set + iced latte ฿50', price: '฿330', orig: '฿400', disc: '−18%', desc: 'Medium set (฿280) + iced latte for only ฿50 add-on (menu price ฿120)', validity: 'Dine-in · Daily', img: '/uploads/promotion-medium-set-iced-latte.webp' },
      { badge: 'Signature', title: 'Signature tray + 2 Thai teas', price: '฿670', orig: '฿870', disc: '−23%', desc: 'Signature chicken rice tray (฿670) with 2 free premium Thai teas (฿100 each)', validity: 'Dine-in · Great for sharing', img: '/uploads/promotion-signature-tray.webp' },
      { badge: 'Brunch', title: 'Pier Breakfast + free hot coffee', price: '฿280', orig: '฿370', disc: 'Free coffee', desc: 'Pier Breakfast plate (฿280) with a free hot Americano (menu ฿90)', validity: 'Dine-in · 09:00–18:00', img: '/uploads/promotion-pier-breakfast.webp' },
      { badge: 'Matcha', title: 'Matcha latte + egg tart', price: '฿185', orig: '฿205', disc: '−10%', desc: 'Matcha latte (฿150) + egg tart (฿55) as a combo', validity: 'Dine-in · Daily', img: '/uploads/promotion-matcha-tart.webp' },
      { badge: 'Combo', title: 'Small set + Thai tea', price: '฿220', orig: '฿250', disc: '−12%', desc: 'Small chicken rice set (฿150) + premium Thai tea (฿100) total ฿220', validity: 'Dine-in · Light meal', img: '/uploads/promotion-small-set-thai-tea.webp' },
    ],
  },
}

function PromotionPanel({ lang }) {
  const t = PROMO_DEALS[lang] || PROMO_DEALS.en
  const { addItem, openCart } = useCart()
  const cardT = CARD_COPY[lang] || CARD_COPY.en
  return (
    <div className="px-6 sm:px-10 lg:px-12 py-7 sm:py-9">
      <div className="flex items-baseline justify-between mb-6 gap-4">
        <p className="text-[10px] tracking-[0.16em] uppercase text-muted">{t.note}</p>
        <Link href="/promotion" className="shrink-0 text-[10px] tracking-[0.2em] uppercase text-gold hover:text-ink transition-colors whitespace-nowrap">
          {t.viewAll} →
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {t.deals.map((deal, i) => (
          <div key={i} className="border border-black/10 rounded-xl overflow-hidden bg-white flex flex-col">
            {deal.img ? (
              <div className="relative bg-[#f2ede6]" style={{ paddingTop: '133.33%' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={deal.img} alt={deal.title} loading="lazy" srcSet={getSrcSet(deal.img)} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="absolute inset-0 w-full h-full object-cover object-center" />
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
                  onClick={() => { addItem({ id: `promo-${i}`, name: deal.title, price: deal.price.replace('฿',''), image: deal.img }); openCart() }}
                  className="shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-[#4a3520] text-white hover:bg-[#3a2818] transition-colors"
                >
                  {cardT.add}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const MENU_PAGE_COPY = {
  en: {
    title: 'Menu — Love Pier Beach Cafe',
    hero: 'Menu <em class="italic text-gold">Love Pier Beach Cafe</em>',
    specialsLabel: "Today's Specials",
    chefLine1: 'Recommended Specials',
  },
  th: {
    title: 'Menu — Love Pier Beach Cafe',
    hero: 'Menu <em class="italic text-gold">Love Pier Beach Cafe</em>',
    specialsLabel: 'เมนูพิเศษวันนี้',
    chefLine1: 'เมนูพิเศษ',
  },
  zh: {
    title: 'Menu — Love Pier Beach Cafe',
    hero: 'Menu <em class="italic text-gold">Love Pier Beach Cafe</em>',
    specialsLabel: '今日推荐',
    chefLine1: '精选推荐',
  },
}

const TAB_SECTION_CATS = {
  food: ['chickenRice', 'breakfast'],
  coffee: ['coffee'],
  matcha: ['matcha'],
  drinks: ['nonCoffee', 'italianSoda', 'other'],
  sweets: ['sweets'],
}

function primaryTabsForLang(lang) {
  if (lang === 'th') {
    return [
      { id: 'promotion', label: 'โปรโมชัน' },
      { id: 'signature', label: 'แนะนำ' },
      { id: 'food', label: 'อาหาร' },
      { id: 'coffee', label: 'กาแฟ' },
      { id: 'matcha', label: 'มัทฉะ' },
      { id: 'drinks', label: 'เครื่องดื่ม' },
      { id: 'sweets', label: 'ของหวาน' },
    ]
  }
  if (lang === 'zh') {
    return [
      { id: 'promotion', label: '优惠' },
      { id: 'signature', label: '招牌' },
      { id: 'food', label: '餐食' },
      { id: 'coffee', label: '咖啡' },
      { id: 'matcha', label: '抹茶' },
      { id: 'drinks', label: '饮品' },
      { id: 'sweets', label: '甜品' },
    ]
  }
  return [
    { id: 'promotion', label: 'Promotion' },
    { id: 'signature', label: 'Signature' },
    { id: 'food', label: 'Food' },
    { id: 'coffee', label: 'Coffee' },
    { id: 'matcha', label: 'Matcha' },
    { id: 'drinks', label: 'Drinks' },
    { id: 'sweets', label: 'Sweets' },
  ]
}

function drinkPriceLabels(lang) {
  return COFFEE_PRICE_LABELS[lang] || COFFEE_PRICE_LABELS.en
}

function menuAddOnsForCategory(cat, lang) {
  if (cat === 'coffee') return COFFEE_ADDONS_COPY[lang] || COFFEE_ADDONS_COPY.en
  return undefined
}

function matchaTasteNotes(lang) {
  return MATCHA_TASTE_NOTES[lang] || MATCHA_TASTE_NOTES.en
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

function buildMenuDataFromDB(dbData, lang) {
  const nameField = lang === 'th' ? 'nameTh' : lang === 'zh' ? 'nameZh' : 'nameEn'
  const descField = lang === 'th' ? 'descriptionTh' : lang === 'zh' ? 'descriptionZh' : 'descriptionEn'
  return dbData.map((cat, catIdx) => {
    const catKey = SLUG_TO_CAT[cat.slug] || cat.slug
    const sectionCopy = SECTION_COPY[lang]?.[catKey] || {}
    return {
      num: String(catIdx + 1).padStart(2, '0'),
      cat: catKey,
      title: sectionCopy.title ?? cat[nameField] ?? cat.nameEn,
      titleEm: sectionCopy.titleEm ?? '',
      subtitle: sectionCopy.subtitle ?? '',
      bg: false,
      items: cat.items.map((item, idx) => ({
        num: String(idx + 1).padStart(2, '0'),
        name: item[nameField] || item.nameEn,
        desc: item[descField] || item.descriptionEn || '',
        price: item.price === '0' ? 'Free' : (item.price ?? ''),
        priceMax: item.priceMax ?? null,
        badge: item.badge ? (BADGE_COPY[lang]?.[item.badge] ?? item.badge) : null,
        image: item.imageUrl ?? null,
        featured: item.isFeatured ?? false,
      })),
    }
  })
}

const SECTION_IDS = ['signature', 'food', 'coffee', 'matcha', 'drinks', 'sweets', 'promotion']

const HERO_IMAGES = [
  '/uploads/gallery-beach-terrace.webp',
  '/uploads/home-beach-panorama.webp',
  '/uploads/home-cafe-exterior.webp',
  '/uploads/gallery-sunset-sea.webp',
  '/uploads/gallery-beach-lawn.webp',
  '/uploads/home-love-pier-exterior.webp',
  '/uploads/gallery-interior-dining.webp',
  '/uploads/gallery-sunset-boat.webp',
]

function MenuHero({ lang }) {
  const [idx, setIdx] = useState(0)
  const [prev, setPrev] = useState(null)

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => {
        setPrev(i)
        return (i + 1) % HERO_IMAGES.length
      })
    }, 4000)
    return () => clearInterval(t)
  }, [])

  const title = lang === 'th' ? 'เมนู' : lang === 'zh' ? '菜单' : 'Menu'

  return (
    <section className="relative overflow-hidden" style={{ height: 'clamp(260px, 55vw, 420px)' }}>
      {/* previous image fading out */}
      {prev !== null && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`prev-${prev}`}
          src={HERO_IMAGES[prev]}
          alt=""
          aria-hidden
          loading="eager"
          className="absolute inset-0 w-full h-full object-cover object-center animate-[fadeOut_0.8s_ease-in-out_forwards]"
        />
      )}
      {/* current image fading in */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`cur-${idx}`}
        src={HERO_IMAGES[idx]}
        alt="Love Pier Beach Cafe"
        loading={idx === 0 ? 'eager' : 'lazy'}
        fetchPriority={idx === 0 ? 'high' : 'auto'}
        className="absolute inset-0 w-full h-full object-cover object-center animate-[fadeIn_0.8s_ease-in-out_forwards]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10" />
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 px-6 text-center">
        <p className="text-white/70 text-[10px] tracking-[0.3em] uppercase font-light mb-2">Love Pier Beach Cafe</p>
        <h1 className="font-display font-light text-white leading-[0.95] tracking-[-0.02em] text-[clamp(36px,7vw,64px)]">
          {title}
        </h1>
      </div>
      {/* dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {HERO_IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => { setPrev(idx); setIdx(i) }}
            className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? 'bg-white w-4' : 'bg-white/40'}`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}

const CART_BTN_COPY = {
  th: 'ตะกร้า',
  en: 'Cart',
  zh: '购物车',
}

export default function Menu({ dbMenuData }) {
  const { lang } = useLanguage()
  const { totalQty, openCart } = useCart()
  const primaryTabs = primaryTabsForLang(lang)
  const t = MENU_PAGE_COPY[lang] || MENU_PAGE_COPY.en
  const menuData = useMemo(() => buildMenuDataFromDB(dbMenuData, lang), [dbMenuData, lang])
  const [activeAnchor, setActiveAnchor] = useState('signature')
  const [globalLbIndex, setGlobalLbIndex] = useState(-1)
  const tabScrollRef = useRef(null)
  const [tabDotIndex, setTabDotIndex] = useState(0)
  const TAB_DOT_COUNT = 2
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

  // Build flat global gallery from all sections (in section order)
  const { globalGallery, globalIndexMap } = useMemo(() => {
    const gallery = []
    const indexMap = {}
    menuData.forEach((section) => {
      section.items.forEach((item) => {
        if (item.image) {
          const key = `${section.cat}-${item.num}`
          indexMap[key] = gallery.length
          gallery.push({
            key,
            image: item.image,
            name: item.name,
            description: item.desc,
            priceText: item.price && item.price !== 'Free' ? `฿${Math.round(parseFloat(item.price))}` : '',
          })
        }
      })
    })
    return { globalGallery: gallery, globalIndexMap: indexMap }
  }, [menuData])

  // Track which section is in view for highlight
  useEffect(() => {
    const observers = []
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(`menu-section-${id}`)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveAnchor(id) },
        { rootMargin: '-40% 0px -55% 0px' }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach((o) => o.disconnect())
  }, [])

  function scrollTo(id) {
    const el = document.getElementById(`menu-section-${id}`)
    if (!el) return
    const navH = document.querySelector('nav')?.offsetHeight ?? 0
    const barH = 52
    const y = el.getBoundingClientRect().top + window.scrollY - navH - barH - 8
    window.scrollTo({ top: y, behavior: 'smooth' })
  }

  // Grouped sections for Food and Drinks
  const foodSections = menuData.filter((s) => TAB_SECTION_CATS.food?.includes(s.cat))
  const drinkSections = menuData.filter((s) => TAB_SECTION_CATS.drinks?.includes(s.cat))
  const coffeeSections = menuData.filter((s) => s.cat === 'coffee')
  const matchaSections = menuData.filter((s) => s.cat === 'matcha')
  const sweetsSections = menuData.filter((s) => s.cat === 'sweets')

  return (
    <>
      <Head>
        <title>{t.title}</title>
        <meta property="og:title" content="เมนูแนะนำ — Love Pier Beach Cafe" />
        <meta property="og:description" content="กาแฟ • ขนม • ข้าวมันไก่ — คาเฟ่ริมทะเลบางแสน" />
        <meta property="og:image" content="https://www.lovepier.cafe/og-menu.png" />
        <meta property="og:url" content="https://www.lovepier.cafe/menu" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://www.lovepier.cafe/og-menu.png" />
      </Head>

      {/* Menu Hero Slideshow */}
      <MenuHero lang={lang} />

      {/* Sticky anchor shortcut bar */}
      <div className="sticky top-[var(--nav-h,64px)] z-50 w-full bg-[#f5f2ee] border-b border-black/10">
        <div className="relative">
          <div ref={tabScrollRef} className="flex overflow-x-auto gap-2 px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {primaryTabs.map(({ id, label }) => (
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
        {/* scroll dots */}
        <div className="lg:hidden flex justify-center gap-1.5 pb-2">
          {Array.from({ length: TAB_DOT_COUNT }).map((_, i) => (
            <span key={i} className={`block rounded-full transition-all duration-300 ${i === tabDotIndex ? 'w-4 h-1.5 bg-[#4a3520]' : 'w-1.5 h-1.5 bg-[#4a3520]/30'}`} />
          ))}
        </div>
      </div>

      {/* Full scrollable menu */}
      <div className="w-full bg-white flore-menu">

        {/* Promotion */}
        <div id="menu-section-promotion" className="border-b border-black/10">
          <div className="px-6 sm:px-10 lg:px-12 pt-10 pb-2">
            <h2 className="font-display font-light text-[clamp(36px,5vw,64px)] tracking-[-0.02em] text-ink leading-none">
              {primaryTabs.find((t) => t.id === 'promotion')?.label ?? 'Promotion'}
            </h2>
            <div className="mt-3 w-12 h-px bg-gold/60" />
          </div>
          <PromotionPanel lang={lang} />
        </div>

        {/* Signature */}
        <div id="menu-section-signature" className="border-b border-black/10">
          <div className="px-6 sm:px-10 lg:px-12 pt-10 pb-2">
            <h2 className="font-display font-light text-[clamp(36px,5vw,64px)] tracking-[-0.02em] text-ink leading-none">
              {primaryTabs.find((t) => t.id === 'signature')?.label ?? 'Signature'}
            </h2>
            <div className="mt-3 w-12 h-px bg-gold/60" />
          </div>
          <FloreSignaturePanel menuData={menuData} globalIndexMap={globalIndexMap} onImageClick={setGlobalLbIndex} />
        </div>

        {/* Food */}
        <div id="menu-section-food" className="border-b border-black/10">
          {foodSections.map((section, i) => (
            <div key={section.cat} className="border-b border-black/[0.06] last:border-b-0">
              <div className="px-6 sm:px-10 lg:px-12 pt-10 pb-2">
                <h2 className="font-display font-light text-[clamp(36px,5vw,64px)] tracking-[-0.02em] text-ink leading-none">
                  {section.title}{section.titleEm ? <em className="not-italic text-gold"> · {section.titleEm}</em> : null}
                </h2>
                <div className="mt-3 w-12 h-px bg-gold/60" />
              </div>
              <FloreMenuPanel
                section={section}
                items={section.items}
                menuAddOns={menuAddOnsForCategory(section.cat, lang)}
                globalIndexMap={globalIndexMap}
                onImageClick={setGlobalLbIndex}
                showPriceList
              />
            </div>
          ))}
        </div>

        {/* Coffee */}
        <div id="menu-section-coffee" className="border-b border-black/10">
          {coffeeSections.map((section) => (
            <div key={section.cat}>
              <div className="px-6 sm:px-10 lg:px-12 pt-10 pb-2">
                <h2 className="font-display font-light text-[clamp(36px,5vw,64px)] tracking-[-0.02em] text-ink leading-none">{section.title}</h2>
                <div className="mt-3 w-12 h-px bg-gold/60" />
              </div>
              <FloreMenuPanel
                section={section}
                items={section.items}
                menuAddOns={menuAddOnsForCategory(section.cat, lang)}
                globalIndexMap={globalIndexMap}
                onImageClick={setGlobalLbIndex}
              />
            </div>
          ))}
        </div>

        {/* Matcha */}
        <div id="menu-section-matcha" className="border-b border-black/10">
          {matchaSections.map((section) => (
            <div key={section.cat}>
              <div className="px-6 sm:px-10 lg:px-12 pt-10 pb-2">
                <h2 className="font-display font-light text-[clamp(36px,5vw,64px)] tracking-[-0.02em] text-ink leading-none">{section.title}</h2>
                <div className="mt-3 w-12 h-px bg-gold/60" />
              </div>
              <FloreMenuPanel
                section={section}
                items={section.items}
                tasteNotes={matchaTasteNotes(lang)}
                globalIndexMap={globalIndexMap}
                onImageClick={setGlobalLbIndex}
              />
            </div>
          ))}
        </div>

        {/* Drinks */}
        <div id="menu-section-drinks" className="border-b border-black/10">
          {drinkSections.map((section) => (
            <div key={section.cat} className="border-b border-black/[0.06] last:border-b-0">
              <div className="px-6 sm:px-10 lg:px-12 pt-10 pb-2">
                <h2 className="font-display font-light text-[clamp(36px,5vw,64px)] tracking-[-0.02em] text-ink leading-none">{section.title}</h2>
                <div className="mt-3 w-12 h-px bg-gold/60" />
              </div>
              <FloreMenuPanel
                section={section}
                items={section.items}
                globalIndexMap={globalIndexMap}
                onImageClick={setGlobalLbIndex}
              />
            </div>
          ))}
        </div>

        {/* Sweets */}
        <div id="menu-section-sweets" className="border-b border-black/10">
          {sweetsSections.map((section) => (
            <div key={section.cat}>
              <div className="px-6 sm:px-10 lg:px-12 pt-10 pb-2">
                <h2 className="font-display font-light text-[clamp(36px,5vw,64px)] tracking-[-0.02em] text-ink leading-none">{section.title}{section.titleEm ? <em className="not-italic text-gold"> {section.titleEm}</em> : null}</h2>
                <div className="mt-3 w-12 h-px bg-gold/60" />
              </div>
              <FloreMenuPanel
                section={section}
                items={section.items}
                globalIndexMap={globalIndexMap}
                onImageClick={setGlobalLbIndex}
              />
            </div>
          ))}
        </div>

      </div>

      {/* Global lightbox — navigates across ALL menu items */}
      {globalLbIndex >= 0 && (
        <Lightbox
          items={globalGallery}
          index={globalLbIndex}
          onIndexChange={setGlobalLbIndex}
          onClose={() => setGlobalLbIndex(-1)}
        />
      )}

      {/* Floating cart button */}
      {totalQty > 0 && (
        <button
          onClick={openCart}
          className="fixed bottom-6 right-5 z-[170] flex items-center gap-2 bg-[#4a3520] text-white px-4 py-3 rounded-full shadow-lg font-semibold text-[13px] hover:bg-[#3a2818] transition-colors active:scale-95"
        >
          <span>🛒</span>
          <span>{CART_BTN_COPY[lang] ?? 'Cart'}</span>
          <span className="bg-white text-[#4a3520] text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {totalQty}
          </span>
        </button>
      )}

      <Footer tagline={FOOTER_TAGLINES.menu} />
    </>
  )
}

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
    sortOrder: cat.sortOrder,
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
        sortOrder: i.sortOrder,
      })),
  }))

  return { props: { dbMenuData } }
}
