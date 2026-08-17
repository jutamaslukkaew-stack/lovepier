// Applies the saved-points redemption schema. Safe to run repeatedly.
//   node scripts/apply-points-redemption-migration.mjs          → dry run
//   node scripts/apply-points-redemption-migration.mjs --apply  → writes
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import postgres from 'postgres'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const APPLY = process.argv.includes('--apply')

function env(key) {
  const src = readFileSync(resolve(scriptDir, '../.env.local'), 'utf8')
  const match = src.match(new RegExp('^' + key + '=(.*)$', 'm'))
  return match ? match[1].trim().replace(/[\r\n]/g, '') : ''
}

async function main() {
  const sql = postgres(env('DATABASE_URL'), { prepare: false, connect_timeout: 20, idle_timeout: 5 })
  const migration = readFileSync(
    resolve(scriptDir, '../lib/db/migrations/manual/0007_points_redemption.sql'),
    'utf8'
  )
  console.log(migration)
  if (!APPLY) {
    console.log('Dry run — nothing written. Re-run with --apply to write.')
    await sql.end()
    return
  }
  await sql.unsafe(migration)
  await sql.end()
  console.log('Points redemption migration applied.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
