import Head from 'next/head'
import { useLanguage } from '../lib/language'
import Footer from '../components/Footer'
import { FOOTER_TAGLINES } from '../lib/footerTagline'
import MenuExperience from '../components/menu/MenuExperience'
import { getMenuPageData } from '../lib/db/menuPageData'

const PAGE_COPY = {
  th: { title: 'Menu — Love Pier Beach Cafe', hero: 'เมนู อาหาร เครื่องดื่ม' },
  en: { title: 'Menu — Love Pier Beach Cafe', hero: 'Menu' },
  zh: { title: 'Menu — Love Pier Beach Cafe', hero: '菜单' },
}

export default function Menu({ dbMenuData, dbPromotions }) {
  const { lang } = useLanguage()
  const t = PAGE_COPY[lang] || PAGE_COPY.en

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

      <MenuExperience dbMenuData={dbMenuData} dbPromotions={dbPromotions} showAddToCart={false} heroTitle={t.hero} />

      <Footer tagline={FOOTER_TAGLINES.menu} />
    </>
  )
}

export async function getServerSideProps() {
  const { dbMenuData, dbPromotions } = await getMenuPageData()
  return { props: { dbMenuData, dbPromotions } }
}
