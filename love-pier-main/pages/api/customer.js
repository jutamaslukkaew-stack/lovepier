import { eq } from 'drizzle-orm'
import { db } from '../../lib/db'
import { customers } from '../../lib/db/schema'

// GET /api/customer?lineUserId=xxx → { customer: { name, phone, address } | null }
// Used to auto-fill the checkout form for returning LINE customers.
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

    return res.status(200).json({
      customer: { name: c.name, phone: c.phone, address: c.address },
    })
  } catch (err) {
    console.error('Fetch customer failed:', err)
    return res.status(200).json({ customer: null })
  }
}
