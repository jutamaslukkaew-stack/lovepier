// Shared layout pieces rendered by both /menu and /delivery. Edit here — not
// in the pages — to change how menu sections, cards, or the hero look; both
// pages pick up the change automatically.
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCart } from '../../lib/cart'
import {
  COFFEE_PRICE_KEYS,
  COFFEE_PRICE_LABELS,
  HERO_IMAGES,
  PROMO_PANEL_COPY,
  getSrcSet,
  promoDealsFromDB,
} from './menuData'

// ── Lightbox ──────────────────────────────────────────────────────────────────
export function Lightbox({ items, index, onIndexChange, onClose }) {
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
    <div className="fixed inset-0 z-[200] flex flex-col bg-white" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-black/5 text-black/60 hover:bg-black/10 hover:text-black text-xl leading-none"
        aria-label="Close"
      >✕</button>

      <div
        className="relative flex-1 min-h-0 w-full px-6 py-6 sm:px-10 sm:py-8"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.image} alt={current.name} loading="eager" className="w-full h-full object-contain rounded-xl" />
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

      <div
        className="shrink-0 px-6 pt-6 pb-8 text-center border-t border-black/10"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: 'system-ui,-apple-system,sans-serif' }}
      >
        <p className="text-black text-3xl sm:text-4xl font-semibold tracking-wide leading-tight">{current.name}</p>
        {current.priceText ? (
          <p className="mt-2 text-[#b8952f] text-2xl sm:text-3xl tabular-nums font-semibold">{current.priceText}</p>
        ) : null}
        {current.description ? (
          <p className="mt-3 mx-auto text-black/60 text-xl sm:text-2xl font-light leading-relaxed" style={{ maxWidth: '400px' }}>
            {current.description}
          </p>
        ) : null}
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

// showAddToCart: false on /menu (browse only), true on /delivery (orderable).
export function MenuCard({ id, name, badge, desc, price, prices, image, lang, onImageClick, showAddToCart }) {
  const { addItem } = useCart()
  const [flash, setFlash] = useState(false)
  const t = CARD_COPY[lang] || CARD_COPY.en

  const displayPrice = prices ? Object.values(prices).find(Boolean) : price

  // Just add + flash "Added ✓" — doesn't pop the cart open, so customers can
  // keep tapping through the menu and add several items in a row (only
  // reachable with showAddToCart, i.e. only on /delivery's guided order flow).
  function handleAdd() {
    addItem({ id, name, price: displayPrice, image })
    setFlash(true)
    setTimeout(() => setFlash(false), 1200)
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

      <div className="p-3.5 flex flex-col flex-1 gap-1.5">
        <h3 className="font-display text-[17px] font-bold text-ink leading-snug line-clamp-2">{name}</h3>
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
        <div className={`mt-auto pt-2 ${showAddToCart ? 'flex items-center justify-between gap-2' : ''}`}>
          <span className="font-semibold text-[15px] text-ink tabular-nums">
            {displayPrice ? `฿${Math.round(parseFloat(displayPrice))}` : '–'}
          </span>
          {showAddToCart && (
            <button
              onClick={handleAdd}
              disabled={!displayPrice || displayPrice === 'Free'}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0 ${
                flash ? 'bg-[#3a2818] text-white' : 'bg-[#4a3520] text-white hover:bg-[#3a2818]'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {flash ? t.added : t.add}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Coffee add-ons / matcha taste notes (used inside coffee & matcha panels) ──
export function CoffeeAddOns({ items }) {
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

export function MatchaTasteNotes({ notes }) {
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

// ── Section panel (grid of MenuCards for one category) ────────────────────────
export function MenuSectionPanel({ section, items, lang, menuAddOns, tasteNotes, globalIndexMap, onImageClick, showAddToCart }) {
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
              showAddToCart={showAddToCart}
              {...item}
              onImageClick={item.image && onImageClick ? () => onImageClick(globalIndexMap?.[key] ?? 0) : undefined}
            />
          )
        })}
      </div>
      {menuAddOns?.length ? <CoffeeAddOns items={menuAddOns} /> : null}
      {tasteNotes?.length ? <MatchaTasteNotes notes={tasteNotes} /> : null}
    </div>
  )
}

// ── Signature panel (badged items from every category) ────────────────────────
export function SignaturePanel({ menuData, lang, globalIndexMap, onImageClick, showAddToCart }) {
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
              showAddToCart={showAddToCart}
              {...item}
              onImageClick={item.image && onImageClick ? () => onImageClick(globalIndexMap?.[key] ?? 0) : undefined}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── Promotions (DB-backed) ─────────────────────────────────────────────────────
const PROMO_CARD_COPY = {
  th: { add: 'เพิ่มลงตะกร้า', added: 'เพิ่มแล้ว ✓' },
  en: { add: 'Add to Cart', added: 'Added ✓' },
  zh: { add: '加入购物车', added: '已添加 ✓' },
}

function PromoOrderCard({ deal, lang, onImageClick }) {
  const { addItem } = useCart()
  const [flash, setFlash] = useState(false)
  const t = PROMO_CARD_COPY[lang] || PROMO_CARD_COPY.en

  function handleAdd() {
    addItem({ id: `promo-${deal.id}`, name: deal.title, price: deal.rawPrice, image: deal.img })
    setFlash(true)
    setTimeout(() => setFlash(false), 1200)
  }

  return (
    <div className="border border-black/10 rounded-xl overflow-hidden bg-white flex flex-col">
      {deal.img ? (
        <div className="relative bg-[#f2ede6]" style={{ paddingTop: '75%' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={deal.img}
            alt={deal.title}
            loading="lazy"
            srcSet={getSrcSet(deal.img)}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            onClick={onImageClick}
            className={`absolute inset-0 w-full h-full object-cover object-center ${onImageClick ? 'cursor-zoom-in' : ''}`}
          />
        </div>
      ) : null}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-2 gap-2">
          <span className="text-[9px] tracking-[0.18em] uppercase text-gold font-medium">{deal.badge}</span>
          {deal.disc && <span className="text-[11px] font-semibold text-[#c0392b] tabular-nums shrink-0">{deal.disc}</span>}
        </div>
        <h3 className="text-[13px] font-semibold tracking-[0.06em] uppercase text-ink leading-snug mb-1.5">{deal.title}</h3>
        <p className="text-[11px] text-[#888] font-light leading-relaxed flex-1 mb-3">{deal.desc}</p>
        <div className="flex items-center justify-between pt-3 border-t border-black/10 gap-2">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[17px] text-gold tabular-nums">{deal.price}</span>
            {deal.orig && <span className="text-[11px] text-[#bbb] line-through tabular-nums">{deal.orig}</span>}
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

// showAddToCart: false on /menu (cards link out to /promotion), true on
// /delivery (cards let you add the deal straight to the cart).
export function PromotionPanel({ lang, dbPromotions = [], showAddToCart, onImageClick, galleryStartIndex = 0 }) {
  const copy = PROMO_PANEL_COPY[lang] || PROMO_PANEL_COPY.en
  const deals = promoDealsFromDB(dbPromotions, lang)

  return (
    <div className="px-6 sm:px-10 lg:px-12 py-7 sm:py-9">
      <div className="flex items-baseline justify-between mb-6 gap-4">
        <p className="text-[10px] tracking-[0.16em] uppercase text-muted">{copy.note}</p>
        {!showAddToCart && (
          <Link href="/promotion" className="shrink-0 text-[10px] tracking-[0.2em] uppercase text-gold hover:text-ink transition-colors whitespace-nowrap">
            {copy.viewAll} →
          </Link>
        )}
      </div>
      {deals.length === 0 ? (
        <p className="text-[12px] text-black/40 py-6 text-center">—</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {deals.map((deal, i) =>
            showAddToCart ? (
              <PromoOrderCard
                key={deal.id}
                deal={deal}
                lang={lang}
                onImageClick={deal.img && onImageClick ? () => onImageClick(galleryStartIndex + i) : undefined}
              />
            ) : (
              <Link
                key={deal.id}
                href="/promotion"
                className="border border-black/10 rounded-xl overflow-hidden bg-white flex flex-col hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(0,0,0,0.06)] transition-all duration-300 cursor-pointer"
              >
                {deal.img ? (
                  <div className="relative bg-[#f2ede6]" style={{ paddingTop: '75%' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={deal.img} alt={deal.title} loading="lazy" srcSet={getSrcSet(deal.img)} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="absolute inset-0 w-full h-full object-cover object-center" />
                  </div>
                ) : null}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className="text-[9px] tracking-[0.18em] uppercase text-gold font-medium">{deal.badge}</span>
                    {deal.disc && <span className="text-[11px] font-semibold text-[#c0392b] tabular-nums shrink-0">{deal.disc}</span>}
                  </div>
                  <h3 className="text-[13px] font-semibold tracking-[0.06em] uppercase text-ink leading-snug mb-1.5">{deal.title}</h3>
                  <p className="text-[11px] text-[#888] font-light leading-relaxed flex-1 mb-3">{deal.desc}</p>
                  <div className="flex items-baseline gap-2 pt-3 border-t border-black/10">
                    <span className="font-display text-[17px] text-gold tabular-nums">{deal.price}</span>
                    {deal.orig && <span className="text-[11px] text-[#bbb] line-through tabular-nums">{deal.orig}</span>}
                  </div>
                </div>
              </Link>
            )
          )}
        </div>
      )}
    </div>
  )
}

// ── Hero slideshow ──────────────────────────────────────────────────────────────
export function MenuHero({ title }) {
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

  return (
    <section className="relative overflow-hidden" style={{ height: 'clamp(260px, 55vw, 420px)' }}>
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
