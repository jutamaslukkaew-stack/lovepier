// Delivery fee = base fee + (distance in km × rate per km), rounded to the
// nearest baht. Pure function — no I/O — so it's easy to unit test and safe
// to call on both the client (preview) and server (source of truth).
export function calcDeliveryFee(distanceKm, { baseFee = 0, perKmRate = 0 } = {}) {
  if (distanceKm == null || !Number.isFinite(Number(distanceKm))) return 0
  const base = Number(baseFee) || 0
  const rate = Number(perKmRate) || 0
  const km = Math.max(0, Number(distanceKm))
  return Math.round(base + km * rate)
}
