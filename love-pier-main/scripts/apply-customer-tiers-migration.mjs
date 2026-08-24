// Applies lib/db/migrations/manual/0010_customer_tiers.sql
// (customers.tier + orders.discount_percent).
//
//   node scripts/apply-customer-tiers-migration.mjs          → dry run
//   node scripts/apply-customer-tiers-migration.mjs --apply  → writes
//
// Safe to run repeatedly: both statements are ADD COLUMN ... IF NOT EXISTS.
// Purely additive — every existing row takes the column default, so both row
// counts must match exactly before and after.
//
// THIS MUST BE APPLIED BEFORE THE CODE THAT DECLARES THE COLUMNS IS DEPLOYED,
// for the same reason as 0009: several call sites do a bare
// `db.select().from(orders)` / `.from(customers)` with no projection, and
// drizzle enumerates every column in schema.ts. Shipping the schema against a
// database without these columns 500s the admin orders page, the public order
// page, slip verification and every new order at once.
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
    (select count(*)::int from customers) as customers,
    (select count(*)::int from orders) as orders,
    (select count(*)::int from information_schema.columns
      where table_name = 'customers' and column_name = 'tier') as has_tier,
    (select count(*)::int from information_schema.columns
      where table_name = 'orders' and column_name = 'discount_percent') as has_discount_percent`

async function main() {
  const sql = postgres(env('DATABASE_URL'), { prepare: false, connect_timeout: 20, idle_timeout: 5 })

  const [before] = await STATE(sql)
  console.log('BEFORE:', before)

  const migrationSql = readFileSync(
    resolve(__dirname, '../lib/db/migrations/manual/0010_customer_tiers.sql'),
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

  if (after.customers !== before.customers || after.orders !== before.orders) {
    throw new Error(
      `Row count changed (customers ${before.customers}->${after.customers}, ` +
        `orders ${before.orders}->${after.orders}) — this migration must not touch rows.`
    )
  }
  if (!after.has_tier || !after.has_discount_percent) {
    throw new Error('Migration ran but a column is still missing.')
  }

  await sql.end()
  console.log('\nDone. Tiers stay inert until member_discount_enabled is turned on in /admin/settings.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
