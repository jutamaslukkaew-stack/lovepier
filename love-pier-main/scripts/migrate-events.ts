import postgres from 'postgres'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// manual env load without dotenv dependency
const envPath = resolve(process.cwd(), '.env.local')
try {
  const envContent = readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
} catch { /* ignore */ }

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id            SERIAL PRIMARY KEY,
      title_th      TEXT NOT NULL,
      title_en      TEXT NOT NULL,
      title_zh      TEXT NOT NULL DEFAULT '',
      title_em      TEXT NOT NULL DEFAULT '',
      event_date    DATE,
      time_range    TEXT NOT NULL DEFAULT '',
      time_sub      TEXT NOT NULL DEFAULT '',
      location      TEXT NOT NULL DEFAULT '',
      price         INTEGER,
      entry_sub_th  TEXT NOT NULL DEFAULT '',
      entry_sub_en  TEXT NOT NULL DEFAULT '',
      entry_sub_zh  TEXT NOT NULL DEFAULT '',
      description_th TEXT NOT NULL DEFAULT '',
      description_en TEXT NOT NULL DEFAULT '',
      description_zh TEXT NOT NULL DEFAULT '',
      category_th   TEXT NOT NULL DEFAULT '',
      category_en   TEXT NOT NULL DEFAULT '',
      category_zh   TEXT NOT NULL DEFAULT '',
      image_url     TEXT,
      is_featured   BOOLEAN NOT NULL DEFAULT FALSE,
      is_active     BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order    INTEGER NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `
  console.log('✅ events table created (or already exists)')
  await sql.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
