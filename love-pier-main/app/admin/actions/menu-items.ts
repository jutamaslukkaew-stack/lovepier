'use server'

import { revalidatePath } from 'next/cache'
import { and, asc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { menuItems } from '@/lib/db/schema'
import { menuItemSchema, reorderSchema } from '@/lib/validations'
import { requireUser } from '@/lib/auth'
import { removeImageByUrl } from '@/lib/supabase/admin'
import type { ActionResult } from './categories'

function revalidateAll() {
  revalidatePath('/admin/menu')
  revalidatePath('/menu')
}

export async function listMenuItems(categoryId?: string) {
  await requireUser()
  const where = categoryId
    ? and(eq(menuItems.isDeleted, false), eq(menuItems.categoryId, categoryId))
    : eq(menuItems.isDeleted, false)
  return db.select().from(menuItems).where(where).orderBy(asc(menuItems.sortOrder))
}

function normalize(data: ReturnType<typeof menuItemSchema.parse>) {
  return {
    categoryId: data.categoryId,
    nameTh: data.nameTh,
    nameEn: data.nameEn,
    nameZh: data.nameZh,
    descriptionTh: data.descriptionTh || null,
    descriptionEn: data.descriptionEn || null,
    descriptionZh: data.descriptionZh || null,
    imageUrl: data.imageUrl || null,
    imageAlt: data.imageAlt || null,
    price: data.price,
    priceMax: data.priceMax ? data.priceMax : null,
    badge: data.badge || null,
    isFeatured: data.isFeatured,
    isAvailable: data.isAvailable,
  }
}

export async function createMenuItem(input: unknown): Promise<ActionResult> {
  try {
    await requireUser()
    const data = menuItemSchema.parse(input)
    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${menuItems.sortOrder}), 0)` })
      .from(menuItems)
      .where(eq(menuItems.categoryId, data.categoryId))
    await db.insert(menuItems).values({ ...normalize(data), sortOrder: Number(max) + 1 })
    revalidateAll()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: errMessage(e) }
  }
}

export async function updateMenuItem(id: string, input: unknown): Promise<ActionResult> {
  try {
    await requireUser()
    const data = menuItemSchema.parse(input)
    const [existing] = await db.select().from(menuItems).where(eq(menuItems.id, id))
    const next = normalize(data)
    // If the image changed, clean up the old object.
    if (existing?.imageUrl && existing.imageUrl !== next.imageUrl) {
      await removeImageByUrl(existing.imageUrl)
    }
    await db
      .update(menuItems)
      .set({ ...next, updatedAt: new Date() })
      .where(eq(menuItems.id, id))
    revalidateAll()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: errMessage(e) }
  }
}

/** Soft delete — keeps the row but hides it everywhere. */
export async function deleteMenuItem(id: string): Promise<ActionResult> {
  try {
    await requireUser()
    await db
      .update(menuItems)
      .set({ isDeleted: true, isAvailable: false, updatedAt: new Date() })
      .where(eq(menuItems.id, id))
    revalidateAll()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: errMessage(e) }
  }
}

export async function toggleAvailability(id: string, value: boolean): Promise<ActionResult> {
  try {
    await requireUser()
    await db
      .update(menuItems)
      .set({ isAvailable: value, updatedAt: new Date() })
      .where(eq(menuItems.id, id))
    revalidateAll()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: errMessage(e) }
  }
}

export async function reorderMenuItems(input: unknown): Promise<ActionResult> {
  try {
    await requireUser()
    const { ids } = reorderSchema.parse(input)
    await db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx
          .update(menuItems)
          .set({ sortOrder: i + 1, updatedAt: new Date() })
          .where(eq(menuItems.id, ids[i]))
      }
    })
    revalidateAll()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: errMessage(e) }
  }
}

function errMessage(e: unknown): string {
  if (e instanceof Error) {
    if (e.message === 'UNAUTHENTICATED') return 'กรุณาเข้าสู่ระบบใหม่'
    if ('issues' in e && Array.isArray((e as { issues: unknown[] }).issues)) {
      const first = (e as unknown as { issues: { message: string }[] }).issues[0]
      return first?.message ?? 'ข้อมูลไม่ถูกต้อง'
    }
    return e.message
  }
  return 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
}
