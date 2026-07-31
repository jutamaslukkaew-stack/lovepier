import { createHash } from 'crypto'
import * as XLSX from 'xlsx'
import { COLUMNS, SHEET_NAME, VALID_STATUS, type FileError, type ImportStatus, type ParsedRow } from './spec'

export type ParseResult =
  | { ok: false; errors: FileError[] }
  | { ok: true; rows: ParsedRow[]; fileHash: string; incompleteCount: number }

function s(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

// Parse a THB integer that may arrive as a number, or a string with commas.
// Returns { value } on success, { invalid: true } when non-blank but not numeric,
// or { value: null } when blank.
function parseMoney(raw: unknown): { value: number | null; invalid?: boolean } {
  const t = s(raw)
  if (t === '') return { value: null }
  const cleaned = t.replace(/,/g, '').replace(/฿|บาท/gi, '').trim()
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return { value: null, invalid: true }
  return { value: Number(cleaned) }
}

// Optional integer (price_max, price_original, sort_order). Never rejects the
// file — an unparseable optional value is simply dropped to null.
function parseOptInt(raw: unknown): number | null {
  const t = s(raw).replace(/,/g, '')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function parseBool(raw: unknown, dflt: boolean): boolean {
  const t = s(raw).toLowerCase()
  if (t === '') return dflt
  if (raw === true) return true
  if (raw === false) return false
  return t === 'true' || t === '1' || t === 'yes' || t === 'y'
}

export function parseWorkbook(buffer: Buffer): ParseResult {
  const fileHash = createHash('sha256').update(buffer).digest('hex')
  const wb = XLSX.read(buffer, { type: 'buffer' })

  const sheet = wb.Sheets[SHEET_NAME]
  if (!sheet) return { ok: false, errors: [{ type: 'missing_sheet' }] }

  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, blankrows: false })
  if (grid.length < 2) return { ok: false, errors: [{ type: 'empty' }] }

  // Header row → column-name → index map (ignore columns whose name starts with `_`).
  const header = (grid[0] as unknown[]).map((h) => s(h))
  const colIndex = new Map<string, number>()
  header.forEach((name, i) => {
    if (name && !name.startsWith('_') && !colIndex.has(name)) colIndex.set(name, i)
  })

  const missing = COLUMNS.filter((c) => !colIndex.has(c))
  if (missing.length) return { ok: false, errors: [{ type: 'missing_columns', columns: missing }] }

  const get = (row: unknown[], col: string) => {
    const i = colIndex.get(col)!
    return i < row.length ? row[i] : null
  }

  const errors: FileError[] = []
  const rows: ParsedRow[] = []
  const seenCodes = new Map<string, number[]>()

  for (let r = 1; r < grid.length; r++) {
    const raw = grid[r] as unknown[]
    // fully blank row → skip
    if (!raw.some((c) => c != null && s(c) !== '')) continue
    const rowNumber = r + 1 // 1-based, header is row 1

    const imageCode = s(get(raw, 'image_code'))
    if (imageCode === '') {
      errors.push({ type: 'missing_image_code', row: rowNumber })
      continue
    }
    const codeRows = seenCodes.get(imageCode) ?? []
    codeRows.push(rowNumber)
    seenCodes.set(imageCode, codeRows)

    // status: blank → published; invalid → reject file
    const statusRaw = s(get(raw, 'status')).toLowerCase()
    let status: ImportStatus = 'published'
    if (statusRaw !== '') {
      if (!(VALID_STATUS as readonly string[]).includes(statusRaw)) {
        errors.push({ type: 'invalid_status', row: rowNumber, value: statusRaw })
      } else {
        status = statusRaw as ImportStatus
      }
    }

    const money = parseMoney(get(raw, 'price'))
    if (money.invalid) {
      errors.push({ type: 'invalid_price', row: rowNumber, value: s(get(raw, 'price')) })
    }
    const price = money.value

    const nameTh = s(get(raw, 'name_th')) || null

    // Incompleteness (NOT a file error): missing thai name or missing/≤0 price.
    const incompleteReasons: string[] = []
    if (!nameTh) incompleteReasons.push('ไม่มีชื่อไทย')
    if (price == null) incompleteReasons.push('ไม่มีราคา')
    else if (price <= 0) incompleteReasons.push('ราคา ≤ 0')
    const incomplete = incompleteReasons.length > 0

    rows.push({
      rowNumber,
      imageCode,
      // incomplete rows are always parked as planned + unavailable
      status: incomplete ? 'planned' : status,
      categoryNo: s(get(raw, 'category_no')),
      subCategory: s(get(raw, 'sub_category')) || null,
      nameTh,
      nameEn: s(get(raw, 'name_en')) || null,
      nameZh: s(get(raw, 'name_zh')) || null,
      descTh: s(get(raw, 'desc_th')) || null,
      descEn: s(get(raw, 'desc_en')) || null,
      descZh: s(get(raw, 'desc_zh')) || null,
      price,
      priceOriginal: parseOptInt(get(raw, 'price_original')),
      priceMax: parseOptInt(get(raw, 'price_max')),
      badge: s(get(raw, 'badge')) || null,
      isFeatured: parseBool(get(raw, 'is_featured'), false),
      isAvailable: incomplete ? false : parseBool(get(raw, 'is_available'), true),
      sortOrder: parseOptInt(get(raw, 'sort_order')),
      imageFile: s(get(raw, 'image_file')) || null,
      noteInternal: s(get(raw, 'note_internal')) || null,
      incomplete,
      incompleteReasons,
    })
  }

  // Duplicate image_code within the file → reject the whole file.
  for (const [code, rs] of seenCodes) {
    if (rs.length > 1) errors.push({ type: 'duplicate_image_code', code, rows: rs })
  }

  if (errors.length) return { ok: false, errors }

  const incompleteCount = rows.filter((r) => r.incomplete).length
  return { ok: true, rows, fileHash, incompleteCount }
}
