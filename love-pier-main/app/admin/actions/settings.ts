'use server'

import { revalidatePath } from 'next/cache'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { requireUser } from '@/lib/auth'

const SETTING_KEYS = {
  distanceMethod: 'distance_method',
  shopLat: 'shop_lat',
  shopLng: 'shop_lng',
  radiusKm: 'delivery_radius_km',
  minOrder: 'delivery_min_order',
  googleApiKey: 'google_maps_api_key',
  slipokApiKey: 'slipok_api_key',
  slipokBranchId: 'slipok_branch_id',
  deliveryFeeTier2km: 'delivery_fee_tier_2km',
  deliveryFeeTier3km: 'delivery_fee_tier_3km',
  deliveryFeeTier4km: 'delivery_fee_tier_4km',
  deliveryFeeTier5km: 'delivery_fee_tier_5km',
  pointsPerBaht: 'loyalty_baht_per_point_v2',
  memberDiscountEnabled: 'member_discount_enabled',
  tierDiscountGeneral: 'tier_discount_general',
  tierDiscountCondo: 'tier_discount_condo',
  tierDiscountScc: 'tier_discount_scc',
  tierDiscountStaff: 'tier_discount_staff',
  inStorePointsPerBaht: 'in_store_baht_per_point',
  inStoreDiscountPercent: 'in_store_discount_percent',
  menuOptionsEnabled: 'menu_customization_enabled',
  // Pre-order — see the commented originals in lib/settings.js. This copy is
  // duplicated on purpose: a 'use server' module may only export async
  // functions, so it cannot import a shared const map without Next.js
  // dropping the whole module's exports at build time.
  preorderEnabled: 'preorder_enabled',
  shopOpenTime: 'shop_open_time',
  shopCloseTime: 'shop_close_time',
  shopClosedDays: 'shop_closed_days',
  preorderLeadMinutes: 'preorder_lead_minutes',
  preorderMaxDaysAhead: 'preorder_max_days_ahead',
} as const

export type ShopSettingsForm = {
  distanceMethod: string
  shopLat: string
  shopLng: string
  radiusKm: string
  minOrder: string
  googleApiKey: string
  slipokApiKey: string
  slipokBranchId: string
  deliveryFeeTier2km: string
  deliveryFeeTier3km: string
  deliveryFeeTier4km: string
  deliveryFeeTier5km: string
  pointsPerBaht: string
  memberDiscountEnabled: boolean
  tierDiscountGeneral: string
  tierDiscountCondo: string
  tierDiscountScc: string
  tierDiscountStaff: string
  inStorePointsPerBaht: string
  inStoreDiscountPercent: string
  menuOptionsEnabled: boolean
  preorderEnabled: boolean
  shopOpenTime: string
  shopCloseTime: string
  // Kept as the raw comma-separated string so the form round-trips whatever
  // the shop typed, blank included.
  shopClosedDays: string
  preorderLeadMinutes: string
  preorderMaxDaysAhead: string
}

export async function getSettings(): Promise<ShopSettingsForm> {
  await requireUser()
  const rows = await db.select().from(settings)
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']))
  return {
    distanceMethod: m[SETTING_KEYS.distanceMethod] || 'straight',
    shopLat: m[SETTING_KEYS.shopLat] || '',
    shopLng: m[SETTING_KEYS.shopLng] || '',
    radiusKm: m[SETTING_KEYS.radiusKm] || '5',
    minOrder: m[SETTING_KEYS.minOrder] || '300',
    googleApiKey: m[SETTING_KEYS.googleApiKey] || '',
    slipokApiKey: m[SETTING_KEYS.slipokApiKey] || '',
    slipokBranchId: m[SETTING_KEYS.slipokBranchId] || '',
    deliveryFeeTier2km: m[SETTING_KEYS.deliveryFeeTier2km] || '20',
    deliveryFeeTier3km: m[SETTING_KEYS.deliveryFeeTier3km] || '30',
    deliveryFeeTier4km: m[SETTING_KEYS.deliveryFeeTier4km] || '40',
    deliveryFeeTier5km: m[SETTING_KEYS.deliveryFeeTier5km] || '50',
    pointsPerBaht: m[SETTING_KEYS.pointsPerBaht] || '20',
    memberDiscountEnabled: m[SETTING_KEYS.memberDiscountEnabled] === 'true',
    // Defaults mirror lib/tiers.js#TIERS. `||` is fine here (unlike
    // shopClosedDays below) because '0' saved by the shop round-trips as '0'
    // — it is the empty string that falls back, and a blank field should
    // show the documented rate rather than an empty box.
    tierDiscountGeneral: m[SETTING_KEYS.tierDiscountGeneral] || '10',
    tierDiscountCondo: m[SETTING_KEYS.tierDiscountCondo] || '15',
    tierDiscountScc: m[SETTING_KEYS.tierDiscountScc] || '50',
    tierDiscountStaff: m[SETTING_KEYS.tierDiscountStaff] || '100',
    inStorePointsPerBaht: m[SETTING_KEYS.inStorePointsPerBaht] || '1',
    inStoreDiscountPercent: m[SETTING_KEYS.inStoreDiscountPercent] || '10',
    menuOptionsEnabled: m[SETTING_KEYS.menuOptionsEnabled] === 'true',
    preorderEnabled: m[SETTING_KEYS.preorderEnabled] === 'true',
    shopOpenTime: m[SETTING_KEYS.shopOpenTime] || '09:00',
    shopCloseTime: m[SETTING_KEYS.shopCloseTime] || '18:00',
    // `?? '3'` rather than `|| '3'`: once the shop has saved a blank (open
    // every day) that blank must survive a reload, and '' is falsy.
    shopClosedDays: m[SETTING_KEYS.shopClosedDays] ?? '3',
    preorderLeadMinutes: m[SETTING_KEYS.preorderLeadMinutes] || '60',
    preorderMaxDaysAhead: m[SETTING_KEYS.preorderMaxDaysAhead] || '7',
  }
}

async function put(key: string, value: string) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: sql`now()` } })
}

export async function saveSettings(data: ShopSettingsForm) {
  await requireUser()
  const method = data.distanceMethod === 'google' ? 'google' : 'straight'
  await put(SETTING_KEYS.distanceMethod, method)
  await put(SETTING_KEYS.shopLat, (data.shopLat || '').trim())
  await put(SETTING_KEYS.shopLng, (data.shopLng || '').trim())
  await put(SETTING_KEYS.radiusKm, (data.radiusKm || '5').trim())
  await put(SETTING_KEYS.minOrder, (data.minOrder || '0').trim())
  await put(SETTING_KEYS.googleApiKey, (data.googleApiKey || '').trim())
  await put(SETTING_KEYS.slipokApiKey, (data.slipokApiKey || '').trim())
  await put(SETTING_KEYS.slipokBranchId, (data.slipokBranchId || '').trim())
  await put(SETTING_KEYS.deliveryFeeTier2km, (data.deliveryFeeTier2km || '20').trim())
  await put(SETTING_KEYS.deliveryFeeTier3km, (data.deliveryFeeTier3km || '30').trim())
  await put(SETTING_KEYS.deliveryFeeTier4km, (data.deliveryFeeTier4km || '40').trim())
  await put(SETTING_KEYS.deliveryFeeTier5km, (data.deliveryFeeTier5km || '50').trim())
  await put(SETTING_KEYS.pointsPerBaht, (data.pointsPerBaht || '20').trim())
  await put(SETTING_KEYS.memberDiscountEnabled, String(Boolean(data.memberDiscountEnabled)))
  await put(SETTING_KEYS.tierDiscountGeneral, (data.tierDiscountGeneral || '10').trim())
  await put(SETTING_KEYS.tierDiscountCondo, (data.tierDiscountCondo || '15').trim())
  await put(SETTING_KEYS.tierDiscountScc, (data.tierDiscountScc || '50').trim())
  await put(SETTING_KEYS.tierDiscountStaff, (data.tierDiscountStaff || '100').trim())
  await put(SETTING_KEYS.inStorePointsPerBaht, (data.inStorePointsPerBaht || '1').trim())
  await put(SETTING_KEYS.inStoreDiscountPercent, (data.inStoreDiscountPercent || '10').trim())
  await put(SETTING_KEYS.menuOptionsEnabled, String(Boolean(data.menuOptionsEnabled)))
  await put(SETTING_KEYS.preorderEnabled, String(Boolean(data.preorderEnabled)))
  await put(SETTING_KEYS.shopOpenTime, (data.shopOpenTime || '09:00').trim())
  await put(SETTING_KEYS.shopCloseTime, (data.shopCloseTime || '18:00').trim())
  // Deliberately no `|| '3'` fallback — a blank here means "open every day"
  // and must be storable as a blank.
  await put(SETTING_KEYS.shopClosedDays, (data.shopClosedDays ?? '').trim())
  await put(SETTING_KEYS.preorderLeadMinutes, (data.preorderLeadMinutes || '60').trim())
  await put(SETTING_KEYS.preorderMaxDaysAhead, (data.preorderMaxDaysAhead || '7').trim())
  revalidatePath('/admin/settings')
  return { ok: true as const }
}
