import crypto from 'crypto'
import { and, desc, eq, isNull, ne, sql } from 'drizzle-orm'
import { db } from '../../lib/db'
import { customers, orders } from '../../lib/db/schema'
import { verifyLineAccessToken } from '../../lib/lineIdentity'
import { effectiveTier, isTierExpired, tierLabel } from '../../lib/tiers'
import { getTierCatalog } from '../../lib/tierCatalog'

// Love Pier ID — the membership card.
//
//   GET  /api/member                    → { member }        (read only)
//   POST /api/member { birthday?, name? } → { member }      (issue if needed)
//
// Both require `Authorization: Bearer <LIFF access token>` and re-derive the
// LINE user id server-side (lib/lineIdentity.js), exactly like
// pages/api/customer.js — a browser-supplied lineUserId is never trusted.
//
// NO SIGNUP FORM (2026-08-26, journey document item 1: "เพิ่มเพื่อน = สมาชิก
// ทันที ไม่มีฟอร์มสมัครซ้ำ"). POST used to require a name and a phone number.
// It no longer requires anything: opening /member issues the card straight
// away, named from the LINE profile the token already proves. Every field the
// form used to collect was either already known (the name) or not needed to
// scan a card at the counter (the phone).
//
// POST is the issuing verb, not GET, because issuing writes — a sequence
// value is consumed and a row is created. It is idempotent all the same: the
// `WHERE member_no IS NULL` guard below means calling it twice returns the
// same card rather than re-rolling one.

// Staff read this off the customer's phone screen, so keep it short and
// unambiguous. LP prefix matches the LP…-style order numbers customers
// already see. The stored value is the raw integer; this is display only.
function formatMemberNo(memberNo) {
  return `LP${String(memberNo).padStart(3, '0')}`
}

// What the QR actually encodes. The namespace prefix + version digit lets a
// future staff-scan endpoint reject unrelated QRs with one startsWith() and
// leaves room to change the code format later without invalidating cards
// already issued. Deliberately not a URL: there's no scan page to land on
// yet, and a dead link scanned by a generic camera app is worse than an
// inert string.
function toQrPayload(memberCode) {
  return `LPID1:${memberCode}`
}

// `tiers` is the shop's group catalog (0015). It is a parameter rather than a
// fetch inside here because this runs twice per POST and the card is pure
// presentation — the caller reads the catalog once. Omitting it degrades to
// the four built-in groups, which is wrong for a shop-created group: the card
// would show "ลูกค้าทั่วไป" to someone who is not.
function toMemberView(c, tiers) {
  if (!c || c.memberNo == null || !c.memberCode) return null
  return {
    memberNo: formatMemberNo(c.memberNo),
    qrPayload: toQrPayload(c.memberCode),
    pointsBalance: c.pointsBalance || 0,
    name: c.name || '',
    phone: c.phone || '',
    birthday: c.birthday || null,
    joinedAt: c.createdAt || null,
    tier: effectiveTier(c.tier, c.tierExpiresAt, undefined, tiers),
    tierLabel: tierLabel(effectiveTier(c.tier, c.tierExpiresAt, undefined, tiers), 'th', tiers),
    tierExpiresAt: c.tierExpiresAt || null,
    tierExpired: isTierExpired(c.tier, c.tierExpiresAt, undefined, tiers),
  }
}

function pickString(v) {
  return typeof v === 'string' ? v.trim() : ''
}

export default async function handler(req, res) {
  const authorization = typeof req.headers.authorization === 'string' ? req.headers.authorization : ''
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  // TEMPORARY (2026-08-26): diagnosing the E401 seen on production /member —
  // see lib/lineIdentity.js's matching temporary `debug` param. Revert both
  // together once the cause is found.
  const _debug = {}
  const verifiedLine = await verifyLineAccessToken(accessToken, _debug)
  if (!verifiedLine) return res.status(401).json({ member: null, error: 'Invalid LINE session', _debug })
  const lineUserId = verifiedLine.userId

  if (req.method === 'GET') {
    try {
      const [c] = await db
        .select()
        .from(customers)
        .where(eq(customers.lineUserId, lineUserId))
        .limit(1)

      // null means "no card yet" — POST issues one. Read-only on purpose:
      // nothing here should be able to consume a member number.
      return res.status(200).json({ member: c ? toMemberView(c, await getTierCatalog()) : null })
    } catch (err) {
      console.error('Fetch member failed:', err)
      return res.status(200).json({ member: null })
    }
  }

  if (req.method === 'POST') {
    // Nothing here is required. `name` is accepted so a future "edit my card"
    // screen has a way in, but the default — and what every customer gets
    // today — is the display name on the LINE account the token belongs to.
    const requestedName = pickString(req.body?.name)
    const displayName = pickString(verifiedLine.displayName)
    const birthdayRaw = pickString(req.body?.birthday)
    // Optional by design — an unparseable or empty birthday is dropped, never
    // an error. Only the shape is validated; Postgres rejects impossible dates.
    const birthday = /^\d{4}-\d{2}-\d{2}$/.test(birthdayRaw) ? birthdayRaw : null

    try {
      // 1. Find-or-attach this LINE user's customer row. Check lineUserId
      //    FIRST so an existing member/customer is always reused — never
      //    split one person across two rows.
      let customerId
      const [byLine] = await db
        .select({ id: customers.id, name: customers.name })
        .from(customers)
        .where(eq(customers.lineUserId, lineUserId))
        .limit(1)

      if (byLine) {
        customerId = byLine.id
        // Only fill a name in, never overwrite one. A returning delivery
        // customer typed theirs at checkout and it is the name staff know
        // them by; the LINE display name is the fallback, not the authority.
        const name = requestedName || byLine.name || displayName
        if (name && name !== byLine.name) {
          try {
            await db
              .update(customers)
              .set({ name, updatedAt: sql`now()` })
              .where(eq(customers.id, customerId))
          } catch (err) {
            // Non-fatal: the card matters more than the label on it, same
            // convention as the customer upsert in pages/api/orders.js.
            console.error('Member name update failed (non-fatal):', err)
          }
        }
      } else {
        // No row yet. Before creating one, look for a phone this LINE account
        // has already used on an order: without the signup form there is
        // nothing else that can link the card to a delivery history, and a
        // second row for the same person would split their points. Skipped
        // when another row already owns that phone — the unique index would
        // reject it, and merging two people's rows is not this endpoint's
        // job.
        let phone = ''
        try {
          const [lastOrder] = await db
            .select({ phone: orders.phone })
            .from(orders)
            .where(and(eq(orders.lineUserId, lineUserId), ne(orders.phone, '')))
            .orderBy(desc(orders.createdAt))
            .limit(1)
          if (lastOrder?.phone) {
            const [taken] = await db
              .select({ id: customers.id })
              .from(customers)
              .where(eq(customers.phone, lastOrder.phone))
              .limit(1)
            if (!taken) phone = lastOrder.phone
          }
        } catch (err) {
          // A card with no phone on it is still a working card.
          console.error('Member phone recovery failed (non-fatal):', err)
        }

        const [inserted] = await db
          .insert(customers)
          .values({
            lineUserId,
            lineDisplayName: displayName,
            name: requestedName || displayName,
            phone,
          })
          .returning({ id: customers.id })
        customerId = inserted?.id
      }

      if (!customerId) {
        console.error('Member registration: could not resolve a customer row')
        return res.status(500).json({ member: null, error: 'Registration failed' })
      }

      // 2. Assign member fields once and only once. `WHERE member_no IS NULL`
      //    means a repeat POST (or two racing ones) never re-rolls an issued
      //    card and never burns a sequence value — it simply matches no rows
      //    and falls through to the re-read below.
      const memberCode = crypto.randomBytes(24).toString('base64url')
      await db
        .update(customers)
        .set({
          memberNo: sql`nextval('customers_member_no_seq')`,
          memberCode,
          // Only when one was actually supplied. Since the signup form is
          // gone this is almost always absent, and writing a bare null here
          // would clear a birthday rather than leave it alone.
          ...(birthday ? { birthday } : {}),
          updatedAt: sql`now()`,
        })
        .where(and(eq(customers.id, customerId), isNull(customers.memberNo)))

      // 3. Let an already-registered member update just their birthday
      //    (the one field they may not have filled in at signup).
      if (birthday) {
        try {
          await db
            .update(customers)
            .set({ birthday, updatedAt: sql`now()` })
            .where(eq(customers.id, customerId))
        } catch (err) {
          console.error('Birthday update failed (non-fatal):', err)
        }
      }

      const [final] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1)
      const member = toMemberView(final, await getTierCatalog())
      if (!member) {
        console.error('Member registration: row has no member fields after assignment')
        return res.status(500).json({ member: null, error: 'Registration failed' })
      }
      return res.status(200).json({ member })
    } catch (err) {
      console.error('Member registration failed:', err)
      return res.status(500).json({ member: null, error: 'Registration failed' })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ member: null, error: 'Method not allowed' })
}
