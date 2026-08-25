'use server'

import { asc, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { preorderItems } from '@/lib/db/schema'
import { requireUser } from '@/lib/auth'

type Media = { type: 'image' | 'video'; url: string; label?: string }

function clean(input: Record<string, unknown>) {
  const nameTh = String(input.nameTh || '').trim()
  if (!nameTh) throw new Error('กรุณากรอกชื่อเมนู')
  const rawPrice = String(input.price ?? '').trim()
  const price = rawPrice === '' ? null : Math.max(0, Math.round(Number(rawPrice)))
  if (rawPrice !== '' && !Number.isFinite(price)) throw new Error('ราคาไม่ถูกต้อง')
  const media = Array.isArray(input.media) ? input.media.filter((m): m is Media => {
    if (!m || typeof m !== 'object') return false
    const row = m as Record<string, unknown>
    return (row.type === 'image' || row.type === 'video') && Boolean(String(row.url || '').trim())
  }).map((m) => ({ type: m.type, url: String(m.url).trim(), label: String(m.label || '').trim() })) : []
  const status = ['draft', 'active', 'paused', 'seasonal'].includes(String(input.status)) ? String(input.status) : 'draft'
  return {
    nameTh,
    descriptionTh: String(input.descriptionTh || '').trim(),
    category: String(input.category || 'อาหารพรีออเดอร์').trim(),
    price,
    unit: String(input.unit || 'ชุด').trim(),
    minQuantity: Math.max(1, Math.floor(Number(input.minQuantity) || 1)),
    leadDays: Math.max(3, Math.floor(Number(input.leadDays) || 3)),
    dailyQuota: String(input.dailyQuota ?? '').trim() === '' ? null : Math.max(1, Math.floor(Number(input.dailyQuota))),
    coverImageUrl: String(input.coverImageUrl || '').trim() || null,
    media,
    status: price == null && status === 'active' ? 'draft' : status,
  }
}

function refresh() {
  revalidatePath('/admin/preorder-menu')
  revalidatePath('/preorder')
}

export async function listPreorderItems(includeDeleted = false) {
  await requireUser()
  const rows = await db.select().from(preorderItems).orderBy(asc(preorderItems.sortOrder))
  return includeDeleted ? rows : rows.filter((row) => !row.isDeleted)
}

export async function createPreorderItem(input: Record<string, unknown>) {
  try {
    await requireUser()
    const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${preorderItems.sortOrder}),0)` }).from(preorderItems)
    await db.insert(preorderItems).values({ ...clean(input), sortOrder: Number(max) + 1 })
    refresh()
    return { ok: true as const }
  } catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : 'เพิ่มเมนูไม่สำเร็จ' } }
}

export async function updatePreorderItem(id: string, input: Record<string, unknown>) {
  try {
    await requireUser()
    await db.update(preorderItems).set({ ...clean(input), updatedAt: new Date() }).where(eq(preorderItems.id, id))
    refresh()
    return { ok: true as const }
  } catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : 'แก้ไขไม่สำเร็จ' } }
}

export async function setPreorderItemDeleted(id: string, deleted: boolean) {
  await requireUser()
  await db.update(preorderItems).set({ isDeleted: deleted, ...(deleted ? { status: 'draft' } : {}), updatedAt: new Date() }).where(eq(preorderItems.id, id))
  refresh()
  return { ok: true as const }
}

export async function setPreorderItemStatus(id: string, status: string) {
  await requireUser()
  if (!['draft', 'active', 'paused', 'seasonal'].includes(status)) return { ok: false as const, error: 'สถานะไม่ถูกต้อง' }
  if (status === 'active') {
    const [item] = await db.select({ price: preorderItems.price }).from(preorderItems).where(eq(preorderItems.id, id)).limit(1)
    if (!item || item.price == null) return { ok: false as const, error: 'กรุณาตั้งราคาก่อนเปิดขาย' }
  }
  await db.update(preorderItems).set({ status, updatedAt: new Date() }).where(eq(preorderItems.id, id))
  refresh()
  return { ok: true as const }
}
