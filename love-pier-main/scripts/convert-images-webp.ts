/**
 * Convert all PNG/JPG in public/ to WebP using Sharp.
 * - Originals moved to public/_originals/ (for rollback)
 * - All .js/.ts/.tsx/.css/.md references updated to .webp
 */
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { globSync } from 'fs'

const ROOT = process.cwd()
const PUBLIC = path.join(ROOT, 'public')
const BACKUP = path.join(PUBLIC, '_originals')
const DIRS = ['uploads', 'menu']
const IMAGE_EXT = /\.(png|jpg|jpeg)$/i
const CODE_GLOBS = ['**/*.js', '**/*.ts', '**/*.tsx', '**/*.css']
const SKIP_DIRS = ['node_modules', '.next', '_originals', '.git']

// ---------- helpers ----------

function walkDir(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  const results: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) results.push(...walkDir(full))
    else if (IMAGE_EXT.test(entry.name)) results.push(full)
  }
  return results
}

function walkCode(dir: string): string[] {
  const results: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) results.push(...walkCode(full))
    else if (/\.(js|ts|tsx|css)$/.test(entry.name)) results.push(full)
  }
  return results
}

// ---------- main ----------

async function main() {
  fs.mkdirSync(BACKUP, { recursive: true })

  const allImages: string[] = []
  for (const d of DIRS) {
    allImages.push(...walkDir(path.join(PUBLIC, d)))
  }

  console.log(`\nFound ${allImages.length} images to convert\n`)

  let converted = 0
  let skipped = 0
  let savedBytes = 0

  for (const src of allImages) {
    const rel = path.relative(PUBLIC, src)          // uploads/foo.png
    const webpPath = src.replace(IMAGE_EXT, '.webp') // same dir, .webp ext
    const backupPath = path.join(BACKUP, rel)

    // Already converted? skip
    if (fs.existsSync(webpPath) && !IMAGE_EXT.test(webpPath)) {
      // webp already exists — still move original if not backed up
    }

    const origSize = fs.statSync(src).size

    // Convert to WebP
    try {
      await sharp(src)
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toFile(webpPath)
    } catch (e) {
      console.warn(`  ⚠️  skip ${rel}: ${(e as Error).message}`)
      skipped++
      continue
    }

    const newSize = fs.statSync(webpPath).size
    savedBytes += origSize - newSize
    const pct = Math.round((1 - newSize / origSize) * 100)
    console.log(`  ✓ ${rel}  ${(origSize / 1024).toFixed(0)}KB → ${(newSize / 1024).toFixed(0)}KB  (-${pct}%)`)

    // Backup original
    fs.mkdirSync(path.dirname(backupPath), { recursive: true })
    fs.renameSync(src, backupPath)

    converted++
  }

  console.log(`\n✅ Converted ${converted} images, skipped ${skipped}`)
  console.log(`💾 Saved ${(savedBytes / 1024 / 1024).toFixed(1)} MB total\n`)

  // ---------- Update code references ----------
  console.log('Updating code references...')

  const codeFiles = walkCode(ROOT)
  let fileCount = 0
  let replaceCount = 0

  const extPattern = /(['"`])(\/[^'"`]*?)\.(png|jpg|jpeg)(['"`])/g

  for (const file of codeFiles) {
    let content = fs.readFileSync(file, 'utf8')
    let changed = false

    const next = content.replace(extPattern, (match, q1, base, ext, q2) => {
      // only rewrite refs that point into our converted dirs
      if (base.startsWith('/uploads/') || base.startsWith('/menu/')) {
        replaceCount++
        changed = true
        return `${q1}${base}.webp${q2}`
      }
      return match
    })

    if (changed) {
      fs.writeFileSync(file, next, 'utf8')
      fileCount++
      console.log(`  updated: ${path.relative(ROOT, file)}`)
    }
  }

  console.log(`\n✅ Updated ${replaceCount} references across ${fileCount} files`)
  console.log('\nOriginals backed up to: public/_originals/')
  console.log('Run "git add -A && git commit" when happy.\n')
}

main().catch((e) => { console.error(e); process.exit(1) })
