import { buildReservationEmail } from '../../lib/emailContent'
import { sendRestaurantEmail } from '../../lib/sendEmail'

function pickString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const name = pickString(req.body?.name)
  const phone = pickString(req.body?.phone)
  const email = pickString(req.body?.email)
  const date = pickString(req.body?.date)
  const time = pickString(req.body?.time)
  const guests = pickString(req.body?.guests)

  if (!name || !phone || !email || !date || !time || !guests) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const envelope = buildReservationEmail(req.body)

  try {
    await sendRestaurantEmail(envelope)
    return res.status(200).json({ ok: true })
  } catch (err) {
    if (err.code === 'EMAIL_NOT_CONFIGURED') {
      return res.status(503).json({ error: 'Email not configured', fallback: 'formsubmit' })
    }
    console.error('Reservation email failed:', err)
    return res.status(500).json({ error: 'Failed to send email' })
  }
}
