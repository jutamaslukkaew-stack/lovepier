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
 * Turn SlipOK's raw failure text into something a customer can act on.
 *
 * SlipOK answers the integrator, not the payer: "รูปภาพไม่มี QR Code" is
 * accurate but leaves someone who photographed their slip badly with no idea
 * what to do next. Every branch here ends in an instruction.
 *
 * Explicit \n are load-bearing — Thai has no inter-word spaces, so LINE's Flex
 * auto-wrap will otherwise break these mid-word (see lib/orderFlex.js).
 *
 * The raw text is never discarded, only demoted to `rawError` for the server
 * log, so a genuinely new SlipOK failure is still diagnosable.
 */
function customerSlipMessage(raw, { duplicate, unavailable } = {}) {
  const text = String(raw || '')

  // Our own checker is down or misconfigured. Nothing about the customer's
  // image is wrong, so telling them to resend it would be false advice.
  if (unavailable) {
    return 'ตรวจสอบสลิปอัตโนมัติไม่สำเร็จ\nทางร้านจะตรวจสอบให้เองนะคะ'
  }
  if (duplicate) {
    return 'สลิปนี้เคยใช้ยืนยันการชำระเงินแล้ว\nหากยังไม่ได้รับการยืนยัน รบกวนแจ้งทางร้านได้เลยนะคะ'
  }
  // Covers "รูปภาพไม่มี QR Code" and any wording about an unreadable QR — by
  // far the most common failure, and almost always a cropped screenshot or a
  // photo that cut the QR off.
  if (/qr/i.test(text)) {
    return 'อ่าน QR ในสลิปไม่ได้\nรบกวนส่งภาพสลิปเต็มใบจากแอปธนาคาร\nให้เห็น QR ชัดเจนอีกครั้งนะคะ'
  }
  // SlipOK could not treat the image as a slip at all.
  if (/ไม่ใช่สลิป|ไม่พบ|อ่าน.*ไม่|ผิดรูปแบบ/.test(text)) {
    return 'อ่านข้อมูลในสลิปไม่ได้\nรบกวนส่งภาพสลิปจากแอปธนาคารโดยตรง\n(ไม่ใช่ภาพหน้าจอแชท) นะคะ'
  }
  // Anything else, including SlipOK being unreachable: say nothing specific
  // rather than surfacing a machine message, since staff will look anyway.
  return 'ตรวจสอบสลิปอัตโนมัติไม่สำเร็จ\nทางร้านจะตรวจสอบให้เองนะคะ'
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

  // SlipOK itself failed to answer (network, bad key, malformed response).
  if (!result.ok) {
    console.warn('slip check unavailable:', order.orderNo, result.reason)
    return {
      verified: false,
      stored,
      error: customerSlipMessage(result.reason, { unavailable: true }),
      rawError: result.reason || null,
    }
  }
  if (!result.verified) {
    console.warn('slip rejected:', order.orderNo, result.reason, result.duplicate ? '(duplicate)' : '')
    return {
      verified: false,
      stored,
      duplicate: result.duplicate || false,
      error: customerSlipMessage(result.reason, { duplicate: result.duplicate }),
      rawError: result.reason || null,
    }
  }
  if (result.amount != null && Math.round(result.amount) !== order.totalAmount) {
    // Keep both numbers — this is the one failure the customer can check and
    // resolve themselves, so being specific is more useful than being gentle.
    const paid = Math.round(result.amount)
    console.warn('slip amount mismatch:', order.orderNo, paid, 'vs', order.totalAmount)
    return {
      verified: false,
      stored,
      error: `ยอดในสลิป ฿${paid} ไม่ตรงกับออเดอร์ ฿${order.totalAmount}\nรบกวนตรวจสอบยอดโอนอีกครั้ง\nหรือแจ้งทางร้านได้เลยนะคะ`,
      rawError: `amount mismatch: slip ${paid} vs order ${order.totalAmount}`,
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
    console.error('mark paid failed:', order.orderNo, err)
    return {
      verified: false,
      stored,
      duplicate: true,
      error: customerSlipMessage(null, { duplicate: true }),
      rawError: 'mark-paid failed (slip_ref already banked)',
    }
  }

  return { verified: true, stored, amount: order.totalAmount }
}
