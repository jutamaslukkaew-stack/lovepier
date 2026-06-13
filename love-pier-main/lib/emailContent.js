function pickString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function buildReservationEmail(body) {
  const name = pickString(body?.name)
  const phone = pickString(body?.phone)
  const email = pickString(body?.email)
  const date = pickString(body?.date)
  const time = pickString(body?.time)
  const guests = pickString(body?.guests)
  const seating = pickString(body?.seating)
  const occasion = pickString(body?.occasion)
  const notes = pickString(body?.notes)

  const text = [
    'New reservation request from Love Pier website',
    '',
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Email: ${email}`,
    `Date: ${date}`,
    `Time: ${time}`,
    `Guests: ${guests}`,
    `Seating: ${seating || '—'}`,
    `Occasion: ${occasion || '—'}`,
    notes ? '' : null,
    notes ? 'Notes:' : null,
    notes || null,
  ]
    .filter((line) => line !== null)
    .join('\n')

  return {
    subject: `[Love Pier Reservation] ${date} ${time} — ${name}`,
    text,
    replyTo: email,
    fields: {
      Name: name,
      Phone: phone,
      Email: email,
      Date: date,
      Time: time,
      Guests: guests,
      Seating: seating || '—',
      Occasion: occasion || '—',
      ...(notes ? { Notes: notes } : {}),
    },
  }
}

export function buildContactEmail(body) {
  const subject = pickString(body?.subject)
  const name = pickString(body?.name)
  const email = pickString(body?.email)
  const phone = pickString(body?.phone)
  const company = pickString(body?.company)
  const message = pickString(body?.message)

  const text = [
    'New message from Love Pier website (Contact form)',
    '',
    `Subject: ${subject}`,
    `Name: ${name}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : null,
    company ? `Company: ${company}` : null,
    '',
    'Message:',
    message,
  ]
    .filter(Boolean)
    .join('\n')

  return {
    subject: `[Love Pier Contact] ${subject} — ${name}`,
    text,
    replyTo: email,
    fields: {
      Subject: subject,
      Name: name,
      Email: email,
      Phone: phone || '—',
      Company: company || '—',
      Message: message,
    },
  }
}
