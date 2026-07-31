import { NextResponse } from 'next/server'
import { and, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categories, menuItems } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { parseWorkbook } from '@/lib/menuImport/parse'
import { diffRows } from '@/lib/menuImport/diff'
import type { ExistingItem } from '@/lib/menuImport/apply'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function POST(req: Request) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let file: File | null = null
  try {
    const form = await req.formData()
    file = form.get('file') as File | null
  } catch {
    return NextResponse.json({ error: 'อ่านไฟล์ไม่ได้' }, { status: 400 })
  }
  if (!file) return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 400 })
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `ไฟล์ใหญ่เกิน ${MAX_BYTES / 1024 / 1024}MB` }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const parsed = parseWorkbook(buffer)
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, errors: parsed.errors }, { status: 200 })
  }

  // Current state from the DB (read-only — preview never writes).
  const cats = await db
    .select({ id: categories.id, categoryNo: categories.categoryNo })
    .from(categories)
    .where(isNotNull(categories.categoryNo))
  const categoryByNo = new Map(cats.map((c) => [c.categoryNo as string, c.id]))

  const existing = await db
    .select({
      importCode: menuItems.importCode,
      categoryId: menuItems.categoryId,
      status: menuItems.status,
      subCategory: menuItems.subCategory,
      imageFile: menuItems.imageFile,
      nameTh: menuItems.nameTh,
      nameEn: menuItems.nameEn,
      nameZh: menuItems.nameZh,
      descriptionTh: menuItems.descriptionTh,
      descriptionEn: menuItems.descriptionEn,
      descriptionZh: menuItems.descriptionZh,
      price: menuItems.price,
      priceOriginal: menuItems.priceOriginal,
      priceMax: menuItems.priceMax,
      badge: menuItems.badge,
      isFeatured: menuItems.isFeatured,
      isAvailable: menuItems.isAvailable,
      sortOrder: menuItems.sortOrder,
    })
    .from(menuItems)
    .where(and(isNotNull(menuItems.importCode), eq(menuItems.isDeleted, false)))
  const existingByCode = new Map<string, ExistingItem>(
    existing.map((e) => [e.importCode as string, e as ExistingItem])
  )

  const diff = diffRows(parsed.rows, categoryByNo, existingByCode)

  return NextResponse.json({
    ok: true,
    fileName: file.name,
    fileHash: parsed.fileHash, // commit re-verifies the same file was applied
    ...diff,
  })
}
