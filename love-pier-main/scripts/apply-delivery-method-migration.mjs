// Applies lib/db/migrations/manual/0004_delivery_method.sql (adds
// orders.delivery_method) and, only when values are passed, seeds the
// delivery-fee settings the shop chose (delivery_base_fee / delivery_per_km_rate
// in the `settings` key/value table, read by lib/settings.js).
//
//   node scripts/apply-delivery-method-migration.mjs
//     → dry run, prints the plan, writes nothing
//   node scripts/apply-delivery-method-migration.mjs --apply
//     → adds the column only
//   node scripts/apply-delivery-method-migration.mjs --apply --base-fee 30 --per-km 30
//     → adds the column AND upserts the two fee settings
//
// Safe to run repeatedly: the ALTER is guarded (IF NOT EXISTS) and the
// settings write is a plain upsert on the key.
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import postgres from 'postgres'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APPLY = process.argv.includes('--apply')

function arg(name) {
  const i = process.argv.indexOf(name)
  return i !== -1 ? process.argv[i + 1] : null
}

const baseFee = arg('--base-fee')
const perKm = arg('--per-km')
const minOrder = arg('--min-order')

function env(k) {
  const src = readFileSync(resolve(__dirname, '../.env.local'), 'utf8')
  const m = src.match(new RegExp('^' + k + '=(.*)$', 'm'))
  return m ? m[1].trim().replace(/[\r\n]/g, '') : ''
}

async function main() {
  const sql = postgres(env('DATABASE_URL'), { prepare: false, connect_timeout: 20, idle_timeout: 5 })

  const [before] = await sql`
    select
      (select count(*)::int from orders) as orders,
      (select count(*)::int from information_schema.columns
        where table_name = 'orders' and column_name = 'delivery_method') as has_column`
  console.log('BEFORE:', before)

  const migrationSql = readFileSync(
    resolve(__dirname, '../lib/db/migrations/manual/0004_delivery_method.sql'),
    'utf8'
  )

  console.log('\n--- migration SQL ---\n' + migrationSql)
  if (baseFee != null || perKm != null || minOrder != null) {
    console.log(`--- settings ---\ndelivery_base_fee = ${baseFee ?? '(unchanged)'}`)
    console.log(`delivery_per_km_rate = ${perKm ?? '(unchanged)'}`)
    console.log(`delivery_min_order = ${minOrder ?? '(unchanged)'}`)
  }

  if (!APPLY) {
    console.log('\nDry run — nothing written. Re-run with --apply to write.')
    await sql.end()
    return
  }

  await sql.unsafe(migrationSql)

  if (baseFee != null) {
    await sql`
      insert into settings (key, value) values ('delivery_base_fee', ${baseFee})
      on conflict (key) do update set value = excluded.value, updated_at = now()`
  }
  if (perKm != null) {
    await sql`
      insert into settings (key, value) values ('delivery_per_km_rate', ${perKm})
      on conflict (key) do update set value = excluded.value, updated_at = now()`
  }
  if (minOrder != null) {
    await sql`
      insert into settings (key, value) values ('delivery_min_order', ${minOrder})
      on conflict (key) do update set value = excluded.value, updated_at = now()`
  }

  const [after] = await sql`
    select
      (select count(*)::int from orders) as orders,
      (select count(*)::int from information_schema.columns
        where table_name = 'orders' and column_name = 'delivery_method') as has_column,
      (select value from settings where key = 'delivery_base_fee') as base_fee,
      (select value from settings where key = 'delivery_per_km_rate') as per_km_rate,
      (select value from settings where key = 'delivery_min_order') as min_order`
  console.log('AFTER:', after)

  if (after.orders !== before.orders) {
    throw new Error(`Order count changed (${before.orders} -> ${after.orders}) — this migration must not touch orders rows.`)
  }

  await sql.end()
  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
