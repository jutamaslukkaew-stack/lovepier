import { useEffect, useState } from 'react'
import { useLanguage } from '../lib/language'
import { getProfileIfLoggedIn, isLiffConfigured } from '../lib/liff'

const COPY = {
  th: {
    eyebrow: 'LOVE PIER REWARDS', title: 'อิ่มอร่อยทุกครั้ง ได้แต้มกลับไปทุกมื้อ',
    intro: 'เข้าสู่ระบบ LINE ตอนสั่งซื้อ เพื่อสะสมคะแนนเข้าบัญชีของคุณ และใช้เป็นส่วนลดเพิ่มจากโปรโมชันอื่นได้',
    spend: 'ทุกยอดใช้จ่าย', points: 'รับทันที', value: 'ใช้ลดได้',
    spendValue: '100 บาท', pointsValue: '5 คะแนน', valueValue: '5 บาท',
    note: '1 คะแนน = ส่วนลด 1 บาท · คะแนนใช้เป็นส่วนลด On Top ในออเดอร์ถัดไปได้',
    myPoints: 'คะแนนสะสมของคุณ', discountValue: 'ใช้เป็นส่วนลดได้',
    loading: 'กำลังตรวจสอบคะแนน…', noAccount: 'เริ่มสะสมคะแนนได้จากออเดอร์แรก', pointsUnit: 'คะแนน', baht: 'บาท', unavailable: 'ไม่สามารถโหลดคะแนนได้ กรุณาลองใหม่',
  },
  en: {
    eyebrow: 'LOVE PIER REWARDS', title: 'Every visit tastes better with rewards',
    intro: 'Sign in with LINE when ordering so points reach your account, then stack them on top of other promotions.',
    spend: 'Every spend', points: 'Earn', value: 'Redeem for',
    spendValue: '฿100', pointsValue: '5 points', valueValue: '฿5 off',
    note: '1 point = ฿1 discount · Redeem as an on-top discount on your next order',
    myPoints: 'Your reward balance', discountValue: 'Available discount',
    loading: 'Checking your points…', noAccount: 'Start earning with your first order', pointsUnit: 'points', baht: 'THB', unavailable: 'Could not load points. Please try again.',
  },
  zh: {
    eyebrow: 'LOVE PIER REWARDS', title: '每次消费，都有积分回馈',
    intro: '下单时使用 LINE 登录，积分将自动存入您的账户，并可与其他优惠叠加使用。',
    spend: '每消费', points: '立即获得', value: '可抵扣',
    spendValue: '฿100', pointsValue: '5 积分', valueValue: '฿5',
    note: '1 积分 = ฿1 优惠 · 下次订单可作为额外折扣使用',
    myPoints: '您的积分余额', discountValue: '可抵扣',
    loading: '正在查询积分…', noAccount: '首笔订单即可开始累积积分', pointsUnit: '积分', baht: '泰铢', unavailable: '无法加载积分，请重试。',
  },
}

export default function RewardsSection() {
  const { lang } = useLanguage()
  const t = COPY[lang] || COPY.en
  const rewards = [
    { label: t.spend, value: t.spendValue },
    { label: t.points, value: t.pointsValue },
    { label: t.value, value: t.valueValue },
  ]
  const [profile, setProfile] = useState(null)
  const [pointsBalance, setPointsBalance] = useState(null)
  const [accountStatus, setAccountStatus] = useState(() => isLiffConfigured() ? 'loading' : 'logged-out')

  async function loadBalance(lineProfile) {
    if (!lineProfile?.userId) {
      setAccountStatus('logged-out')
      return
    }
    setProfile(lineProfile)
    setAccountStatus('loading')
    try {
      const res = await fetch('/api/customer', {
        headers: { Authorization: `Bearer ${lineProfile.accessToken || ''}` },
      })
      const data = await res.json()
      setPointsBalance(Math.max(0, Number(data.customer?.pointsBalance) || 0))
      setAccountStatus('ready')
    } catch {
      setAccountStatus('error')
    }
  }

  useEffect(() => {
    if (!isLiffConfigured()) return
    // liff.init() never settles in a browser whose domain isn't registered with
    // the LIFF app (localhost, or a desktop visitor arriving from search). This
    // card is now the only thing in the column, so stop waiting after a few
    // seconds rather than leaving a spinner there forever.
    let settled = false
    const timer = setTimeout(() => { if (!settled) setAccountStatus('logged-out') }, 6000)
    const finish = () => { settled = true; clearTimeout(timer) }
    getProfileIfLoggedIn()
      .then((lineProfile) => { finish(); return loadBalance(lineProfile) })
      .catch(() => { finish(); setAccountStatus('logged-out') })
    return () => clearTimeout(timer)
  }, [])

  // Signed-out visitors see no card at all: the shop asked to drop the
  // add-LINE-friend panel (customers reach this page from inside LINE, already
  // signed in), and the login button lived in the same box.
  const showCard = accountStatus !== 'logged-out'

  return (
    <section id="rewards" className="relative scroll-mt-32 overflow-hidden border-b border-black/10 bg-[#f5f1eb] px-4 py-14 sm:px-8 sm:py-20 lg:px-14 lg:py-24 reveal">
      <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-[#b18a54]/20" />
      <div aria-hidden="true" className="absolute -right-10 -top-10 h-44 w-44 rounded-full border border-[#b18a54]/25" />
      <div className="relative mx-auto max-w-6xl">
        <div className={`grid gap-10 ${showCard ? 'lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] lg:items-center lg:gap-16' : ''}`}>
          <div>
            <p className="mb-4 text-[10px] font-semibold tracking-[0.32em] text-gold-deep">{t.eyebrow}</p>
            <h2 className="max-w-3xl font-display text-[clamp(34px,5vw,66px)] font-light leading-[1.05] tracking-[-0.02em] text-ink">{t.title}</h2>
            <p className="mt-5 max-w-2xl text-[14px] font-light leading-[1.9] text-[#555] sm:text-[15px]">{t.intro}</p>
            <div className="mt-9 grid grid-cols-3 overflow-hidden rounded-2xl border border-black/10 bg-white/70">
              {rewards.map((item, index) => (
                <div key={item.label} className={`px-3 py-5 sm:px-6 sm:py-7 ${index ? 'border-l border-black/10' : ''}`}>
                  <span className="block text-[9px] uppercase tracking-[0.16em] text-muted-strong sm:text-[10px]">{item.label}</span>
                  <strong className="mt-2 block font-display text-[clamp(19px,3.2vw,34px)] font-normal leading-none text-gold-deep">{item.value}</strong>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-muted-strong sm:text-[12px]">{t.note}</p>
          </div>
          {showCard ? (
            <div className="rounded-[28px] border border-black/10 bg-[#fffdf8] p-6 shadow-[0_24px_70px_rgba(74,53,32,0.08)] sm:p-8">
              {accountStatus === 'ready' ? (
                <div>
                  <p className="text-[10px] tracking-[0.16em] text-muted-strong">{t.myPoints}</p>
                  {profile?.displayName ? <p className="mt-0.5 text-[13px] text-ink">{profile.displayName}</p> : null}
                  <div className="mt-5 flex items-end justify-between gap-4">
                    <strong className="font-display text-[clamp(42px,6vw,64px)] font-normal leading-none text-gold-deep">{pointsBalance.toLocaleString()}</strong>
                    <span className="pb-1 text-[12px] text-muted-strong">{t.pointsUnit}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-4 text-[12px]">
                    <span className="text-muted-strong">{t.discountValue}</span>
                    <strong className="text-ink">{pointsBalance.toLocaleString()} {t.baht}</strong>
                  </div>
                  {pointsBalance === 0 ? <p className="mt-3 text-[11px] text-muted-strong">{t.noAccount}</p> : null}
                </div>
              ) : accountStatus === 'loading' ? (
                <p className="py-5 text-center text-[12px] text-muted-strong">{t.loading}</p>
              ) : (
                <p className="py-5 text-center text-[12px] text-muted-strong">{t.unavailable}</p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
