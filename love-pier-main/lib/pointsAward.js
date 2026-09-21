// Server-only: credits loyalty points once a payment is confirmed. Split out
// of lib/points.js specifically because this file imports `./db`
// (drizzle/postgres), which must never end up in the client bundle — see the
// note at the top of lib/points.js. Only import this from server code
// (API routes, lib/slipVerification.js), never from components/.
import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from './db'
import { customers, pointTransactions } from './db/schema'
import { planCancelSettlement, planUncancelSettlement } from './points'

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

/**
 * Settles the points of an order that has just been cancelled: gives back the
 * points spent on it and takes back the points it earned (never below zero).
 * The arithmetic, and why, is planCancelSettlement in lib/points.js.
 *
 * Recorded as `refund` / `earn_reversal` ledger rows so points_balance stays
 * equal to the sum of the ledger. Runs in one transaction with the customer
 * row locked, so two cancels racing each other (admin dropdown + LINE button)
 * settle once.
 *
 * @returns {Promise<{ refund: number, reversal: number }>}
 */
export async function settlePointsOnCancel(orderId) {
  return db.transaction(async (tx) => {
    const ledger = await orderLedger(tx, orderId)
    const customer = await lockCustomer(tx, ledger)
    if (!customer) return { refund: 0, reversal: 0 }

    const { refund, reversal } = planCancelSettlement({
      redeemed: -(ledger.redeem?.points ?? 0),
      earned: ledger.earn?.points ?? 0,
      refunded: ledger.refund?.points ?? 0,
      reversed: -(ledger.earn_reversal?.points ?? 0),
      balance: customer.pointsBalance,
    })
    if (!refund && !reversal) return { refund, reversal }

    if (refund) {
      // A partial refund row can survive an undone cancel (see
      // restorePointsOnUncancel), so top it up rather than insert blindly.
      await tx
        .insert(pointTransactions)
        .values({ orderId, customerId: customer.id, phone: customer.phone || '', points: refund, type: 'refund' })
        .onConflictDoUpdate({
          target: [pointTransactions.orderId, pointTransactions.type],
          set: { points: sql`${pointTransactions.points} + ${refund}` },
        })
    }
    if (reversal) {
      await tx
        .insert(pointTransactions)
        .values({ orderId, customerId: customer.id, phone: customer.phone || '', points: -reversal, type: 'earn_reversal' })
    }
    await tx
      .update(customers)
      .set({ pointsBalance: sql`${customers.pointsBalance} + ${refund - reversal}`, updatedAt: sql`now()` })
      .where(eq(customers.id, customer.id))
    return { refund, reversal }
  })
}

/**
 * The reverse of settlePointsOnCancel, for an order moved OUT of cancelled
 * (staff cancelled by mistake): re-spends the refunded points as far as the
 * balance allows and returns the reversed earn. See planUncancelSettlement.
 *
 * @returns {Promise<{ delta: number, keptRefund: number }>}
 */
export async function restorePointsOnUncancel(orderId) {
  return db.transaction(async (tx) => {
    const ledger = await orderLedger(tx, orderId)
    if (!ledger.refund && !ledger.earn_reversal) return { delta: 0, keptRefund: 0 }
    const customer = await lockCustomer(tx, ledger)
    if (!customer) return { delta: 0, keptRefund: 0 }

    const { delta, keptRefund } = planUncancelSettlement({
      refunded: ledger.refund?.points ?? 0,
      reversed: -(ledger.earn_reversal?.points ?? 0),
      balance: customer.pointsBalance,
    })

    await tx
      .delete(pointTransactions)
      .where(and(eq(pointTransactions.orderId, orderId), inArray(pointTransactions.type, ['earn_reversal', ...(keptRefund ? [] : ['refund'])])))
    if (keptRefund) {
      await tx
        .update(pointTransactions)
        .set({ points: keptRefund })
        .where(and(eq(pointTransactions.orderId, orderId), eq(pointTransactions.type, 'refund')))
      console.warn('POINTS_UNCANCEL_SHORT — refunded points already spent, customer keeps them:', { orderId, keptRefund })
    }
    if (delta) {
      await tx
        .update(customers)
        .set({ pointsBalance: sql`${customers.pointsBalance} + ${delta}`, updatedAt: sql`now()` })
        .where(eq(customers.id, customer.id))
    }
    return { delta, keptRefund }
  })
}

/** The order's ledger rows, keyed by type (unique per order, see 0007). */
async function orderLedger(tx, orderId) {
  const rows = await tx.select().from(pointTransactions).where(eq(pointTransactions.orderId, orderId))
  return Object.fromEntries(rows.map((r) => [r.type, r]))
}

/** Locks the customer the order's points belong to; null if there is none. */
async function lockCustomer(tx, ledger) {
  const customerId = ledger.redeem?.customerId ?? ledger.earn?.customerId ?? ledger.refund?.customerId
  if (!customerId) return null
  const [customer] = await tx.select().from(customers).where(eq(customers.id, customerId)).for('update').limit(1)
  return customer ?? null
}
