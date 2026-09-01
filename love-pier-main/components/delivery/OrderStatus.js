import Head from 'next/head'
import { Check } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getCachedLiffProfile, getProfileIfLoggedIn, loginAndGetProfile } from '../../lib/liff'
import OrderJourney from './OrderJourney'

// The order tracker, rendered inside /delivery (?order=<orderNo>) so it runs on
// the delivery LIFF app's own Endpoint URL — same init, same session, same
// cached profile as the order flow. It used to live at /order/[orderNo], a path
// no LIFF app is registered for, so every visit without an already-cached
// profile had to bounce through /delivery to log in and a single failed bounce
// left the page stuck on "loading" forever.

// OrderJourney is the same stepper the delivery success screen shows, so the
// two surfaces read as one flow. It only speaks paid → preparing → done, so
// pending / cancelled get their own small card instead.
const JOURNEY_T = {
  journeyPaid: 'ชำระเงิน',
  journeyPrep: 'ร้านกำลังเตรียม',
  journeyDeliver: 'กำลังจัดส่ง',
  journeyPickup: 'พร้อมให้รับ',
  // journeyTitle is deliberately omitted: OrderStatus renders the heading
  // itself so it can sit on one row with the live indicator.
  // The live dot already proves the page updates itself, so this line points
  // at the channel the customer can't see from here instead.
  journeyHint: 'ร้านจะแจ้งทุกครั้งที่สถานะเปลี่ยน ทาง LINE ด้วยนะคะ',
}

const STEPPER_STATUSES = ['paid', 'preparing', 'done']

// Tailwind tone classes rather than bespoke hex — matches the amber / emerald /
// red state colors already used across the delivery flow.
const STATUS_PILL = {
  pending: { label: 'รอชำระเงิน', cls: 'bg-amber-100 text-amber-800' },
  // Gold, not the brand brown: this pill sits ON the #3a2818 header, so the
  // brown-on-brown version was invisible — the customer's own payment state,
  // unreadable. #c9a96e is the accent already used for the shop name above it.
  paid: { label: 'ชำระเงินแล้ว', cls: 'bg-[#c9a96e] text-[#3a2818]' },
  preparing: { label: 'ร้านกำลังเตรียม', cls: 'bg-blue-100 text-blue-800' },
  done: { label: 'พร้อมแล้ว', cls: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'ยกเลิก', cls: 'bg-red-100 text-red-700' },
}

const POLL_MS = 10000
// After a failure, back off instead of hammering a server that is already
// struggling — and stop draining the phone's battery inside LINE's webview.
const BACKOFF_MS = [15000, 30000, 60000]
// Two failures before saying anything: one dropped request on a moving phone
// is normal and not worth a banner.
const STALE_AFTER_FAILURES = 2

function Shell({ children }) {
  return (
    <div className="min-h-[100dvh] bg-[#f5f2ee] px-5 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-3">{children}</div>
    </div>
  )
}

function PrimaryButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 rounded-xl bg-[#3a2818] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#4a3520] active:scale-[0.98]"
    >
      {children}
    </button>
  )
}

function lastCheckedLabel(lastOkAt, now) {
  if (!lastOkAt) return ''
  const seconds = Math.max(0, Math.round((now - lastOkAt) / 1000))
  if (seconds < 15) return 'อัปเดตล่าสุดเมื่อสักครู่'
  if (seconds < 60) return `อัปเดตล่าสุด ${seconds} วินาทีที่แล้ว`
  return `อัปเดตล่าสุด ${Math.round(seconds / 60)} นาทีที่แล้ว`
}

export default function OrderStatus({ orderNo }) {
  // `order` holds the last GOOD response and is never cleared by a transient
  // failure — a dropped poll used to blank a paid order back to "not found".
  const [order, setOrder] = useState(null)
  const [phase, setPhase] = useState('loading') // loading | ready | not-found | expired
  const [stale, setStale] = useState(false)
  const [lastOkAt, setLastOkAt] = useState(0)
  const [justChanged, setJustChanged] = useState(null)
  const [now, setNow] = useState(() => Date.now())

  const profileRef = useRef(null)
  const prevStatusRef = useRef(null)
  const failCountRef = useRef(0)
  const timerRef = useRef(null)
  const cancelledRef = useRef(false)

  const clearPending = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const applyOrder = useCallback((next) => {
    const prev = prevStatusRef.current
    prevStatusRef.current = next.status
    setOrder(next)
    // prev === null on the very first load: the customer already knew this
    // status when they opened the page, so announcing it would be noise.
    if (prev && prev !== next.status) setJustChanged(next.status)
  }, [])

  const loadOrder = useCallback(async () => {
    const token = profileRef.current?.accessToken
    if (!token || cancelledRef.current) return
    try {
      const res = await fetch(`/api/order-status?orderNo=${encodeURIComponent(orderNo)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (cancelledRef.current) return

      // 404 and 401 are real answers about this order; everything else is the
      // network or the server having a moment, and must not destroy what is
      // already on screen.
      if (res.status === 404) {
        failCountRef.current = 0
        setStale(false)
        setOrder(null)
        setPhase('not-found')
        return
      }
      if (res.status === 401) {
        failCountRef.current = 0
        setStale(false)
        setOrder(null)
        setPhase('expired')
        return
      }
      if (!res.ok) throw new Error(`http ${res.status}`)
      const data = await res.json()
      if (!data?.order) throw new Error('empty payload')
      if (cancelledRef.current) return

      failCountRef.current = 0
      setStale(false)
      setLastOkAt(Date.now())
      applyOrder(data.order)
      setPhase('ready')
    } catch {
      if (cancelledRef.current) return
      failCountRef.current += 1
      if (failCountRef.current >= STALE_AFTER_FAILURES) setStale(true)
      // Deliberately does NOT touch `order` or `phase`.
    }
  }, [orderNo, applyOrder])

  // Self-scheduling loop rather than setInterval: it can back off after a
  // failure, and it can be cancelled and re-fired the moment the tab is
  // foregrounded again. The tail call goes through a ref so each tick picks up
  // the current closure instead of the one captured when the loop started.
  const scheduleNextRef = useRef(null)
  const scheduleNext = useCallback(() => {
    clearPending()
    if (cancelledRef.current || document.hidden) return
    const fails = failCountRef.current
    const delay = fails === 0 ? POLL_MS : BACKOFF_MS[Math.min(fails - 1, BACKOFF_MS.length - 1)]
    timerRef.current = window.setTimeout(async () => {
      await loadOrder()
      scheduleNextRef.current?.()
    }, delay)
  }, [clearPending, loadOrder])

  // Runs before the mount effect below, so the ref is always populated by the
  // time a scheduled tick could fire.
  useEffect(() => {
    scheduleNextRef.current = scheduleNext
  }, [scheduleNext])

  const runNow = useCallback(async () => {
    clearPending()
    await loadOrder()
    scheduleNext()
  }, [clearPending, loadOrder, scheduleNext])

  useEffect(() => {
    cancelledRef.current = false

    // A LINE login redirect or a LIFF init that never settles must not leave
    // the customer on the loading text forever — fall through to a card that
    // offers a way forward.
    const safety = window.setTimeout(() => {
      if (!cancelledRef.current) setPhase((p) => (p === 'loading' ? 'expired' : p))
    }, 12000)

    ;(async () => {
      try {
        // Reuse the profile the delivery flow already cached this session
        // before falling back to a live check / login. We are on /delivery
        // here, the delivery LIFF app's registered Endpoint URL, so
        // loginAndGetProfile logs in on this page instead of bridging.
        const profile =
          getCachedLiffProfile() ||
          (await getProfileIfLoggedIn()) ||
          (await loginAndGetProfile({ ownEndpointPath: '/delivery' }))
        if (cancelledRef.current) return
        if (!profile?.accessToken) {
          // Login is redirecting away, or LIFF is unavailable — either way
          // stop loading so a card renders instead of hanging.
          setPhase('expired')
          return
        }
        profileRef.current = profile
        await loadOrder()
        scheduleNext()
      } catch {
        if (!cancelledRef.current) setPhase('expired')
      }
    })()

    return () => {
      cancelledRef.current = true
      window.clearTimeout(safety)
      clearPending()
      // React Strict Mode double-mounts effects in dev; without this the
      // second mount would see a stale previous status and fire the "updated"
      // banner for a change that never happened.
      prevStatusRef.current = null
      failCountRef.current = 0
    }
  }, [orderNo, loadOrder, scheduleNext, clearPending])

  // Pause entirely while backgrounded (no requests at all inside the LINE
  // webview), and refresh the instant the customer comes back rather than
  // making them stare at a stale status for up to 10s.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        failCountRef.current = 0
        runNow()
      } else {
        clearPending()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [runNow, clearPending])

  // Drives the "อัปเดตล่าสุด…" label. Paused while hidden alongside the poll —
  // a counter ticking against a frozen fetch would be lying.
  useEffect(() => {
    if (phase !== 'ready') return undefined
    const tick = window.setInterval(() => {
      if (!document.hidden) setNow(Date.now())
    }, 1000)
    return () => window.clearInterval(tick)
  }, [phase])

  // A cancellation is the one change the customer must not miss by looking
  // away, so it stays until they leave the page.
  useEffect(() => {
    if (!justChanged || justChanged === 'cancelled') return undefined
    const timer = window.setTimeout(() => setJustChanged(null), 6000)
    return () => window.clearTimeout(timer)
  }, [justChanged])

  if (phase === 'loading') {
    return (
      <Shell>
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="rounded-2xl border border-black/[0.06] bg-white/60 px-6 py-10 text-center"
        >
          <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-[#4a3520]/20 border-t-[#4a3520]" />
          <p className="mt-4 text-[13px] text-black/50">กำลังโหลดออเดอร์จาก LINE…</p>
        </div>
      </Shell>
    )
  }

  if (phase === 'not-found') {
    return (
      <Shell>
        <div className="flex flex-col items-center rounded-2xl border border-black/[0.06] bg-white/60 px-6 py-10 text-center text-[13px] text-black/55">
          <p>ไม่พบออเดอร์นี้</p>
          <PrimaryButton onClick={runNow}>ลองอีกครั้ง</PrimaryButton>
        </div>
      </Shell>
    )
  }

  if (phase === 'expired' || !order) {
    return (
      <Shell>
        <div className="flex flex-col items-center rounded-2xl border border-black/[0.06] bg-white/60 px-6 py-10 text-center text-[13px] text-black/55">
          <p>เซสชัน LINE หมดอายุ</p>
          <PrimaryButton onClick={() => loginAndGetProfile({ ownEndpointPath: '/delivery' })}>
            เข้าสู่ระบบ LINE อีกครั้ง
          </PrimaryButton>
        </div>
      </Shell>
    )
  }

  const pill = STATUS_PILL[order.status] || STATUS_PILL.pending
  const items = Array.isArray(order.items) ? order.items : []
  const showStepper = STEPPER_STATUSES.includes(order.status)
  const changedPill = justChanged ? STATUS_PILL[justChanged] : null

  return (
    <>
      <Head>
        <title>ออเดอร์ {order.orderNo} — Love Pier Beach Cafe</title>
        <meta name="robots" content="noindex" />
      </Head>
      <Shell>
        {/* Header — shop, order number, and the plain-language status word */}
        <div className="rounded-2xl bg-[#3a2818] px-5 py-5 text-white">
          <p className="text-[11px] tracking-[0.14em] text-[#c9a96e]">LOVE PIER BEACH CAFE</p>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <p className="font-display text-[20px] leading-none">ออเดอร์ {order.orderNo}</p>
            <span className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold ${pill.cls}`}>
              {pill.label}
            </span>
          </div>
        </div>

        {/* The page's only live region: it announces a status change and
            nothing else, so it stays worth listening to. */}
        {changedPill && (
          <div
            role="status"
            aria-live="polite"
            style={{ animation: 'fadeIn 400ms ease-out both' }}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-[13px] ${
              justChanged === 'cancelled'
                ? 'border-[#a5352f]/20 bg-[#fbeae9] text-[#7a2a26]'
                : 'border-[#5cbf62]/30 bg-[#eef7ee] text-[#2f5c33]'
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white ${
                justChanged === 'cancelled' ? 'bg-[#a5352f]' : 'bg-[#5cbf62]'
              }`}
            >
              <Check size={12} strokeWidth={3} />
            </span>
            <span>อัปเดตแล้ว — {changedPill.label}</span>
          </div>
        )}

        {/* Status — the shared stepper for a live order, a plain card otherwise */}
        {showStepper ? (
          <div className="rounded-2xl border border-black/[0.06] bg-white/60 px-3 pb-3 pt-3">
            {/* Heading and liveness share one row — stacked, the centred title
                and the right-aligned chip read as two unrelated fragments. */}
            <div className="mb-3 flex items-center justify-between gap-2 px-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8c682c]">
                สถานะออเดอร์
              </p>
              {/* 10px, a step below the heading beside it — the liveness chip
                  is reassurance, not a second title competing with it. */}
              <span className="flex items-center gap-1.5 text-[10px] text-[#8c682c]">
              {stale ? (
                <>
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-amber-500"
                    style={{ animation: 'orderSparkle 1.4s ease-in-out infinite' }}
                    aria-hidden="true"
                  />
                  <span className="text-amber-700">กำลังเชื่อมต่อใหม่…</span>
                </>
              ) : (
                <>
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-[#5cbf62]"
                    style={{ animation: 'orderSparkle 1.8s ease-in-out infinite' }}
                    aria-hidden="true"
                  />
                  {/* aria-live="off": a label that changes every second is
                      pure noise for a screen reader. */}
                  <span aria-live="off">{lastCheckedLabel(lastOkAt, now) || 'อัปเดตอัตโนมัติ'}</span>
                </>
              )}
              </span>
            </div>
            <OrderJourney
              method={order.deliveryMethod}
              status={order.status}
              t={JOURNEY_T}
              justChanged={justChanged}
            />
          </div>
        ) : order.status === 'cancelled' ? (
          <div className="rounded-2xl border border-[#a5352f]/20 bg-[#fbeae9] px-4 py-4 text-center text-[13px] leading-[1.8] text-[#7a2a26]">
            ออเดอร์นี้ถูกยกเลิก หากมีข้อสงสัยกรุณาติดต่อร้านทาง LINE
          </div>
        ) : (
          <div className="rounded-2xl border border-[#8a5a00]/20 bg-[#fdf1dd] px-4 py-4 text-center text-[13px] leading-[1.8] text-[#7a4f14]">
            รอชำระเงิน — กรุณาแนบสลิปการโอนในหน้าสั่งซื้อเพื่อยืนยัน
          </div>
        )}

        {/* Items + total */}
        <div className="rounded-2xl border border-black/[0.06] bg-white/60 px-5 py-4">
          <div className="space-y-1.5">
            {items.map((it, i) => (
              <div key={i} className="text-[14px]">
                <div className="flex justify-between gap-3">
                  <span className="text-ink">
                    {it.name} <span className="text-black/40">×{it.qty}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-black/70">
                    ฿{Math.round((Number(it.price) || 0) * (Number(it.qty) || 0))}
                  </span>
                </div>
                {it.note && <p className="text-[12px] leading-snug text-black/45">— {it.note}</p>}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-black/[0.08] pt-3">
            <span className="text-[13px] font-semibold text-ink">ยอดชำระ</span>
            <span className="font-display text-[18px] tabular-nums text-[#4a3520]">฿{order.totalAmount}</span>
          </div>
        </div>

        {/* Customer / delivery details */}
        <div className="rounded-2xl border border-black/[0.06] bg-white/60 px-5 py-4 text-[13px] leading-[1.9] text-black/60">
          <p>ชื่อ : {order.customerName}</p>
          <p>เบอร์โทร : {order.phone}</p>
          <p>รับอาหาร : {order.deliveryMethod === 'pickup' ? 'รับที่ร้าน' : 'ให้ร้านจัดส่ง'}</p>
          {order.scheduledFor && (
            <p className="font-medium text-[#8c682c]">
              สั่งล่วงหน้า : {new Date(order.scheduledFor).toLocaleString('th-TH', {
                // SSR'd on Vercel (UTC), and the page re-fetches every 10s — a
                // missing timeZone would be wrong on every reload.
                timeZone: 'Asia/Bangkok',
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })} น.
            </p>
          )}
          {order.address && <p>ที่อยู่ : {order.address}</p>}
          {order.distanceKm != null && <p>ระยะส่ง : {order.distanceKm} กม.</p>}
        </div>
      </Shell>
    </>
  )
}
