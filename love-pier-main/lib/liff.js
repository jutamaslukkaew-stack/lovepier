// Thin wrapper around the LINE Front-end Framework (LIFF) SDK.
// Loaded only in the browser and only when a LIFF ID is configured, so the
// rest of the site keeps working outside LINE / before LIFF is set up.

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || ''
// Google Apps Script Web App that logs LINE customers into a Google Sheet.
const SHEETS_WEBHOOK = process.env.NEXT_PUBLIC_SHEETS_WEBHOOK_URL || ''

let _liff = null
let _initPromise = null
let _sheetLogged = false

// Best-effort: log the LINE profile (name/picture/userId) to Google Sheets,
// once per session. Fire-and-forget, never throws.
export function logProfileToSheet(profile) {
  if (!SHEETS_WEBHOOK || !profile?.userId || _sheetLogged) return
  _sheetLogged = true
  try {
    fetch(SHEETS_WEBHOOK, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        source: 'liff',
        deliveryUrl: 'https://lovepier.cafe/delivery',
        userId: profile.userId,
        displayName: profile.displayName || '',
        pictureUrl: profile.pictureUrl || '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {})
  } catch {}
}

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
  const p = {
    userId: profile.userId,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl || '',
  }
  logProfileToSheet(p)
  return p
}

// Send messages into the LINE chat the LIFF was opened from (works only inside
// the LINE app). Best-effort: returns false when unavailable instead of throwing.
export async function sendMessagesToChat(messages) {
  if (!LIFF_ID) return false
  try {
    const liff = await initLiff()
    if (!liff.isApiAvailable || !liff.isApiAvailable('sendMessages')) return false
    await liff.sendMessages(messages)
    return true
  } catch {
    return false
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
    const p = {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl || '',
    }
    logProfileToSheet(p)
    return p
  } catch {
    return null
  }
}
