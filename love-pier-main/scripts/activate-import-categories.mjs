// Switch the public menu over from the hand-built categories to the ten
// bulk-import ones (the rows carrying category_no, seeded is_active=false by
// scripts/apply-menu-import-migration.mjs).
//
//   node scripts/activate-import-categories.mjs           → dry run, prints the plan
//   node scripts/activate-import-categories.mjs --apply   → writes
//   node scripts/activate-import-categories.mjs --revert --apply → swap back
//
// Only categories.is_active is touched. No menu_items row is edited or deleted,
// so reverting restores the old menu exactly. /menu and /delivery read through
// lib/db/menuPageData.js, which filters on is_active.
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import postgres from 'postgres'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APPLY = process.argv.includes('--apply')
const REVERT = process.argv.includes('--revert')

function env(k) {
  const src = readFileSync(resolve(__dirname, '../.env.local'), 'utf8')
  const m = src.match(new RegExp('^' + k + '=(.*)$', 'm'))
  return m ? m[1].trim().replace(/[\r\n]/g, '') : ''
}

async function main() {
  const sql = postgres(env('DATABASE_URL'), { prepare: false, connect_timeout: 20, idle_timeout: 5 })

  // An imported category is one with a category_no; legacy ones have null.
  const rows = await sql`
    select c.id, c.slug, c.name_th, c.category_no, c.is_active,
           (select count(*)::int from menu_items m
             where m.category_id = c.id and m.is_available = true and m.is_deleted = false) as live_items
    from categories c
    order by c.category_no nulls last, c.sort_order`

  const imported = rows.filter((r) => r.category_no != null)
  const legacy = rows.filter((r) => r.category_no == null)
  const on = REVERT ? legacy : imported
  const off = REVERT ? imported : legacy

  console.log(`\nTURN ON (${on.length}):`)
  for (const r of on) console.log(`  ${r.is_active ? '=' : '+'} ${r.slug.padEnd(18)} ${String(r.live_items).padStart(4)} items  ${r.name_th}`)
  console.log(`\nTURN OFF (${off.length}):`)
  for (const r of off) console.log(`  ${r.is_active ? '-' : '='} ${r.slug.padEnd(18)} ${String(r.live_items).padStart(4)} items  ${r.name_th}`)

  const willShow = on.reduce((n, r) => n + r.live_items, 0)
  const willHide = off.reduce((n, r) => n + r.live_items, 0)
  console.log(`\nmenu items visible after: ${willShow}   (hidden: ${willHide})`)

  if (!APPLY) {
    console.log('\n[dry-run] nothing written. re-run with --apply')
    await sql.end()
    return
  }

  const onIds = on.map((r) => r.id)
  const offIds = off.map((r) => r.id)
  await sql.begin(async (tx) => {
    if (onIds.length) await tx`update categories set is_active = true where id in ${tx(onIds)}`
    if (offIds.length) await tx`update categories set is_active = false where id in ${tx(offIds)}`
  })

  const [after] = await sql`
    select count(*)::int as n from menu_items m
    join categories c on c.id = m.category_id
    where c.is_active = true and m.is_available = true and m.is_deleted = false`
  console.log(`\nAPPLIED. menu items now visible on /menu: ${after.n}`)
  await sql.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
