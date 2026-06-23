import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

let _db: PostgresJsDatabase<typeof schema> | null = null

function getDb(): PostgresJsDatabase<typeof schema> {
  if (_db) return _db
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Copy .env.local.example to .env.local and fill it in.')
  }
  // `prepare: false` is required for Supabase's transaction-mode connection pooler.
  const client = postgres(connectionString, { prepare: false })
  _db = drizzle(client, { schema })
  return _db
}

/**
 * Lazy Drizzle client. The connection is only created on first query,
 * so importing this module never throws during build when env is absent.
 */
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    const instance = getDb() as unknown as Record<string | symbol, unknown>
    const value = instance[prop]
    return typeof value === 'function' ? value.bind(instance) : value
  },
})

export { schema }
