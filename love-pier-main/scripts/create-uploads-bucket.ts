import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(process.cwd(), '.env.local')
try {
  const envContent = readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
} catch { /* ignore */ }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { data: buckets } = await supabase.storage.listBuckets()
  if (buckets?.find((b) => b.name === 'uploads')) {
    console.log('✅ bucket "uploads" already exists')
    return
  }
  const { error } = await supabase.storage.createBucket('uploads', { public: true })
  if (error) { console.error('❌', error.message); process.exit(1) }
  console.log('✅ bucket "uploads" created (public)')
}

main()
