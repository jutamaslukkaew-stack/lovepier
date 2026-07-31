import { NextResponse } from 'next/server'
import { and, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categories, menuImports, menuItems } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { parseWorkbook } from '@/lib/menuImport/parse'
import { applyRows, type CommitCounts } from '@/lib/menuImport/commit'

const MAX_BYTES = 10 * 1024 * 1024

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

const EXISTING_COLS = {
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
  imageUrl: menuItems.imageUrl,
}

export async function POST(req: Request) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let file: File | null = null
  let expectedHash = ''
  try {
    const form = await req.formData()
    file = form.get('file') as File | null
    expectedHash = String(form.get('fileHash') ?? '')
  } catch {
    return NextResponse.json({ error: 'อ่านคำขอไม่ได้' }, { status: 400 })
  }
  if (!file) return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'ไฟล์ใหญ่เกินไป' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const parsed = parseWorkbook(buffer)
  if (!parsed.ok) return NextResponse.json({ ok: false, errors: parsed.errors }, { status: 200 })

  // Guard: commit must act on exactly the file that was previewed.
  if (expectedHash && expectedHash !== parsed.fileHash) {
    return NextResponse.json(
      { ok: false, error: 'ไฟล์เปลี่ยนไปจากตอนตรวจสอบ กรุณากดตรวจสอบใหม่อีกครั้ง' },
      { status: 200 }
    )
  }

  // Current state
  const cats = await db
    .select({ id: categories.id, categoryNo: categories.categoryNo })
    .from(categories)
    .where(isNotNull(categories.categoryNo))
  const categoryByNo = new Map(cats.map((c) => [c.categoryNo as string, c.id]))

  const existingRows = await db
    .select(EXISTING_COLS)
    .from(menuItems)
    .where(and(isNotNull(menuItems.importCode), eq(menuItems.isDeleted, false)))
  const existingByCode = new Map(existingRows.map((e) => [e.importCode as string, e]))
  const fileCodes = new Set(parsed.rows.map((r) => r.imageCode))

  let counts: CommitCounts
  try {
    counts = await db.transaction(async (tx) => {
      const c = await applyRows(tx, parsed.rows, categoryByNo, existingByCode)
      if (c.categoriesNotFound.length > 0) throw new Error('CATEGORIES_NOT_FOUND') // roll back all
      return c
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'CATEGORIES_NOT_FOUND') {
      // re-derive the missing categories for the error message (nothing was written)
      const missing = [...new Set(parsed.rows.map((r) => r.categoryNo).filter((no) => !categoryByNo.has(no)))]
      return NextResponse.json(
        { ok: false, error: 'มีหมวดที่ไม่รู้จัก — ไม่ได้บันทึกอะไรเลย', categoriesNotFound: missing },
        { status: 200 }
      )
    }
    console.error('menu-import commit failed:', err)
    return NextResponse.json({ ok: false, error: 'บันทึกไม่สำเร็จ (rollback แล้ว)' }, { status: 500 })
  }
  const { created, updated, unchanged, incompleteReport, errors } = counts

  // ── Report groups (recomputed from the post-commit state) ──
  const afterRows = await db
    .select({ importCode: menuItems.importCode, nameTh: menuItems.nameTh, imageUrl: menuItems.imageUrl })
    .from(menuItems)
    .where(and(isNotNull(menuItems.importCode), eq(menuItems.isDeleted, false)))
  const noImage = afterRows
    .filter((r) => !r.imageUrl && fileCodes.has(r.importCode as string))
    .map((r) => ({ imageCode: r.importCode as string, nameTh: r.nameTh }))
  const notInFile = afterRows
    .filter((r) => !fileCodes.has(r.importCode as string))
    .map((r) => ({ imageCode: r.importCode as string, nameTh: r.nameTh }))

  const summary = {
    total: parsed.rows.length,
    created,
    updated,
    unchanged,
    incomplete: incompleteReport.length,
    errors: errors.length,
  }
  const report = {
    incompleteMenus: incompleteReport, // group 1
    menusWithoutImages: noImage, // group 2 (unmatched images come from the image pipeline)
    menusNotInFile: notInFile, // group 3 (never auto-deleted/disabled — reported only)
  }

  await db.insert(menuImports).values({
    filename: file.name,
    uploadedBy: user.email ?? user.id,
    rowsTotal: summary.total,
    rowsCreated: created,
    rowsUpdated: updated,
    rowsUnchanged: unchanged,
    rowsIncomplete: incompleteReport.length,
    report: { summary, report, errors },
  })

  return NextResponse.json({ ok: true, summary, report })
}
