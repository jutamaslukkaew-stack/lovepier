// Applies the additive, repeatable customer tier expiry/history migration.
// Run without --apply for a read-only preview.
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import postgres from 'postgres'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const APPLY = process.argv.includes('--apply')

function env(key) {
  const source = readFileSync(resolve(scriptDir, '../.env.local'), 'utf8')
  const match = source.match(new RegExp(`^${key}=(.*)$`, 'm'))
  return match ? match[1].trim().replace(/[\r\n]/g, '') : ''
}

async function state(sql) {
  const [row] = await sql`
    select
      (select count(*)::int from customers) as customers,
      (select count(*)::int from information_schema.columns
        where table_name = 'customers' and column_name = 'tier_expires_at') as has_expiry,
      (select count(*)::int from information_schema.tables
        where table_name = 'customer_tier_history') as has_history`
  return row
}

async function main() {
  const sql = postgres(env('DATABASE_URL'), { prepare: false, connect_timeout: 20, idle_timeout: 5 })
  const before = await state(sql)
  console.log('BEFORE:', before)
  const migration = readFileSync(resolve(scriptDir, '../lib/db/migrations/manual/0011_customer_tier_expiry.sql'), 'utf8')

  if (!APPLY) {
    console.log(migration)
    console.log('Dry run — nothing written.')
    await sql.end()
    return
  }

  await sql.unsafe(migration)
  const after = await state(sql)
  console.log('AFTER:', after)
  if (after.customers !== before.customers) throw new Error('Customer row count changed unexpectedly.')
  if (!after.has_expiry || !after.has_history) throw new Error('Migration objects are missing.')
  await sql.end()
  console.log('Tier expiry migration applied.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
