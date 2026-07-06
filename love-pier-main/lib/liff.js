// Thin wrapper around the LINE Front-end Framework (LIFF) SDK.
// Loaded only in the browser and only when a LIFF ID is configured, so the
// rest of the site keeps working outside LINE / before LIFF is set up.

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || ''

let _liff = null
let _initPromise = null

export function isLiffConfigured() {
  return Boolean(LIFF_ID)
}

async function getLiff() {
  if (_liff) return _liff
  const mod = await import('@line/liff')
  _liff = mod.default || mod
  return _liff
}

// Initialise once. Safe to call repeatedly.
export function initLiff() {
  if (!LIFF_ID) return Promise.resolve(null)
  if (_initPromise) return _initPromise
  _initPromise = (async () => {
    const liff = await getLiff()
    await liff.init({ liffId: LIFF_ID })
    return liff
  })().catch((err) => {
    _initPromise = null
    throw err
  })
  return _initPromise
}

// Log the user in (redirects inside LINE, opens LINE Login popup on web) and
// return their profile: { userId, displayName, pictureUrl }. Returns null when
// LIFF isn't configured so callers can fall back to manual entry.
export async function loginAndGetProfile() {
  if (!LIFF_ID) return null
  const liff = await initLiff()
  if (!liff.isLoggedIn()) {
    liff.login()
    return null // page will redirect; profile is fetched after it comes back
  }
  const profile = await liff.getProfile()
  return {
    userId: profile.userId,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl || '',
  }
}

// If we're already logged in (e.g. after the login redirect), grab the profile
// silently without triggering another login.
export async function getProfileIfLoggedIn() {
  if (!LIFF_ID) return null
  try {
    const liff = await initLiff()
    if (!liff.isLoggedIn()) return null
    const profile = await liff.getProfile()
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl || '',
    }
  } catch {
    return null
  }
}
