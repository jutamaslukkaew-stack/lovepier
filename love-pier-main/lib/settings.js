import { db } from './db'
import { settings } from './db/schema'

// Keys stored in the `settings` table (edited from /admin/settings).
export const SETTING_KEYS = {
  distanceMethod: 'distance_method', // 'straight' | 'google'
  shopLat: 'shop_lat',
  shopLng: 'shop_lng',
  radiusKm: 'delivery_radius_km',
  googleApiKey: 'google_maps_api_key',
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
  }
}
