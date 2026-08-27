// Invite-link rules (0016). Pure — no I/O, no DB, no React — same rule as
// lib/tiers.js, so the /join page, /api/join and the admin screen all reason
// about a link the same way.

/**
 * Uppercase, and missing I, L, O, U, 0 and 1.
 *
 * A code gets read off a printed QR, typed by someone squinting at a phone,
 * and dictated over the counter. Ambiguous glyphs are where that goes wrong,
 * and U is dropped as well so no generated code can accidentally spell
 * something the shop would rather not print.
 */
export const INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789'

/** 10 characters of a 30-symbol alphabet ≈ 49 bits — not guessable at scale. */
export const INVITE_CODE_LENGTH = 10

export const INVITE_CODE_PATTERN = new RegExp(`^[${INVITE_ALPHABET}]{${INVITE_CODE_LENGTH}}$`)

/**
 * What the customer typed → what the database stores.
 *
 * Lowercase is accepted and upcased, and spaces/dashes are dropped, because
 * people write codes down in groups ("ABCD-EFGH-JK") and phone keyboards
 * autocapitalise unpredictably. Anything else is left alone so it fails the
 * pattern check rather than being silently "corrected" into a different,
 * possibly real, code.
 */
export function normalizeInviteCode(raw) {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '')
}

export function isInviteCode(raw) {
  return INVITE_CODE_PATTERN.test(normalizeInviteCode(raw))
}

/**
 * Why a link cannot be used, or 'ok'.
 *
 * Returns the FIRST reason in a fixed order rather than a list, because the
 * customer sees one sentence. Order is deliberate: 'inactive' outranks
 * 'expired' so a link the shop switched off reads as switched off even after
 * its date has also passed.
 *
 * @param {{ isActive?: boolean, expiresAt?: string|Date|null, maxUses?: number|null, useCount?: number }} invite
 * @param {Date} [now]
 * @returns {'ok'|'inactive'|'expired'|'exhausted'}
 */
export function inviteStatus(invite, now = new Date()) {
  if (!invite) return 'inactive'
  if (invite.isActive === false) return 'inactive'
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() <= now.getTime()) return 'expired'
  // `!= null` not truthiness: max_uses is never 0 (the CHECK forbids it), but
  // reading it as "unlimited" if it ever were would be the wrong direction.
  if (invite.maxUses != null && Number(invite.useCount || 0) >= Number(invite.maxUses)) {
    return 'exhausted'
  }
  return 'ok'
}

export function isInviteUsable(invite, now = new Date()) {
  return inviteStatus(invite, now) === 'ok'
}

/**
 * Whether a group may be joined by tapping a link at all.
 *
 * The plan is explicit: "ยกเว้นกลุ่ม 50% และ 100% ที่เข้าเองไม่ได้ ต้องแอดมินตั้งให้".
 * staffOnly is that rule, and it is per-group since 0015 rather than a
 * hard-coded pair of keys — a group the shop creates is staffOnly by default,
 * so a new group cannot become self-service by accident.
 *
 * Enforced when the link is MINTED and again when it is REDEEMED: a group can
 * be made staff-only after links to it are already in circulation.
 */
export function isSelfServiceTier(tier) {
  return Boolean(tier) && tier.staffOnly !== true
}

/** Absolute URL an admin copies, or encodes into a QR. */
export function inviteUrl(origin, code) {
  return `${String(origin || '').replace(/\/+$/, '')}/join?code=${encodeURIComponent(code)}`
}
