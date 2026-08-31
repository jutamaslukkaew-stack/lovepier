import Head from 'next/head'
import { useEffect, useState } from 'react'
import { getCachedLiffProfile, getProfileIfLoggedIn, loginAndGetProfile } from '../../lib/liff'
import OrderJourney from '../../components/delivery/OrderJourney'

// OrderJourney is the same stepper the delivery success screen shows, so the
// two surfaces read as one flow. It only speaks paid → preparing → done, so
// pending / cancelled get their own small card instead.
const JOURNEY_T = {
  journeyPaid: 'ชำระเงิน',
  journeyPrep: 'ร้านกำลังเตรียม',
  journeyDeliver: 'กำลังจัดส่ง',
  journeyPickup: 'พร้อมให้รับ',
  journeyTitle: 'สถานะออเดอร์',
  journeyHint: 'หน้านี้อัปเดตสถานะให้อัตโนมัติ ไม่ต้องรีเฟรช',
}

const STEPPER_STATUSES = ['paid', 'preparing', 'done']

// Tailwind tone classes rather than bespoke hex — matches the amber / emerald /
// red state colors already used across the delivery flow.
const STATUS_PILL = {
  pending: { label: 'รอชำระเงิน', cls: 'bg-amber-100 text-amber-800' },
  paid: { label: 'ชำระเงินแล้ว', cls: 'bg-[#3a2818] text-white' },
  preparing: { label: 'ร้านกำลังเตรียม', cls: 'bg-blue-100 text-blue-800' },
  done: { label: 'พร้อมแล้ว', cls: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'ยกเลิก', cls: 'bg-red-100 text-red-700' },
}

function Shell({ children }) {
  return (
    <div className="min-h-[100dvh] bg-[#f5f2ee] px-5 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-3">{children}</div>
    </div>
  )
}

export default function OrderStatus({ orderNo }) {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let timer

    ;(async () => {
      try {
        // Reuse the profile the delivery flow already cached this session
        // before falling back to a live check / login bridge — same order as
        // the order flow, so arriving here from the success screen inside the
        // LINE webview resolves instantly instead of re-bridging.
        const profile = getCachedLiffProfile() || await getProfileIfLoggedIn() || await loginAndGetProfile()
        if (!profile?.accessToken || cancelled) return

        const loadOrder = async () => {
          const res = await fetch(`/api/order-status?orderNo=${encodeURIComponent(orderNo)}`, {
            headers: { Authorization: `Bearer ${profile.accessToken}` },
            cache: 'no-store',
          })
          const data = await res.json()
          if (!cancelled) {
            setOrder(res.ok ? data.order : null)
            setLoading(false)
          }
        }

        await loadOrder()
        timer = window.setInterval(loadOrder, 10000)
      } catch {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      if (timer) window.clearInterval(timer)
    }
  }, [orderNo])

  if (loading) {
    return (
      <Shell>
        <div className="rounded-2xl border border-black/[0.06] bg-white/60 px-6 py-10 text-center text-[13px] text-black/50">
          กำลังโหลดออเดอร์จาก LINE…
        </div>
      </Shell>
    )
  }

  if (!order) {
    return (
      <Shell>
        <div className="rounded-2xl border border-black/[0.06] bg-white/60 px-6 py-10 text-center text-[13px] text-black/55">
          ไม่พบออเดอร์นี้ หรือเซสชัน LINE หมดอายุ
        </div>
      </Shell>
    )
  }

  const pill = STATUS_PILL[order.status] || STATUS_PILL.pending
  const items = Array.isArray(order.items) ? order.items : []
  const showStepper = STEPPER_STATUSES.includes(order.status)

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
            <span
              className="shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold"
              style={{ color: pill.color, backgroundColor: pill.bg }}
            >
              {pill.label}
            </span>
          </div>
        </div>

        {/* Status — the shared stepper for a live order, a plain card otherwise */}
        {showStepper ? (
          <div className="rounded-2xl border border-black/[0.06] bg-white/60 px-3 pb-3 pt-4">
            <OrderJourney method={order.deliveryMethod} status={order.status} t={JOURNEY_T} />
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

export async function getServerSideProps({ params }) {
  return { props: { orderNo: String(params?.orderNo || '') } }
}
