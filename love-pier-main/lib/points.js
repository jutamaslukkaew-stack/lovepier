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
