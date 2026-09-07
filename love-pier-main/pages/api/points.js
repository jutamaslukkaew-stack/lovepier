import { eq } from 'drizzle-orm'
import { db } from '../../lib/db'
import { customers } from '../../lib/db/schema'
import { verifyLineAccessToken } from '../../lib/lineIdentity'

// GET /api/points → { pointsBalance }
//
// One number, one query. /rewards used to read its balance from
// /api/customer, which exists to refill the CHECKOUT form: for the single
// field this page shows it also read the shop settings, the customer-group
// catalog, and the customer's two most recent orders (for a saved address and
// a delivery distance) — five sequential database round trips, four of them
// for fields nobody on the rewards page ever looks at.
//
// Same auth as every other LINE-facing endpoint: the LIFF access token is
// re-verified server-side and the user id comes from LINE, never from the
// request body (lib/lineIdentity.js).
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ pointsBalance: null, error: 'Method not allowed' })
  }

  const authorization = typeof req.headers.authorization === 'string' ? req.headers.authorization : ''
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  const verifiedLine = await verifyLineAccessToken(accessToken)
  if (!verifiedLine) return res.status(401).json({ pointsBalance: null, error: 'Invalid LINE session' })

  // A balance is per-customer and changes the moment an order is paid, so it
  // must never sit in a shared or browser cache.
  res.setHeader('Cache-Control', 'no-store')

  try {
    const [c] = await db
      .select({ pointsBalance: customers.pointsBalance })
      .from(customers)
      .where(eq(customers.lineUserId, verifiedLine.userId))
      .limit(1)

    // No row yet — someone who added the LINE account but has never ordered.
    // Zero is the true balance for them, not an error.
    return res.status(200).json({ pointsBalance: Math.max(0, Number(c?.pointsBalance) || 0) })
  } catch (err) {
    // Deliberately NOT a 200 with zero. /api/customer answers a failed read
    // with `customer: null`, which this page then rendered as a balance of 0 —
    // a customer with points being told they have none is worse than being
    // told the number could not be loaded.
    console.error('Fetch points failed:', err)
    return res.status(500).json({ pointsBalance: null, error: 'Could not load points' })
  }
}
