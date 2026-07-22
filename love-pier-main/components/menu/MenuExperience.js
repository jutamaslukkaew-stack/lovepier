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

export default function MenuExperience({ dbMenuData, dbPromotions = [], showAddToCart = false, heroTitle, onCartClick }) {
  const { lang } = useLanguage()
  const { totalQty, openCart } = useCart()
  const handleCartClick = onCartClick || openCart
  const primaryTabs = primaryTabsForLang(lang)
  const menuData = useMemo(() => buildMenuData(dbMenuData, lang), [dbMenuData, lang])
  const [activeAnchor, setActiveAnchor] = useState('signature')
  const [globalLbIndex, setGlobalLbIndex] = useState(-1)
  const tabScrollRef = useRef(null)
  const [tabDotIndex, setTabDotIndex] = useState(0)
  const TAB_DOT_COUNT = primaryTabs.length

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
    const navH = document.querySelector('nav')?.offsetHeight ?? 0
    const barH = 52
    const y = el.getBoundingClientRect().top + window.scrollY - navH - barH - 8
    window.scrollTo({ top: y, behavior: 'smooth' })
  }

  const foodSections = menuData.filter((s) => TAB_SECTION_CATS.food?.includes(s.cat))
  const drinkSections = menuData.filter((s) => TAB_SECTION_CATS.drinks?.includes(s.cat))
  const coffeeSections = menuData.filter((s) => s.cat === 'coffee')
  const matchaSections = menuData.filter((s) => s.cat === 'matcha')
  const sweetsSections = menuData.filter((s) => s.cat === 'sweets')
  const iceCreamSections = menuData.filter((s) => s.cat === 'ice-cream')
  const alcoholSections = menuData.filter((s) => s.cat === 'alcohol')

  const cartLabel = CART_BTN_LABEL[lang] || CART_BTN_LABEL.en

  return (
    <>
      <MenuHero title={heroTitle} />

      {/* Sticky anchor shortcut bar */}
      <div className="sticky top-[var(--nav-h,64px)] z-50 w-full bg-[#f5f2ee] border-b border-black/10">
        <div className="relative">
          <div ref={tabScrollRef} className="flex justify-center overflow-x-auto gap-2 px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
        <div className="flex justify-center gap-1.5 pb-2">
          {Array.from({ length: TAB_DOT_COUNT }).map((_, i) => (
            <span key={i} className={`block rounded-full transition-all duration-300 ${i === tabDotIndex ? 'w-4 h-1.5 bg-[#4a3520]' : 'w-1.5 h-1.5 bg-[#4a3520]/30'}`} />
          ))}
        </div>
      </div>

      {/* Full scrollable menu */}
      <div className="w-full bg-white flore-menu">
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

        <div id="menu-section-signature" className="border-b border-black/10">
          <div className="px-6 sm:px-10 lg:px-12 pt-10 pb-2">
            <h2 className="font-display font-light text-[clamp(36px,5vw,64px)] tracking-[-0.02em] text-ink leading-none">
              {primaryTabs.find((t) => t.id === 'signature')?.label ?? 'Signature'}
            </h2>
            <div className="mt-3 w-12 h-px bg-gold/60" />
          </div>
          <SignaturePanel menuData={menuData} lang={lang} globalIndexMap={globalIndexMap} onImageClick={setGlobalLbIndex} showAddToCart={showAddToCart} />
        </div>

        <div id="menu-section-food" className="border-b border-black/10">
          {foodSections.map((section) => (
            <div key={section.cat} className="border-b border-black/[0.06] last:border-b-0">
              <div className="px-6 sm:px-10 lg:px-12 pt-10 pb-2">
                <h2 className="font-display font-light text-[clamp(36px,5vw,64px)] tracking-[-0.02em] text-ink leading-none">
                  {section.title}{section.titleEm ? <em className="not-italic text-gold"> · {section.titleEm}</em> : null}
                </h2>
                <div className="mt-3 w-12 h-px bg-gold/60" />
              </div>
              <MenuSectionPanel
                section={section}
                items={section.items}
                lang={lang}
                menuAddOns={menuAddOnsForCategory(section.cat, lang)}
                globalIndexMap={globalIndexMap}
                onImageClick={setGlobalLbIndex}
                showAddToCart={showAddToCart}
              />
            </div>
          ))}
        </div>

        <div id="menu-section-coffee" className="border-b border-black/10">
          {coffeeSections.map((section) => (
            <div key={section.cat}>
              <div className="px-6 sm:px-10 lg:px-12 pt-10 pb-2">
                <h2 className="font-display font-light text-[clamp(36px,5vw,64px)] tracking-[-0.02em] text-ink leading-none">{section.title}</h2>
                <div className="mt-3 w-12 h-px bg-gold/60" />
              </div>
              <MenuSectionPanel
                section={section}
                items={section.items}
                lang={lang}
                menuAddOns={menuAddOnsForCategory(section.cat, lang)}
                globalIndexMap={globalIndexMap}
                onImageClick={setGlobalLbIndex}
                showAddToCart={showAddToCart}
              />
            </div>
          ))}
        </div>

        <div id="menu-section-matcha" className="border-b border-black/10">
          {matchaSections.map((section) => (
            <div key={section.cat}>
              <div className="px-6 sm:px-10 lg:px-12 pt-10 pb-2">
                <h2 className="font-display font-light text-[clamp(36px,5vw,64px)] tracking-[-0.02em] text-ink leading-none">{section.title}</h2>
                <div className="mt-3 w-12 h-px bg-gold/60" />
              </div>
              <MenuSectionPanel
                section={section}
                items={section.items}
                lang={lang}
                tasteNotes={matchaTasteNotes(lang)}
                globalIndexMap={globalIndexMap}
                onImageClick={setGlobalLbIndex}
                showAddToCart={showAddToCart}
              />
            </div>
          ))}
        </div>

        <div id="menu-section-drinks" className="border-b border-black/10">
          {drinkSections.map((section) => (
            <div key={section.cat} className="border-b border-black/[0.06] last:border-b-0">
              <div className="px-6 sm:px-10 lg:px-12 pt-10 pb-2">
                <h2 className="font-display font-light text-[clamp(36px,5vw,64px)] tracking-[-0.02em] text-ink leading-none">{section.title}</h2>
                <div className="mt-3 w-12 h-px bg-gold/60" />
              </div>
              <MenuSectionPanel
                section={section}
                items={section.items}
                lang={lang}
                globalIndexMap={globalIndexMap}
                onImageClick={setGlobalLbIndex}
                showAddToCart={showAddToCart}
              />
            </div>
          ))}
        </div>

        <div id="menu-section-sweets" className="border-b border-black/10">
          {sweetsSections.map((section) => (
            <div key={section.cat}>
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
                globalIndexMap={globalIndexMap}
                onImageClick={setGlobalLbIndex}
                showAddToCart={showAddToCart}
              />
            </div>
          ))}
        </div>

        {iceCreamSections.length > 0 && (
          <div id="menu-section-ice-cream" className="border-b border-black/10">
            {iceCreamSections.map((section) => (
              <div key={section.cat}>
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
                  globalIndexMap={globalIndexMap}
                  onImageClick={setGlobalLbIndex}
                  showAddToCart={showAddToCart}
                />
              </div>
            ))}
          </div>
        )}

        {alcoholSections.length > 0 && (
          <div id="menu-section-alcohol" className="border-b border-black/10">
            {alcoholSections.map((section) => (
              <div key={section.cat}>
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
                  globalIndexMap={globalIndexMap}
                  onImageClick={setGlobalLbIndex}
                  showAddToCart={showAddToCart}
                />
              </div>
            ))}
          </div>
        )}
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
        <button
          onClick={handleCartClick}
          className="fixed bottom-6 right-5 z-[170] flex items-center gap-2 bg-[#4a3520] text-white px-4 py-3 rounded-full shadow-lg font-semibold text-[13px] hover:bg-[#3a2818] transition-colors active:scale-95"
        >
          <span>{cartLabel}</span>
          <span className="bg-white text-[#4a3520] text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{totalQty}</span>
        </button>
      )}
    </>
  )
}
