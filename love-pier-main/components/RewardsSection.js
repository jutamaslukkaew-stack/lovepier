import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useLanguage } from '../lib/language'
import {
  clearLiffBridgeAttempt,
  getCachedLiffProfile,
  getProfileIfLoggedIn,
  forgetLiffProfile,
  hasTriedLiffBridge,
  isLiffConfigured,
  loginAndGetProfile,
  recallLiffProfile,
  REWARDS_LIFF_ID,
} from '../lib/liff'

// ── The balance is kept on the device so the page has something to show ──
//
// Reading your own points used to mean waiting out the entire LINE handshake
// before a single digit appeared — and when this page has no LIFF app of its
// own (NEXT_PUBLIC_REWARDS_LIFF_ID unset, which is the case in production
// today) that handshake bounces through /delivery and back, three full page
// loads inside the LINE webview.
//
// So the last balance seen on this device is painted immediately and the
// handshake becomes a background refresh. A refresh that fails or stalls
// leaves the number up rather than replacing it with an error — stale by a
// few points beats blank. Same technique as the membership card in
// pages/member.js; the shorter age limit is because a balance, unlike a
// member number, does change.
const BALANCE_CACHE_KEY = 'love-pier:points-balance:v1'
const BALANCE_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

function readCachedBalance() {
  if (typeof window === 'undefined') return null
  try {
    const cached = JSON.parse(window.localStorage.getItem(BALANCE_CACHE_KEY) || 'null')
    if (!cached || typeof cached.pointsBalance !== 'number') return null
    if (Date.now() - Number(cached.savedAt || 0) > BALANCE_CACHE_MAX_AGE_MS) return null
    return cached
  } catch {
    return null
  }
}

function writeCachedBalance({ userId, name, pointsBalance }) {
  if (typeof window === 'undefined' || typeof pointsBalance !== 'number') return
  try {
    window.localStorage.setItem(
      BALANCE_CACHE_KEY,
      JSON.stringify({ userId: userId || '', name: name || '', pointsBalance, savedAt: Date.now() })
    )
  } catch {}
}

function clearCachedBalance() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(BALANCE_CACHE_KEY)
  } catch {}
}

// Read through useSyncExternalStore so the stored balance is part of the
// FIRST render rather than a second one, and without the hydration mismatch a
// useState initialiser would cause (the server has no localStorage — its
// snapshot is null). The snapshot must be referentially stable, hence the
// module-level memo; anything fresher arrives as state.
let _balanceSnapshot
function balanceSnapshot() {
  if (_balanceSnapshot === undefined) _balanceSnapshot = readCachedBalance()
  return _balanceSnapshot
}
function noBalanceSnapshot() {
  return null
}
function subscribeToNothing() {
  return () => {}
}

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

// Distinguishes "the handshake ran out of time" from "it finished with no
// profile" in the race below — the two need opposite answers on screen.
const TIMED_OUT = Symbol('liff-handshake-timeout')

// This page's own LIFF app when the shop has created one (its Endpoint URL is
// /rewards, so the SDK initialises right here and a customer arriving from
// LINE is already authenticated — no button, no bounce). Otherwise the page
// borrows the delivery app, whose endpoint is /delivery, and has to bridge
// through it.
const OWN_LIFF_ID = REWARDS_LIFF_ID
const LIFF_ENDPOINT_PATH = OWN_LIFF_ID ? '/rewards' : '/delivery'

export default function RewardsSection() {
  const { lang } = useLanguage()
  const t = COPY[lang] || COPY.en
  const [profile, setProfile] = useState(null)
  const [pointsBalance, setPointsBalance] = useState(null)
  // loading → ready | signin | error. 'signin' is a dead end the customer can
  // act on (button), not a spinner — reached once the silent LINE handshake
  // and its one endpoint bridge have both had their turn without a profile.
  const [accountStatus, setAccountStatus] = useState(() => (isLiffConfigured(OWN_LIFF_ID || undefined) ? 'loading' : 'signin'))
  // The balance this device last saw, and the flag that disowns it when the
  // refresh comes back for a different LINE account.
  const storedBalance = useSyncExternalStore(subscribeToNothing, balanceSnapshot, noBalanceSnapshot)
  const [storedBalanceRejected, setStoredBalanceRejected] = useState(false)
  // Bumped to re-run the handshake once, after a remembered LINE session turns
  // out to be stale. Once only — `staleSessionRetried` is the guard that keeps
  // a token the server keeps rejecting from looping the page.
  const [handshakeNonce, setHandshakeNonce] = useState(0)
  const staleSessionRetried = useRef(false)
  const stored = storedBalanceRejected ? null : storedBalance

  // What is actually on screen: the fetched balance the moment there is one,
  // the stored balance until then. A number here outranks every other state —
  // a refresh that failed is not worth an error card in front of a figure the
  // customer can already read.
  const shownBalance = pointsBalance != null ? pointsBalance : stored ? stored.pointsBalance : null
  const shownName = profile?.displayName || stored?.name || ''
  const view = shownBalance != null ? 'ready' : accountStatus

  const loadBalance = useCallback(async (lineProfile) => {
    if (!lineProfile?.userId) {
      setAccountStatus('signin')
      return
    }
    setProfile(lineProfile)
    // Same device, a different LINE account: drop the stored balance rather
    // than show someone else's points while this one loads.
    const onDevice = readCachedBalance()
    if (onDevice?.userId && onDevice.userId !== lineProfile.userId) {
      clearCachedBalance()
      setStoredBalanceRejected(true)
      setPointsBalance(null)
    }
    // Invisible while a stored balance is showing — `view` keeps that number
    // up — and the spinner only when there is genuinely nothing yet.
    setAccountStatus('loading')
    // The LINE in-app browser can leave a fetch pending indefinitely; without
    // a ceiling the card stays on "checking your points…" for good.
    const controller = new AbortController()
    const abortTimer = window.setTimeout(() => controller.abort(), 10000)
    try {
      // /api/points, not /api/customer: the latter exists to refill the
      // checkout form and reads the settings, the group catalog and the two
      // most recent orders on the way to the one field this page shows.
      const res = await fetch('/api/points', {
        headers: { Authorization: `Bearer ${lineProfile.accessToken || ''}` },
        signal: controller.signal,
      })
      const data = await res.json()
      // 401 means the token was rejected by LINE itself, which for this page
      // almost always means a REMEMBERED session that has aged out. Drop it and
      // run the handshake again from scratch — that path can log in properly.
      // The customer sees nothing: any stored balance stays on screen.
      if (res.status === 401) {
        forgetLiffProfile()
        if (!staleSessionRetried.current) {
          staleSessionRetried.current = true
          setHandshakeNonce((n) => n + 1)
          return
        }
      }
      if (!res.ok) throw new Error(data?.error || 'Could not load points')
      const balance = Math.max(0, Number(data.pointsBalance) || 0)
      setPointsBalance(balance)
      writeCachedBalance({
        userId: lineProfile.userId,
        name: lineProfile.displayName || '',
        pointsBalance: balance,
      })
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
    // The LINE session this device logged in with earlier — from ordering, the
    // membership card, anywhere. sessionStorage above only survives inside one
    // LIFF window; this survives closing it, which is exactly the case that
    // used to cost a full bounce through /delivery just to read a number.
    // If the server rejects the token, the 401 path above forgets it and comes
    // back through here with the real handshake.
    const remembered = recallLiffProfile()
    if (remembered) return remembered
    // getProfileIfLoggedIn() calls liff.init(), and a LIFF app only initialises
    // on its own registered Endpoint URL. Calling it anywhere else is the
    // "liff.init() was called with a current URL that is not related to the
    // endpoint URL" case, and it does not fail, it HANGS: measured on
    // production 2026-09-05, /rewards sat on "กำลังตรวจสอบคะแนน…" for 27s+ and
    // never started the login, so nobody could read their balance at all.
    //
    // With this page's own LIFF app the endpoint IS /rewards, so the init runs
    // here and a customer who opened the LIFF link from LINE is already
    // authenticated — the balance appears with nothing to press. Without it,
    // skip the init entirely and let loginAndGetProfile() bridge through
    // /delivery; it comes back with the profile cached, which the branch above
    // then answers instantly.
    if (window.location.pathname === LIFF_ENDPOINT_PATH) {
      const existing = await getProfileIfLoggedIn(OWN_LIFF_ID || undefined)
      if (existing) return existing
    }
    return OWN_LIFF_ID
      ? loginAndGetProfile({ liffId: OWN_LIFF_ID, ownEndpointPath: '/rewards' })
      : loginAndGetProfile()
  }, [])

  const runSilentLogin = useCallback(() => {
    if (!isLiffConfigured(OWN_LIFF_ID || undefined)) return
    // liff.init()/login() can hang inside a blocked webview, so the handshake
    // needs a ceiling. It RACES the handshake rather than living in a timer
    // held by a ref: the effect's cleanup cancelled that timer, so any
    // remount — React's own double-mount in development is enough — left the
    // customer on "กำลังตรวจสอบคะแนน…" with nothing left to end it. Observed
    // 2026-09-05: still spinning after 23s. A race cannot be dropped.
    const ceiling = new Promise((resolve) => {
      window.setTimeout(() => resolve(TIMED_OUT), 12000)
    })
    Promise.race([resolveProfile(), ceiling])
      .then((p) => {
        if (p === TIMED_OUT) {
          // Only a spinner is worth replacing — a handshake that already
          // finished has the truer answer on screen.
          setAccountStatus((s) => (s === 'loading' ? 'error' : s))
          return undefined
        }
        if (p) return loadBalance(p)
        // No profile: either loginAndGetProfile() is navigating away to LINE /
        // the bridge (leave the spinner up for the redirect), or the bridge has
        // already been spent this session and no navigation is coming.
        if (hasTriedLiffBridge()) setAccountStatus('signin')
        return undefined
      })
      .catch(() => setAccountStatus('error'))
  }, [loadBalance, resolveProfile])

  useEffect(() => {
    runSilentLogin()
    // handshakeNonce is the retry signal, not a value this reads.
  }, [runSilentLogin, handshakeNonce])

  // Manual retry from the button: forget the spent bridge so the endpoint hop
  // is allowed to run once more, then re-enter the same handshake.
  const handleRetry = useCallback(() => {
    setAccountStatus('loading')
    // A customer pressing this has already been told something went wrong, so
    // start clean: forget any remembered session and let the spent bridge run
    // once more.
    forgetLiffProfile()
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
              {view === 'ready' ? (
                <div>
                  <p className="text-[10px] tracking-[0.16em] text-muted-strong">{t.myPoints}</p>
                  {shownName ? <p className="mt-0.5 text-[13px] text-ink">{shownName}</p> : null}
                  <div className="mt-5 flex items-end justify-between gap-4">
                    <strong className="font-display text-[clamp(42px,6vw,64px)] font-normal leading-none text-gold-deep">{shownBalance.toLocaleString()}</strong>
                    <span className="pb-1 text-[12px] text-muted-strong">{t.pointsUnit}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-4 text-[12px]">
                    <span className="text-muted-strong">{t.discountValue}</span>
                    <strong className="text-ink">{shownBalance.toLocaleString()} {t.baht}</strong>
                  </div>
                  {shownBalance === 0 ? <p className="mt-3 text-[11px] text-muted-strong">{t.noAccount}</p> : null}
                  <p className="mt-3 text-[11px] leading-relaxed text-muted-strong">{t.earnRate}</p>
                </div>
              ) : view === 'loading' ? (
                <p className="py-5 text-center text-[12px] text-muted-strong">{t.loading}</p>
              ) : (
                <div className="py-3 text-center">
                  <p className="text-[12px] text-muted-strong">
                    {view === 'error' ? t.unavailable : t.signInPrompt}
                  </p>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[#4a3520] px-5 py-3 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-[#3a2818] active:scale-[0.98]"
                  >
                    {view === 'error' ? t.retryCta : t.signInCta}
                  </button>
                </div>
              )}
            </div>
        </div>
      </div>
    </section>
  )
}
