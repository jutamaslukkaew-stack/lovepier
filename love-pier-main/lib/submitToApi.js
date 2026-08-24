import { submitViaFormSubmitClient } from './formSubmitClient'

export async function submitToApi(endpoint, payload, emailEnvelope, { accessToken = '', allowFallback = true } = {}) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json().catch(() => ({}))

  if (allowFallback && res.status === 503 && data.fallback === 'formsubmit' && emailEnvelope) {
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
