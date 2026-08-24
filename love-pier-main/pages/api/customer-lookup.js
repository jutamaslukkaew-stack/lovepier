import { and, eq } from 'drizzle-orm'
import { db } from '../../lib/db'
import { customers } from '../../lib/db/schema'
import { verifyLineAccessToken } from '../../lib/lineIdentity'

// GET /api/customer-lookup?phone=xxx → { customer: { name, address } | null }
// Used to auto-fill the order form for a returning customer once they've
// typed their phone number. The caller must prove the same LINE identity that
// owns the customer row; knowing a phone number alone never reveals a name or
// address.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const phone = typeof req.query.phone === 'string' ? req.query.phone.trim() : ''
  // Require a plausible full phone number before querying — avoids a DB
  // round-trip (and any chance of matching the wrong record) on every
  // keystroke while the customer is still typing.
  if (phone.replace(/\D/g, '').length < 9) return res.status(200).json({ customer: null })

  const authorization = String(req.headers.authorization || '')
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  const verifiedLine = await verifyLineAccessToken(accessToken)
  if (!verifiedLine?.userId) {
    return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ LINE ใหม่อีกครั้ง' })
  }

  try {
    const rows = await db
      .select()
      .from(customers)
      .where(and(eq(customers.phone, phone), eq(customers.lineUserId, verifiedLine.userId)))
      .limit(1)

    const c = rows[0]
    if (!c) return res.status(200).json({ customer: null })

    return res.status(200).json({
      customer: { name: c.name, address: c.address },
    })
  } catch (err) {
    console.error('Customer lookup failed:', err)
    return res.status(200).json({ customer: null })
  }
}
