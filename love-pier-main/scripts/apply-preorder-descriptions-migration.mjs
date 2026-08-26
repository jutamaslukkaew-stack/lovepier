import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import postgres from 'postgres'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const APPLY = process.argv.includes('--apply')
function env(key) { const source = readFileSync(resolve(scriptDir, '../.env.local'), 'utf8'); return source.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() || '' }

async function main() {
  const sql = postgres(env('DATABASE_URL'), { prepare: false, connect_timeout: 20, idle_timeout: 5 })
  const migration = readFileSync(resolve(scriptDir, '../lib/db/migrations/manual/0014_preorder_descriptions.sql'), 'utf8')
  if (!APPLY) { console.log(migration); await sql.end(); return }
  const [before] = await sql`select count(*)::int as described from preorder_items where description_th <> ''`
  await sql.unsafe(migration)
  const [after] = await sql`select count(*)::int as described from preorder_items where description_th <> ''`
  console.log('Pre Order descriptions:', before.described, '->', after.described)
  await sql.end()
}
main().catch((error) => { console.error(error); process.exit(1) })
