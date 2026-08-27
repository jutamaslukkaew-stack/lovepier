// Applies the additive, repeatable referral migration (0017).
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
        where table_name = 'group_invites') as has_invites,
      (select count(*)::int from information_schema.columns
        where table_name = 'customers' and column_name = 'referred_by_customer_id') as has_referrer,
      (select count(*)::int from information_schema.tables
        where table_name = 'referral_payouts') as has_payouts,
      (select count(*)::int from customers) as customers`
  // Counted separately, and only once the column exists: on the BEFORE pass of
  // a first run it does not, and naming it in the query above would make the
  // whole statement fail to parse rather than returning zero.
  let referred = 0
  if (row.has_referrer) {
    const [r] = await sql`
      select count(*)::int as n from customers where referred_by_customer_id is not null`
    referred = r.n
  }
  return { ...row, referred }
}

async function main() {
  const sql = postgres(env('DATABASE_URL'), { prepare: false, connect_timeout: 20, idle_timeout: 5 })
  const before = await state(sql)
  console.log('BEFORE:', before)

  // 0017 does not depend on 0016 structurally, but a referral can only ever be
  // recorded by an invite redemption, so applying it alone would be pointless.
  if (!before.has_invites) {
    throw new Error('group_invites is missing — run `npm run db:migrate-group-invites` first (0016 before 0017).')
  }

  const migration = readFileSync(
    resolve(scriptDir, '../lib/db/migrations/manual/0017_referrals.sql'),
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
  if (!after.has_referrer || !after.has_payouts) throw new Error('Migration objects are missing.')
  // Adds columns and a table; it must not have touched anybody.
  if (after.customers !== before.customers) throw new Error('Customer row count changed unexpectedly.')
  if (after.referred !== before.referred) throw new Error('Referral attributions changed unexpectedly.')

  await sql.end()
  console.log('Referrals migration applied.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
