import { eq } from 'drizzle-orm'
import { db } from '../../lib/db'
import { customers } from '../../lib/db/schema'

// GET /api/customer-lookup?phone=xxx → { customer: { name, address } | null }
// Used to auto-fill the order form for a returning customer once they've
// typed their phone number — phone, not LINE login, is the key here, since
// the guided order flow now asks for it first (see OrderFlow.js) and LINE
// login can fail/be skipped while a phone number is always collected.
// Deliberately does not return lineUserId/phone/internal ids — only what the
// form needs to pre-fill, since this endpoint is unauthenticated by design
// (a customer types their own number before we know who they are).
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

  try {
    const rows = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, phone))
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
