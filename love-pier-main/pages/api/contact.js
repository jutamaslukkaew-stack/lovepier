import { buildContactEmail } from '../../lib/emailContent'
import { sendRestaurantEmail } from '../../lib/sendEmail'

function pickString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const subject = pickString(req.body?.subject)
  const name = pickString(req.body?.name)
  const email = pickString(req.body?.email)
  const message = pickString(req.body?.message)

  if (!subject || !name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const envelope = buildContactEmail(req.body)

  try {
    await sendRestaurantEmail(envelope)
    return res.status(200).json({ ok: true })
  } catch (err) {
    if (err.code === 'EMAIL_NOT_CONFIGURED') {
      return res.status(503).json({ error: 'Email not configured', fallback: 'formsubmit' })
    }
    console.error('Contact email failed:', err)
    return res.status(500).json({ error: 'Failed to send email' })
  }
}
