// Seeds the tiered delivery-fee settings (replacing the old
// delivery_base_fee / delivery_per_km_rate formula — see lib/deliveryFee.js
// and lib/settings.js) into the `settings` key/value table. No schema
// change: these are plain upserts on existing settings.key values, so this
// is safe to run repeatedly.
//
//   node scripts/apply-tiered-delivery-fee-migration.mjs
//     → dry run, prints the plan, writes nothing
//   node scripts/apply-tiered-delivery-fee-migration.mjs --apply
//     → writes the shop's chosen tiers: ฿20 (0-2km), ฿30 (2-3km),
//       ฿40 (3-4km), ฿50 (4-5km). delivery_min_order (now read as the
//       free-delivery threshold, already ฿300 in prod) is left untouched.
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import postgres from 'postgres'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APPLY = process.argv.includes('--apply')

const TIERS = {
  delivery_fee_tier_2km: '20',
  delivery_fee_tier_3km: '30',
  delivery_fee_tier_4km: '40',
  delivery_fee_tier_5km: '50',
}

function env(k) {
  const src = readFileSync(resolve(__dirname, '../.env.local'), 'utf8')
  const m = src.match(new RegExp('^' + k + '=(.*)$', 'm'))
  return m ? m[1].trim().replace(/[\r\n]/g, '') : ''
}

async function main() {
  const sql = postgres(env('DATABASE_URL'), { prepare: false, connect_timeout: 20, idle_timeout: 5 })

  const watchKeys = [...Object.keys(TIERS), 'delivery_min_order', 'delivery_base_fee', 'delivery_per_km_rate']
  const before = await sql`select key, value from settings where key = any(${watchKeys})`
  console.log('BEFORE:', before)

  console.log('\n--- plan ---')
  for (const [key, value] of Object.entries(TIERS)) console.log(`${key} = ${value}`)

  if (!APPLY) {
    console.log('\nDry run — nothing written. Re-run with --apply to write.')
    await sql.end()
    return
  }

  for (const [key, value] of Object.entries(TIERS)) {
    await sql`
      insert into settings (key, value) values (${key}, ${value})
      on conflict (key) do update set value = excluded.value, updated_at = now()`
  }

  const after = await sql`select key, value from settings where key = any(${watchKeys})`
  console.log('AFTER:', after)

  await sql.end()
  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
