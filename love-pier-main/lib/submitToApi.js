import { submitViaFormSubmitClient } from './formSubmitClient'

export async function submitToApi(endpoint, payload, emailEnvelope) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await res.json().catch(() => ({}))

  if (res.status === 503 && data.fallback === 'formsubmit' && emailEnvelope) {
    await submitViaFormSubmitClient(emailEnvelope)
    return { ok: true }
  }

  if (!res.ok) {
    const err = new Error(data.error || 'Request failed')
    err.status = res.status
    throw err
  }

  return data
}
