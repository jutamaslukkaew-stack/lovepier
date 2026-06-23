'use server'

import { revalidatePath } from 'next/cache'
import { asc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categories, menuItems } from '@/lib/db/schema'
import { categorySchema, reorderSchema } from '@/lib/validations'
import { requireUser } from '@/lib/auth'

export type ActionResult = { ok: true } | { ok: false; error: string }

function revalidateAll() {
  revalidatePath('/admin/categories')
  revalidatePath('/admin/menu')
  revalidatePath('/menu')
}

export async function listCategories() {
  await requireUser()
  const rows = await db
    .select({
      id: categories.id,
      nameTh: categories.nameTh,
      nameEn: categories.nameEn,
      nameZh: categories.nameZh,
      slug: categories.slug,
      sortOrder: categories.sortOrder,
      isActive: categories.isActive,
      itemCount: sql<number>`count(${menuItems.id}) filter (where ${menuItems.isDeleted} = false)`,
    })
    .from(categories)
    .leftJoin(menuItems, eq(menuItems.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder))
  return rows
}

export async function createCategory(input: unknown): Promise<ActionResult> {
  try {
    await requireUser()
    const data = categorySchema.parse(input)
    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${categories.sortOrder}), 0)` })
      .from(categories)
    await db.insert(categories).values({ ...data, sortOrder: Number(max) + 1 })
    revalidateAll()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: errMessage(e) }
  }
}

export async function updateCategory(id: string, input: unknown): Promise<ActionResult> {
  try {
    await requireUser()
    const data = categorySchema.parse(input)
    await db
      .update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(categories.id, id))
    revalidateAll()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: errMessage(e) }
  }
}

/**
 * Delete a category. If it still holds items, the caller must pass a
 * `moveToCategoryId` to relocate them first — otherwise the delete is refused.
 */
export async function deleteCategory(
  id: string,
  moveToCategoryId?: string
): Promise<ActionResult> {
  try {
    await requireUser()
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(menuItems)
      .where(eq(menuItems.categoryId, id))

    if (Number(count) > 0) {
      if (!moveToCategoryId) {
        return { ok: false, error: 'หมวดนี้ยังมีเมนูอยู่ กรุณาเลือกหมวดปลายทางก่อนลบ' }
      }
      if (moveToCategoryId === id) {
        return { ok: false, error: 'ไม่สามารถย้ายเมนูไปหมวดเดิมที่กำลังลบได้' }
      }
      await db
        .update(menuItems)
        .set({ categoryId: moveToCategoryId, updatedAt: new Date() })
        .where(eq(menuItems.categoryId, id))
    }

    await db.delete(categories).where(eq(categories.id, id))
    revalidateAll()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: errMessage(e) }
  }
}

export async function reorderCategories(input: unknown): Promise<ActionResult> {
  try {
    await requireUser()
    const { ids } = reorderSchema.parse(input)
    await db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx
          .update(categories)
          .set({ sortOrder: i + 1, updatedAt: new Date() })
          .where(eq(categories.id, ids[i]))
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
      // ZodError
      const first = (e as unknown as { issues: { message: string }[] }).issues[0]
      return first?.message ?? 'ข้อมูลไม่ถูกต้อง'
    }
    if (e.message.includes('duplicate key') && e.message.includes('slug')) {
      return 'slug นี้ถูกใช้แล้ว'
    }
    return e.message
  }
  return 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
}
