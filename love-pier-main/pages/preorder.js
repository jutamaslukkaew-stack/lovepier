import Head from 'next/head'
import { useLanguage } from '../lib/language'
import Footer from '../components/Footer'
import PageHero from '../components/PageHero'
import { FOOTER_TAGLINES } from '../lib/footerTagline'
import OrderFlow from '../components/delivery/OrderFlow'
import { useChrome } from '../lib/chrome'
import { getMenuPageData } from '../lib/db/menuPageData'
import { getShopSettings } from '../lib/settings'
import { getActivePreorderItems } from '../lib/db/preorderCatalog'

const PAGE_COPY = {
  th: {
    title: 'พรีออเดอร์ — Love Pier Beach Cafe',
    hero: 'พรีออเดอร์',
    unavailable: 'ขณะนี้ยังไม่เปิดรับพรีออเดอร์',
    unavailableNote: 'กรุณากลับมาใหม่อีกครั้ง หรือติดต่อร้านทาง LINE',
  },
  en: {
    title: 'Pre-order — Love Pier Beach Cafe',
    hero: 'Pre-order',
    unavailable: 'Pre-orders are currently closed',
    unavailableNote: 'Please check back later or contact us on LINE.',
  },
  zh: {
    title: '预约点餐 — Love Pier Beach Cafe',
    hero: '预约点餐',
    unavailable: '目前暂未开放预约点餐',
    unavailableNote: '请稍后再试，或通过 LINE 联系我们。',
  },
}

export default function Preorder(props) {
  const { lang } = useLanguage()
  const t = PAGE_COPY[lang] || PAGE_COPY.en
  const { hidden } = useChrome()

  return (
    <>
      <Head>
        <title>{t.title}</title>
        <meta property="og:title" content={t.title} />
        <meta property="og:description" content="สั่งอาหารล่วงหน้ากับ Love Pier Beach Cafe" />
        <meta property="og:image" content="https://www.lovepier.cafe/og-menu.png" />
        <meta property="og:url" content="https://www.lovepier.cafe/preorder" />
        <meta property="og:type" content="website" />
      </Head>

      {props.preorderEnabled ? (
        <OrderFlow {...props} heroTitle={t.hero} preOrderOnly />
      ) : (
        <>
          <PageHero title={t.hero} compact />
          <section className="bg-[#f5f2ee] px-6 py-16 text-center min-h-[45vh]">
            <h1 className="font-display text-[30px] text-ink">{t.unavailable}</h1>
            <p className="mt-3 text-[14px] text-black/55">{t.unavailableNote}</p>
          </section>
        </>
      )}

      {!hidden && <Footer tagline={FOOTER_TAGLINES.menu} />}
    </>
  )
}

export async function getServerSideProps() {
  const { dbMenuData, dbPromotions } = await getMenuPageData()
  const preorderItems = await getActivePreorderItems()
  const {
    radiusKm, minDeliveryOrder, pointsPerBaht, menuOptionsEnabled,
    preorderEnabled, shopOpenTime, shopCloseTime, shopClosedDays, preorderLeadMinutes, preorderMaxDaysAhead,
  } = await getShopSettings()

  return {
    props: {
      dbMenuData,
      dbPromotions,
      preorderItems: JSON.parse(JSON.stringify(preorderItems)),
      radiusKm: radiusKm ?? 5,
      minDeliveryOrder: minDeliveryOrder ?? 300,
      pointsPerBaht: pointsPerBaht ?? 20,
      menuOptionsEnabled: menuOptionsEnabled ?? false,
      preorderEnabled: preorderEnabled ?? false,
      shopOpenTime: shopOpenTime ?? '09:00',
      shopCloseTime: shopCloseTime ?? '18:00',
      shopClosedDays: shopClosedDays ?? [3],
      preorderLeadMinutes: Math.max(preorderLeadMinutes ?? 60, 3 * 24 * 60),
      preorderMaxDaysAhead: preorderMaxDaysAhead ?? 7,
    },
  }
}
