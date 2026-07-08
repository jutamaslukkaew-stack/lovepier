import { eq } from 'drizzle-orm'
import { db } from '../../lib/db'
import { orders } from '../../lib/db/schema'
import { getShopSettings } from '../../lib/settings'
import { verifySlip } from '../../lib/slipok'
import { createAdminClient } from '../../lib/supabase/admin'

// Allow a slip image (base64) in the request body.
export const config = { api: { bodyParser: { sizeLimit: '8mb' } } }

const SLIP_BUCKET = 'slips'

function parseImage(imageBase64) {
  const m = String(imageBase64 || '').match(/^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i)
  if (m) return { mime: m[1], base64: m[2] }
  return { mime: 'image/jpeg', base64: String(imageBase64 || '').replace(/^data:[^;]+;base64,/, '') }
}

async function storeSlip(orderNo, imageBase64) {
  const { mime, base64 } = parseImage(imageBase64)
  if (!base64) return null
  try {
    const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg'
    const path = `${orderNo}/${Date.now()}.${ext}`
    const bytes = Buffer.from(base64, 'base64')
    const sb = createAdminClient()
    const { error } = await sb.storage.from(SLIP_BUCKET).upload(path, bytes, {
      contentType: mime,
      upsert: true,
    })
    if (error) {
      console.error('slip upload failed:', error.message)
      return null
    }
    return path
  } catch (err) {
    console.error('slip upload error:', err)
    return null
  }
}

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

  const [order] = await db.select().from(orders).where(eq(orders.orderNo, orderNo)).limit(1)
  if (!order) return res.status(404).json({ error: 'ไม่พบออเดอร์' })

  // Always keep the slip image with the order so the shop can review it in /admin.
  const slipPath = await storeSlip(orderNo, imageBase64)
  if (slipPath) {
    await db.update(orders).set({ slipUrl: slipPath }).where(eq(orders.id, order.id))
  }

  if (order.status === 'paid') {
    return res.status(200).json({ ok: true, verified: true, stored: true, alreadyPaid: true })
  }

  const s = await getShopSettings()

  // No automatic verification configured → just store the slip for manual review.
  if (!s.slipokApiKey || !s.slipokBranchId) {
    return res.status(200).json({ ok: true, verified: false, stored: true })
  }

  // SlipOK configured → verify with the bank.
  const result = await verifySlip(
    { apiKey: s.slipokApiKey, branchId: s.slipokBranchId },
    { imageBase64, amount: order.totalAmount }
  )

  if (!result.ok) {
    return res.status(200).json({ ok: true, verified: false, stored: true, error: result.reason || 'ตรวจสอบไม่สำเร็จ' })
  }
  if (!result.verified) {
    return res.status(200).json({
      ok: true,
      verified: false,
      stored: true,
      duplicate: result.duplicate || false,
      error: result.duplicate ? 'สลิปนี้ถูกใช้ไปแล้ว' : result.reason || 'สลิปไม่ถูกต้อง',
    })
  }

  if (result.amount != null && Math.round(result.amount) !== order.totalAmount) {
    return res.status(200).json({
      ok: true,
      verified: false,
      stored: true,
      error: `ยอดในสลิป (฿${Math.round(result.amount)}) ไม่ตรงกับออเดอร์ (฿${order.totalAmount})`,
    })
  }

  try {
    await db
      .update(orders)
      .set({ status: 'paid', slipRef: result.transRef || null })
      .where(eq(orders.id, order.id))
  } catch (err) {
    console.error('mark paid failed:', err)
    return res.status(200).json({ ok: true, verified: false, stored: true, duplicate: true, error: 'สลิปนี้ถูกใช้ไปแล้ว' })
  }

  return res.status(200).json({ ok: true, verified: true, stored: true, amount: order.totalAmount })
}
