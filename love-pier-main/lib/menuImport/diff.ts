import { computeTargets, diffTargets, type ExistingItem, type FieldChange } from './apply'
import type { ParsedRow } from './spec'

export type RowAction = 'create' | 'update' | 'unchanged' | 'error'

export type DiffRow = {
  imageCode: string
  nameTh: string | null
  categoryNo: string
  action: RowAction
  incomplete: boolean
  changes: FieldChange[]
  issues: string[]
}

export type DiffResult = {
  summary: {
    total: number
    toCreate: number
    toUpdate: number
    unchanged: number
    incomplete: number
    errors: number
  }
  rows: DiffRow[]
  categoriesNotFound: string[] // category_no values referenced but not in the DB
}

// Categories keyed by category_no → id. Existing menu_items keyed by import_code.
export function diffRows(
  rows: ParsedRow[],
  categoryByNo: Map<string, string>,
  existingByCode: Map<string, ExistingItem>
): DiffResult {
  const out: DiffRow[] = []
  const catsNotFound = new Set<string>()

  for (const row of rows) {
    const issues: string[] = []
    if (row.incomplete) issues.push(...row.incompleteReasons)

    const categoryId = categoryByNo.get(row.categoryNo)
    if (!categoryId) {
      catsNotFound.add(row.categoryNo)
      out.push({
        imageCode: row.imageCode,
        nameTh: row.nameTh,
        categoryNo: row.categoryNo,
        action: 'error',
        incomplete: row.incomplete,
        changes: [],
        issues: [...issues, `ไม่พบหมวด category_no="${row.categoryNo}"`],
      })
      continue
    }

    const existing = existingByCode.get(row.imageCode)
    if (!existing) {
      out.push({
        imageCode: row.imageCode,
        nameTh: row.nameTh,
        categoryNo: row.categoryNo,
        action: 'create',
        incomplete: row.incomplete,
        changes: [],
        issues,
      })
      continue
    }

    const changes = diffTargets(computeTargets(row, categoryId, false), existing)
    out.push({
      imageCode: row.imageCode,
      nameTh: row.nameTh,
      categoryNo: row.categoryNo,
      action: changes.length ? 'update' : 'unchanged',
      incomplete: row.incomplete,
      changes,
      issues,
    })
  }

  return {
    summary: {
      total: out.length,
      toCreate: out.filter((r) => r.action === 'create').length,
      toUpdate: out.filter((r) => r.action === 'update').length,
      unchanged: out.filter((r) => r.action === 'unchanged').length,
      incomplete: out.filter((r) => r.incomplete).length,
      errors: out.filter((r) => r.action === 'error').length,
    },
    rows: out,
    categoriesNotFound: [...catsNotFound],
  }
}
