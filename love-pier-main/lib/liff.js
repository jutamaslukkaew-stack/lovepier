// Thin wrapper around the LINE Front-end Framework (LIFF) SDK.
// Loaded only in the browser and only when a LIFF ID is configured, so the
// rest of the site keeps working outside LINE / before LIFF is set up.
//
// TWO LIFF apps exist on the same LINE Login channel, each with its own fixed
// Endpoint URL (a LIFF app can only have one) — DEFAULT_LIFF_ID's is
// /delivery, MEMBER_LIFF_ID's is /member. Every exported function here takes
// an optional `liffId` (defaulting to DEFAULT_LIFF_ID, so every existing
// /delivery call site is unchanged) — passing the wrong one is exactly the
// 2026-08-25 bug: liff.init() with an ID that doesn't match the context the
// page was actually launched in fails, even though the Console side (Rich
// Menu link, Endpoint URL) is configured correctly. See note_2026_08_25_member_liff
// / handoff_2026_08_25 in state.json and pages/member.js's own call sites.
const DEFAULT_LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || ''
export const MEMBER_LIFF_ID = process.env.NEXT_PUBLIC_MEMBER_LIFF_ID || ''
// Google Apps Script Web App that logs LINE customers into a Google Sheet.
const SHEETS_WEBHOOK = process.env.NEXT_PUBLIC_SHEETS_WEBHOOK_URL || ''

let _liffSdk = null
// Keyed by liffId — normally only ever holds one entry per page load (each
// page uses exactly one LIFF app for its own lifetime), but keying like this
// rather than a single cached value means a page that somehow needs both
// (or a hot-reload re-entry with a different id) re-inits correctly instead
// of silently reusing a promise resolved for the other app.
const _initPromises = new Map()
let _sheetLogged = false

export const LIFF_RETURN_TO_KEY = 'love-pier:liff-return-to'
export const LIFF_PROFILE_KEY = 'love-pier:liff-profile'

export function cacheLiffProfile(profile) {
  if (typeof window === 'undefined' || !profile?.userId || !profile?.accessToken) return
  try {
    window.sessionStorage.setItem(LIFF_PROFILE_KEY, JSON.stringify(profile))
  } catch {}
}

export function getCachedLiffProfile() {
  if (typeof window === 'undefined') return null
  try {
    const profile = JSON.parse(window.sessionStorage.getItem(LIFF_PROFILE_KEY) || 'null')
    return profile?.userId && profile?.accessToken ? profile : null
  } catch {
    return null
  }
}

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

export function isLiffConfigured(liffId = DEFAULT_LIFF_ID) {
  return Boolean(liffId)
}

async function getLiffSdk() {
  if (_liffSdk) return _liffSdk
  const mod = await import('@line/liff')
  _liffSdk = mod.default || mod
  return _liffSdk
}

// Initialise once per liffId. Safe to call repeatedly.
export function initLiff(liffId = DEFAULT_LIFF_ID) {
  if (!liffId) return Promise.resolve(null)
  if (_initPromises.has(liffId)) return _initPromises.get(liffId)
  const promise = (async () => {
    const liff = await getLiffSdk()
    await liff.init({ liffId })
    return liff
  })().catch((err) => {
    _initPromises.delete(liffId)
    throw err
  })
  _initPromises.set(liffId, promise)
  return promise
}

// Log the user in (redirects inside LINE, opens LINE Login popup on web) and
// return their profile: { userId, displayName, pictureUrl }. Returns null when
// LIFF isn't configured so callers can fall back to manual entry.
//
// `ownEndpointPath` must match the liffId's actual registered Endpoint URL
// (path only) — defaults to '/delivery' for DEFAULT_LIFF_ID's existing
// behavior, unchanged. A LIFF app's Endpoint URL is fixed to one path, and
// LINE requires any custom redirectUri to start with it, so a page whose own
// path ISN'T the endpoint (the old /member-via-the-delivery-app case) has to
// bounce through the real endpoint with a same-origin return path instead of
// redirecting straight back to itself.
export async function loginAndGetProfile({ liffId = DEFAULT_LIFF_ID, ownEndpointPath = '/delivery' } = {}) {
  if (!liffId) return null
  // A LIFF app may only initialise reliably on (or below) the Endpoint URL
  // registered in LINE Developers. Pre-order shares delivery's LIFF app, so
  // enter through /delivery first and let that page complete authentication
  // before returning here. Doing this before liff.init() avoids the endpoint
  // mismatch that previously surfaced as E-LIFF on /preorder.
  if (typeof window !== 'undefined' && window.location.pathname !== ownEndpointPath) {
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`
    try {
      window.sessionStorage.setItem(LIFF_RETURN_TO_KEY, returnTo)
    } catch {}
    const bridge = new URL(ownEndpointPath, window.location.origin)
    bridge.searchParams.set('__liff_return_to', returnTo)
    window.location.replace(bridge.toString())
    return null
  }
  const liff = await initLiff(liffId)
  if (!liff.isLoggedIn()) {
    liff.login()
    return null // page will redirect; profile is fetched after it comes back
  }
  const profile = await liff.getProfile()
  const p = {
    userId: profile.userId,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl || '',
    accessToken: liff.getAccessToken() || '',
  }
  cacheLiffProfile(p)
  logProfileToSheet(p)
  return p
}

// Send messages into the LINE chat the LIFF was opened from (works only inside
// the LINE app). Best-effort: returns false when unavailable instead of throwing.
export async function sendMessagesToChat(messages) {
  if (!DEFAULT_LIFF_ID) return false
  try {
    const liff = await initLiff()
    if (!liff.isApiAvailable || !liff.isApiAvailable('sendMessages')) return false
    await liff.sendMessages(messages)
    return true
  } catch {
    return false
  }
}

// Close the LIFF webview and hand the customer back to the LINE chat they
// opened it from. Returns false when there is no LINE window to close (an
// ordinary browser, or LIFF unavailable) so the caller can navigate instead
// — closeWindow() is a no-op outside the LINE app, which would otherwise
// leave a button that visibly does nothing.
export async function closeLiffWindow(liffId = DEFAULT_LIFF_ID) {
  if (!liffId) return false
  try {
    const liff = await initLiff(liffId)
    if (!liff?.isInClient || !liff.isInClient()) return false
    liff.closeWindow()
    return true
  } catch {
    return false
  }
}

// If we're already logged in (e.g. after the login redirect), grab the profile
// silently without triggering another login.
export async function getProfileIfLoggedIn(liffId = DEFAULT_LIFF_ID) {
  if (!liffId) return null
  try {
    const liff = await initLiff(liffId)
    if (!liff.isLoggedIn()) return null
    const profile = await liff.getProfile()
    const p = {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl || '',
      accessToken: liff.getAccessToken() || '',
    }
    cacheLiffProfile(p)
    logProfileToSheet(p)
    return p
  } catch {
    return null
  }
}
