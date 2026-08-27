// Server-side invite resolution (0016). Shared by pages/api/join.js and
// pages/join.js's getServerSideProps so the customer-facing preview and the
// endpoint that actually grants the discount can never disagree about whether
// a link is usable.
//
// Split from lib/invites.js for the same reason lib/tierCatalog.js is split
// from lib/tiers.js: that file is pure and safe to import from the client,
// this one touches the database.
import { sql } from 'drizzle-orm'
import { db } from './db'
import { getTierCatalog } from './tierCatalog'
import { isInviteCode, isInviteUsable, isSelfServiceTier, normalizeInviteCode } from './invites'
import { tierLabel } from './tiers'

/**
 * Everything both callers need about a link, in one round trip.
 *
 * @returns {Promise<
 *   | { ok: false, reason: 'invalid_code' | 'not_found' | 'gone' | 'error' }
 *   | { ok: true, code: string, row: object, tier: object, tiers: object[],
 *       usable: boolean, selfService: boolean }
 * >}
 */
export async function loadInviteContext(rawCode) {
  const code = normalizeInviteCode(rawCode)
  if (!isInviteCode(code)) return { ok: false, reason: 'invalid_code' }

  let rows
  try {
    rows = await db.execute(sql`
      select id, code, tier_key, label, max_uses, use_count, expires_at,
        tier_expires_at, is_active
      from group_invites where code = ${code} limit 1
    `)
  } catch (err) {
    // Includes "relation group_invites does not exist" — 0016 not applied.
    console.error('Invite lookup failed:', err)
    return { ok: false, reason: 'error' }
  }
  const row = rows[0]
  if (!row) return { ok: false, reason: 'not_found' }

  const tiers = await getTierCatalog()
  const tier = tiers.find((t) => t.key === row.tier_key)
  // The FK makes this near-impossible; a hand-run DELETE could still do it,
  // and guessing a group would be worse than refusing.
  if (!tier) return { ok: false, reason: 'gone' }

  return {
    ok: true,
    code,
    row,
    tier,
    tiers,
    usable: isInviteUsable({
      isActive: Boolean(row.is_active),
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      maxUses: row.max_uses == null ? null : Number(row.max_uses),
      useCount: Number(row.use_count ?? 0),
    }),
    // Re-checked away from mint time on purpose: a group can be switched to
    // staff-only after links to it are already circulating, and the plan says
    // those groups must never be reachable without an admin.
    selfService: isSelfServiceTier(tier),
  }
}

/**
 * The only invite fields a customer is allowed to see.
 *
 * Deliberately NOT the label, use counts or dates: an invite code is a bearer
 * token, and anyone holding it already knows which link they were sent — but
 * they have no business seeing the shop's internal campaign name or how many
 * of the 50 seats are gone.
 */
export function publicInvite(ctx) {
  return {
    code: ctx.code,
    tierKey: ctx.tier.key,
    tierLabel: tierLabel(ctx.tier.key, 'th', ctx.tiers),
    discountPercent: ctx.tier.percent,
    usable: ctx.usable && ctx.selfService,
    reason: !ctx.selfService ? 'staff_only' : ctx.usable ? null : 'unusable',
  }
}
