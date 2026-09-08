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
  referralEnabled: 'referral_enabled',
  referralPercent: 'referral_percent',
  referralMonths: 'referral_months',
  referralMaxDownline: 'referral_max_downline',
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
  shopLastOrderMinutes: 'shop_last_order_minutes',
  preorderLeadMinutes: 'preorder_lead_minutes',
  preorderMaxDaysAhead: 'preorder_max_days_ahead',
  preorderPickupOpen: 'preorder_pickup_open',
  preorderPickupClose: 'preorder_pickup_close',
  preorderSlotMinutes: 'preorder_slot_minutes',
  preorderCustomTimeEnabled: 'preorder_custom_time_enabled',
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
  referralEnabled: boolean
  referralPercent: string
  referralMonths: string
  referralMaxDownline: string
  inStorePointsPerBaht: string
  inStoreDiscountPercent: string
  menuOptionsEnabled: boolean
  preorderEnabled: boolean
  shopOpenTime: string
  shopCloseTime: string
  // Kept as the raw comma-separated string so the form round-trips whatever
  // the shop typed, blank included.
  shopClosedDays: string
  shopLastOrderMinutes: string
  preorderLeadMinutes: string
  preorderMaxDaysAhead: string
  preorderPickupOpen: string
  preorderPickupClose: string
  preorderSlotMinutes: string
  preorderCustomTimeEnabled: boolean
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
    referralEnabled: m[SETTING_KEYS.referralEnabled] === 'true',
    // Defaults mirror lib/referrals.js. '0' round-trips as '0' for the cap,
    // which is the "no limit" value, so `||` is safe on all four.
    referralPercent: m[SETTING_KEYS.referralPercent] || '5',
    referralMonths: m[SETTING_KEYS.referralMonths] || '6',
    referralMaxDownline: m[SETTING_KEYS.referralMaxDownline] || '0',
    inStorePointsPerBaht: m[SETTING_KEYS.inStorePointsPerBaht] || '1',
    inStoreDiscountPercent: m[SETTING_KEYS.inStoreDiscountPercent] || '10',
    menuOptionsEnabled: m[SETTING_KEYS.menuOptionsEnabled] === 'true',
    preorderEnabled: m[SETTING_KEYS.preorderEnabled] === 'true',
    shopOpenTime: m[SETTING_KEYS.shopOpenTime] || '09:00',
    shopCloseTime: m[SETTING_KEYS.shopCloseTime] || '18:00',
    // `?? '3'` rather than `|| '3'`: once the shop has saved a blank (open
    // every day) that blank must survive a reload, and '' is falsy.
    shopClosedDays: m[SETTING_KEYS.shopClosedDays] ?? '3',
    shopLastOrderMinutes: m[SETTING_KEYS.shopLastOrderMinutes] || '0',
    preorderLeadMinutes: m[SETTING_KEYS.preorderLeadMinutes] || '60',
    preorderMaxDaysAhead: m[SETTING_KEYS.preorderMaxDaysAhead] || '7',
    // No `|| '09:00'` fallback, unlike shopOpenTime above: blank is a real
    // value here ("use the shop's trading hours") and has to round-trip
    // through the form, or clearing the field would be impossible.
    preorderPickupOpen: m[SETTING_KEYS.preorderPickupOpen] || '',
    preorderPickupClose: m[SETTING_KEYS.preorderPickupClose] || '',
    preorderSlotMinutes: m[SETTING_KEYS.preorderSlotMinutes] || '60',
    preorderCustomTimeEnabled: m[SETTING_KEYS.preorderCustomTimeEnabled] === 'true',
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
  // The four `tier_discount_*` rows are NOT written here any more (0015) —
  // the rates live on the customer_tiers rows and are edited at /admin/tiers.
  // Leaving the old rows untouched keeps them as the rollback snapshot the
  // migration seeded from; rewriting them from a stale form would destroy it.
  await put(SETTING_KEYS.referralEnabled, String(Boolean(data.referralEnabled)))
  await put(SETTING_KEYS.referralPercent, (data.referralPercent || '5').trim())
  await put(SETTING_KEYS.referralMonths, (data.referralMonths || '6').trim())
  await put(SETTING_KEYS.referralMaxDownline, (data.referralMaxDownline || '0').trim())
  await put(SETTING_KEYS.inStorePointsPerBaht, (data.inStorePointsPerBaht || '1').trim())
  await put(SETTING_KEYS.inStoreDiscountPercent, (data.inStoreDiscountPercent || '10').trim())
  await put(SETTING_KEYS.menuOptionsEnabled, String(Boolean(data.menuOptionsEnabled)))
  await put(SETTING_KEYS.preorderEnabled, String(Boolean(data.preorderEnabled)))
  await put(SETTING_KEYS.shopOpenTime, (data.shopOpenTime || '09:00').trim())
  await put(SETTING_KEYS.shopCloseTime, (data.shopCloseTime || '18:00').trim())
  // Deliberately no `|| '3'` fallback — a blank here means "open every day"
  // and must be storable as a blank.
  await put(SETTING_KEYS.shopClosedDays, (data.shopClosedDays ?? '').trim())
  await put(SETTING_KEYS.shopLastOrderMinutes, (data.shopLastOrderMinutes || '0').trim())
  await put(SETTING_KEYS.preorderLeadMinutes, (data.preorderLeadMinutes || '60').trim())
  await put(SETTING_KEYS.preorderMaxDaysAhead, (data.preorderMaxDaysAhead || '7').trim())
  // Trimmed to '' rather than defaulted: clearing the field must actually
  // clear the window.
  await put(SETTING_KEYS.preorderPickupOpen, (data.preorderPickupOpen || '').trim())
  await put(SETTING_KEYS.preorderPickupClose, (data.preorderPickupClose || '').trim())
  // Whitelisted, not just trimmed: lib/preorder.js will happily step the grid
  // by any divisor, but a shop must not be able to type 7 and get 09:07.
  await put(
    SETTING_KEYS.preorderSlotMinutes,
    ['15', '30', '60'].includes((data.preorderSlotMinutes || '').trim())
      ? (data.preorderSlotMinutes || '').trim()
      : '60'
  )
  await put(SETTING_KEYS.preorderCustomTimeEnabled, String(Boolean(data.preorderCustomTimeEnabled)))
  revalidatePath('/admin/settings')
  return { ok: true as const }
}
