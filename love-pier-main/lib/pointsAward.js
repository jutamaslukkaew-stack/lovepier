// Server-only: credits loyalty points once a payment is confirmed. Split out
// of lib/points.js specifically because this file imports `./db`
// (drizzle/postgres), which must never end up in the client bundle — see the
// note at the top of lib/points.js. Only import this from server code
// (API routes, lib/slipVerification.js), never from components/.
import { eq, sql } from 'drizzle-orm'
import { db } from './db'
import { customers, pointTransactions } from './db/schema'

/**
 * Credits `points` to the customer matching `lineUserId` (falling back to
 * `phone`), once, for `orderId`. Never throws — callers (lib/slipVerification.js)
 * treat this as best-effort, same as every other secondary write in that
 * path (customer upsert, LINE pushes): a points failure must never affect
 * whether the payment itself is considered verified.
 *
 * Idempotent via point_transactions.order_id's UNIQUE constraint — a losing
 * race (e.g. the same slip verified twice) hits that constraint and is
 * treated as "already awarded", not an error.
 */
export async function awardPoints({ orderId, lineUserId, phone, points }) {
  if (!(points > 0)) return

  const where = lineUserId
    ? eq(customers.lineUserId, lineUserId)
    : phone
      ? eq(customers.phone, phone)
      : null
  if (!where) return

  const [customer] = await db.select().from(customers).where(where).limit(1)

  try {
    await db.insert(pointTransactions).values({
      orderId,
      customerId: customer?.id || null,
      phone: phone || '',
      points,
    })
  } catch (err) {
    // orderId is unique — a losing race here means this order already
    // banked its points. Not an error, just nothing left to do. Postgres
    // unique_violation is code 23505; the driver nests the actual error
    // (with the constraint name) under `.cause`, not in `.message` — a
    // string match on `.message` alone never catches this (verified while
    // testing: it threw instead of no-op'ing until this was fixed).
    if (err?.cause?.code === '23505' && err?.cause?.constraint_name === 'point_transactions_order_id_key') {
      return
    }
    throw err
  }

  if (customer) {
    await db
      .update(customers)
      .set({ pointsBalance: sql`${customers.pointsBalance} + ${points}`, updatedAt: sql`now()` })
      .where(eq(customers.id, customer.id))
  }
}
