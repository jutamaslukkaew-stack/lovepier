// Applies lib/db/migrations/manual/0009_preorder_scheduled_for.sql
// (orders.scheduled_for + its partial index).
//
//   node scripts/apply-preorder-migration.mjs          → dry run
//   node scripts/apply-preorder-migration.mjs --apply  → writes
//
// Safe to run repeatedly: both statements are guarded (ADD COLUMN /
// CREATE INDEX ... IF NOT EXISTS). Purely additive — only touches `orders`,
// and never its rows, so the before/after row count must match exactly.
//
// THIS MUST BE APPLIED BEFORE THE CODE THAT DECLARES THE COLUMN IS DEPLOYED.
// Three call sites do a bare `db.select().from(orders)` with no projection
// (app/admin/actions/orders.ts, pages/order/[orderNo].js, pages/api/verify-slip.js)
// and drizzle enumerates every column in schema.ts — so shipping the schema
// against a database without this column 500s the admin orders page, the
// public order page, slip verification, and every new order at once.
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import postgres from 'postgres'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APPLY = process.argv.includes('--apply')

function env(k) {
  const src = readFileSync(resolve(__dirname, '../.env.local'), 'utf8')
  const m = src.match(new RegExp('^' + k + '=(.*)$', 'm'))
  return m ? m[1].trim().replace(/[\r\n]/g, '') : ''
}

const STATE = (sql) => sql`
  select
    (select count(*)::int from orders) as orders,
    (select count(*)::int from information_schema.columns
      where table_name = 'orders' and column_name = 'scheduled_for') as has_scheduled_for,
    (select count(*)::int from pg_indexes
      where tablename = 'orders' and indexname = 'orders_scheduled_for_idx') as has_index`

async function main() {
  const sql = postgres(env('DATABASE_URL'), { prepare: false, connect_timeout: 20, idle_timeout: 5 })

  const [before] = await STATE(sql)
  console.log('BEFORE:', before)

  const migrationSql = readFileSync(
    resolve(__dirname, '../lib/db/migrations/manual/0009_preorder_scheduled_for.sql'),
    'utf8'
  )
  console.log('\n--- migration SQL ---\n' + migrationSql)

  if (!APPLY) {
    console.log('Dry run — nothing written. Re-run with --apply to write.')
    await sql.end()
    return
  }

  await sql.unsafe(migrationSql)

  const [after] = await STATE(sql)
  console.log('AFTER:', after)

  if (after.orders !== before.orders) {
    throw new Error(
      `Row count changed (orders ${before.orders}->${after.orders}) — this migration must not touch rows.`
    )
  }
  if (!after.has_scheduled_for || !after.has_index) {
    throw new Error('Migration ran but the column or index is still missing.')
  }

  await sql.end()
  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
