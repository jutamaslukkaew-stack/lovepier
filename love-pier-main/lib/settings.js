import { db } from './db'
import { settings } from './db/schema'
import { DEFAULT_DELIVERY_FEE_TIERS } from './deliveryFee'

// Keys stored in the `settings` table (edited from /admin/settings).
export const SETTING_KEYS = {
  distanceMethod: 'distance_method', // 'straight' | 'google'
  shopLat: 'shop_lat',
  shopLng: 'shop_lng',
  radiusKm: 'delivery_radius_km',
  // Minimum cart subtotal (baht) required to choose shop delivery — 0 (or
  // unset) disables the requirement. Re-added 2026-08-12 after being fully
  // removed the same day; this time it's a plain hard minimum, not bundled
  // with a free-delivery incentive (see note_2026_08_12_fee_tiers_and_line_notify).
  minOrder: 'delivery_min_order',
  googleApiKey: 'google_maps_api_key',
  slipokApiKey: 'slipok_api_key',
  slipokBranchId: 'slipok_branch_id',
  // Flat delivery fee per 1km distance band (replaced the old base+per-km
  // formula — see lib/deliveryFee.js). Each key holds that band's fee in baht.
  deliveryFeeTier2km: 'delivery_fee_tier_2km', // 0–2 km
  deliveryFeeTier3km: 'delivery_fee_tier_3km', // 2–3 km
  deliveryFeeTier4km: 'delivery_fee_tier_4km', // 3–4 km
  deliveryFeeTier5km: 'delivery_fee_tier_5km', // 4–5 km
  // Loyalty points earned per baht of (post-discount) item subtotal — see
  // lib/points.js#calcOrderDiscountAndPoints. 0 disables points entirely.
  pointsPerBaht: 'loyalty_baht_per_point_v2',
  // % off itemsSubtotal for orders with a LINE ID attached (LIFF login
  // completed) — never applies to delivery fee. 0 disables the discount.
  memberDiscountPercent: 'member_discount_percent',
  // ── In-store (Love Pier ID QR scanned at the counter — /admin/scan) ──
  // Deliberately separate from the delivery rates above: the shop wanted a
  // different, more generous rate for walk-ins, and coupling them would mean
  // one can't change without moving the other.
  // Baht of (post-discount) spend per 1 point. Default 1 = ฿1 earns 1 point.
  inStorePointsPerBaht: 'in_store_baht_per_point',
  // % off the amount the customer actually pays in store. 0 disables it.
  inStoreDiscountPercent: 'in_store_discount_percent',
  // Whether the Summary step shows the sweetness/coffee-bean pickers per
  // cart item (lib/menuOptions.js). Off by default — added 2026-08-17 so
  // the shop can turn it on later without a code change; unset/anything
  // other than the literal string 'true' reads as off.
  menuOptionsEnabled: 'menu_customization_enabled',
}

function num(v) {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : NaN
}

/**
 * Read shop settings from the DB, falling back to env vars, then defaults.
 * Used server-side (API routes + admin).
 */
export async function getShopSettings() {
  let rows = []
  try {
    rows = await db.select().from(settings)
  } catch {
    rows = []
  }
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]))

  return {
    distanceMethod: m[SETTING_KEYS.distanceMethod] || 'straight',
    shopLat: m[SETTING_KEYS.shopLat] ? num(m[SETTING_KEYS.shopLat]) : num(process.env.SHOP_LAT),
    shopLng: m[SETTING_KEYS.shopLng] ? num(m[SETTING_KEYS.shopLng]) : num(process.env.SHOP_LNG),
    radiusKm: m[SETTING_KEYS.radiusKm]
      ? num(m[SETTING_KEYS.radiusKm])
      : num(process.env.DELIVERY_RADIUS_KM) || 5,
    minDeliveryOrder: m[SETTING_KEYS.minOrder] ? num(m[SETTING_KEYS.minOrder]) : 300,
    googleApiKey: m[SETTING_KEYS.googleApiKey] || process.env.GOOGLE_MAPS_API_KEY || '',
    slipokApiKey: m[SETTING_KEYS.slipokApiKey] || process.env.SLIPOK_API_KEY || '',
    slipokBranchId: m[SETTING_KEYS.slipokBranchId] || process.env.SLIPOK_BRANCH_ID || '',
    deliveryFeeTiers: [
      { upToKm: 2, fee: m[SETTING_KEYS.deliveryFeeTier2km] ? num(m[SETTING_KEYS.deliveryFeeTier2km]) : NaN },
      { upToKm: 3, fee: m[SETTING_KEYS.deliveryFeeTier3km] ? num(m[SETTING_KEYS.deliveryFeeTier3km]) : NaN },
      { upToKm: 4, fee: m[SETTING_KEYS.deliveryFeeTier4km] ? num(m[SETTING_KEYS.deliveryFeeTier4km]) : NaN },
      { upToKm: 5, fee: m[SETTING_KEYS.deliveryFeeTier5km] ? num(m[SETTING_KEYS.deliveryFeeTier5km]) : NaN },
    ].map((tier, i) => ({
      ...tier,
      fee: Number.isFinite(tier.fee) ? tier.fee : DEFAULT_DELIVERY_FEE_TIERS[i].fee,
    })),
    pointsPerBaht: m[SETTING_KEYS.pointsPerBaht] ? num(m[SETTING_KEYS.pointsPerBaht]) : 20,
    memberDiscountPercent: 0,
    inStorePointsPerBaht: m[SETTING_KEYS.inStorePointsPerBaht]
      ? num(m[SETTING_KEYS.inStorePointsPerBaht])
      : 1,
    inStoreDiscountPercent: m[SETTING_KEYS.inStoreDiscountPercent]
      ? num(m[SETTING_KEYS.inStoreDiscountPercent])
      : 10,
    menuOptionsEnabled: m[SETTING_KEYS.menuOptionsEnabled] === 'true',
  }
}
