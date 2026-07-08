import { eq } from 'drizzle-orm'
import { db } from '../../lib/db'
import { orders } from '../../lib/db/schema'
import { getShopSettings } from '../../lib/settings'
import { verifySlip } from '../../lib/slipok'

// Allow a slip image (base64) in the request body.
export const config = { api: { bodyParser: { sizeLimit: '8mb' } } }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const orderNo = typeof req.body?.orderNo === 'string' ? req.body.orderNo.trim() : ''
  const imageBase64 = req.body?.imageBase64
  if (!orderNo || !imageBase64) {
    return res.status(400).json({ error: 'ข้อมูลไม่ครบ' })
  }

  // Find the order.
  const [order] = await db.select().from(orders).where(eq(orders.orderNo, orderNo)).limit(1)
  if (!order) return res.status(404).json({ error: 'ไม่พบออเดอร์' })
  if (order.status === 'paid') {
    return res.status(200).json({ ok: true, verified: true, alreadyPaid: true })
  }

  const s = await getShopSettings()
  if (!s.slipokApiKey || !s.slipokBranchId) {
    return res.status(200).json({ ok: false, error: 'ร้านยังไม่ได้เปิดระบบตรวจสลิปอัตโนมัติ' })
  }

  const result = await verifySlip(
    { apiKey: s.slipokApiKey, branchId: s.slipokBranchId },
    { imageBase64, amount: order.totalAmount }
  )

  if (!result.ok) {
    return res.status(200).json({ ok: false, error: result.reason || 'ตรวจสอบไม่สำเร็จ' })
  }
  if (!result.verified) {
    return res.status(200).json({
      ok: false,
      duplicate: result.duplicate || false,
      error: result.duplicate ? 'สลิปนี้ถูกใช้ไปแล้ว' : result.reason || 'สลิปไม่ถูกต้อง',
    })
  }

  // Verified. Guard the amount (SlipOK also checks, but be safe).
  if (result.amount != null && Math.round(result.amount) !== order.totalAmount) {
    return res.status(200).json({
      ok: false,
      error: `ยอดในสลิป (฿${Math.round(result.amount)}) ไม่ตรงกับออเดอร์ (฿${order.totalAmount})`,
    })
  }

  try {
    await db
      .update(orders)
      .set({ status: 'paid', slipRef: result.transRef || null })
      .where(eq(orders.id, order.id))
  } catch (err) {
    // Unique index on slip_ref → this slip was already used for another order.
    console.error('mark paid failed:', err)
    return res.status(200).json({ ok: false, duplicate: true, error: 'สลิปนี้ถูกใช้ไปแล้ว' })
  }

  return res.status(200).json({ ok: true, verified: true, amount: order.totalAmount })
}
