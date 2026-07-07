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
  googleApiKey: 'google_maps_api_key',
} as const

export type ShopSettingsForm = {
  distanceMethod: string
  shopLat: string
  shopLng: string
  radiusKm: string
  googleApiKey: string
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
    googleApiKey: m[SETTING_KEYS.googleApiKey] || '',
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
  await put(SETTING_KEYS.googleApiKey, (data.googleApiKey || '').trim())
  revalidatePath('/admin/settings')
  return { ok: true as const }
}
