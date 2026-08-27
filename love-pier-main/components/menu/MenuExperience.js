// The full menu experience — hero, sticky tab bar, and every section — shared
// by /menu (browse only) and /delivery (orderable). Edit sections/layout here;
// both pages re-render identically. `showAddToCart` is the only thing that
// changes between them (plus the hero title and floating cart button).
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from '../../lib/language'
import { useCart } from '../../lib/cart'
import {
  Lightbox,
  MenuHero,
  MenuSectionPanel,
  SignaturePanel,
  PromotionPanel,
} from './MenuSections'
import {
  SECTION_IDS,
  TAB_SECTION_CATS,
  buildMenuData,
  matchaTasteNotes,
  menuAddOnsForCategory,
  primaryTabsForLang,
} from './menuData'

const CART_BTN_LABEL = { th: 'ตะกร้า', en: 'Cart', zh: '购物车' }

// cartBlockedNote: when set, the floating cart button is disabled and this
// line explains why (currently only /delivery's ฿300 minimum). Left undefined
// by /menu, which has no checkout to block.
export default function MenuExperience({ dbMenuData, dbPromotions = [], showAddToCart = false, heroTitle, onCartClick, cartBlockedNote = '' }) {
  const { lang } = useLanguage()
  const { totalQty, openCart } = useCart()
  const handleCartClick = onCartClick || openCart
  const primaryTabs = primaryTabsForLang(lang)
  const menuData = useMemo(() => buildMenuData(dbMenuData, lang), [dbMenuData, lang])

  // Sections behind each tab, in the order TAB_SECTION_CATS declares (not the
  // order the DB returns), so a tab reads the same no matter which of its
  // categories are active. An active category with no available items would
  // otherwise render a heading over nothing, so it is dropped here too.
  const sectionsByTab = useMemo(() => {
    const map = {}
    for (const [tabId, cats] of Object.entries(TAB_SECTION_CATS)) {
      map[tabId] = cats.flatMap((cat) => menuData.filter((s) => s.cat === cat && s.items.length))
    }
    return map
  }, [menuData])

  // Promotion has no active DB rows, or Signature has no badged items —
  // either way there's nothing to show under the heading, so both the
  // section (heading + body) and its tab are dropped below, the same
  // treatment already given to an empty category tab.
  const hasPromotions = dbPromotions.length > 0
  const hasSignatureItems = menuData.some((section) => section.items.some((item) => item.badge))

  // A tab whose categories are all inactive has no anchor to scroll to, and
  // scrollTo() no-ops silently — so drop it from the bar rather than leave a dead
  // button.
  const visibleTabs = primaryTabs.filter((t) => {
    if (t.id === 'promotion') return hasPromotions
    if (t.id === 'signature') return hasSignatureItems
    return sectionsByTab[t.id]?.length
  })

  const [activeAnchor, setActiveAnchor] = useState(visibleTabs[0]?.id ?? 'signature')
  const [globalLbIndex, setGlobalLbIndex] = useState(-1)
  const tabScrollRef = useRef(null)
  const stickyTabRef = useRef(null)
  const [tabDotIndex, setTabDotIndex] = useState(0)
  const TAB_DOT_COUNT = visibleTabs.length

  useEffect(() => {
    const el = tabScrollRef.current
    if (!el) return
    const onScroll = () => {
      const ratio = el.scrollLeft / (el.scrollWidth - el.clientWidth || 1)
      setTabDotIndex(Math.round(ratio * (TAB_DOT_COUNT - 1)))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [TAB_DOT_COUNT])

  // With twelve tabs the bar overflows even on desktop, so the highlighted tab
  // can sit outside the visible strip as the page scrolls. Pull it back in.
  useEffect(() => {
    const bar = tabScrollRef.current
    const btn = bar?.querySelector(`[data-tab="${activeAnchor}"]`)
    if (!bar || !btn) return
    const b = btn.getBoundingClientRect()
    const c = bar.getBoundingClientRect()
    if (b.left >= c.left && b.right <= c.right) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    bar.scrollTo({
      left: bar.scrollLeft + (b.left - c.left) - (c.width - b.width) / 2,
      behavior: reduce ? 'auto' : 'smooth',
    })
  }, [activeAnchor])

  // Build flat global gallery (promotions first, then every item with an image)
  // so the lightbox can page through everything in section order.
  const { globalGallery, globalIndexMap, promoStartIdx } = useMemo(() => {
    const gallery = dbPromotions
      .filter((p) => p.imageUrl)
      .map((p) => ({
        key: `promo-${p.id}`,
        image: p.imageUrl,
        name: (lang === 'th' ? p.titleTh : lang === 'zh' ? p.titleZh : p.titleEn) || p.titleEn,
        description: (lang === 'th' ? p.descriptionTh : lang === 'zh' ? p.descriptionZh : p.descriptionEn) || p.descriptionEn,
        priceText: `฿${p.priceCurrent}`,
      }))
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
    return { globalGallery: gallery, globalIndexMap: indexMap, promoStartIdx: 0 }
  }, [menuData, dbPromotions, lang])

  // Track which section is in view for the sticky tab highlight.
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
    // Highlight immediately on tap; IntersectionObserver will keep it in sync
    // once scrolling settles. In the order wizard the visible top header is
    // StepHeader, not <nav>, and its measured height is exposed as --nav-h.
    const cssNavH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'))
    const navH = Number.isFinite(cssNavH) ? cssNavH : (document.querySelector('nav')?.offsetHeight ?? 0)
    const barH = stickyTabRef.current?.offsetHeight ?? 52
    const y = el.getBoundingClientRect().top + window.scrollY - navH - barH - 8
    setActiveAnchor(id)
    window.scrollTo({ top: y, behavior: 'smooth' })
  }

  const cartLabel = CART_BTN_LABEL[lang] || CART_BTN_LABEL.en

  return (
    <>
      <MenuHero title={heroTitle} />

      {/* Sticky anchor shortcut bar */}
      <div ref={stickyTabRef} className="sticky top-[var(--nav-h,64px)] z-50 w-full bg-[#f5f2ee] border-b border-black/10">
        <div className="relative">
          {/* The outer element owns horizontal scrolling; the inner max-width
              row owns layout. This remains swipeable on iOS/LINE webviews,
              unlike auto margins on children of the overflow element. */}
          <div ref={tabScrollRef} className="overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max min-w-full justify-center gap-2 px-4 py-3">
              {visibleTabs.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  data-tab={id}
                  onClick={() => scrollTo(id)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-[11px] sm:text-xs tracking-[0.1em] uppercase font-semibold whitespace-nowrap transition-colors duration-200 cursor-pointer ${
                    activeAnchor === id
                      ? 'bg-[#4a3520] text-white shadow-sm shadow-[#4a3520]/20'
                      : 'bg-[#4a3520]/[0.07] text-[#4a3520]/70 hover:bg-[#4a3520]/15 hover:text-[#4a3520]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="lg:hidden pointer-events-none absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-[#f5f2ee] to-transparent" />
        </div>
        <div className="flex justify-center gap-1.5 pb-2">
          {Array.from({ length: TAB_DOT_COUNT }).map((_, i) => (
            <span key={i} className={`block rounded-full transition-all duration-300 ${i === tabDotIndex ? 'w-4 h-1.5 bg-[#4a3520]' : 'w-1.5 h-1.5 bg-[#4a3520]/30'}`} />
          ))}
        </div>
      </div>

      {/* Full scrollable menu. When the cart button is in play it floats over
          the bottom-right corner, so the list needs room to scroll clear of it
          — without this the LAST card's "add to cart" sits underneath it with
          no scroll left to move it out of the way. */}
      <div className={`w-full bg-[#f5f2ee] flore-menu ${showAddToCart ? 'pb-28' : ''}`}>
        {hasPromotions && (
          <div id="menu-section-promotion" className="border-b border-black/10">
            <div className="px-6 sm:px-10 lg:px-12 pt-10 pb-2">
              <h2 className="font-display font-light text-[clamp(36px,5vw,64px)] tracking-[-0.02em] text-ink leading-none">
                {primaryTabs.find((t) => t.id === 'promotion')?.label ?? 'Promotion'}
              </h2>
              <div className="mt-3 w-12 h-px bg-gold/60" />
            </div>
            <PromotionPanel
              lang={lang}
              dbPromotions={dbPromotions}
              showAddToCart={showAddToCart}
              onImageClick={setGlobalLbIndex}
              galleryStartIndex={promoStartIdx}
            />
          </div>
        )}

        {hasSignatureItems && (
          <div id="menu-section-signature" className="border-b border-black/10">
            <div className="px-6 sm:px-10 lg:px-12 pt-10 pb-2">
              <h2 className="font-display font-light text-[clamp(36px,5vw,64px)] tracking-[-0.02em] text-ink leading-none">
                {primaryTabs.find((t) => t.id === 'signature')?.label ?? 'Signature'}
              </h2>
              <div className="mt-3 w-12 h-px bg-gold/60" />
            </div>
            <SignaturePanel menuData={menuData} lang={lang} globalIndexMap={globalIndexMap} onImageClick={setGlobalLbIndex} showAddToCart={showAddToCart} />
          </div>
        )}

        {visibleTabs.map(({ id }) => {
          const sections = sectionsByTab[id]
          if (!sections?.length) return null
          return (
            <div key={id} id={`menu-section-${id}`} className="border-b border-black/10">
              {sections.map((section) => (
                <div key={section.cat} className="border-b border-black/[0.06] last:border-b-0">
                  <div className="px-6 sm:px-10 lg:px-12 pt-10 pb-2">
                    <h2 className="font-display font-light text-[clamp(36px,5vw,64px)] tracking-[-0.02em] text-ink leading-none">
                      {section.title}{section.titleEm ? <em className="not-italic text-gold"> {section.titleEm}</em> : null}
                    </h2>
                    <div className="mt-3 w-12 h-px bg-gold/60" />
                  </div>
                  <MenuSectionPanel
                    section={section}
                    items={section.items}
                    lang={lang}
                    menuAddOns={menuAddOnsForCategory(section.cat, lang)}
                    tasteNotes={section.cat === 'matcha' ? matchaTasteNotes(lang) : undefined}
                    globalIndexMap={globalIndexMap}
                    onImageClick={setGlobalLbIndex}
                    showAddToCart={showAddToCart}
                  />
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {globalLbIndex >= 0 && (
        <Lightbox
          items={globalGallery}
          index={globalLbIndex}
          onIndexChange={setGlobalLbIndex}
          onClose={() => setGlobalLbIndex(-1)}
        />
      )}

      {showAddToCart && totalQty > 0 && (
        // `cartBlockedNote` is how the /delivery wizard says the cart has not
        // reached the shop's minimum yet. It matters here specifically because
        // the menu now comes FIRST in that flow: this button is the way out of
        // the menu, so the reason it won't move has to be legible on the
        // button itself rather than waiting on a later screen.
        <div className="fixed bottom-6 right-5 z-[170] flex flex-col items-end gap-1.5">
          {cartBlockedNote && (
            <span className="max-w-[15rem] rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] leading-snug text-amber-800 shadow-sm">
              {cartBlockedNote}
            </span>
          )}
          <button
            onClick={handleCartClick}
            disabled={Boolean(cartBlockedNote)}
            className="flex items-center gap-2 bg-[#4a3520] text-white px-4 py-3 rounded-full shadow-lg font-semibold text-[13px] hover:bg-[#3a2818] transition-colors active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <span>{cartLabel}</span>
            <span className="bg-white text-[#4a3520] text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{totalQty}</span>
          </button>
        </div>
      )}
    </>
  )
}
