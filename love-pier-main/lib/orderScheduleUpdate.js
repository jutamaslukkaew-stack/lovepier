// Shared core for MOVING a pre-order's pickup time. Updates the row and, when
// staff ask for it, pushes the customer a card showing the old time and the
// new one. Mirrors lib/orderStatusUpdate.js deliberately: that module is
// shared between the admin panel and the staff LINE quick-action buttons, so
// when a "เลื่อนเวลา" button eventually lands on the staff card it reuses this
// with no second implementation. Server-only: imports ./db.
import { eq } from 'drizzle-orm'
import { db } from './db'
import { orders } from './db/schema'
import { pushToUser } from './lineMessaging'
import { markUnfriended } from './lineFriendship'
import { noticeFor } from './orderStatusUpdate'
import { buildScheduleChangedFlex } from './orderFlex'
import { bangkokSlotToInstant, formatInstantThai, formatSlotThai } from './preorder'

/**
 * Move an existing pre-order to a new Bangkok wall-clock date and time.
 *
 * WHAT IS DELIBERATELY NOT CHECKED, and why:
 *
 * This does NOT run validateScheduleRequest. Those are the rules for PLACING
 * an order — the catalogue's three-day lead time, the closed days, the pickup
 * window — and applying them here would refuse "push it back thirty minutes",
 * which is the entire reason the feature exists. Staff know things the
 * settings cannot: the dish came out early, the customer phoned, the shop is
 * opening specially. The admin UI warns about a closed day or a time in the
 * past so the move is never accidental; it is not the server's place to
 * overrule someone standing in the kitchen.
 *
 * The one hard check is bangkokSlotToInstant. This is the second place in the
 * codebase where a wall-clock pair becomes a stored instant, and it uses the
 * same function as the first — never a hand-rolled Date, whose result would
 * depend on the server's timezone.
 *
 * An order with no scheduled_for is refused rather than converted. Turning an
 * ASAP order into a pre-order would silently move it into /admin/preorders and
 * reorder the kitchen's queue; that is a separate decision, not a side effect
 * of typing in a time field.
 *
 * @param {{ id: string, scheduledDate: string, scheduledSlot: string,
 *   reason?: string, notify?: boolean }} args
 * @returns {Promise<{ ok: boolean, error?: string, unchanged?: boolean,
 *   orderNo?: string, from?: string, to?: string, sentToLine?: boolean,
 *   customerNotice?: string }>}
 */
export async function applyOrderScheduleChange({ id, scheduledDate, scheduledSlot, reason = '', notify = true }) {
  if (!id) return { ok: false, error: 'ไม่พบออเดอร์' }

  const scheduledFor = bangkokSlotToInstant(scheduledDate, scheduledSlot)
  if (!scheduledFor) return { ok: false, error: 'รูปแบบวันหรือเวลาไม่ถูกต้อง' }

  const [order] = await db
    .select({
      id: orders.id,
      orderNo: orders.orderNo,
      lineUserId: orders.lineUserId,
      deliveryMethod: orders.deliveryMethod,
      scheduledFor: orders.scheduledFor,
    })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1)

  if (!order) return { ok: false, error: 'ไม่พบออเดอร์' }
  if (!order.scheduledFor) {
    return { ok: false, error: 'ออเดอร์นี้ไม่ใช่พรีออเดอร์ จึงยังไม่มีเวลารับให้แก้' }
  }

  const fromLabel = formatInstantThai(order.scheduledFor)
  const toLabel = formatSlotThai(scheduledDate, scheduledSlot)

  // No-op guard, matching applyOrderStatusChange: re-saving the same time must
  // not push the customer a card announcing a change that didn't happen.
  if (order.scheduledFor.getTime() === scheduledFor.getTime()) {
    return { ok: true, unchanged: true, orderNo: order.orderNo, from: fromLabel, to: toLabel, sentToLine: false, customerNotice: 'unchanged' }
  }

  await db.update(orders).set({ scheduledFor }).where(eq(orders.id, order.id))

  // noticeFor() decides whether the customer SHOULD be told and, afterwards,
  // whether they actually were — so build the card first and let it judge.
  // Reused rather than reimplemented so the admin toast vocabulary
  // (sent / no-line / in-store / blocked / failed) needs no new entries.
  const message = notify && order.lineUserId
    ? buildScheduleChangedFlex({
        orderNo: order.orderNo,
        fromLabel,
        toLabel,
        reason: String(reason || '').trim().slice(0, 200),
        deliveryMethod: order.deliveryMethod,
      })
    : null

  let pushed = null
  if (message) {
    try {
      pushed = await pushToUser(order.lineUserId, [message])
    } catch (err) {
      console.error('schedule-change customer push failed (non-fatal):', order.orderNo, err)
      pushed = { ok: false }
    }
  }

  const customerNotice = notify
    ? noticeFor({
        lineUserId: order.lineUserId,
        deliveryMethod: order.deliveryMethod,
        message,
        pushed,
      })
    : 'unchanged'

  // Same stamp as every other push path: a 403 means blocked / not a friend,
  // so record it for /admin/customers. Only on 403 — never on a transient
  // failure. Best-effort; it must not affect the reschedule itself.
  if (customerNotice === 'blocked') await markUnfriended(order.lineUserId)

  // The audit trail, mirroring the `order status change:` line — a moved
  // pickup time is exactly the sort of thing someone asks about a week later.
  console.log('order schedule change:', {
    orderNo: order.orderNo,
    from: fromLabel,
    to: toLabel,
    reason: reason || null,
    customerNotice,
  })

  return {
    ok: true,
    orderNo: order.orderNo,
    from: fromLabel,
    to: toLabel,
    sentToLine: Boolean(pushed?.ok),
    customerNotice,
  }
}
