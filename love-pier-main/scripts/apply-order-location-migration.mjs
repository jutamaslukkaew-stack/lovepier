// Applies the additive, repeatable order location migration (0019).
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
      (select count(*)::int from information_schema.columns
        where table_name = 'orders' and column_name = 'lat') as has_lat,
      (select count(*)::int from information_schema.columns
        where table_name = 'orders' and column_name = 'lng') as has_lng,
      (select count(*)::int from orders) as orders`
  return row
}

async function main() {
  const sql = postgres(env('DATABASE_URL'), { prepare: false, connect_timeout: 20, idle_timeout: 5 })
  const before = await state(sql)
  console.log('BEFORE:', before)

  const migration = readFileSync(
    resolve(scriptDir, '../lib/db/migrations/manual/0019_order_location.sql'),
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
  if (!after.has_lat || !after.has_lng) {
    throw new Error('lat/lng columns are missing.')
  }
  // Adds two nullable columns only; must not have touched a single row.
  if (after.orders !== before.orders) throw new Error('Order row count changed unexpectedly.')

  await sql.end()
  console.log('Order location migration applied.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
