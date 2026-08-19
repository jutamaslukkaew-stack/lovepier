// Applies lib/db/migrations/manual/0008_love_pier_id.sql
// (customers.member_no, customers.member_code, customers.birthday, plus the
// customers_member_no_seq sequence backing member numbers).
//
//   node scripts/apply-love-pier-id-migration.mjs          → dry run
//   node scripts/apply-love-pier-id-migration.mjs --apply  → writes
//
// Safe to run repeatedly: every statement is guarded (CREATE SEQUENCE /
// ADD COLUMN / CREATE UNIQUE INDEX ... IF NOT EXISTS). Purely additive —
// only touches `customers`, and never its rows, so the before/after row
// count must match exactly.
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
    (select count(*)::int from information_schema.columns
      where table_name = 'customers' and column_name = 'member_no') as has_member_no,
    (select count(*)::int from information_schema.columns
      where table_name = 'customers' and column_name = 'member_code') as has_member_code,
    (select count(*)::int from information_schema.columns
      where table_name = 'customers' and column_name = 'birthday') as has_birthday,
    (select count(*)::int from information_schema.sequences
      where sequence_name = 'customers_member_no_seq') as has_seq`

async function main() {
  const sql = postgres(env('DATABASE_URL'), { prepare: false, connect_timeout: 20, idle_timeout: 5 })

  const [before] = await STATE(sql)
  console.log('BEFORE:', before)

  const migrationSql = readFileSync(
    resolve(__dirname, '../lib/db/migrations/manual/0008_love_pier_id.sql'),
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

  if (after.customers !== before.customers) {
    throw new Error(
      `Row count changed (customers ${before.customers}->${after.customers}) — this migration must not touch rows.`
    )
  }

  await sql.end()
  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
