// Server-side reader for the customer-group catalog (migration 0015).
//
// Split from lib/tiers.js on purpose: that file is pure and imported by client
// components, so it must never reach a database. This one does the I/O and
// hands lib/tiers.js a plain array in the shape it expects.
import { asc } from 'drizzle-orm'
import { db } from './db'
import { customerTiers } from './db/schema'
import { DEFAULT_TIERS, TIER_GENERAL } from './tiers'

/**
 * Every group, active and retired, in display order.
 *
 * RETIRED GROUPS ARE INCLUDED, and that is the point. Customers keep their
 * tier key when a group is retired; dropping the row here would normalize
 * them to general and change what they pay. `isActive` decides what the
 * pickers OFFER, not what the pricing path can RESOLVE — filter on it at the
 * point of display, never here.
 *
 * Falls back to the four code defaults if the query fails. An order has to
 * stay priceable when the catalog read breaks, and those four are what the
 * table was seeded with, so the fallback prices are the pre-0015 ones rather
 * than zero for everybody.
 */
export async function getTierCatalog() {
  let rows = []
  try {
    rows = await db
      .select()
      .from(customerTiers)
      .orderBy(asc(customerTiers.sortOrder), asc(customerTiers.key))
  } catch {
    return DEFAULT_TIERS
  }
  if (rows.length === 0) return DEFAULT_TIERS

  const tiers = rows.map((r) => ({
    key: r.key,
    // `percent`, not `discountPercent`: this is the shape lib/tiers.js works
    // in, shared with DEFAULT_TIERS so neither side has to know the other's
    // column names.
    percent: Number(r.discountPercent) || 0,
    labelTh: r.labelTh,
    labelEn: r.labelEn || '',
    staffOnly: Boolean(r.staffOnly),
    isActive: Boolean(r.isActive),
    sortOrder: Number(r.sortOrder) || 0,
  }))

  // 'general' is the value every unknown tier falls back to and the default on
  // customers.tier, so it has to resolve to something. The admin refuses to
  // delete it, but a hand-run DELETE in psql should degrade to the documented
  // 10% rather than to "general is not a tier".
  return tiers.some((t) => t.key === TIER_GENERAL)
    ? tiers
    : [DEFAULT_TIERS[0], ...tiers]
}

/** The map lib/tiers.js#tierDiscountPercent reads. */
export function percentByTier(tiers) {
  return Object.fromEntries(tiers.map((t) => [t.key, t.percent]))
}

/**
 * What an admin picker should offer: the active groups, plus the customer's
 * CURRENT group even if it has been retired.
 *
 * Without that second half the select would be handed a value not present in
 * its options and would render blank — making a retired group look like "no
 * group" and inviting an admin to "fix" it by moving the customer out, which
 * silently changes what they pay.
 */
export function pickableTiers(tiers, currentKey) {
  const active = tiers.filter((t) => t.isActive !== false)
  if (!currentKey || active.some((t) => t.key === currentKey)) return active
  const current = tiers.find((t) => t.key === currentKey)
  return current ? [...active, current] : active
}
