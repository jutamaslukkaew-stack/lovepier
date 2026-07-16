import Head from 'next/head'
import { useLanguage } from '../lib/language'
import Footer from '../components/Footer'
import { FOOTER_TAGLINES } from '../lib/footerTagline'
import OrderFlow from '../components/delivery/OrderFlow'
import { useChrome } from '../lib/chrome'
import { getMenuPageData } from '../lib/db/menuPageData'

const PAGE_COPY = {
  th: { title: 'เดลิเวอรี่ — Love Pier Beach Cafe', hero: 'เดลิเวอรี่' },
  en: { title: 'Delivery — Love Pier Beach Cafe', hero: 'Delivery' },
  zh: { title: '外卖 — Love Pier Beach Cafe', hero: '外卖' },
}

// Guided 6-step order flow (welcome → distance check → menu → summary →
// payment → success) — see components/delivery/OrderFlow.js. The menu step
// reuses components/menu/MenuExperience, the same shared menu layout as
// /menu, so section/layout edits there apply to both pages.
export default function Delivery({ dbMenuData, dbPromotions }) {
  const { lang } = useLanguage()
  const t = PAGE_COPY[lang] || PAGE_COPY.en
  const { hidden } = useChrome()

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

      <OrderFlow dbMenuData={dbMenuData} dbPromotions={dbPromotions} heroTitle={t.hero} />

      {!hidden && <Footer tagline={FOOTER_TAGLINES.menu} />}
    </>
  )
}

export async function getServerSideProps() {
  const { dbMenuData, dbPromotions } = await getMenuPageData()
  return { props: { dbMenuData, dbPromotions } }
}
