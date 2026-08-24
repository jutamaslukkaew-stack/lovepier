import { and, desc, eq, isNotNull, ne } from 'drizzle-orm'
import { db } from '../../lib/db'
import { customers, orders } from '../../lib/db/schema'
import { verifyLineAccessToken } from '../../lib/lineIdentity'
import { getShopSettings } from '../../lib/settings'
import { normalizeTier, tierDiscountPercent } from '../../lib/tiers'

// GET /api/customer?lineUserId=xxx
//   → { customer: { name, phone, address, lastOrderDistanceKm, tier,
//                   discountPercent } | null }
// Used to auto-fill the checkout form for returning LINE customers, and —
// via lastOrderDistanceKm — to offer skipping the GPS prompt by reusing the
// distance from their most recent order (see the `contact` step in
// components/delivery/OrderFlow.js). Null when they have no past order with
// a recorded distance yet (first-ever order, or GPS failed every time).
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authorization = typeof req.headers.authorization === 'string' ? req.headers.authorization : ''
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  const verifiedLine = await verifyLineAccessToken(accessToken)
  if (!verifiedLine) return res.status(401).json({ customer: null, error: 'Invalid LINE session' })
  const lineUserId = verifiedLine.userId

  try {
    const s = await getShopSettings()
    const rows = await db
      .select()
      .from(customers)
      .where(eq(customers.lineUserId, lineUserId))
      .limit(1)

    const c = rows[0]
    if (!c) return res.status(200).json({ customer: null })

    const [lastOrder] = await db
      .select({ distanceKm: orders.distanceKm })
      .from(orders)
      .where(and(eq(orders.lineUserId, lineUserId), isNotNull(orders.distanceKm)))
      .orderBy(desc(orders.createdAt))
      .limit(1)

    // Pickup orders may legitimately have no delivery address. Older builds
    // wrote that blank value back to customers, erasing a previously saved
    // address. Recover from the newest order that still has a real address so
    // returning LINE customers can be offered "use saved / use new" again.
    const [lastAddressOrder] = await db
      .select({ address: orders.address })
      .from(orders)
      .where(and(eq(orders.lineUserId, lineUserId), ne(orders.address, '')))
      .orderBy(desc(orders.createdAt))
      .limit(1)

    return res.status(200).json({
      customer: {
        name: c.name,
        phone: c.phone,
        address: c.address || lastAddressOrder?.address || '',
        pointsBalance: c.pointsBalance || 0,
        lastOrderDistanceKm: lastOrder ? Number(lastOrder.distanceKm) : null,
        // Tier + what it is worth today, for the summary's preview line only.
        // /api/orders re-derives both from this same row when the order is
        // actually priced, so a stale or edited value here cannot change what
        // the customer is charged.
        tier: normalizeTier(c.tier),
        discountPercent: tierDiscountPercent(c.tier, {
          enabled: s.memberDiscountEnabled,
          percentByTier: s.tierDiscountPercent,
        }),
      },
    })
  } catch (err) {
    console.error('Fetch customer failed:', err)
    return res.status(200).json({ customer: null })
  }
}
