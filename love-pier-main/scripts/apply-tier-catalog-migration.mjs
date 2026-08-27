// Applies the additive, repeatable customer tier CATALOG migration (0015).
// Run without --apply for a read-only preview.
//
// The check that matters is not "did the table appear" but "does every group
// still cost what it cost before". The migration seeds the catalog from the
// four `tier_discount_*` settings rows for exactly that reason, and the
// comparison below is printed so a mismatch is visible rather than inferred.
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import postgres from 'postgres'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const APPLY = process.argv.includes('--apply')

// Mirrors lib/tiers.js#DEFAULT_TIERS — what a tier is worth when the shop has
// never set a rate for it.
const DEFAULTS = { general: 10, condo: 15, scc: 50, staff: 100 }

function env(key) {
  const source = readFileSync(resolve(scriptDir, '../.env.local'), 'utf8')
  const match = source.match(new RegExp(`^${key}=(.*)$`, 'm'))
  return match ? match[1].trim().replace(/[\r\n]/g, '') : ''
}

// What the OLD code would charge: the settings row if it parses, else the
// code default. Same rule as getShopSettings() + tierDiscountPercent().
async function ratesBefore(sql) {
  const rows = await sql`
    select key, value from settings where key like 'tier_discount_%'`
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  return Object.fromEntries(
    Object.entries(DEFAULTS).map(([key, fallback]) => {
      const raw = m[`tier_discount_${key}`]
      const n = Number.parseFloat(raw)
      const pct = Number.isFinite(n) ? n : fallback
      return [key, Math.min(100, Math.max(0, Math.round(pct)))]
    })
  )
}

async function ratesAfter(sql) {
  const rows = await sql`select key, discount_percent from customer_tiers`
  return Object.fromEntries(rows.map((r) => [r.key, Number(r.discount_percent)]))
}

async function main() {
  const sql = postgres(env('DATABASE_URL'), { prepare: false, connect_timeout: 20, idle_timeout: 5 })

  const [{ has_table }] = await sql`
    select count(*)::int as has_table from information_schema.tables
    where table_name = 'customer_tiers'`
  const before = await ratesBefore(sql)
  console.log('BEFORE — rates in force:', before, `(customer_tiers exists: ${Boolean(has_table)})`)

  const migration = readFileSync(
    resolve(scriptDir, '../lib/db/migrations/manual/0015_customer_tier_catalog.sql'),
    'utf8'
  )

  if (!APPLY) {
    console.log(migration)
    console.log('Dry run — nothing written.')
    await sql.end()
    return
  }

  await sql.unsafe(migration)
  const after = await ratesAfter(sql)
  console.log('AFTER  — rates in catalog:', after)

  // The whole point of the migration. A difference here means somebody's
  // price moved, which is the one outcome the plan rules out.
  const moved = Object.entries(before).filter(([key, pct]) => after[key] !== pct)
  if (moved.length > 0) {
    throw new Error(
      `Tier rates changed during migration: ${moved
        .map(([key, pct]) => `${key} ${pct}% -> ${after[key]}%`)
        .join(', ')}`
    )
  }

  const [{ customers_total, orphaned }] = await sql`
    select
      (select count(*)::int from customers) as customers_total,
      (select count(*)::int from customers c
        where not exists (select 1 from customer_tiers t where t.key = c.tier)) as orphaned`
  // Not fatal — an orphan prices as general, which is the documented
  // behaviour — but it means somebody is in a group the catalog never had.
  console.log(`Customers: ${customers_total}, in a group not in the catalog: ${orphaned}`)

  await sql.end()
  console.log('Tier catalog migration applied. Rates unchanged.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
