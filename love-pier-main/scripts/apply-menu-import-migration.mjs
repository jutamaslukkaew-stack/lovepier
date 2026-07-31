// Phase 1 applier for the bulk menu-import feature.
//   node scripts/apply-menu-import-migration.mjs          → dry-run (prints plan, no writes)
//   node scripts/apply-menu-import-migration.mjs --apply  → runs the SQL + seeds categories
//
// Safe to run repeatedly: the SQL is guarded (IF NOT EXISTS) and the category
// seed upserts on category_no. It never touches orders or existing menu_items,
// and asserts that afterwards.
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

// The 10 import categories, keyed by category_no. Slugs marked (*) are suffixed
// with the category_no because the base slug is already taken by a legacy
// category (slug is UNIQUE); the real link to the Excel is category_no, not slug.
// name_zh is seeded from name_en for now (Chinese names come in a later round).
const CATEGORIES = [
  { category_no: '1',   slug: 'chicken-rice-1', name_th: 'ข้าวมันไก่ & ข้าว',            name_en: 'Chicken & Rice',                    sort_order: 10 },
  { category_no: '2',   slug: 'pasta-western',  name_th: 'พาสต้า & อาหารตะวันตก',        name_en: 'Pasta & Western Kitchen',           sort_order: 20 },
  { category_no: '3',   slug: 'sushi-roll',     name_th: 'ซูชิ & โรล',                   name_en: 'Sushi & Roll',                      sort_order: 30 },
  { category_no: '4',   slug: 'bbq-seafood',    name_th: 'บาร์บีคิว & ซีฟู้ดย่าง',        name_en: 'Beach BBQ & Seafood Grill',         sort_order: 40 },
  { category_no: '6',   slug: 'oyster-bar',     name_th: 'หอยนางรม & โอเชียนบาร์',        name_en: 'Oyster & Ocean Bar',                sort_order: 60 },
  { category_no: '7',   slug: 'breakfast-7',    name_th: 'อาหารเช้า',                    name_en: 'All Day Breakfast',                 sort_order: 70 },
  { category_no: '8',   slug: 'cake-bakery',    name_th: 'เค้ก & เบเกอรี่',              name_en: 'Cake & Bakery',                     sort_order: 80 },
  { category_no: '9',   slug: 'coffee-drinks',  name_th: 'กาแฟ & เครื่องดื่มไม่มีแอลกอฮอล์', name_en: 'Coffee & Non-Alcoholic Drinks',     sort_order: 90 },
  { category_no: '9.5', slug: 'icecream',       name_th: 'ไอศกรีม',                      name_en: 'Icecream',                          sort_order: 95 },
  { category_no: '10',  slug: 'bar-wine',       name_th: 'บาร์ & ไวน์',                  name_en: 'Bar & Wine',                        sort_order: 100 },
]

async function main() {
  const sql = postgres(env('DATABASE_URL'), { prepare: false, connect_timeout: 20, idle_timeout: 5 })

  // ── before snapshot (for the safety assertion) ──
  const [before] = await sql`
    select
      (select count(*)::int from orders) as orders,
      (select count(*)::int from menu_items) as menu_items,
      (select count(*)::int from categories) as categories`
  console.log('BEFORE:', before)

  if (!APPLY) {
    console.log('\n[dry-run] would run lib/db/migrations/manual/0002_menu_bulk_import.sql')
    console.log('[dry-run] would upsert', CATEGORIES.length, 'categories by category_no:')
    for (const c of CATEGORIES) console.log('   ', c.category_no.padEnd(4), c.slug.padEnd(16), c.name_th)
    console.log('\nRun again with --apply to execute.')
    await sql.end({ timeout: 5 })
    return
  }

  // ── 1) schema changes ──
  const ddl = readFileSync(resolve(__dirname, '../lib/db/migrations/manual/0002_menu_bulk_import.sql'), 'utf8')
  await sql.unsafe(ddl)
  console.log('✓ schema migration applied')

  // ── 2) seed categories (idempotent upsert on category_no) ──
  let seeded = 0
  for (const c of CATEGORIES) {
    // is_active=false so these categories stay INVISIBLE on the public /menu
    // and /delivery until an admin deliberately publishes them. on-conflict does
    // NOT touch is_active, so re-running never re-hides a category the admin has
    // since turned on.
    await sql`
      insert into categories (name_th, name_en, name_zh, slug, category_no, sort_order, is_active)
      values (${c.name_th}, ${c.name_en}, ${c.name_en}, ${c.slug}, ${c.category_no}, ${c.sort_order}, false)
      on conflict (category_no) do update set
        name_th = excluded.name_th,
        name_en = excluded.name_en,
        sort_order = excluded.sort_order,
        updated_at = now()`
    seeded++
  }
  console.log('✓ seeded/updated', seeded, 'categories by category_no')

  // ── after snapshot + safety assertions ──
  const [after] = await sql`
    select
      (select count(*)::int from orders) as orders,
      (select count(*)::int from menu_items) as menu_items,
      (select count(*)::int from categories) as categories,
      (select count(*)::int from menu_imports) as menu_imports`
  console.log('AFTER:', after)

  const problems = []
  if (after.orders !== before.orders) problems.push(`orders count changed ${before.orders}→${after.orders}`)
  if (after.menu_items !== before.menu_items) problems.push(`menu_items count changed ${before.menu_items}→${after.menu_items}`)
  if (problems.length) {
    console.error('\n❌ SAFETY CHECK FAILED:', problems.join('; '))
    process.exitCode = 1
  } else {
    console.log('\n✅ orders and existing menu_items untouched. New categories:', after.categories - before.categories, '· menu_imports table ready.')
  }
  await sql.end({ timeout: 5 })
}

main().catch((e) => { console.error('ERR', e.message); process.exit(1) })
