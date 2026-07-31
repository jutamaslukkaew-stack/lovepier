// Pure filename → import_code matching for the image pipeline. No IO, so it is
// trivially unit-testable and shared by the image-urls and process-images APIs.

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp'])

export type FileStatus = 'matched' | 'unmatched' | 'drive_dup' | 'heic' | 'skipped'

export type FileClass = {
  path: string // original path/name exactly as supplied by the client
  basename: string
  status: FileStatus
  importCode?: string
  reason?: string
}

export type MatchReport = {
  files: FileClass[]
  // files safe to upload + process, already resolved to their import_code
  matched: { path: string; importCode: string }[]
  summary: {
    total: number
    matched: number
    unmatched: number
    driveDup: number
    heic: number
    skipped: number
    // import_codes referenced by more than one incoming file (ambiguous)
    conflicts: { importCode: string; paths: string[] }[]
  }
}

export type ValidCode = { importCode: string; imageFile: string | null }

/** basename of a possibly-nested path, forward or back slashes. */
export function basenameOf(path: string): string {
  const clean = path.replace(/\\/g, '/')
  const parts = clean.split('/')
  return parts[parts.length - 1]
}

/** Strip ONLY the final extension. "9.5_03.jpg" → "9.5_03" (not "9"). */
export function stripExt(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

/** lowercased final extension without the dot, or '' when none. */
export function extOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

function isSystemFile(path: string): boolean {
  if (/(^|\/)__MACOSX(\/|$)/.test(path.replace(/\\/g, '/'))) return true
  const base = basenameOf(path)
  if (base.startsWith('.')) return true // .DS_Store and any dotfile
  if (base.toLowerCase() === 'thumbs.db') return true
  return false
}

/** Google Drive appends " (1)", " (2)" to duplicate uploads. */
function isDriveDuplicate(baseNoExt: string): boolean {
  return /\s\(\d+\)$/.test(baseNoExt)
}

/**
 * Classify every incoming filename and resolve matches to import_codes.
 * Folder names are ignored — only the basename matters (Google Drive splits
 * photos into per-category folders that carry no meaning for the system).
 */
export function classifyImages(paths: string[], validCodes: ValidCode[]): MatchReport {
  // key (lowercased) → import_code. Key is image_file (ext stripped) when set,
  // otherwise the import_code itself.
  const keyToCode = new Map<string, string>()
  for (const v of validCodes) {
    const key = (v.imageFile ? stripExt(v.imageFile) : v.importCode).toLowerCase()
    keyToCode.set(key, v.importCode)
  }

  const files: FileClass[] = []
  const codeToPaths = new Map<string, string[]>()

  for (const path of paths) {
    const basename = basenameOf(path)

    if (isSystemFile(path)) {
      files.push({ path, basename, status: 'skipped', reason: 'ไฟล์ระบบ' })
      continue
    }

    const ext = extOf(basename)
    if (ext === 'heic' || ext === 'heif') {
      files.push({ path, basename, status: 'heic', reason: 'ไฟล์ HEIC ใช้ไม่ได้ — ส่งเป็น JPEG' })
      continue
    }
    if (!IMAGE_EXTS.has(ext)) {
      files.push({ path, basename, status: 'skipped', reason: 'ไม่ใช่ไฟล์รูป' })
      continue
    }

    const baseNoExt = stripExt(basename)
    if (isDriveDuplicate(baseNoExt)) {
      files.push({
        path,
        basename,
        status: 'drive_dup',
        reason: 'ไฟล์ซ้ำจาก Google Drive — ลบตัวเก่าแล้วอัปใหม่ (อย่าใช้ชื่อลงท้าย (1))',
      })
      continue
    }

    const importCode = keyToCode.get(baseNoExt.toLowerCase())
    if (!importCode) {
      files.push({ path, basename, status: 'unmatched', reason: 'ไม่พบเมนูที่ตรงกับชื่อไฟล์นี้' })
      continue
    }

    files.push({ path, basename, status: 'matched', importCode })
    const arr = codeToPaths.get(importCode) ?? []
    arr.push(path)
    codeToPaths.set(importCode, arr)
  }

  const conflicts = [...codeToPaths.entries()]
    .filter(([, ps]) => ps.length > 1)
    .map(([importCode, paths]) => ({ importCode, paths }))

  const matched = files
    .filter((f) => f.status === 'matched')
    .map((f) => ({ path: f.path, importCode: f.importCode! }))

  return {
    files,
    matched,
    summary: {
      total: paths.length,
      matched: files.filter((f) => f.status === 'matched').length,
      unmatched: files.filter((f) => f.status === 'unmatched').length,
      driveDup: files.filter((f) => f.status === 'drive_dup').length,
      heic: files.filter((f) => f.status === 'heic').length,
      skipped: files.filter((f) => f.status === 'skipped').length,
      conflicts,
    },
  }
}
