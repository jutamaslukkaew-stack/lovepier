// Applies the additive, repeatable pre-order pickup window migration (0018).
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
        where table_name = 'preorder_items') as has_catalog,
      (select count(*)::int from information_schema.columns
        where table_name = 'preorder_items' and column_name = 'pickup_start') as has_pickup_start,
      (select count(*)::int from information_schema.columns
        where table_name = 'preorder_items' and column_name = 'pickup_end') as has_pickup_end,
      (select count(*)::int from information_schema.columns
        where table_name = 'orders' and column_name = 'pickup_note') as has_pickup_note,
      (select value from settings where key = 'preorder_slot_minutes') as slot_minutes,
      (select count(*)::int from orders where scheduled_for is not null) as preorders`
  // Counted separately, and only once the columns exist: on the BEFORE pass of
  // a first run they do not, and naming them above would make the whole
  // statement fail to parse rather than returning zero.
  let windowed = 0
  if (row.has_pickup_start) {
    const [r] = await sql`
      select count(*)::int as n from preorder_items where pickup_start is not null`
    windowed = r.n
  }
  return { ...row, windowed }
}

async function main() {
  const sql = postgres(env('DATABASE_URL'), { prepare: false, connect_timeout: 20, idle_timeout: 5 })
  const before = await state(sql)
  console.log('BEFORE:', before)

  // The columns hang off the Pre Order catalogue, so 0013 has to be in first.
  if (!before.has_catalog) {
    throw new Error('preorder_items is missing — run `npm run db:migrate-preorder-catalog` first (0013 before 0018).')
  }

  const migration = readFileSync(
    resolve(scriptDir, '../lib/db/migrations/manual/0018_preorder_pickup_windows.sql'),
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
  if (!after.has_pickup_start || !after.has_pickup_end || !after.has_pickup_note) {
    throw new Error('Migration columns are missing.')
  }
  // Adds columns and one settings row; it must not have touched an order or
  // silently narrowed a dish that had no window before.
  if (after.preorders !== before.preorders) throw new Error('Pre-order row count changed unexpectedly.')
  if (after.windowed !== before.windowed) throw new Error('Pickup windows changed unexpectedly.')
  if (!after.slot_minutes) throw new Error('preorder_slot_minutes was not set.')

  await sql.end()
  console.log(`Pre-order pickup window migration applied. Slot interval: ${after.slot_minutes} minutes.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
