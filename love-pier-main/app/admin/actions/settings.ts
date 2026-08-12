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
  revalidatePath('/admin/settings')
  return { ok: true as const }
}
