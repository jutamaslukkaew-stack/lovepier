// Delivery fee is a flat rate that steps up in 1km distance bands, rather
// than a continuous base + per-km formula (that's what this used to be —
// see git history if it's ever needed again). Each tier's `upToKm` is its
// *inclusive* upper bound: distance under the lowest tier's upToKm still
// pays that tier's fee (there is no free first stretch), and distance
// beyond the last tier's upToKm keeps paying the last tier's fee rather
// than falling through to ฿0. Pure function — no I/O — so it's easy to
// unit test and safe to call on both the client (preview) and server
// (source of truth).
export const DEFAULT_DELIVERY_FEE_TIERS = [
  { upToKm: 2, fee: 20 }, // covers 0–2 km — the shop's "1-2 กม." tier; under 1km pays the same ฿20
  { upToKm: 3, fee: 30 },
  { upToKm: 4, fee: 40 },
  { upToKm: 5, fee: 50 },
]

export function calcDeliveryFee(distanceKm, { tiers } = {}) {
  if (distanceKm == null || !Number.isFinite(Number(distanceKm))) return 0
  const km = Math.max(0, Number(distanceKm))
  const list = Array.isArray(tiers) && tiers.length > 0 ? tiers : DEFAULT_DELIVERY_FEE_TIERS
  const sorted = [...list].sort((a, b) => a.upToKm - b.upToKm)
  const match = sorted.find((tier) => km <= tier.upToKm)
  const fee = match ? match.fee : sorted[sorted.length - 1].fee
  return Math.round(Number(fee) || 0)
}
