import { eq } from 'drizzle-orm'
import Head from 'next/head'
import { db } from '../../lib/db'
import { orders } from '../../lib/db/schema'

const STATUS = {
  pending: { label: 'รอชำระเงิน', color: '#b58900', bg: '#fdf6e3' },
  paid: { label: 'ชำระเงินแล้ว', color: '#f5f3ef', bg: '#3a2818' },
  preparing: { label: 'กำลังเตรียม', color: '#1a73e8', bg: '#eaf1fd' },
  done: { label: 'เสร็จสิ้น', color: '#555', bg: '#f2f2f2' },
  cancelled: { label: 'ยกเลิก', color: '#c0392b', bg: '#fdeceb' },
}

export default function OrderStatus({ order }) {
  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f3ef] px-6 text-center">
        <p className="text-ink/60">ไม่พบออเดอร์นี้</p>
      </div>
    )
  }

  const st = STATUS[order.status] || STATUS.pending
  const items = Array.isArray(order.items) ? order.items : []

  return (
    <>
      <Head>
        <title>ออเดอร์ {order.orderNo} — Love Pier Beach Cafe</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="min-h-screen bg-[#f5f3ef] py-8 px-4">
        <div className="mx-auto max-w-md bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-[#3a2818] px-6 py-5 text-white">
            <p className="text-[13px] text-[#c9a96e]">Love Pier Beach Cafe</p>
            <p className="font-semibold text-lg">ออเดอร์ {order.orderNo}</p>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-black/50">สถานะ</span>
              <span
                className="text-[13px] font-semibold px-3 py-1 rounded-full"
                style={{ color: st.color, backgroundColor: st.bg }}
              >
                {st.label}
              </span>
            </div>

            <div className="border-t border-dashed border-black/15 pt-3 space-y-1.5">
              {items.map((it, i) => (
                <div key={i} className="flex justify-between text-[14px]">
                  <span className="text-ink">
                    {it.name} <span className="text-black/40">×{it.qty}</span>
                  </span>
                  <span className="tabular-nums text-black/70">
                    ฿{Math.round((Number(it.price) || 0) * (Number(it.qty) || 0))}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-black/15 pt-3 space-y-1 text-[13px] text-black/60">
              <p>ชื่อ : {order.customerName}</p>
              <p>เบอร์โทร : {order.phone}</p>
              {order.address && <p>ที่อยู่ : {order.address}</p>}
              {order.distanceKm != null && <p>ระยะส่ง : {order.distanceKm} กม.</p>}
            </div>

            <div className="border-t border-dashed border-black/15 pt-3 flex items-center justify-between">
              <span className="font-semibold text-ink">ยอดชำระ</span>
              <span className="font-bold text-[18px] text-[#4a3520] tabular-nums">฿{order.totalAmount}</span>
            </div>

            {order.status === 'pending' && (
              <p className="text-[12px] text-amber-700 text-center pt-2">
                กรุณาแนบสลิปการโอนเพื่อยืนยันการชำระเงิน
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export async function getServerSideProps({ params }) {
  const orderNo = String(params?.orderNo || '')
  try {
    const [row] = await db.select().from(orders).where(eq(orders.orderNo, orderNo)).limit(1)
    if (!row) return { props: { order: null } }
    return {
      props: {
        order: {
          orderNo: row.orderNo,
          status: row.status,
          customerName: row.customerName,
          phone: row.phone,
          address: row.address,
          distanceKm: row.distanceKm != null ? Number(row.distanceKm) : null,
          items: row.items,
          totalAmount: row.totalAmount,
        },
      },
    }
  } catch {
    return { props: { order: null } }
  }
}
