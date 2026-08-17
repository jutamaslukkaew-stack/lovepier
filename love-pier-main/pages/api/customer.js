import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { db } from '../../lib/db'
import { customers, orders } from '../../lib/db/schema'

// GET /api/customer?lineUserId=xxx
//   → { customer: { name, phone, address, lastOrderDistanceKm } | null }
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

  const lineUserId =
    typeof req.query.lineUserId === 'string' ? req.query.lineUserId.trim() : ''
  if (!lineUserId) return res.status(200).json({ customer: null })

  try {
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

    return res.status(200).json({
      customer: {
        name: c.name,
        phone: c.phone,
        address: c.address,
        lastOrderDistanceKm: lastOrder ? Number(lastOrder.distanceKm) : null,
      },
    })
  } catch (err) {
    console.error('Fetch customer failed:', err)
    return res.status(200).json({ customer: null })
  }
}
