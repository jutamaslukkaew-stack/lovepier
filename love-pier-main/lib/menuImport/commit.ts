import { eq } from 'drizzle-orm'
import { menuItems } from '@/lib/db/schema'
import { computeTargets, diffTargets, type ExistingItem } from './apply'
import type { ParsedRow } from './spec'

export type CommitCounts = {
  created: number
  updated: number
  unchanged: number
  incompleteReport: { imageCode: string; nameTh: string | null; reasons: string[] }[]
  errors: { imageCode: string; error: string }[]
  categoriesNotFound: string[]
}

// A minimal Drizzle executor shape so this works with both `db` and a `tx`.
type Executor = {
  insert: typeof import('@/lib/db').db.insert
  update: typeof import('@/lib/db').db.update
}

/**
 * Apply parsed rows to menu_items via upsert-by-import_code. Pure of HTTP/auth
 * so the commit route and the test exercise the exact same logic.
 * - unchanged rows are NOT written (→ re-importing the same file = 0 writes)
 * - only fields present in the file are updated; images are never touched here
 * - throws 'CATEGORIES_NOT_FOUND' after tallying so the caller can roll back
 */
export async function applyRows(
  tx: Executor,
  rows: ParsedRow[],
  categoryByNo: Map<string, string>,
  existingByCode: Map<string, ExistingItem>
): Promise<CommitCounts> {
  const counts: CommitCounts = {
    created: 0,
    updated: 0,
    unchanged: 0,
    incompleteReport: [],
    errors: [],
    categoriesNotFound: [],
  }
  const notFound = new Set<string>()

  for (const row of rows) {
    const categoryId = categoryByNo.get(row.categoryNo)
    if (!categoryId) {
      notFound.add(row.categoryNo)
      counts.errors.push({ imageCode: row.imageCode, error: `ไม่พบหมวด "${row.categoryNo}"` })
      continue
    }
    if (row.incomplete) {
      counts.incompleteReport.push({ imageCode: row.imageCode, nameTh: row.nameTh, reasons: row.incompleteReasons })
    }

    const existing = existingByCode.get(row.imageCode)
    if (!existing) {
      const t = computeTargets(row, categoryId, true)
      await tx.insert(menuItems).values({
        importCode: row.imageCode,
        categoryId,
        nameTh: t.nameTh ?? '',
        nameEn: t.nameEn ?? '',
        nameZh: t.nameZh ?? '',
        price: t.price ?? '0.00',
        status: t.status ?? 'published',
        isAvailable: t.isAvailable ?? true,
        subCategory: t.subCategory ?? null,
        imageFile: t.imageFile ?? null,
        descriptionTh: t.descriptionTh ?? null,
        descriptionEn: t.descriptionEn ?? null,
        descriptionZh: t.descriptionZh ?? null,
        priceOriginal: t.priceOriginal ?? null,
        priceMax: t.priceMax ?? null,
        badge: t.badge ?? null,
        isFeatured: t.isFeatured ?? false,
        sortOrder: t.sortOrder ?? 0,
      })
      counts.created++
    } else {
      const t = computeTargets(row, categoryId, false)
      const changes = diffTargets(t, existing)
      if (changes.length === 0) {
        counts.unchanged++
      } else {
        await tx
          .update(menuItems)
          .set({ ...(t as Record<string, unknown>), updatedAt: new Date() })
          .where(eq(menuItems.importCode, row.imageCode))
        counts.updated++
      }
    }
  }

  counts.categoriesNotFound = [...notFound]
  return counts
}
