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

  if (!lineUserId && !phone) return

  const customer = await resolveCustomer({ lineUserId, phone })
  if (!customer) {
    // Nothing to credit and nothing we could create — recording the ledger
    // row anyway would bank the points against nobody, which is how one +10
    // award went missing in 2026-08. Loud, because it means a paying customer
    // is owed points: grep Vercel for POINTS_UNCREDITED.
    console.error('POINTS_UNCREDITED — no customer row to credit:', { orderId, lineUserId, phone, points })
    return
  }

  try {
    await db.insert(pointTransactions).values({
      orderId,
      customerId: customer.id,
      phone: phone || '',
      points,
      type: 'earn',
    })
  } catch (err) {
    // orderId is unique — a losing race here means this order already
    // banked its points. Not an error, just nothing left to do. Postgres
    // unique_violation is code 23505; the driver nests the actual error
    // (with the constraint name) under `.cause`, not in `.message` — a
    // string match on `.message` alone never catches this (verified while
    // testing: it threw instead of no-op'ing until this was fixed).
    if (err?.cause?.code === '23505') {
      return
    }
    throw err
  }

  await db
    .update(customers)
    .set({ pointsBalance: sql`${customers.pointsBalance} + ${points}`, updatedAt: sql`now()` })
    .where(eq(customers.id, customer.id))
}

/**
 * The row this order's points belong to: the LINE account first, then the
 * phone number, then a row created for it.
 *
 * The phone fallback is not redundant with the lineUserId lookup — an order
 * carrying a LINE id whose customer row was never written (the upsert in
 * pages/api/orders.js is best-effort and swallows its own failures) still has
 * a phone that usually does have one. Creating the row as a last resort is
 * what keeps the points attached to a person: they are the customer's, earned
 * on money the shop has already received.
 */
async function resolveCustomer({ lineUserId, phone }) {
  if (lineUserId) {
    const [byLine] = await db.select().from(customers).where(eq(customers.lineUserId, lineUserId)).limit(1)
    if (byLine) return byLine
  }
  if (phone) {
    const [byPhone] = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1)
    if (byPhone) return byPhone
  }

  try {
    // onConflictDoNothing rather than an upsert: another writer (the customer
    // upsert on a concurrent order) may create the same row first, and the
    // re-select below picks up whichever of us won.
    await db
      .insert(customers)
      .values({ lineUserId: lineUserId || null, phone: phone || '' })
      .onConflictDoNothing()
  } catch (err) {
    console.error('Customer create for points failed (non-fatal):', err)
  }

  if (lineUserId) {
    const [created] = await db.select().from(customers).where(eq(customers.lineUserId, lineUserId)).limit(1)
    if (created) return created
  }
  if (phone) {
    const [created] = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1)
    if (created) return created
  }
  return null
}
