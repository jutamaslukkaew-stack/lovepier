// Member discount + loyalty points math for /delivery. Pure, no I/O — mirrors
// lib/deliveryFee.js so it's safe to import from BOTH the client (Summary
// preview in components/delivery/OrderFlow.js) and the server (source of
// truth in pages/api/orders.js). The DB-writing half (awardPoints) lives in
// lib/pointsAward.js instead, specifically so this file never pulls in `./db`
// (drizzle/postgres) — that import breaks the client bundle (postgres needs
// Node builtins like `fs`/`perf_hooks` that don't exist in the browser).
//
// Business rule (2026-08-17): no instant member discount. Members earn
// 1 point per ฿20 actually spent on food (5 points per ฿100), and each saved
// point can be redeemed for ฿1 off a later order. Delivery fees never earn
// points and cannot be paid with points.
export function calcOrderDiscountAndPoints(
  itemsSubtotal,
  { hasLineId = false, pointsPerBaht = 20, pointsRedeemed = 0 } = {}
) {
  const subtotal = Number(itemsSubtotal) || 0
  // Keep at least ฿1 payable so the existing PromptPay/slip verification
  // flow still has a real transaction to confirm.
  const redemptionCeiling = Math.max(0, subtotal - 1)
  const redeemed = hasLineId
    ? Math.min(Math.max(0, Math.floor(Number(pointsRedeemed) || 0)), redemptionCeiling)
    : 0
  const netSubtotal = Math.max(0, subtotal - redeemed)
  const pointsEarned = hasLineId && pointsPerBaht > 0 ? Math.floor(netSubtotal / pointsPerBaht) : 0
  return { discountAmount: 0, pointsRedeemed: redeemed, pointsEarned }
}

/**
 * In-store visit math for /admin/scan — staff type the gross bill, this works
 * out what the member actually pays and what they earn.
 *
 * Deliberately separate from calcOrderDiscountAndPoints above: in store the
 * member DOES get an instant percentage discount (delivery does not, by the
 * 2026-08-17 rule), the rates come from their own admin settings, and there's
 * no delivery fee or point redemption in the flow. Pure, so /admin/scan can
 * preview the same numbers the server later commits.
 *
 * Points are earned on what the customer actually pays (post-discount) — so a
 * bigger discount means slightly fewer points, never points on money that was
 * never spent.
 */
export function calcInStoreVisit(grossAmount, { discountPercent = 0, pointsPerBaht = 1 } = {}) {
  const gross = Math.max(0, Math.floor(Number(grossAmount) || 0))
  const pct = Math.min(100, Math.max(0, Number(discountPercent) || 0))
  // Round the discount down so the shop never gives away more than the stated
  // percentage, and the customer's payable amount stays a whole baht.
  const discountAmount = Math.floor((gross * pct) / 100)
  const netAmount = Math.max(0, gross - discountAmount)
  const perPoint = Number(pointsPerBaht) || 0
  const pointsEarned = perPoint > 0 ? Math.floor(netAmount / perPoint) : 0
  return { grossAmount: gross, discountAmount, netAmount, pointsEarned }
}
