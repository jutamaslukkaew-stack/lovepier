// Member discount + loyalty points math for /delivery. Pure, no I/O — mirrors
// lib/deliveryFee.js so it's safe to import from BOTH the client (Summary
// preview in components/delivery/OrderFlow.js) and the server (source of
// truth in pages/api/orders.js). The DB-writing half (awardPoints) lives in
// lib/pointsAward.js instead, specifically so this file never pulls in `./db`
// (drizzle/postgres) — that import breaks the client bundle (postgres needs
// Node builtins like `fs`/`perf_hooks` that don't exist in the browser).
//
// Business rule (2026-08-17): members earn 1 point per ฿20 actually spent on
// food (5 points per ฿100), and each saved point can be redeemed for ฿1 off a
// later order. Delivery fees never earn points and cannot be paid with points.
//
// Business rule (2026-08-24, journey review): ON TOP of that, a member's tier
// takes a percentage off the food subtotal — 10/15/50/100% by group, see
// lib/tiers.js. The shop chose to keep points as well as the discount, so a
// customer can receive both on the same order. `discountPercent` arrives
// already resolved (tier + master switch + settings) so this stays pure; it
// is 0 for everyone while member_discount_enabled is off, which is the
// behaviour that has been live since 2026-08-17.
//
// ORDER OF OPERATIONS, and why:
//   1. the tier percentage comes off the subtotal
//   2. points are redeemed against what is left
//   3. points are earned on what the customer actually pays
// Points last means a 50% member's saved points are still worth ฿1 each
// rather than being halved with everything else. Earning on the net means the
// shop never awards points for money that was never spent — the same rule
// calcInStoreVisit already follows below.
export function calcOrderDiscountAndPoints(
  itemsSubtotal,
  { hasLineId = false, discountPercent = 0, pointsPerBaht = 20, pointsRedeemed = 0 } = {}
) {
  const subtotal = Number(itemsSubtotal) || 0
  const pct = hasLineId ? Math.min(100, Math.max(0, Number(discountPercent) || 0)) : 0
  // Rounded DOWN so the shop never gives away more than the stated percentage
  // and the payable amount stays a whole baht.
  const discountAmount = Math.floor((subtotal * pct) / 100)
  const afterDiscount = Math.max(0, subtotal - discountAmount)
  // Keep at least ฿1 payable so the existing PromptPay/slip verification flow
  // still has a real transaction to confirm. Measured against the
  // POST-discount amount: at 100% there is nothing left to redeem against,
  // and a ceiling computed off the gross subtotal would happily "spend"
  // points that reduce nothing.
  const redemptionCeiling = Math.max(0, afterDiscount - 1)
  const redeemed = hasLineId
    ? Math.min(Math.max(0, Math.floor(Number(pointsRedeemed) || 0)), redemptionCeiling)
    : 0
  const netSubtotal = Math.max(0, afterDiscount - redeemed)
  const pointsEarned = hasLineId && pointsPerBaht > 0 ? Math.floor(netSubtotal / pointsPerBaht) : 0
  return { discountAmount, discountPercent: pct, pointsRedeemed: redeemed, pointsEarned }
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
export function calcInStoreVisit(grossAmount, { discountPercent = 0, pointsPerBaht = 1, pointsRedeemed = 0 } = {}) {
  const gross = Math.max(0, Math.floor(Number(grossAmount) || 0))
  const pct = Math.min(100, Math.max(0, Number(discountPercent) || 0))
  // Round the discount down so the shop never gives away more than the stated
  // percentage, and the customer's payable amount stays a whole baht.
  const discountAmount = Math.floor((gross * pct) / 100)
  const afterDiscount = Math.max(0, gross - discountAmount)
  const redeemed = Math.min(afterDiscount, Math.max(0, Math.floor(Number(pointsRedeemed) || 0)))
  const netAmount = Math.max(0, afterDiscount - redeemed)
  const perPoint = Number(pointsPerBaht) || 0
  const pointsEarned = perPoint > 0 ? Math.floor(netAmount / perPoint) : 0
  return { grossAmount: gross, discountAmount, pointsRedeemed: redeemed, netAmount, pointsEarned }
}
