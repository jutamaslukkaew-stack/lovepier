// Shared core for changing an order's status. Updates the row, credits loyalty
// points on the pending→paid transition, and pushes the customer the matching
// LINE status card. Called from BOTH the admin panel
// (app/admin/actions/orders.ts) and the staff LINE quick-action buttons
// (pages/api/line-webhook.js), so a status change lands identically whichever
// way staff make it. Server-only: imports ./db.
import { eq } from 'drizzle-orm'
import { db } from './db'
import { orders } from './db/schema'
import { pushToUser } from './lineMessaging'
import { markUnfriended } from './lineFriendship'
import { buildOrderStatusFlex } from './orderFlex'
import { awardPoints } from './pointsAward'
import { IN_STORE_METHOD } from './inStore'

// Mirror of ORDER_STATUSES in app/admin/orders/status.ts. Duplicated (not
// imported) to keep this runtime module free of an app/ dependency.
const ALL_STATUSES = ['pending', 'paid', 'preparing', 'done', 'cancelled']

// Owned by lib/staffPostback.js (which has no db dependency, so it can be
// unit-tested); re-exported here because this is where callers expect to find
// the status vocabulary.
export { STAFF_BUTTON_STATUSES } from './staffPostback'

/**
 * Why the customer was or wasn't told. The old code collapsed all of this into
 * one `sentToLine` boolean, so staff were shown "this order has no LINE
 * account" for a customer who had one and whose push had simply failed — and
 * therefore didn't follow up. Whoever is being informed needs the difference
 * between "nothing to do" and "go call them".
 *
 * @param {{lineUserId?: string, deliveryMethod?: string, message?: object|null, pushed?: {ok?: boolean, status?: number}}} args
 * @returns {'sent'|'no-line'|'in-store'|'no-card'|'blocked'|'failed'}
 */
export function noticeFor({ lineUserId, deliveryMethod, message, pushed }) {
  if (!lineUserId) return 'no-line'
  // In-store sales (from /admin/scan) already handed the customer their
  // receipt at the counter, and buildOrderStatusFlex only speaks
  // delivery/pickup — pushing it for a walk-in would be actively wrong.
  if (deliveryMethod === IN_STORE_METHOD) return 'in-store'
  if (!message) return 'no-card'
  if (pushed?.ok) return 'sent'
  // 403 is LINE's answer for "this user has blocked the OA" — the one failure
  // a human has to act on, so it must not read the same as a transient 500.
  if (pushed?.status === 403) return 'blocked'
  return 'failed'
}

/**
 * Locate an order by id OR orderNo, move it to `status`, and fan out the same
 * side effects the admin dropdown has always had. Never throws for a "not
 * found" / bad-status case — those come back as { ok: false }. A genuine DB
 * failure still throws; callers on the webhook path wrap this in try/catch so
 * they can still return 200 to LINE.
 *
 * @param {{ id?: string, orderNo?: string, status: string }} args
 * @returns {Promise<{ ok: boolean, error?: string, unchanged?: boolean,
 *   orderNo?: string, from?: string, to?: string, sentToLine?: boolean,
 *   customerNotice?: 'sent'|'no-line'|'in-store'|'no-card'|'blocked'|'failed'|'unchanged' }>}
 */
export async function applyOrderStatusChange({ id, orderNo, status }) {
  if (!ALL_STATUSES.includes(status)) {
    return { ok: false, error: 'สถานะไม่ถูกต้อง' }
  }
  const locator = id
    ? eq(orders.id, id)
    : orderNo
      ? eq(orders.orderNo, orderNo)
      : null
  if (!locator) return { ok: false, error: 'ไม่พบออเดอร์' }

  const [order] = await db
    .select({
      id: orders.id,
      orderNo: orders.orderNo,
      lineUserId: orders.lineUserId,
      deliveryMethod: orders.deliveryMethod,
      status: orders.status,
      phone: orders.phone,
      pointsEarned: orders.pointsEarned,
    })
    .from(orders)
    .where(locator)
    .limit(1)

  if (!order) return { ok: false, error: 'ไม่พบออเดอร์' }
  if (order.status === status) {
    return { ok: true, unchanged: true, orderNo: order.orderNo, from: order.status, to: status, sentToLine: false, customerNotice: 'unchanged' }
  }

  await db.update(orders).set({ status }).where(eq(orders.id, order.id))

  // Manual payment confirmation must have the same loyalty outcome as an
  // auto-verified slip. awardPoints is idempotent by order id, so a later
  // retry or status change cannot credit the customer twice.
  if (status === 'paid' && order.status === 'pending' && order.pointsEarned > 0) {
    try {
      await awardPoints({
        orderId: order.id,
        lineUserId: order.lineUserId,
        phone: order.phone,
        points: order.pointsEarned,
      })
    } catch (err) {
      console.error('status-change points failed (non-fatal):', order.orderNo, err)
    }
  }

  // noticeFor() decides whether the customer SHOULD be told and, afterwards,
  // whether they actually were — so build the card first and let it judge.
  const shouldPush = Boolean(order.lineUserId) && order.deliveryMethod !== IN_STORE_METHOD
  const message = shouldPush
    ? buildOrderStatusFlex({ orderNo: order.orderNo, status, deliveryMethod: order.deliveryMethod })
    : null

  let pushed = null
  if (message) {
    try {
      pushed = await pushToUser(order.lineUserId, [message])
    } catch (err) {
      console.error('status-change customer push failed (non-fatal):', order.orderNo, err)
      pushed = { ok: false }
    }
  }

  const customerNotice = noticeFor({
    lineUserId: order.lineUserId,
    deliveryMethod: order.deliveryMethod,
    message,
    pushed,
  })

  // Same stamp as the order-creation path: a 403 means blocked / not a friend,
  // so record it for /admin/customers. Only on 403 — never on a transient
  // failure. Best-effort; it must not affect the status change itself.
  if (customerNotice === 'blocked') await markUnfriended(order.lineUserId)

  console.log('order status change:', {
    orderNo: order.orderNo,
    from: order.status,
    to: status,
    customerNotice,
  })
  return {
    ok: true,
    orderNo: order.orderNo,
    from: order.status,
    to: status,
    customerNotice,
    // Kept for callers that only care whether the customer heard anything.
    sentToLine: customerNotice === 'sent',
  }
}
