// Server-only verification of the LIFF access token. Never trust userId or
// displayName posted by the browser: both are ordinary request fields and can
// be changed. LINE's token verification + profile endpoints are the source of
// truth for the account placing an order.

function getChannelId() {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || ''
  return process.env.LINE_LOGIN_CHANNEL_ID || liffId.split('-')[0] || ''
}

// `debug`, when passed, is filled in with WHY verification failed — TEMPORARY,
// 2026-08-26, diagnosing the /member E401 on production. No existing caller
// passes it, so this is a no-op everywhere else. Remove this param + the
// debug.reason writes once the cause is found (see pages/api/member.js's own
// temporary use of it).
export async function verifyLineAccessToken(accessToken, debug) {
  const channelId = getChannelId()
  if (!accessToken) { if (debug) debug.reason = 'no_token'; return null }
  if (!channelId) { if (debug) debug.reason = 'no_channel_id'; return null }

  try {
    // Both calls carry the same bearer token and neither needs the other's
    // answer, so they are issued together rather than one after the other:
    // the profile fetch used to sit behind the verify round trip, and those
    // two hops are most of the time /member spends before it can even look at
    // the database. Nothing is trusted any earlier — the client_id check
    // below still gates the profile, and an unverified token simply means the
    // profile response is dropped unread. `.catch(() => null)` keeps a failed
    // profile fetch from rejecting the pair (and from going unhandled when
    // verification is what actually failed).
    const [verifyRes, profileRes] = await Promise.all([
      fetch(
        `https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(accessToken)}`,
        { headers: { Accept: 'application/json' } }
      ),
      fetch('https://api.line.me/v2/profile', {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      }).catch(() => null),
    ])
    if (!verifyRes.ok) {
      if (debug) {
        debug.reason = 'verify_not_ok'
        debug.status = verifyRes.status
        try { debug.body = (await verifyRes.text()).slice(0, 300) } catch {}
      }
      return null
    }
    const verification = await verifyRes.json()
    if (String(verification.client_id || '') !== String(channelId)) {
      if (debug) {
        debug.reason = 'client_id_mismatch'
        debug.got = verification.client_id
        debug.want = channelId
      }
      return null
    }

    if (!profileRes) {
      if (debug) debug.reason = 'profile_fetch_failed'
      return null
    }
    if (!profileRes.ok) {
      if (debug) {
        debug.reason = 'profile_not_ok'
        debug.status = profileRes.status
        try { debug.body = (await profileRes.text()).slice(0, 300) } catch {}
      }
      return null
    }
    const profile = await profileRes.json()
    if (!profile?.userId) {
      if (debug) debug.reason = 'no_user_id'
      return null
    }

    return {
      userId: String(profile.userId),
      displayName: String(profile.displayName || ''),
      pictureUrl: String(profile.pictureUrl || ''),
    }
  } catch (error) {
    if (debug) { debug.reason = 'exception'; debug.message = String(error?.message || error) }
    console.error('LINE access token verification failed:', error)
    return null
  }
}
