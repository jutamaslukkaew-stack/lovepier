// Customer discount tiers (2026-08-24 journey review, section 2 "Persona";
// made shop-editable 2026-08-26, migration 0015).
//
// `customers.tier` holds which group someone is in. The set of groups and
// what each is worth USED to be this file's hard-coded TIERS array plus four
// fixed `tier_discount_*` settings rows. It is now a table the shop edits at
// /admin/tiers — adding a fifth group no longer needs a deploy.
//
// This file stays PURE: no I/O, no React, no DB — same rule as lib/points.js
// and lib/preorder.js, because it is imported from the client (the summary
// preview), the server (/api/orders, the source of truth) and the admin UI
// alike. The catalog is therefore something you PASS IN, not something this
// file fetches. lib/tierCatalog.js does the fetching, server-side only.
//
// Every function takes the catalog last and defaults it to DEFAULT_TIERS, so
// a caller that only deals in the four original groups reads exactly as it
// did before. Callers on the pricing path must pass the real catalog — see
// the note on normalizeTier for what goes wrong if they don't.

export const TIER_GENERAL = 'general'

/**
 * One group as the rest of the app sees it. lib/tierCatalog.js maps database
 * rows into this shape so neither side has to know the other's column names.
 *
 * @typedef {object} TierEntry
 * @property {string} key
 * @property {number} percent  Whole percent off the item subtotal, 0–100.
 * @property {string} labelTh
 * @property {string} labelEn
 * @property {boolean} staffOnly
 * @property {boolean} [isActive]  Absent on the built-in defaults; false = retired.
 * @property {number} [sortOrder]
 */

/**
 * The four groups the system shipped with, in display order, which is also
 * least- to most-privileged.
 *
 * These are now only TWO things: the seed migration 0015 writes into
 * `customer_tiers`, and the fallback used when the catalog cannot be read
 * (an order must still be priceable if that query fails). The live list comes
 * from the database.
 *
 * `staffOnly` marks groups that may never be reached by anything a customer
 * does — the document requires affiliated-staff status to be verified by a
 * person, and the 100% team tier exists to test with real orders. New groups
 * created in the admin default to staffOnly as well; opening one to
 * self-service is a deliberate act.
 */
export const DEFAULT_TIERS = [
  { key: TIER_GENERAL, percent: 10, labelTh: 'ลูกค้าทั่วไป', labelEn: 'General', staffOnly: false },
  { key: 'condo', percent: 15, labelTh: 'คอนโด / แนะนำพิเศษ', labelEn: 'Condo / referred', staffOnly: false },
  { key: 'scc', percent: 50, labelTh: 'พนักงานในเครือ (SCC)', labelEn: 'Affiliated staff (SCC)', staffOnly: true },
  { key: 'staff', percent: 100, labelTh: 'ทีมงาน (ทดลองระบบ)', labelEn: 'Team (system trial)', staffOnly: true },
]

export const DEFAULT_TIER_KEYS = DEFAULT_TIERS.map((t) => t.key)

/**
 * Guards every function below. A caller that passes nothing, a non-array, or
 * an empty catalog gets the four defaults rather than a system where no tier
 * exists and therefore everyone silently reads as general at 0%.
 *
 * An empty array is treated as "unusable", not as "the shop deleted all its
 * groups": 'general' is not deletable in the admin, so an empty table means
 * the read failed, not that the shop meant it.
 */
/** @param {TierEntry[]} [tiers] @returns {TierEntry[]} */
function catalog(tiers) {
  return Array.isArray(tiers) && tiers.length > 0 ? tiers : DEFAULT_TIERS
}

/** @param {string} tier @param {TierEntry[]} [tiers] @returns {TierEntry} */
function entry(tier, tiers) {
  const list = catalog(tiers)
  return list.find((t) => t.key === tier) ?? list.find((t) => t.key === TIER_GENERAL) ?? DEFAULT_TIERS[0]
}

/** @param {TierEntry[]} [tiers] */
export function tierKeys(tiers) {
  return catalog(tiers).map((t) => t.key)
}

/** @param {unknown} value @param {TierEntry[]} [tiers] */
export function isTierKey(value, tiers) {
  return catalog(tiers).some((t) => t.key === value)
}

/**
 * Unknown/blank/legacy values read as 'general' rather than throwing.
 *
 * PASS THE REAL CATALOG ON THE PRICING PATH. With the default list, a
 * customer in a shop-created group ('agent', say) is unknown here and would
 * be normalized to general — quietly charging them the wrong price and, via
 * effectiveTier, making their expiry date meaningless. That is the one way
 * this refactor can lose money, so pages/api/orders.js, pages/api/customer.js
 * and lib/inStore.ts all thread the catalog through.
 *
 * @param {unknown} value
 * @param {TierEntry[]} [tiers]
 * @returns {string}
 */
export function normalizeTier(value, tiers) {
  return isTierKey(value, tiers) ? String(value) : TIER_GENERAL
}

/** Special access expires at the end of the stored Bangkok calendar date. */
/** @param {unknown} tier @param {unknown} expiresAt @param {Date} [now] @param {TierEntry[]} [tiers] @returns {boolean} */
export function isTierExpired(tier, expiresAt, now = new Date(), tiers) {
  if (normalizeTier(tier, tiers) === TIER_GENERAL || !expiresAt) return false
  const expiry = String(expiresAt).slice(0, 10)
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
  return expiry < today
}

/** @param {unknown} tier @param {unknown} expiresAt @param {Date} [now] @param {TierEntry[]} [tiers] @returns {string} */
export function effectiveTier(tier, expiresAt, now = new Date(), tiers) {
  return isTierExpired(tier, expiresAt, now, tiers) ? TIER_GENERAL : normalizeTier(tier, tiers)
}

/** @param {unknown} tier @param {'th'|'en'} [lang] @param {TierEntry[]} [tiers] @returns {string} */
export function tierLabel(tier, lang = 'th', tiers) {
  const found = entry(normalizeTier(tier, tiers), tiers)
  return lang === 'th' ? found.labelTh : found.labelEn || found.labelTh
}

/** Whether a customer may be put in this group by anything but an admin. */
/** @param {unknown} tier @param {TierEntry[]} [tiers] @returns {boolean} */
export function isStaffOnlyTier(tier, tiers) {
  return Boolean(entry(normalizeTier(tier, tiers), tiers).staffOnly)
}

/**
 * What this customer's tier is worth right now.
 *
 * `enabled` is the master switch (member_discount_enabled). Off — the default
 * — returns 0 for everyone, which is the behaviour that has been live since
 * 2026-08-17 and is also the rollback lever: flipping the setting restores it
 * with no deploy.
 *
 * `percentByTier` comes from getShopSettings(), which since 0015 builds it
 * from the catalog rather than from four settings rows. A tier missing from
 * it falls back to that tier's own catalog percent, so a catalog row added
 * between the two reads cannot hand out a silent 0%.
 *
 * @param {unknown} tier
 * @param {{ enabled?: boolean, percentByTier?: Record<string, number>, tiers?: TierEntry[] }} [options]
 * @returns {number} 0–100, always a whole number.
 */
export function tierDiscountPercent(tier, { enabled = false, percentByTier = {}, tiers } = {}) {
  if (!enabled) return 0
  const key = normalizeTier(tier, tiers)
  const configured = percentByTier[key]
  const fallback = entry(key, tiers).percent
  const pct = Number.isFinite(Number(configured)) ? Number(configured) : fallback
  return Math.min(100, Math.max(0, Math.round(pct)))
}
