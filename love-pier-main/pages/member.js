import Head from 'next/head'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
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

// ── The card is cached on the device, and that is the whole speed story ──
//
// Nothing on this card changes between visits: the member number and the QR
// payload are assigned once and never re-rolled (see pages/api/member.js).
// Yet every visit used to wait on the full chain — LIFF SDK, liff.init(),
// getProfile(), then /api/member, which itself calls LINE twice before it
// touches the database — before the customer could see anything but a
// skeleton. That is a lot of network for bytes we already had.
//
// So: paint the last card immediately, then run the same chain as a
// background refresh that quietly replaces what is on screen. A returning
// customer sees their QR on the first frame; a failing refresh leaves the
// cached card up instead of an error (the QR staff scan is still valid).
const CARD_CACHE_KEY = 'love-pier:member-card:v1'
// Long, because the card itself does not expire — this is a floor on how
// stale the tier/name on it may be if the device never gets a refresh in.
const CARD_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

function readCachedCard() {
  if (typeof window === 'undefined') return null
  try {
    const cached = JSON.parse(window.localStorage.getItem(CARD_CACHE_KEY) || 'null')
    if (!cached?.member?.memberNo || !cached?.member?.qrPayload) return null
    if (Date.now() - Number(cached.savedAt || 0) > CARD_CACHE_MAX_AGE_MS) return null
    return cached
  } catch {
    return null
  }
}

// `qrDataUrl` is optional: a refresh that has no QR to hand keeps the stored
// one as long as it still belongs to this card's payload, so the next visit
// never has to pull the qrcode bundle in again.
function writeCachedCard({ userId, member, qrDataUrl }) {
  if (typeof window === 'undefined' || !member?.memberNo) return
  try {
    const prev = readCachedCard()
    const keptQr = prev?.member?.qrPayload === member.qrPayload ? prev.qrDataUrl || '' : ''
    window.localStorage.setItem(
      CARD_CACHE_KEY,
      JSON.stringify({
        userId: userId || prev?.userId || '',
        member,
        qrDataUrl: qrDataUrl || keptQr,
        savedAt: Date.now(),
      })
    )
  } catch {}
}

// Read through useSyncExternalStore rather than in an effect, so the cached
// card is part of the FIRST client render instead of a second one — and
// without the hydration mismatch a useState initialiser would cause on this
// prerendered page (the server has no localStorage; its snapshot is null).
// The snapshot has to be referentially stable, hence the module-level memo:
// nothing external mutates this cache mid-visit, only this page does, and
// fresher data arrives as `member` state.
let _cardSnapshot
function cardSnapshot() {
  if (_cardSnapshot === undefined) _cardSnapshot = readCachedCard()
  return _cardSnapshot
}
function noCardSnapshot() {
  return null
}
function subscribeToNothing() {
  return () => {}
}

function clearCachedCard() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(CARD_CACHE_KEY)
  } catch {}
}

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
    scanHint: 'ให้พนักงานสแกน QR นี้ก่อนชำระเงิน',
    error: 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่',
    errorLiff: 'เปิดบัตรสมาชิกจากเมนูในแชท LINE ของร้าน เพื่อให้ระบบรู้จักบัญชีของคุณ',
    errorAuth: 'เซสชัน LINE หมดอายุ กรุณาเข้าสู่ระบบใหม่',
    errorNetwork: 'เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
    codeLabel: 'รหัส',
    retry: 'ลองใหม่',
    group: 'กลุ่มสมาชิก', validUntil: 'สิทธิ์ถึง', allChannels: 'ใช้สิทธิ์ได้ทั้งหน้าร้านและเดลิเวอรี่',
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
    scanHint: 'Show this QR to our staff before you pay',
    error: 'Could not load your card. Please try again.',
    errorLiff: 'Open your card from our LINE chat menu so we can recognise your account.',
    errorAuth: 'Your LINE session has expired. Please log in again.',
    errorNetwork: 'Could not reach the server. Please try again.',
    codeLabel: 'Code',
    retry: 'Try again',
    group: 'Member group', validUntil: 'Valid until', allChannels: 'Benefits apply in store and on delivery',
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
    scanHint: '结账前请向店员出示此二维码',
    error: '无法加载会员卡，请重试。',
    errorLiff: '请从本店 LINE 聊天的菜单打开会员卡，以便系统识别您的账号。',
    errorAuth: 'LINE 登录已过期，请重新登录。',
    errorNetwork: '连接失败，请重试。',
    codeLabel: '代码',
    retry: '重试',
    group: '会员组', validUntil: '有效期至', allChannels: '店内及配送均可使用权益',
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
  // The card this device last saw, and the flag that disowns it when the
  // refresh comes back for a different LINE account.
  const storedCard = useSyncExternalStore(subscribeToNothing, cardSnapshot, noCardSnapshot)
  const [storedCardRejected, setStoredCardRejected] = useState(false)
  const stored = storedCardRejected ? null : storedCard

  // What is actually on screen: the fetched card the moment there is one,
  // the stored card until then. Everything downstream reads these, which is
  // why the network path below needs no "is a card already showing?" flag —
  // a failed REFRESH cannot blank a card that is right here.
  const card = member || stored?.member || null
  const cardQr =
    qrDataUrl || (stored?.member?.qrPayload === card?.qrPayload ? stored?.qrDataUrl || '' : '')
  const view = card ? 'card' : status

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
    // Same device, a different LINE account: disown the stored card rather
    // than leave someone else's QR on screen while this one loads.
    const onDevice = readCachedCard()
    if (onDevice?.userId && onDevice.userId !== lineProfile.userId) {
      clearCachedCard()
      setStoredCardRejected(true)
      setMember(null)
      setQrDataUrl('')
    }
    // Invisible while a stored card is showing — `view` keeps that card up —
    // and the skeleton only when there is genuinely nothing yet.
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
      // TEMPORARY (2026-08-26): appends the server's debug.reason to the
      // visible code so a screenshot of this card is the diagnosis — see the
      // matching temporary code in lib/lineIdentity.js / pages/api/member.js.
      if (res.status === 401) return fail('auth', `E401:${data?._debug?.reason || '?'}`)
      if (!res.ok) return fail('server', `E${res.status}`)
      if (!data?.member) return fail('server', 'E-EMPTY')
      setMember(data.member)
      writeCachedCard({ userId: lineProfile.userId, member: data.member })
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
  // on the login screen, and never again once the drawn QR is cached. Same
  // dynamic-import + data-URL technique as the PromptPay QR in
  // components/delivery/OrderFlow.js.
  useEffect(() => {
    if (!card?.qrPayload || cardQr) return
    const payload = card.qrPayload
    let cancelled = false
    ;(async () => {
      try {
        const QRCode = (await import('qrcode')).default
        const url = await QRCode.toDataURL(payload, { margin: 1, width: 320 })
        if (cancelled) return
        setQrDataUrl(url)
        // Stored with the card, so the next visit paints the QR without
        // pulling the qrcode bundle in at all.
        writeCachedCard({ member: card, qrDataUrl: url })
      } catch {
        // A missing QR still leaves the member number readable on the card.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [card, cardQr])

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
        {/* The critical path here is entirely LINE's — the LIFF SDK's config
            fetch, then liff.init()/getProfile() against api.line.me — so open
            those connections while the HTML is still parsing. */}
        <link rel="preconnect" href="https://api.line.me" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://static.line-scdn.net" crossOrigin="anonymous" />
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

          {view === 'loading' ? (
            <div className="overflow-hidden rounded-[28px] border border-black/10 bg-[#fffdf8] shadow-[0_24px_70px_rgba(74,53,32,0.08)]" aria-label={t.loading}>
              <div className="px-7 pb-7 pt-8">
                <div className="mx-auto h-56 w-56 animate-pulse rounded-2xl bg-black/[0.06]" />
              </div>
              <div className="bg-[#4a3520] px-7 py-7 text-center">
                <div className="mx-auto h-3 w-20 animate-pulse rounded-full bg-white/20" />
                <div className="mx-auto mt-3 h-10 w-36 animate-pulse rounded-xl bg-white/20" />
              </div>
              <div className="border-t border-black/10 bg-white/35 px-7 py-6">
                <div className="mx-auto h-3 w-32 animate-pulse rounded-full bg-black/[0.07]" />
                <div className="mx-auto mt-3 h-3 w-24 animate-pulse rounded-full bg-black/[0.07]" />
              </div>
            </div>
          ) : null}

          {view === 'logged-out' ? (
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

          {view === 'error' ? (
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

          {view === 'card' && card ? (
            <div className="overflow-hidden rounded-[28px] border border-black/10 bg-[#fffdf8] shadow-[0_24px_70px_rgba(74,53,32,0.08)]">
              <div className="px-7 pb-7 pt-8 text-center">
                {cardQr ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cardQr}
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

              {/* The member number takes the brown band the points balance used
                  to hold (2026-09-07). With the balance gone the code is the
                  one thing staff read off this screen, and an all-cream card
                  read as unfinished. Points still live on /rewards. */}
              <div className="bg-[#4a3520] px-7 py-7 text-center text-white">
                <p className="text-[10px] tracking-[0.24em] text-white/75">{t.memberNo}</p>
                <strong className="mt-2 block font-display text-[clamp(34px,10vw,46px)] font-normal leading-none tracking-[0.08em] text-white">
                  {card.memberNo}
                </strong>
                {card.name ? <p className="mt-3 text-[12px] text-white/75">{card.name}</p> : null}
              </div>

              <div className="border-t border-black/10 bg-white/35 px-7 py-6 text-center text-[12px] text-muted-strong">
                <p>{t.group}: <strong className="text-ink">{card.tierLabel}</strong></p>
                {card.tierExpiresAt ? <p className="mt-1">{t.validUntil}: {card.tierExpiresAt}</p> : null}
                <p className="mt-1">{t.allChannels}</p>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </>
  )
}
