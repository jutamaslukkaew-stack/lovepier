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
import { buildOrderStatusFlex } from './orderFlex'
import { awardPoints } from './pointsAward'
import { IN_STORE_METHOD } from './inStore'

// Mirror of ORDER_STATUSES in app/admin/orders/status.ts. Duplicated (not
// imported) to keep this runtime module free of an app/ dependency.
const ALL_STATUSES = ['pending', 'paid', 'preparing', 'done', 'cancelled']

// The subset a LINE quick-action button may set: forward-only kitchen steps
// plus cancel. 'paid' is deliberately excluded — payment is confirmed by slip
// verification, never a button — and so is 'pending' (a card can't un-do a
// step).
export const STAFF_BUTTON_STATUSES = ['preparing', 'done', 'cancelled']

/**
 * Locate an order by id OR orderNo, move it to `status`, and fan out the same
 * side effects the admin dropdown has always had. Never throws for a "not
 * found" / bad-status case — those come back as { ok: false }. A genuine DB
 * failure still throws; callers on the webhook path wrap this in try/catch so
 * they can still return 200 to LINE.
 *
 * @param {{ id?: string, orderNo?: string, status: string }} args
 * @returns {Promise<{ ok: boolean, error?: string, unchanged?: boolean,
 *   orderNo?: string, from?: string, to?: string, sentToLine?: boolean }>}
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
    return { ok: true, unchanged: true, orderNo: order.orderNo, from: order.status, to: status, sentToLine: false }
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

  let sentToLine = false
  // In-store sales (from /admin/scan) already handed the customer their
  // receipt at the counter, and buildOrderStatusFlex only speaks
  // delivery/pickup — pushing it for a walk-in would be actively wrong.
  if (order.lineUserId && order.deliveryMethod !== IN_STORE_METHOD) {
    const message = buildOrderStatusFlex({
      orderNo: order.orderNo,
      status,
      deliveryMethod: order.deliveryMethod,
    })
    if (message) {
      try {
        const pushed = await pushToUser(order.lineUserId, [message])
        sentToLine = Boolean(pushed.ok)
      } catch (err) {
        console.error('status-change customer push failed (non-fatal):', order.orderNo, err)
      }
    }
  }

  console.log('order status change:', {
    orderNo: order.orderNo,
    from: order.status,
    to: status,
    sentToLine,
  })
  return { ok: true, orderNo: order.orderNo, from: order.status, to: status, sentToLine }
}
