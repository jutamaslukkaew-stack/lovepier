import Head from 'next/head'
import { useCallback, useEffect, useState } from 'react'
import { useChrome } from '../lib/chrome'
import { useLanguage } from '../lib/language'
import { getProfileIfLoggedIn, isLiffConfigured, loginAndGetProfile } from '../lib/liff'

// Love Pier ID — the customer's membership card.
//
// Opened from the LINE OA Rich Menu inside LIFF, so it hides the site
// nav/footer and reads as a dedicated card screen. States:
//   loading → logged-out → card
//
// THERE IS NO SIGNUP FORM (2026-08-26, journey document item 1: "เพิ่มเพื่อน =
// สมาชิกทันที ไม่มีฟอร์มสมัครซ้ำ"). First-time visitors used to be asked for a
// name, a phone number and an optional birthday before they could see a card.
// Now the page POSTs on load and the card comes back — named from the LINE
// profile, which the access token already proves. First visit and every visit
// after it take exactly the same path.

const COPY = {
  th: {
    title: 'Love Pier ID — บัตรสมาชิก',
    heading: 'Love Pier ID',
    tagline: 'บัตรสมาชิกของคุณ ใช้แสดงที่หน้าร้าน',
    loading: 'กำลังโหลด…',
    loginLead: 'เข้าสู่ระบบด้วย LINE เพื่อรับบัตรสมาชิก Love Pier ID ของคุณ',
    login: 'เข้าสู่ระบบด้วย LINE',
    unavailable: 'เปิดหน้านี้จากแอป LINE ของร้าน เพื่อรับบัตรสมาชิก',
    memberNo: 'รหัสสมาชิก',
    points: 'คะแนนสะสม',
    scanHint: 'ให้พนักงานสแกน QR นี้ก่อนชำระเงิน',
    error: 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่',
    retry: 'ลองใหม่',
  },
  en: {
    title: 'Love Pier ID — Membership card',
    heading: 'Love Pier ID',
    tagline: 'Your membership card — show it in store',
    loading: 'Loading…',
    loginLead: 'Log in with LINE to get your Love Pier ID card.',
    login: 'Log in with LINE',
    unavailable: 'Open this page from our LINE account to get your card.',
    memberNo: 'Member ID',
    points: 'Points balance',
    scanHint: 'Show this QR to our staff before you pay',
    error: 'Could not load your card. Please try again.',
    retry: 'Try again',
  },
  zh: {
    title: 'Love Pier ID — 会员卡',
    heading: 'Love Pier ID',
    tagline: '您的会员卡 — 到店出示即可',
    loading: '加载中…',
    loginLead: '使用 LINE 登录，即可领取您的 Love Pier ID 会员卡。',
    login: '使用 LINE 登录',
    unavailable: '请从本店 LINE 官方账号打开此页面以领取会员卡。',
    memberNo: '会员编号',
    points: '积分余额',
    scanHint: '结账前请向店员出示此二维码',
    error: '无法加载会员卡，请重试。',
    retry: '重试',
  },
}

export default function MemberPage() {
  const { lang } = useLanguage()
  const t = COPY[lang] || COPY.en
  const { setHidden: setChromeHidden } = useChrome()

  const [status, setStatus] = useState(() => (isLiffConfigured() ? 'loading' : 'logged-out'))
  const [profile, setProfile] = useState(null)
  const [member, setMember] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState('')

  // This is a card screen reached from the Rich Menu, not a marketing page.
  useEffect(() => {
    setChromeHidden(true)
    return () => setChromeHidden(false)
  }, [setChromeHidden])

  const loadMember = useCallback(async (lineProfile) => {
    if (!lineProfile?.userId) {
      setStatus('logged-out')
      return
    }
    setProfile(lineProfile)
    setStatus('loading')
    try {
      // POST, not GET: this both issues the card on a first visit and returns
      // an existing one, so there is a single round trip and a single code
      // path whether or not the customer has been here before. Idempotent —
      // /api/member only assigns a member number where there isn't one.
      const res = await fetch('/api/member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${lineProfile.accessToken || ''}`,
        },
        body: '{}',
      })
      const data = await res.json()
      if (!res.ok || !data.member) {
        setStatus('error')
        return
      }
      setMember(data.member)
      setStatus('card')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (!isLiffConfigured()) return
    getProfileIfLoggedIn()
      .then(loadMember)
      .catch(() => setStatus('logged-out'))
  }, [loadMember])

  // Only ever runs once a card exists — the qrcode bundle is never pulled in
  // on the login screen. Same dynamic-import + data-URL technique as
  // the PromptPay QR in components/delivery/OrderFlow.js.
  useEffect(() => {
    if (!member?.qrPayload) return
    let cancelled = false
    ;(async () => {
      try {
        const QRCode = (await import('qrcode')).default
        const url = await QRCode.toDataURL(member.qrPayload, { margin: 1, width: 320 })
        if (!cancelled) setQrDataUrl(url)
      } catch {
        // A missing QR still leaves the member number readable on the card.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [member?.qrPayload])

  async function handleLogin() {
    setStatus('loading')
    try {
      const lineProfile = await loginAndGetProfile()
      if (lineProfile) await loadMember(lineProfile)
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      <Head>
        <title>{t.title}</title>
        <meta property="og:title" content={t.title} />
        <meta property="og:description" content="บัตรสมาชิก Love Pier Beach Cafe" />
        <meta property="og:url" content="https://www.lovepier.cafe/member" />
        <meta property="og:type" content="website" />
      </Head>

      <main className="min-h-dvh bg-[#f5f1eb] px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto w-full max-w-md">
          <header className="mb-7 text-center">
            <p className="text-[10px] font-semibold tracking-[0.32em] text-gold-deep">LOVE PIER BEACH CAFE</p>
            <h1 className="mt-3 font-display text-[clamp(30px,8vw,42px)] font-light leading-none tracking-[-0.02em] text-ink">
              {t.heading}
            </h1>
            <p className="mt-3 text-[13px] font-light text-[#555]">{t.tagline}</p>
          </header>

          {status === 'loading' ? (
            <div className="rounded-[28px] border border-black/10 bg-[#fffdf8] px-6 py-14 text-center shadow-[0_24px_70px_rgba(74,53,32,0.08)]">
              <p className="text-[13px] text-muted-strong">{t.loading}</p>
            </div>
          ) : null}

          {status === 'logged-out' ? (
            <div className="rounded-[28px] border border-black/10 bg-[#fffdf8] p-7 text-center shadow-[0_24px_70px_rgba(74,53,32,0.08)]">
              {isLiffConfigured() ? (
                <>
                  <p className="mb-6 text-[13px] font-light leading-[1.9] text-[#555]">{t.loginLead}</p>
                  <button
                    type="button"
                    onClick={handleLogin}
                    className="flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-[#06C755] px-5 py-3.5 text-[13px] font-semibold text-white transition hover:bg-[#05b94e]"
                  >
                    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3C6.5 3 2 6.6 2 11c0 4 3.6 7.3 8.5 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6 1.5-1.7 2.6-3.4 2.6-4.9 0-4.4-4.5-8-10-8z" />
                    </svg>
                    {t.login}
                  </button>
                </>
              ) : (
                <p className="text-[13px] font-light leading-[1.9] text-[#555]">{t.unavailable}</p>
              )}
            </div>
          ) : null}

          {status === 'error' ? (
            <div className="rounded-[28px] border border-black/10 bg-[#fffdf8] p-7 text-center shadow-[0_24px_70px_rgba(74,53,32,0.08)]">
              <p className="text-[13px] text-muted-strong">{t.error}</p>
              <button
                type="button"
                onClick={handleLogin}
                className="mt-4 text-[13px] font-semibold text-gold-deep underline underline-offset-4"
              >
                {t.retry}
              </button>
            </div>
          ) : null}

          {status === 'card' && member ? (
            <div className="overflow-hidden rounded-[28px] border border-black/10 bg-[#fffdf8] shadow-[0_24px_70px_rgba(74,53,32,0.08)]">
              <div className="bg-[#4a3520] px-7 py-6 text-center text-white">
                <p className="text-[10px] tracking-[0.28em] text-white/70">{t.memberNo}</p>
                <strong className="mt-2 block font-display text-[clamp(30px,8vw,40px)] font-normal leading-none tracking-[0.06em]">
                  {member.memberNo}
                </strong>
                {member.name ? <p className="mt-3 text-[13px] text-white/80">{member.name}</p> : null}
              </div>

              <div className="px-7 py-7 text-center">
                {qrDataUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrDataUrl}
                      alt=""
                      className="mx-auto h-56 w-56 rounded-2xl border border-black/10 bg-white p-2"
                    />
                    <p className="mt-4 text-[12px] text-muted-strong">{t.scanHint}</p>
                  </>
                ) : (
                  <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-2xl border border-dashed border-black/15">
                    <p className="text-[12px] text-muted-strong">{t.loading}</p>
                  </div>
                )}
              </div>

              {/* Centred, not label-left/value-right. Split across the full
                  card width the two halves read as unrelated scraps in the
                  corners, and the balance — the one number a customer opens
                  this card to check after the QR — was the smallest thing on
                  the screen. Stacked and centred it matches the header and
                  the QR above it, so the whole card reads on one axis. */}
              <div className="border-t border-black/10 px-7 py-6 text-center">
                <p className="text-[11px] tracking-[0.14em] text-muted-strong">{t.points}</p>
                {/* The numeral alone, so it lands ON the centre axis rather
                    than beside it — pairing it with a unit word centres the
                    PAIR and pushes the digit off to the left. Nothing is lost
                    by dropping the unit: the label directly above it already
                    says these are points. */}
                <p className="mt-1.5 font-display text-[clamp(44px,13vw,56px)] font-normal leading-none text-gold-deep">
                  {Number(member.pointsBalance || 0).toLocaleString()}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </>
  )
}
