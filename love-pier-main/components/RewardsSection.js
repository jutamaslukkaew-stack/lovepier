import { useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage } from '../lib/language'
import {
  clearLiffBridgeAttempt,
  getCachedLiffProfile,
  getProfileIfLoggedIn,
  hasTriedLiffBridge,
  isLiffConfigured,
  loginAndGetProfile,
} from '../lib/liff'

const COPY = {
  th: {
    eyebrow: 'LOVE PIER REWARDS', title: 'อิ่มอร่อยทุกครั้ง ได้แต้มกลับไปทุกมื้อ',
    intro: 'เข้าสู่ระบบ LINE ตอนสั่งซื้อ เพื่อสะสมคะแนนเข้าบัญชีของคุณ และใช้เป็นส่วนลดเพิ่มจากโปรโมชันอื่นได้',
    earnRate: 'ทุกยอดใช้จ่าย 100 บาท รับ 5 คะแนน · 1 คะแนน = ส่วนลด 1 บาท ใช้เป็นส่วนลด On Top ในออเดอร์ถัดไปได้',
    myPoints: 'คะแนนสะสมของคุณ', discountValue: 'ใช้เป็นส่วนลดได้',
    loading: 'กำลังตรวจสอบคะแนน…', noAccount: 'เริ่มสะสมคะแนนได้จากออเดอร์แรก', pointsUnit: 'คะแนน', baht: 'บาท', unavailable: 'ไม่สามารถโหลดคะแนนได้ กรุณาลองใหม่',
    signInPrompt: 'เข้าสู่ระบบ LINE เพื่อดูคะแนนสะสมของคุณ',
    signInCta: 'เข้าสู่ระบบ LINE', retryCta: 'ลองอีกครั้ง',
  },
  en: {
    eyebrow: 'LOVE PIER REWARDS', title: 'Every visit tastes better with rewards',
    intro: 'Sign in with LINE when ordering so points reach your account, then stack them on top of other promotions.',
    earnRate: 'Every ฿100 spent earns 5 points · 1 point = ฿1 off, on top of other promotions, on your next order',
    myPoints: 'Your reward balance', discountValue: 'Available discount',
    loading: 'Checking your points…', noAccount: 'Start earning with your first order', pointsUnit: 'points', baht: 'THB', unavailable: 'Could not load points. Please try again.',
    signInPrompt: 'Sign in with LINE to see your reward balance',
    signInCta: 'Sign in with LINE', retryCta: 'Try again',
  },
  zh: {
    eyebrow: 'LOVE PIER REWARDS', title: '每次消费，都有积分回馈',
    intro: '下单时使用 LINE 登录，积分将自动存入您的账户，并可与其他优惠叠加使用。',
    earnRate: '每消费 ฿100 获得 5 积分 · 1 积分 = ฿1 优惠，下次订单可叠加使用',
    myPoints: '您的积分余额', discountValue: '可抵扣',
    loading: '正在查询积分…', noAccount: '首笔订单即可开始累积积分', pointsUnit: '积分', baht: '泰铢', unavailable: '无法加载积分，请重试。',
    signInPrompt: '使用 LINE 登录以查看您的积分余额',
    signInCta: '使用 LINE 登录', retryCta: '重试',
  },
}

export default function RewardsSection() {
  const { lang } = useLanguage()
  const t = COPY[lang] || COPY.en
  const [profile, setProfile] = useState(null)
  const [pointsBalance, setPointsBalance] = useState(null)
  // loading → ready | signin | error. 'signin' is a dead end the customer can
  // act on (button), not a spinner — reached once the silent LINE handshake
  // and its one endpoint bridge have both had their turn without a profile.
  const [accountStatus, setAccountStatus] = useState(() => (isLiffConfigured() ? 'loading' : 'signin'))
  const timeoutRef = useRef(null)

  const loadBalance = useCallback(async (lineProfile) => {
    if (!lineProfile?.userId) {
      setAccountStatus('signin')
      return
    }
    setProfile(lineProfile)
    setAccountStatus('loading')
    // The LINE in-app browser can leave a fetch pending indefinitely; without
    // a ceiling the card stays on "checking your points…" for good.
    const controller = new AbortController()
    const abortTimer = window.setTimeout(() => controller.abort(), 10000)
    try {
      const res = await fetch('/api/customer', {
        headers: { Authorization: `Bearer ${lineProfile.accessToken || ''}` },
        signal: controller.signal,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Could not load customer')
      setPointsBalance(Math.max(0, Number(data.customer?.pointsBalance) || 0))
      setAccountStatus('ready')
    } catch {
      setAccountStatus('error')
    } finally {
      window.clearTimeout(abortTimer)
    }
  }, [])

  // Silent LINE handshake: reuse a profile the delivery/member bridge already
  // cached this session, then fall back to a live check, then to one endpoint
  // bridge. Anything past that is a button the customer presses, not a spinner.
  const resolveProfile = useCallback(async () => {
    const cached = getCachedLiffProfile()
    if (cached) return cached
    const existing = await getProfileIfLoggedIn()
    if (existing) return existing
    return loginAndGetProfile()
  }, [])

  const runSilentLogin = useCallback(() => {
    if (!isLiffConfigured()) return
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    // liff.init()/login() can hang inside a blocked webview. Give LINE a
    // window, then surface a button the customer can actually press.
    timeoutRef.current = window.setTimeout(() => {
      setAccountStatus((s) => (s === 'loading' ? 'error' : s))
    }, 12000)
    resolveProfile()
      .then((p) => {
        if (p) {
          window.clearTimeout(timeoutRef.current)
          return loadBalance(p)
        }
        // No profile: either loginAndGetProfile() is navigating away to LINE /
        // the bridge (leave the spinner up for the redirect), or the bridge has
        // already been spent this session and no navigation is coming.
        if (hasTriedLiffBridge()) {
          window.clearTimeout(timeoutRef.current)
          setAccountStatus('signin')
        }
      })
      .catch(() => {
        window.clearTimeout(timeoutRef.current)
        setAccountStatus('error')
      })
  }, [loadBalance, resolveProfile])

  useEffect(() => {
    runSilentLogin()
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [runSilentLogin])

  // Manual retry from the button: forget the spent bridge so the endpoint hop
  // is allowed to run once more, then re-enter the same handshake.
  const handleRetry = useCallback(() => {
    setAccountStatus('loading')
    clearLiffBridgeAttempt()
    runSilentLogin()
  }, [runSilentLogin])

  return (
    <section id="rewards" className="relative scroll-mt-32 overflow-hidden border-b border-black/10 bg-[#f5f1eb] px-4 py-14 sm:px-8 sm:py-20 lg:px-14 lg:py-24 reveal">
      <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-[#b18a54]/20" />
      <div aria-hidden="true" className="absolute -right-10 -top-10 h-44 w-44 rounded-full border border-[#b18a54]/25" />
      <div className="relative mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] lg:items-center lg:gap-16">
          <div>
            <p className="mb-4 text-[10px] font-semibold tracking-[0.32em] text-gold-deep">{t.eyebrow}</p>
            <h2 className="max-w-3xl font-display text-[clamp(34px,5vw,66px)] font-light leading-[1.05] tracking-[-0.02em] text-ink">{t.title}</h2>
            <p className="mt-5 max-w-2xl text-[14px] font-light leading-[1.9] text-[#555] sm:text-[15px]">{t.intro}</p>
          </div>
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
                  <p className="mt-3 text-[11px] leading-relaxed text-muted-strong">{t.earnRate}</p>
                </div>
              ) : accountStatus === 'loading' ? (
                <p className="py-5 text-center text-[12px] text-muted-strong">{t.loading}</p>
              ) : (
                <div className="py-3 text-center">
                  <p className="text-[12px] text-muted-strong">
                    {accountStatus === 'error' ? t.unavailable : t.signInPrompt}
                  </p>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[#4a3520] px-5 py-3 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#3a2818] active:scale-[0.98]"
                  >
                    {accountStatus === 'error' ? t.retryCta : t.signInCta}
                  </button>
                </div>
              )}
            </div>
        </div>
      </div>
    </section>
  )
}
