import Head from 'next/head'
import Footer from '../components/Footer'
import RewardsSection from '../components/RewardsSection'
import { FOOTER_TAGLINES } from '../lib/footerTagline'
import { useLanguage } from '../lib/language'

const PAGE_COPY = {
  th: {
    title: 'สะสมแต้ม — Love Pier Beach Cafe',
    description: 'ดูคะแนนสะสมและสิทธิประโยชน์ Love Pier Rewards',
  },
  en: {
    title: 'Rewards — Love Pier Beach Cafe',
    description: 'View your Love Pier Rewards balance and benefits.',
  },
  zh: {
    title: '积分奖励 — Love Pier Beach Cafe',
    description: '查看您的 Love Pier 积分与会员权益。',
  },
}

export default function RewardsPage() {
  const { lang } = useLanguage()
  const t = PAGE_COPY[lang] || PAGE_COPY.en

  return (
    <>
      <Head>
        <title>{t.title}</title>
        <meta name="description" content={t.description} />
        <meta property="og:title" content={t.title} />
        <meta property="og:description" content={t.description} />
        <meta property="og:image" content="https://www.lovepier.cafe/og-promotion.png" />
        <meta property="og:url" content="https://www.lovepier.cafe/rewards" />
        <meta property="og:type" content="website" />
      </Head>

      <RewardsSection />
      <Footer tagline={FOOTER_TAGLINES.promotion} />
    </>
  )
}
