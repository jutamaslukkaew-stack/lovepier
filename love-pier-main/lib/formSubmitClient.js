const RESTAURANT_EMAIL = 'cafe.lovepier@gmail.com'

function formSubmitSucceeded(data) {
  return data.success === true || data.success === 'true'
}

/** FormSubmit only accepts submissions from the browser, not server-side fetch. */
export async function submitViaFormSubmitClient({ subject, text, replyTo, fields = {} }) {
  const res = await fetch(
    `https://formsubmit.co/ajax/${encodeURIComponent(RESTAURANT_EMAIL)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        _subject: subject,
        _template: 'table',
        _captcha: 'false',
        _replyto: replyTo || '',
        Details: text,
        ...fields,
      }),
    }
  )

  let data = {}
  try {
    data = await res.json()
  } catch {
    /* ignore parse errors */
  }

  if (!res.ok || !formSubmitSucceeded(data)) {
    const err = new Error(data.message || 'FORM_SUBMIT_FAILED')
    err.status = 503
    throw err
  }
}
