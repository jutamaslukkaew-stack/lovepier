// Customer discount tiers (2026-08-24 journey review, section 2 "Persona").
//
// The shop sells to four groups at four prices. `customers.tier` holds which
// group someone is in; the percentage each group gets is a SETTING, edited at
// /admin/settings (lib/settings.js#SETTING_KEYS), because the rates are policy
// and have already been revised once in the meeting notes.
//
// Pure, no I/O, no React, no DB — same rule as lib/points.js and
// lib/preorder.js. Imported from the client (the summary preview), the server
// (/api/orders, the source of truth) and the admin UI alike.

export const TIER_GENERAL = 'general'

/**
 * In display order, which is also least- to most-privileged. `defaultPercent`
 * is only the seed value for a fresh install; the live number always comes
 * from settings.
 *
 * `staffOnly` marks the tiers that may never be reached by anything a
 * customer does — the document requires the affiliated-staff tier to be
 * verified by a person, and the 100% team tier exists to test with real
 * orders. Nothing customer-facing writes tier at all today; the flag is here
 * so that stays deliberate if a self-service path is ever added.
 */
export const TIERS = [
  { key: TIER_GENERAL, defaultPercent: 10, labelTh: 'ลูกค้าทั่วไป', labelEn: 'General', staffOnly: false },
  { key: 'condo', defaultPercent: 15, labelTh: 'คอนโด / แนะนำพิเศษ', labelEn: 'Condo / referred', staffOnly: false },
  { key: 'scc', defaultPercent: 50, labelTh: 'พนักงานในเครือ (SCC)', labelEn: 'Affiliated staff (SCC)', staffOnly: true },
  { key: 'staff', defaultPercent: 100, labelTh: 'ทีมงาน (ทดลองระบบ)', labelEn: 'Team (system trial)', staffOnly: true },
]

export const TIER_KEYS = TIERS.map((t) => t.key)

export function isTierKey(value) {
  return TIER_KEYS.includes(value)
}

/** Unknown/blank/legacy values read as 'general' rather than throwing. */
export function normalizeTier(value) {
  return isTierKey(value) ? value : TIER_GENERAL
}

export function tierLabel(tier, lang = 'th') {
  const found = TIERS.find((t) => t.key === normalizeTier(tier))
  return lang === 'th' ? found.labelTh : found.labelEn
}

/**
 * What this customer's tier is worth right now.
 *
 * `enabled` is the master switch (member_discount_enabled). Off — the default
 * — returns 0 for everyone, which is the behaviour that has been live since
 * 2026-08-17 and is also the rollback lever: flipping the setting restores it
 * with no deploy.
 *
 * `percentByTier` comes from getShopSettings(). A tier missing from it falls
 * back to its defaultPercent, so adding a tier in code cannot hand out a
 * silent 0% before someone visits /admin/settings.
 *
 * @returns {number} 0–100, always a whole number.
 */
export function tierDiscountPercent(tier, { enabled = false, percentByTier = {} } = {}) {
  if (!enabled) return 0
  const key = normalizeTier(tier)
  const configured = percentByTier[key]
  const fallback = TIERS.find((t) => t.key === key).defaultPercent
  const pct = Number.isFinite(Number(configured)) ? Number(configured) : fallback
  return Math.min(100, Math.max(0, Math.round(pct)))
}
