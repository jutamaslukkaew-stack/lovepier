// Referral fees for agents (0017, plan ผัง 3). Pure — no I/O, no DB — same
// rule as lib/tiers.js and lib/invites.js, so the admin report and any future
// screen compute the same number from the same inputs.
//
// The plan states the policy as an ASSUMPTION to be confirmed, not a settled
// fact ("ข้อสมมติที่ตั้งไว้ แก้ได้ถ้าไม่ตรง"). Everything here is therefore
// parameterised and the numbers live in settings, the same treatment the tier
// percentages got in 0015.

export const DEFAULT_REFERRAL_PERCENT = 5
export const DEFAULT_REFERRAL_MONTHS = 6

/**
 * Orders that count.
 *
 * "นับเฉพาะออเดอร์ที่ยืนยันการชำระเงินแล้ว ไม่ใช่ทุกออเดอร์ที่กดสั่ง" — an
 * order only reaches 'paid' when a transfer slip has been verified
 * (lib/slipVerification.js), and it moves on to 'preparing'/'done' from
 * there, so all three mean the money arrived. 'pending' has not been paid and
 * 'cancelled' was refunded or never collected.
 */
export const PAID_ORDER_STATUSES = ['paid', 'preparing', 'done']

export function isPaidOrder(order) {
  return PAID_ORDER_STATUSES.includes(String(order?.status || ''))
}

/**
 * The end of an agent's earning window on one downline customer.
 *
 * Counted from when the customer was RECRUITED, not from their first order:
 * "นาฬิกา 6 เดือนเริ่มนับตั้งแต่วันที่ลูกค้าเข้าระบบ ไม่ใช่วันที่สั่งครั้งแรก".
 *
 * Calendar months, so a customer recruited on 31 January runs to 31 July.
 * setMonth() would roll 31 February into 3 March; clamping to the last day of
 * the target month is the reading a person would give "six months later".
 */
export function referralWindowEnd(referredAt, months = DEFAULT_REFERRAL_MONTHS) {
  if (!referredAt) return null
  const start = new Date(referredAt)
  if (Number.isNaN(start.getTime())) return null
  const target = new Date(start.getTime())
  const day = start.getUTCDate()
  target.setUTCDate(1)
  target.setUTCMonth(target.getUTCMonth() + Number(months))
  // Last day of the month we landed in, so a 31st never spills into the next.
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return target
}

/**
 * Whether one order falls inside the window.
 *
 * Half-open: an order placed exactly at the end instant does not count. The
 * window is "six months from recruitment", and the alternative — counting the
 * boundary — makes the last order arbitrary to the millisecond.
 */
export function isWithinReferralWindow(referredAt, orderCreatedAt, months = DEFAULT_REFERRAL_MONTHS) {
  const end = referralWindowEnd(referredAt, months)
  if (!end) return false
  const placed = new Date(orderCreatedAt)
  if (Number.isNaN(placed.getTime())) return false
  return placed.getTime() >= new Date(referredAt).getTime() && placed.getTime() < end.getTime()
}

/**
 * What one order is worth to the agent.
 *
 * "5% ของค่าอาหารหลังหักส่วนลด ไม่รวมค่าส่ง" — the base is the food after the
 * member discount, and the delivery fee is excluded, which mirrors the
 * existing rule that a member discount never comes off delivery.
 *
 * Points redeemed are NOT deducted. They are a payment instrument the customer
 * already earned, not a reduction in what the food was sold for — and treating
 * them as one would let an agent's fee be erased by a loyalty balance the
 * agent had nothing to do with. Flagged in the plan as an assumption; this is
 * the one place to change it.
 *
 * Floored, not rounded: this is money leaving the shop, and a half-baht
 * rounded up on every order across every downline adds up in the wrong
 * direction.
 */
export function referralFeeForOrder(order, percent = DEFAULT_REFERRAL_PERCENT) {
  if (!isPaidOrder(order)) return 0
  const base = Math.max(0, Number(order?.itemsSubtotal || 0) - Number(order?.discountAmount || 0))
  const pct = Math.min(100, Math.max(0, Number(percent) || 0))
  return Math.floor((base * pct) / 100)
}

/**
 * Total an agent has earned from one downline customer.
 *
 * @param {{ referredAt: string|Date }} downline
 * @param {Array<object>} orders  that customer's orders, any status
 */
export function referralFeeForCustomer(downline, orders, { percent, months } = {}) {
  const eligible = (orders || []).filter(
    (o) => isPaidOrder(o) && isWithinReferralWindow(downline?.referredAt, o.createdAt, months)
  )
  return {
    orderCount: eligible.length,
    fee: eligible.reduce((sum, o) => sum + referralFeeForOrder(o, percent), 0),
  }
}
