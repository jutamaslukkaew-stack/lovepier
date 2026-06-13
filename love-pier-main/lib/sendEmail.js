import nodemailer from 'nodemailer'

const RESTAURANT_EMAIL = process.env.MAIL_TO || 'cafe.lovepier@gmail.com'

export function smtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  )
}

async function sendViaSmtp({ subject, text, replyTo }) {
  const port = Number(process.env.SMTP_PORT || 587)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const from = process.env.MAIL_FROM || process.env.SMTP_USER

  await transporter.sendMail({
    from: `"Love Pier Website" <${from}>`,
    to: RESTAURANT_EMAIL,
    replyTo: replyTo || undefined,
    subject,
    text,
  })
}

export async function sendRestaurantEmail({ subject, text, replyTo }) {
  if (!smtpConfigured()) {
    const err = new Error('EMAIL_NOT_CONFIGURED')
    err.code = 'EMAIL_NOT_CONFIGURED'
    throw err
  }

  await sendViaSmtp({ subject, text, replyTo })
}
