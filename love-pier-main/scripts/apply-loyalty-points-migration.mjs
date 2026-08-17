// Applies lib/db/migrations/manual/0006_loyalty_points_and_discount.sql
// (customers.points_balance, orders.discount_amount, orders.points_earned,
// and the new point_transactions table).
//
//   node scripts/apply-loyalty-points-migration.mjs          → dry run
//   node scripts/apply-loyalty-points-migration.mjs --apply  → writes
//
// Safe to run repeatedly: every statement is guarded (ADD COLUMN IF NOT
// EXISTS / CREATE TABLE IF NOT EXISTS). Purely additive — never touches
// existing rows, so the before/after row counts must match exactly.
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

async function main() {
  const sql = postgres(env('DATABASE_URL'), { prepare: false, connect_timeout: 20, idle_timeout: 5 })

  const [before] = await sql`
    select
      (select count(*)::int from customers) as customers,
      (select count(*)::int from orders) as orders,
      (select count(*)::int from information_schema.columns
        where table_name = 'customers' and column_name = 'points_balance') as has_points_balance,
      (select count(*)::int from information_schema.tables
        where table_name = 'point_transactions') as has_ledger`
  console.log('BEFORE:', before)

  const migrationSql = readFileSync(
    resolve(__dirname, '../lib/db/migrations/manual/0006_loyalty_points_and_discount.sql'),
    'utf8'
  )
  console.log('\n--- migration SQL ---\n' + migrationSql)

  if (!APPLY) {
    console.log('Dry run — nothing written. Re-run with --apply to write.')
    await sql.end()
    return
  }

  await sql.unsafe(migrationSql)

  const [after] = await sql`
    select
      (select count(*)::int from customers) as customers,
      (select count(*)::int from orders) as orders,
      (select count(*)::int from information_schema.columns
        where table_name = 'customers' and column_name = 'points_balance') as has_points_balance,
      (select count(*)::int from information_schema.tables
        where table_name = 'point_transactions') as has_ledger`
  console.log('AFTER:', after)

  if (after.customers !== before.customers || after.orders !== before.orders) {
    throw new Error(
      `Row counts changed (customers ${before.customers}->${after.customers}, orders ${before.orders}->${after.orders}) — this migration must not touch rows.`
    )
  }

  await sql.end()
  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
