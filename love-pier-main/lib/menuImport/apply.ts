import type { ParsedRow } from './spec'

// The menu_items columns the importer manages. `image_url`/`image_alt` are
// intentionally excluded — images are handled by the separate image pipeline
// and must never be touched by an Excel-only import.
export type Targets = {
  categoryId?: string
  status?: string
  subCategory?: string | null
  imageFile?: string | null
  nameTh?: string
  nameEn?: string
  nameZh?: string
  descriptionTh?: string | null
  descriptionEn?: string | null
  descriptionZh?: string | null
  price?: string // numeric column → string, to match Drizzle
  priceOriginal?: string | null
  priceMax?: string | null
  badge?: string | null
  isFeatured?: boolean
  isAvailable?: boolean
  sortOrder?: number
}

// Which sheet columns were non-blank on this row. A blank optional cell means
// "leave the existing value alone" (per spec: update only fields present in the
// file), so it must NOT appear in the targets on an update.
function present(row: ParsedRow, col: keyof ParsedRow): boolean {
  const v = row[col]
  return v != null && !(typeof v === 'string' && v.trim() === '')
}

/**
 * The exact set of column→value writes this row implies. Shared by the preview
 * diff and the commit so a re-import of an unchanged file produces zero writes.
 *
 * - isCreate=true fills the NOT NULL columns (name_th, price) with placeholders
 *   for incomplete rows so the insert is valid; status/is_available default.
 * - isCreate=false (update) only includes columns the file actually provides,
 *   plus the forced status/availability for incomplete rows.
 */
export function computeTargets(row: ParsedRow, categoryId: string, isCreate: boolean): Targets {
  const t: Targets = {}

  // category is always provided (category_no is required)
  t.categoryId = categoryId

  // status / availability: incomplete rows are always parked; otherwise use the
  // file value when present, and only default on create.
  if (row.incomplete) {
    t.status = 'planned'
    t.isAvailable = false
  } else {
    if (present(row, 'status')) t.status = row.status
    else if (isCreate) t.status = 'published'
    if (present(row, 'isAvailable')) t.isAvailable = row.isAvailable
    else if (isCreate) t.isAvailable = true
  }

  // required NOT NULL columns — on create they must always get a value, so a
  // blank Excel cell falls back to '' / '0.00' rather than violating NOT NULL.
  if (present(row, 'nameTh')) t.nameTh = row.nameTh as string
  else if (isCreate) t.nameTh = '' // placeholder for an incomplete new row
  if (present(row, 'nameEn')) t.nameEn = row.nameEn as string
  else if (isCreate) t.nameEn = ''
  if (present(row, 'nameZh')) t.nameZh = row.nameZh as string
  else if (isCreate) t.nameZh = ''
  if (row.price != null && row.price > 0) t.price = row.price.toFixed(2)
  else if (isCreate) t.price = '0.00' // placeholder for an incomplete new row

  // present-gated optional columns
  if (present(row, 'subCategory')) t.subCategory = row.subCategory
  if (present(row, 'imageFile')) t.imageFile = row.imageFile
  if (present(row, 'descTh')) t.descriptionTh = row.descTh
  if (present(row, 'descEn')) t.descriptionEn = row.descEn
  if (present(row, 'descZh')) t.descriptionZh = row.descZh
  if (present(row, 'priceOriginal')) t.priceOriginal = (row.priceOriginal as number).toFixed(2)
  if (present(row, 'priceMax')) t.priceMax = (row.priceMax as number).toFixed(2)
  if (present(row, 'badge')) t.badge = row.badge
  if (present(row, 'isFeatured')) t.isFeatured = row.isFeatured
  if (present(row, 'sortOrder')) t.sortOrder = row.sortOrder as number

  return t
}

// Existing DB row shape we compare against (subset of menu_items).
export type ExistingItem = {
  categoryId: string
  status: string
  subCategory: string | null
  imageFile: string | null
  nameTh: string
  nameEn: string
  nameZh: string
  descriptionTh: string | null
  descriptionEn: string | null
  descriptionZh: string | null
  price: string | null
  priceOriginal: string | null
  priceMax: string | null
  badge: string | null
  isFeatured: boolean
  isAvailable: boolean
  sortOrder: number
}

export type FieldChange = { field: string; from: unknown; to: unknown }

const NUMERIC_FIELDS = new Set(['price', 'priceOriginal', 'priceMax'])

function sameValue(field: string, a: unknown, b: unknown): boolean {
  if (NUMERIC_FIELDS.has(field)) {
    const na = a == null || a === '' ? null : Number(a)
    const nb = b == null || b === '' ? null : Number(b)
    return na === nb // "150.00" vs 150 → equal; null vs null → equal
  }
  if (typeof a === 'boolean' || typeof b === 'boolean') return Boolean(a) === Boolean(b)
  if (typeof a === 'number' || typeof b === 'number') return Number(a) === Number(b)
  return (a ?? '') === (b ?? '') // treat null and '' as equal for text
}

/** Field-level changes between the computed targets and an existing row. */
export function diffTargets(targets: Targets, existing: ExistingItem): FieldChange[] {
  const changes: FieldChange[] = []
  for (const [field, to] of Object.entries(targets)) {
    const from = (existing as Record<string, unknown>)[field]
    if (!sameValue(field, from, to)) changes.push({ field, from, to })
  }
  return changes
}
