import { db } from './db'
import { settings } from './db/schema'
import { DEFAULT_DELIVERY_FEE_TIERS } from './deliveryFee'

// Keys stored in the `settings` table (edited from /admin/settings).
export const SETTING_KEYS = {
  distanceMethod: 'distance_method', // 'straight' | 'google'
  shopLat: 'shop_lat',
  shopLng: 'shop_lng',
  radiusKm: 'delivery_radius_km',
  googleApiKey: 'google_maps_api_key',
  slipokApiKey: 'slipok_api_key',
  slipokBranchId: 'slipok_branch_id',
  // Flat delivery fee per 1km distance band (replaced the old base+per-km
  // formula — see lib/deliveryFee.js). Each key holds that band's fee in baht.
  deliveryFeeTier2km: 'delivery_fee_tier_2km', // 0–2 km
  deliveryFeeTier3km: 'delivery_fee_tier_3km', // 2–3 km
  deliveryFeeTier4km: 'delivery_fee_tier_4km', // 3–4 km
  deliveryFeeTier5km: 'delivery_fee_tier_5km', // 4–5 km
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
  }
}
