// Applies the additive, repeatable invite-link migration (0016).
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
      (select count(*)::int from information_schema.tables
        where table_name = 'customer_tiers') as has_tiers,
      (select count(*)::int from information_schema.tables
        where table_name = 'group_invites') as has_invites,
      (select count(*)::int from information_schema.tables
        where table_name = 'group_invite_redemptions') as has_redemptions,
      (select count(*)::int from customers) as customers`
  return row
}

async function main() {
  const sql = postgres(env('DATABASE_URL'), { prepare: false, connect_timeout: 20, idle_timeout: 5 })
  const before = await state(sql)
  console.log('BEFORE:', before)

  // 0016 declares a foreign key onto customer_tiers, so it cannot be applied
  // to a database that has not had 0015. Say that plainly instead of letting
  // Postgres report a missing relation.
  if (!before.has_tiers) {
    throw new Error('customer_tiers is missing — run `npm run db:migrate-tier-catalog` first (0015 before 0016).')
  }

  const migration = readFileSync(
    resolve(scriptDir, '../lib/db/migrations/manual/0016_group_invites.sql'),
    'utf8'
  )

  if (!APPLY) {
    console.log(migration)
    console.log('Dry run — nothing written.')
    await sql.end()
    return
  }

  await sql.unsafe(migration)
  const after = await state(sql)
  console.log('AFTER:', after)
  if (!after.has_invites || !after.has_redemptions) throw new Error('Migration objects are missing.')
  // This migration only ADDS tables — it must not have touched anybody.
  if (after.customers !== before.customers) throw new Error('Customer row count changed unexpectedly.')

  await sql.end()
  console.log('Group invites migration applied.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
