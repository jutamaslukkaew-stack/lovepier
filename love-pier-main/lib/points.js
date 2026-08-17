// Member discount + loyalty points math for /delivery. Pure, no I/O — mirrors
// lib/deliveryFee.js so it's safe to import from BOTH the client (Summary
// preview in components/delivery/OrderFlow.js) and the server (source of
// truth in pages/api/orders.js). The DB-writing half (awardPoints) lives in
// lib/pointsAward.js instead, specifically so this file never pulls in `./db`
// (drizzle/postgres) — that import breaks the client bundle (postgres needs
// Node builtins like `fs`/`perf_hooks` that don't exist in the browser).
//
// Business rule (2026-08-17 journey review): 10% off itemsSubtotal for
// orders with a LINE ID attached (LIFF login completed) — never applies to
// the delivery fee. 1 point per ฿25 of the post-discount item subtotal.
// Both rates are runtime settings (/admin/settings), these are just the
// fallback defaults — see lib/settings.js.
export function calcOrderDiscountAndPoints(
  itemsSubtotal,
  { hasLineId = false, discountPercent = 10, pointsPerBaht = 25 } = {}
) {
  const subtotal = Number(itemsSubtotal) || 0
  const discountAmount =
    hasLineId && discountPercent > 0 ? Math.round(subtotal * (discountPercent / 100)) : 0
  const netSubtotal = Math.max(0, subtotal - discountAmount)
  const pointsEarned = pointsPerBaht > 0 ? Math.floor(netSubtotal / pointsPerBaht) : 0
  return { discountAmount, pointsEarned }
}
