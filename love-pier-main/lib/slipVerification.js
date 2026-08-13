// Shared slip-verification core.
//
// A customer can hand us a payment slip through two completely different
// doors, and both must behave identically or the order's paid/unpaid state
// depends on which door they happened to use:
//   1. the website's upload field   -> pages/api/verify-slip.js
//   2. sending the image into the   -> pages/api/line-webhook.js
//      LINE OA chat
//
// Door 2 exists because the order-confirmation message tells customers to
// attach the slip in the chat — before this module they did exactly that and
// the app never saw it, so the order sat unpaid and no confirmation card ever
// came back (see state.json note_2026_08_13_slip_in_chat).
//
// This module owns the storage + SlipOK + mark-paid sequence. It deliberately
// does NOT send any LINE message: the two callers notify differently (the web
// route pushes, the webhook replies with the replyToken it was handed).

import { eq } from 'drizzle-orm'
import { db } from './db'
import { orders } from './db/schema'
import { getShopSettings } from './settings'
import { verifySlip } from './slipok'
import { createAdminClient } from './supabase/admin'

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
    // Blob rather than the bare Buffer this used to pass. NOT a bug fix — the
    // slips already in production storage were checked and are valid JPEGs, so
    // this path never hit the Buffer-coercion corruption that broke the admin
    // image uploader (40029ca). It's kept in the Blob form only so every
    // server-side Storage upload in the codebase looks the same.
    const { error } = await sb.storage
      .from(SLIP_BUCKET)
      .upload(path, new Blob([new Uint8Array(bytes)], { type: mime }), {
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

/**
 * Store a slip against an order and, when SlipOK is configured, verify it with
 * the bank and mark the order paid. Never throws.
 *
 * The returned shape is what pages/api/verify-slip.js puts on the wire, so the
 * website's existing client code keeps working unchanged.
 *
 * @param {object} order  the orders row (needs id, orderNo, totalAmount, status)
 * @param {string} imageBase64  data URL or bare base64
 * @returns {Promise<{verified:boolean, stored:boolean, alreadyPaid?:boolean,
 *                    duplicate?:boolean, error?:string, amount?:number}>}
 */
export async function processSlipForOrder(order, imageBase64) {
  // Always keep the slip image with the order so the shop can review it in
  // /admin, even when it can't be verified automatically.
  const slipPath = await storeSlip(order.orderNo, imageBase64)
  if (slipPath) {
    await db.update(orders).set({ slipUrl: slipPath }).where(eq(orders.id, order.id))
  }
  const stored = Boolean(slipPath)

  if (order.status === 'paid') {
    return { verified: true, stored, alreadyPaid: true }
  }

  const s = await getShopSettings()

  // No automatic verification configured → just store the slip for manual review.
  if (!s.slipokApiKey || !s.slipokBranchId) {
    return { verified: false, stored }
  }

  const result = await verifySlip(
    { apiKey: s.slipokApiKey, branchId: s.slipokBranchId },
    { imageBase64, amount: order.totalAmount }
  )

  if (!result.ok) {
    return { verified: false, stored, error: result.reason || 'ตรวจสอบไม่สำเร็จ' }
  }
  if (!result.verified) {
    return {
      verified: false,
      stored,
      duplicate: result.duplicate || false,
      error: result.duplicate ? 'สลิปนี้ถูกใช้ไปแล้ว' : result.reason || 'สลิปไม่ถูกต้อง',
    }
  }
  if (result.amount != null && Math.round(result.amount) !== order.totalAmount) {
    return {
      verified: false,
      stored,
      error: `ยอดในสลิป (฿${Math.round(result.amount)}) ไม่ตรงกับออเดอร์ (฿${order.totalAmount})`,
    }
  }

  try {
    await db
      .update(orders)
      .set({ status: 'paid', slipRef: result.transRef || null })
      .where(eq(orders.id, order.id))
  } catch (err) {
    // slip_ref carries a unique constraint, so a losing race here means this
    // exact slip was already banked against another order.
    console.error('mark paid failed:', err)
    return { verified: false, stored, duplicate: true, error: 'สลิปนี้ถูกใช้ไปแล้ว' }
  }

  return { verified: true, stored, amount: order.totalAmount }
}
