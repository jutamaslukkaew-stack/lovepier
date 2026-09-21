// Copies every file in every Supabase Storage bucket, plus the admin account
// list, onto this machine — insurance in case the Supabase project is paused
// or lost before the migration away from it happens.
//
//   npx tsx scripts/backup-storage.ts [outDir]
//
// outDir defaults to ../supabase-backup-YYYY-MM-DD (the git root), which the
// root .gitignore excludes: the slips bucket holds customers' bank-transfer
// slips and must never be committed. Read-only against Supabase; safe to re-run (files already on
// disk with the same size are skipped).
import { createClient } from '@supabase/supabase-js'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'

const envPath = resolve(process.cwd(), '.env.local')
try {
  const envContent = readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
} catch { /* ignore */ }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key || key.startsWith('your-')) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing in .env.local')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const today = new Date().toISOString().slice(0, 10)
const outDir = resolve(process.argv[2] ?? join(process.cwd(), '..', `supabase-backup-${today}`))

type Entry = { path: string; size: number | null }

// Storage "folders" are list() entries with no id; recurse into them.
async function listAll(bucket: string, prefix = ''): Promise<Entry[]> {
  const out: Entry[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`)
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id === null) out.push(...(await listAll(bucket, path)))
      else out.push({ path, size: (item.metadata as { size?: number } | null)?.size ?? null })
    }
    if (data.length < 1000) break
  }
  return out
}

async function backupBucket(bucket: string) {
  const files = await listAll(bucket)
  let downloaded = 0, skipped = 0, failed = 0
  for (const f of files) {
    const dest = join(outDir, bucket, f.path)
    if (existsSync(dest) && f.size !== null && statSync(dest).size === f.size) { skipped++; continue }
    const { data, error } = await supabase.storage.from(bucket).download(f.path)
    if (error || !data) { failed++; console.error(`  ⚠️ ${bucket}/${f.path}: ${error?.message}`); continue }
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, Buffer.from(await data.arrayBuffer()))
    downloaded++
  }
  console.log(`📦 ${bucket}: ${files.length} files (new ${downloaded}, already had ${skipped}, failed ${failed})`)
  return { bucket, files: files.length, failed }
}

async function backupAdmins() {
  const users: { id: string; email?: string; role?: unknown; created_at: string; last_sign_in_at?: string }[] = []
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`auth users: ${error.message}`)
    for (const u of data.users) {
      users.push({
        id: u.id,
        email: u.email,
        role: u.app_metadata?.role ?? u.user_metadata?.role,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      })
    }
    if (data.users.length < 1000) break
  }
  writeFileSync(join(outDir, 'auth-users.json'), JSON.stringify(users, null, 2))
  console.log(`👤 auth users: ${users.length} (emails + roles only — passwords can't be exported)`)
}

async function main() {
  mkdirSync(outDir, { recursive: true })
  console.log(`→ ${outDir}`)
  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) { console.error('❌', error.message); process.exit(1) }
  const results = []
  for (const b of buckets) results.push(await backupBucket(b.name))
  await backupAdmins()
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify({ project: url, date: today, buckets: results }, null, 2))
  const failed = results.reduce((n, r) => n + r.failed, 0)
  if (failed) { console.error(`❌ ${failed} file(s) failed — re-run to retry`); process.exit(1) }
  console.log('✅ done')
}

main().catch((err) => { console.error('❌', err.message ?? err); process.exit(1) })
