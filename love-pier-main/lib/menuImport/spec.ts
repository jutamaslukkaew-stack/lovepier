// Shared contract for the Excel menu-import feature. The column names below
// ARE the contract with the template (lovepier_menu_import_template_v1.xlsx) —
// changing one side without the other breaks parsing.

export const SHEET_NAME = 'menu'

// Exact header names, in order, that the `menu` sheet must contain (row 1).
export const COLUMNS = [
  'image_code',
  'status',
  'category_no',
  'sub_category',
  'name_th',
  'name_en',
  'name_zh',
  'desc_th',
  'desc_en',
  'desc_zh',
  'price',
  'price_original',
  'price_max',
  'badge',
  'is_featured',
  'is_available',
  'sort_order',
  'image_file',
  'note_internal',
] as const

export type ColumnName = (typeof COLUMNS)[number]

export const VALID_STATUS = ['published', 'planned', 'retired'] as const
export type ImportStatus = (typeof VALID_STATUS)[number]

// A parsed + normalised menu row (before the DB diff).
export type ParsedRow = {
  rowNumber: number // 1-based row in the sheet (header = 1, first data = 2)
  imageCode: string
  status: ImportStatus
  categoryNo: string
  subCategory: string | null
  nameTh: string | null
  nameEn: string | null
  nameZh: string | null
  descTh: string | null
  descEn: string | null
  descZh: string | null
  price: number | null
  priceOriginal: number | null
  priceMax: number | null
  badge: string | null
  isFeatured: boolean
  isAvailable: boolean
  sortOrder: number | null
  imageFile: string | null
  noteInternal: string | null
  // A row is "incomplete" when name_th is blank or price is missing/≤0. Such
  // rows are imported but forced to planned + unavailable (never rejected).
  incomplete: boolean
  incompleteReasons: string[]
}

// Hard errors that reject the WHOLE file (vs. per-row incompleteness).
export type FileError =
  | { type: 'missing_sheet' }
  | { type: 'missing_columns'; columns: string[] }
  | { type: 'duplicate_image_code'; code: string; rows: number[] }
  | { type: 'invalid_price'; row: number; value: string }
  | { type: 'invalid_status'; row: number; value: string }
  | { type: 'missing_image_code'; row: number }
  | { type: 'empty' }
