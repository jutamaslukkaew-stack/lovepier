import { and, eq } from 'drizzle-orm'
import { db } from '../../lib/db'
import { orders } from '../../lib/db/schema'
import { verifyLineAccessToken } from '../../lib/lineIdentity'

function bearerToken(req) {
  const value = String(req.headers.authorization || '')
  return value.startsWith('Bearer ') ? value.slice(7).trim() : ''
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const orderNo = typeof req.query?.orderNo === 'string' ? req.query.orderNo.trim() : ''
  const profile = await verifyLineAccessToken(bearerToken(req))
  if (!orderNo || !profile?.userId) {
    return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ LINE ใหม่อีกครั้ง' })
  }

  const [order] = await db
    .select({
      orderNo: orders.orderNo,
      status: orders.status,
      customerName: orders.customerName,
      phone: orders.phone,
      address: orders.address,
      deliveryMethod: orders.deliveryMethod,
      distanceKm: orders.distanceKm,
      scheduledFor: orders.scheduledFor,
      items: orders.items,
      totalAmount: orders.totalAmount,
      // Banked into the customer's balance the moment this order turns paid
      // (lib/pointsAward.js). Sent so the tracker can show what the payment
      // is worth in points — before, the only place a customer ever saw that
      // was the success screen they had already navigated away from.
      pointsEarned: orders.pointsEarned,
    })
    .from(orders)
    .where(and(eq(orders.orderNo, orderNo), eq(orders.lineUserId, profile.userId)))
    .limit(1)

  if (!order) return res.status(404).json({ error: 'ไม่พบออเดอร์' })

  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({
    ok: true,
    status: order.status,
    order: {
      ...order,
      distanceKm: order.distanceKm != null ? Number(order.distanceKm) : null,
      scheduledFor: order.scheduledFor ? order.scheduledFor.toISOString() : null,
    },
  })
}
