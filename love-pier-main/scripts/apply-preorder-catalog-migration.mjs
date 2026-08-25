import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import postgres from 'postgres'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const APPLY = process.argv.includes('--apply')
function env(key) { const source = readFileSync(resolve(scriptDir, '../.env.local'), 'utf8'); return source.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() || '' }

async function main() {
  const sql = postgres(env('DATABASE_URL'), { prepare: false, connect_timeout: 20, idle_timeout: 5 })
  const before = await sql`select count(*)::int as orders from orders`
  const migration = readFileSync(resolve(scriptDir, '../lib/db/migrations/manual/0013_preorder_catalog.sql'), 'utf8')
  if (!APPLY) { console.log(migration); await sql.end(); return }
  await sql.unsafe(migration)
  const [state] = await sql`select count(*)::int as items from preorder_items`
  const after = await sql`select count(*)::int as orders from orders`
  if (before[0].orders !== after[0].orders) throw new Error('Order count changed unexpectedly')
  if (state.items < 21) throw new Error('Pre Order seed is incomplete')
  console.log('Pre Order catalogue ready:', state.items, 'items')
  await sql.end()
}
main().catch((error) => { console.error(error); process.exit(1) })
