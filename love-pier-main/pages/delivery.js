import Head from 'next/head'
import { useLanguage } from '../lib/language'
import Footer from '../components/Footer'
import { FOOTER_TAGLINES } from '../lib/footerTagline'
import OrderFlow from '../components/delivery/OrderFlow'
import OrderStatus from '../components/delivery/OrderStatus'
import { useChrome } from '../lib/chrome'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { cacheLiffProfile, initLiff, LIFF_RETURN_TO_KEY } from '../lib/liff'
import { getMenuPageData } from '../lib/db/menuPageData'
import { getShopSettings } from '../lib/settings'

// Only a local absolute path is accepted. This parameter crosses an OAuth
// redirect and is therefore untrusted even though we generated it.
function safePath(value) {
  const path = Array.isArray(value) ? value[0] : value
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') ? path : ''
}

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
  const { hidden, setHidden } = useChrome()
  const router = useRouter()
  // Start guarded so an OAuth callback can never flash the delivery wizard
  // before the client has checked sessionStorage for its intended route.
  const [checkingLiffReturn, setCheckingLiffReturn] = useState(true)
  // Where the customer was going before LINE login interrupted them; the
  // holding screen offers it as a link the moment it gives up waiting.
  const bridgeTarget = safePath(router.query.__liff_return_to)
  // ?order=<orderNo> turns this page into the order tracker. It shares the
  // delivery LIFF app's Endpoint URL, so the tracker inits LIFF and reuses the
  // cached profile in place — it never bridges, so it also never shows the
  // login holding screen below.
  const rawOrder = router.query.order
  const trackOrderNo = Array.isArray(rawOrder) ? rawOrder[0] : (typeof rawOrder === 'string' ? rawOrder : '')
  const bridging = !trackOrderNo && (checkingLiffReturn || (router.isReady && Boolean(router.query.__liff_return_to)))
  // The holding screen is a redirect step, not a page: showing the site nav
  // around it makes a stalled login look like a broken web page.
  useEffect(() => {
    setHidden(bridging)
  }, [bridging, setHidden])

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

    const safeReturnTo = safePath(returnTo) || '/'

    // LIFF can hang here — init that never settles, or a login redirect the
    // LINE webview silently refuses — and the customer is left staring at the
    // holding screen. Hand them back to where they were going regardless:
    // the destination works without a LINE identity, it just has to ask for
    // their details instead of filling them in.
    let settled = false
    const giveUp = window.setTimeout(() => {
      if (settled) return
      settled = true
      router.replace(safeReturnTo)
    }, 8000)
    const finish = (goBack) => {
      if (settled) return
      settled = true
      window.clearTimeout(giveUp)
      if (goBack) router.replace(safeReturnTo)
      else setCheckingLiffReturn(false)
    }

    initLiff()
      .then(async (liff) => {
        if (liff && !liff.isLoggedIn()) {
          liff.login()
          return false
        }
        if (liff) {
          const profile = await liff.getProfile()
          cacheLiffProfile({
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl || '',
            accessToken: liff.getAccessToken() || '',
          })
        }
        return true
      })
      .then((authenticated) => {
        // Not authenticated means liff.login() is navigating away; leave the
        // holding screen up (the timeout still covers a login that never goes).
        if (!authenticated) return
        try {
          window.sessionStorage.removeItem(LIFF_RETURN_TO_KEY)
        } catch {}
        finish(true)
      })
      // LIFF itself failed. Continue to the destination rather than stranding
      // the customer on a page that renders nothing.
      .catch(() => finish(true))

    return () => window.clearTimeout(giveUp)
  }, [router.isReady, router.query.__liff_return_to, router])

  // Never flash the delivery welcome screen while LIFF is consuming its
  // callback and sending a member/rewards visitor back where they started.
  // This is a holding screen, not a blank one: an earlier version rendered an
  // empty <main> here, so every way this step could fail looked to the
  // customer like the app had died inside the LINE webview.
  if (bridging) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#f5f1eb] px-6 text-center">
        <p className="text-[15px] text-black/60">กำลังเข้าสู่ระบบ LINE…</p>
        {bridgeTarget ? (
          <a href={bridgeTarget} className="text-[13px] text-[#8c682c] underline">
            ถ้ารอนานเกินไป แตะที่นี่เพื่อไปต่อ
          </a>
        ) : null}
      </main>
    )
  }

  if (trackOrderNo) {
    return (
      <>
        <Head>
          <meta name="robots" content="noindex" />
        </Head>
        <OrderStatus orderNo={trackOrderNo} />
      </>
    )
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
