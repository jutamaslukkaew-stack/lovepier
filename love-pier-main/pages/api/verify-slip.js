import { eq } from 'drizzle-orm'
import { db } from '../../lib/db'
import { orders } from '../../lib/db/schema'
import { processSlipForOrder } from '../../lib/slipVerification'
import { buildPaymentConfirmedFlex } from '../../lib/orderFlex'
import { isStaffNotifyTarget, pushToUser, pushOrderCardToStaff } from '../../lib/lineMessaging'

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

  const [order] = await db.select().from(orders).where(eq(orders.orderNo, orderNo)).limit(1)
  if (!order) return res.status(404).json({ error: 'ไม่พบออเดอร์' })

  // Storing, verifying and marking paid is shared with the LINE webhook, so a
  // slip sent into the chat lands the order in exactly the same state as one
  // uploaded here — see lib/slipVerification.js.
  const result = await processSlipForOrder(order, imageBase64)

  // Best-effort — a push failure shouldn't affect the verified response.
  // Skipped when the order was already paid, so a re-upload doesn't send a
  // second confirmation card (to the customer OR to staff) for the same
  // payment. The staff push doesn't need order.lineUserId — it always goes
  // to LINE_ORDER_NOTIFY_TO regardless of whether the customer has a LINE
  // session, same as the order-received card in pages/api/orders.js.
  if (result.verified && !result.alreadyPaid) {
    const flex = buildPaymentConfirmedFlex({ orderNo: order.orderNo, total: order.totalAmount, pointsEarned: order.pointsEarned })
    const targetIsCustomer = isStaffNotifyTarget(order.lineUserId)
    // Always alert the configured shop destination from the server. If it is
    // also the customer's test account, skip only the duplicate customer push.
    const staffPush = await pushOrderCardToStaff(flex)
    if (order.lineUserId && !targetIsCustomer) {
      await pushToUser(order.lineUserId, [flex])
    }
    // Same reasoning as pages/api/orders.js: a payment the shop never hears
    // about is an operational failure, and the low-level "push to staff
    // failed" line doesn't say which order it belonged to. Grep the Vercel
    // logs for PAYMENT_NOT_ALERTED to list the paid orders nobody was told
    // about — those are the ones a customer has paid for and is waiting on.
    if (!staffPush.ok) {
      console.error('PAYMENT_NOT_ALERTED — shop was not notified of a verified payment:', {
        orderNo: order.orderNo,
        reason: staffPush.skipped
          ? 'LINE_MESSAGING_TOKEN or LINE_ORDER_NOTIFY_TO is not configured'
          : 'LINE rejected the push (see the LINE push to staff line above for the status)',
      })
    }
  }

  return res.status(200).json({ ok: true, ...result })
}
