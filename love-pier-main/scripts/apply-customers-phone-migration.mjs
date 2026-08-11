// Applies lib/db/migrations/manual/0005_customers_phone_unique.sql (adds a
// partial unique index on customers.phone).
//
//   node scripts/apply-customers-phone-migration.mjs          → dry run
//   node scripts/apply-customers-phone-migration.mjs --apply  → writes
//
// Safe to run repeatedly: CREATE UNIQUE INDEX IF NOT EXISTS is a no-op the
// second time. Refuses to apply if a duplicate non-blank phone already
// exists (the index creation would fail anyway; this just gives a clearer
// error naming the offending phone numbers).
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

  const dupes = await sql`
    select phone, count(*)::int as n from customers
    where phone <> '' group by phone having count(*) > 1`
  if (dupes.length > 0) {
    console.error('Duplicate non-blank phones exist — resolve these before applying:', dupes)
    await sql.end()
    process.exit(1)
  }

  const [before] = await sql`
    select
      (select count(*)::int from customers) as customers,
      (select count(*)::int from pg_indexes where indexname = 'customers_phone_unique_idx') as has_index`
  console.log('BEFORE:', before)

  const migrationSql = readFileSync(
    resolve(__dirname, '../lib/db/migrations/manual/0005_customers_phone_unique.sql'),
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
      (select count(*)::int from pg_indexes where indexname = 'customers_phone_unique_idx') as has_index`
  console.log('AFTER:', after)

  if (after.customers !== before.customers) {
    throw new Error(`Customer count changed (${before.customers} -> ${after.customers}) — this migration must not touch rows.`)
  }

  await sql.end()
  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
