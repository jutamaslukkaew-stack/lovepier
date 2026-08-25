import Head from 'next/head'
import { useLanguage } from '../lib/language'
import Footer from '../components/Footer'
import { FOOTER_TAGLINES } from '../lib/footerTagline'
import OrderFlow from '../components/delivery/OrderFlow'
import { useChrome } from '../lib/chrome'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { initLiff, LIFF_RETURN_TO_KEY } from '../lib/liff'
import { getMenuPageData } from '../lib/db/menuPageData'
import { getShopSettings } from '../lib/settings'

const PAGE_COPY = {
  th: { title: 'เดลิเวอรี่ — Love Pier Beach Cafe', hero: 'เดลิเวอรี่' },
  en: { title: 'Delivery — Love Pier Beach Cafe', hero: 'Delivery' },
  zh: { title: '外卖 — Love Pier Beach Cafe', hero: '外卖' },
}

// Guided 6-step order flow (welcome → distance check → menu → summary →
// payment → success) — see components/delivery/OrderFlow.js. The menu step
// reuses components/menu/MenuExperience, the same shared menu layout as
// /menu, so section/layout edits there apply to both pages.
export default function Delivery({ dbMenuData, dbPromotions, radiusKm, minDeliveryOrder, pointsPerBaht, menuOptionsEnabled }) {
  const { lang } = useLanguage()
  const t = PAGE_COPY[lang] || PAGE_COPY.en
  const { hidden } = useChrome()
  const router = useRouter()
  // Start guarded so an OAuth callback can never flash the delivery wizard
  // before the client has checked sessionStorage for its intended route.
  const [checkingLiffReturn, setCheckingLiffReturn] = useState(true)

  useEffect(() => {
    if (!router.isReady) return
    const raw = router.query.__liff_return_to
    const queryReturnTo = Array.isArray(raw) ? raw[0] : raw
    let storedReturnTo = ''
    try {
      storedReturnTo = window.sessionStorage.getItem(LIFF_RETURN_TO_KEY) || ''
    } catch {}
    const returnTo = queryReturnTo || storedReturnTo
    if (!returnTo) {
      const timer = window.setTimeout(() => setCheckingLiffReturn(false), 0)
      return () => window.clearTimeout(timer)
    }

    // Only a local absolute path is accepted. This parameter crosses an OAuth
    // redirect and is therefore untrusted even though we generated it.
    const safeReturnTo = returnTo.startsWith('/') && !returnTo.startsWith('//')
      ? returnTo
      : '/'
    initLiff()
      .then((liff) => {
        if (liff && !liff.isLoggedIn()) {
          liff.login()
          return false
        }
        return true
      })
      .then((authenticated) => {
        if (!authenticated) return
        try {
          window.sessionStorage.removeItem(LIFF_RETURN_TO_KEY)
        } catch {}
        router.replace(safeReturnTo)
      })
      .catch(() => setCheckingLiffReturn(false))
  }, [router.isReady, router.query.__liff_return_to, router])

  // Never flash the delivery welcome screen while LIFF is consuming its
  // callback and sending a member/rewards visitor back where they started.
  if (checkingLiffReturn || (router.isReady && router.query.__liff_return_to)) {
    return <main className="min-h-dvh bg-[#f5f1eb]" aria-label="กำลังเปิดบัตรสมาชิก" />
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

      <OrderFlow
        dbMenuData={dbMenuData}
        dbPromotions={dbPromotions}
        heroTitle={t.hero}
        radiusKm={radiusKm}
        minDeliveryOrder={minDeliveryOrder}
        pointsPerBaht={pointsPerBaht}
        menuOptionsEnabled={menuOptionsEnabled}
      />

      {!hidden && <Footer tagline={FOOTER_TAGLINES.menu} />}
    </>
  )
}

export async function getServerSideProps() {
  const { dbMenuData, dbPromotions } = await getMenuPageData()
  // The welcome screen states the delivery radius before the customer commits
  // to a LINE login, so it has to know it up front — /api/delivery-distance
  // only reports it after the GPS check.
  const {
    radiusKm, minDeliveryOrder, pointsPerBaht, menuOptionsEnabled,
  } = await getShopSettings()
  return {
    props: {
      dbMenuData,
      dbPromotions,
      radiusKm: radiusKm ?? 5,
      minDeliveryOrder: minDeliveryOrder ?? 300,
      pointsPerBaht: pointsPerBaht ?? 20,
      menuOptionsEnabled: menuOptionsEnabled ?? false,
    },
  }
}
