import Head from 'next/head'
import { useCallback, useEffect, useState } from 'react'
import { useChrome } from '../lib/chrome'
import { useLanguage } from '../lib/language'
import { getProfileIfLoggedIn, isLiffConfigured, loginAndGetProfile, MEMBER_LIFF_ID } from '../lib/liff'

// This page uses its OWN LIFF app (NEXT_PUBLIC_MEMBER_LIFF_ID), separate from
// the one /delivery uses — each LIFF app's Endpoint URL is fixed to one path,
// and this one's is /member. Passing the wrong LIFF ID to liff.init() fails
// even when the Console side (Rich Menu link, Endpoint URL) is configured
// correctly — see lib/liff.js's own comment and state.json's
// note_2026_08_25_member_liff / handoff_2026_08_25.

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
    errorLiff: 'เปิดบัตรสมาชิกจากเมนูในแชท LINE ของร้าน เพื่อให้ระบบรู้จักบัญชีของคุณ',
    errorAuth: 'เซสชัน LINE หมดอายุ กรุณาเข้าสู่ระบบใหม่',
    errorNetwork: 'เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
    codeLabel: 'รหัส',
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
    errorLiff: 'Open your card from our LINE chat menu so we can recognise your account.',
    errorAuth: 'Your LINE session has expired. Please log in again.',
    errorNetwork: 'Could not reach the server. Please try again.',
    codeLabel: 'Code',
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
    errorLiff: '请从本店 LINE 聊天的菜单打开会员卡，以便系统识别您的账号。',
    errorAuth: 'LINE 登录已过期，请重新登录。',
    errorNetwork: '连接失败，请重试。',
    codeLabel: '代码',
    retry: '重试',
  },
}

export default function MemberPage() {
  const { lang } = useLanguage()
  const t = COPY[lang] || COPY.en
  const { setHidden: setChromeHidden } = useChrome()

  const [status, setStatus] = useState(() => (isLiffConfigured(MEMBER_LIFF_ID) ? 'loading' : 'logged-out'))
  const [profile, setProfile] = useState(null)
  const [member, setMember] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  // { kind, code } — every path to the error card records why it got there.
  // Until 2026-08-25 all of them set a single 'error' state, so a LIFF failure
  // (the card cannot be issued at all) and a passing network blip (retrying
  // works) produced the same sentence, and a real-phone report carried no
  // information about which one had happened. See note_2026_08_25_member_liff.
  const [failure, setFailure] = useState(null)

  // This is a card screen reached from the Rich Menu, not a marketing page.
  useEffect(() => {
    setChromeHidden(true)
    return () => setChromeHidden(false)
  }, [setChromeHidden])

  const fail = useCallback((kind, code) => {
    setFailure({ kind, code })
    setStatus('error')
  }, [])

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
      // Parsed defensively: a 500 or a gateway timeout comes back as HTML, and
      // res.json() would then throw inside this try and be reported as a
      // network failure, which is the one thing it is not.
      let data = null
      try {
        data = await res.json()
      } catch {
        data = null
      }
      if (res.status === 401) return fail('auth', 'E401')
      if (!res.ok) return fail('server', `E${res.status}`)
      if (!data?.member) return fail('server', 'E-EMPTY')
      setMember(data.member)
      setStatus('card')
    } catch {
      // fetch() itself rejected: offline, blocked, or the request was dropped.
      fail('network', 'E-NET')
    }
  }, [fail])

  useEffect(() => {
    if (!isLiffConfigured(MEMBER_LIFF_ID)) return
    getProfileIfLoggedIn(MEMBER_LIFF_ID)
      .then(async (lineProfile) => {
        if (lineProfile) {
          await loadMember(lineProfile)
          return
        }
        // The membership page is a LINE-only destination. Start authentication
        // immediately and return to this route instead of presenting a second
        // login choice to a customer who already arrived from the LINE OA.
        const authenticatedProfile = await loginAndGetProfile({ liffId: MEMBER_LIFF_ID, ownEndpointPath: '/member' })
        if (authenticatedProfile) await loadMember(authenticatedProfile)
      })
      // liff.init()/liff.login() rejecting is the expected failure when this
      // page is opened as a plain https:// URL inside the LINE in-app browser
      // rather than through a liff.line.me URL — there is no LIFF context to
      // log in with. That is a Rich Menu/Endpoint URL configuration problem,
      // not something a retry fixes, so it gets its own message.
      .catch(() => fail('liff', 'E-LIFF'))
  }, [loadMember, fail])

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
      const lineProfile = await loginAndGetProfile({ liffId: MEMBER_LIFF_ID, ownEndpointPath: '/member' })
      if (lineProfile) await loadMember(lineProfile)
    } catch {
      fail('liff', 'E-LIFF')
    }
  }

  const failureCopy =
    failure?.kind === 'liff' ? t.errorLiff
    : failure?.kind === 'auth' ? t.errorAuth
    : failure?.kind === 'network' ? t.errorNetwork
    : t.error

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
            <div className="overflow-hidden rounded-[28px] border border-black/10 bg-[#fffdf8] shadow-[0_24px_70px_rgba(74,53,32,0.08)]" aria-label={t.loading}>
              <div className="px-7 pb-7 pt-8">
                <div className="mx-auto h-56 w-56 animate-pulse rounded-2xl bg-black/[0.06]" />
              </div>
              <div className="bg-[#4a3520] px-7 py-7 text-center">
                <div className="mx-auto h-3 w-24 animate-pulse rounded-full bg-white/20" />
                <div className="mx-auto mt-3 h-14 w-20 animate-pulse rounded-xl bg-white/20" />
              </div>
              <div className="border-t border-black/10 bg-white/35 px-7 py-6">
                <div className="mx-auto h-3 w-20 animate-pulse rounded-full bg-black/[0.07]" />
                <div className="mx-auto mt-3 h-9 w-32 animate-pulse rounded-lg bg-black/[0.07]" />
              </div>
            </div>
          ) : null}

          {status === 'logged-out' ? (
            <div className="rounded-[28px] border border-black/10 bg-[#fffdf8] p-7 text-center shadow-[0_24px_70px_rgba(74,53,32,0.08)]">
              {isLiffConfigured(MEMBER_LIFF_ID) ? (
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
              <p className="text-[13px] leading-[1.9] text-muted-strong">{failureCopy}</p>
              <button
                type="button"
                onClick={handleLogin}
                className="mt-4 text-[13px] font-semibold text-gold-deep underline underline-offset-4"
              >
                {t.retry}
              </button>
              {/* Small enough to ignore, specific enough that a screenshot of
                  this card is a diagnosis rather than the start of one. */}
              {failure?.code ? (
                <p className="mt-4 text-[11px] text-muted-strong">{t.codeLabel}: {failure.code}</p>
              ) : null}
            </div>
          ) : null}

          {status === 'card' && member ? (
            <div className="overflow-hidden rounded-[28px] border border-black/10 bg-[#fffdf8] shadow-[0_24px_70px_rgba(74,53,32,0.08)]">
              <div className="px-7 pb-7 pt-8 text-center">
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

              <div className="bg-[#4a3520] px-7 py-7 text-center text-white">
                <p className="text-[11px] font-medium tracking-[0.18em] text-white/75">{t.points}</p>
                <p className="mt-2 font-display text-[clamp(52px,16vw,68px)] font-normal leading-none text-white">
                  {Number(member.pointsBalance || 0).toLocaleString()}
                </p>
              </div>

              <div className="border-t border-black/10 bg-white/35 px-7 py-6 text-center">
                <p className="text-[10px] tracking-[0.24em] text-muted-strong">{t.memberNo}</p>
                <strong className="mt-2 block font-display text-[clamp(28px,8vw,38px)] font-normal leading-none tracking-[0.08em] text-ink">
                  {member.memberNo}
                </strong>
                {member.name ? <p className="mt-3 text-[12px] text-muted-strong">{member.name}</p> : null}
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </>
  )
}
