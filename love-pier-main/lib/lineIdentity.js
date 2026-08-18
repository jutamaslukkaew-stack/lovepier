// Server-only verification of the LIFF access token. Never trust userId or
// displayName posted by the browser: both are ordinary request fields and can
// be changed. LINE's token verification + profile endpoints are the source of
// truth for the account placing an order.

function getChannelId() {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || ''
  return process.env.LINE_LOGIN_CHANNEL_ID || liffId.split('-')[0] || ''
}

export async function verifyLineAccessToken(accessToken) {
  const channelId = getChannelId()
  if (!accessToken || !channelId) return null

  try {
    const verifyRes = await fetch(
      `https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(accessToken)}`,
      { headers: { Accept: 'application/json' } }
    )
    if (!verifyRes.ok) return null
    const verification = await verifyRes.json()
    if (String(verification.client_id || '') !== String(channelId)) return null

    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    })
    if (!profileRes.ok) return null
    const profile = await profileRes.json()
    if (!profile?.userId) return null

    return {
      userId: String(profile.userId),
      displayName: String(profile.displayName || ''),
      pictureUrl: String(profile.pictureUrl || ''),
    }
  } catch (error) {
    console.error('LINE access token verification failed:', error)
    return null
  }
}
