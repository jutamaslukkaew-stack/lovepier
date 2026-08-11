import { db } from './db'
import { settings } from './db/schema'

// Keys stored in the `settings` table (edited from /admin/settings).
export const SETTING_KEYS = {
  distanceMethod: 'distance_method', // 'straight' | 'google'
  shopLat: 'shop_lat',
  shopLng: 'shop_lng',
  radiusKm: 'delivery_radius_km',
  googleApiKey: 'google_maps_api_key',
  slipokApiKey: 'slipok_api_key',
  slipokBranchId: 'slipok_branch_id',
  deliveryBaseFee: 'delivery_base_fee',
  deliveryPerKmRate: 'delivery_per_km_rate',
  // Minimum food subtotal (before delivery fee) required to have the shop
  // deliver. Doesn't apply to pickup — a small order is still fine if the
  // customer collects it themselves.
  deliveryMinOrder: 'delivery_min_order',
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
    deliveryBaseFee: m[SETTING_KEYS.deliveryBaseFee] ? num(m[SETTING_KEYS.deliveryBaseFee]) || 0 : 0,
    deliveryPerKmRate: m[SETTING_KEYS.deliveryPerKmRate] ? num(m[SETTING_KEYS.deliveryPerKmRate]) || 0 : 0,
    deliveryMinOrder: m[SETTING_KEYS.deliveryMinOrder] ? num(m[SETTING_KEYS.deliveryMinOrder]) || 0 : 0,
  }
}
