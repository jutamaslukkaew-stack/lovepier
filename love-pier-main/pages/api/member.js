import crypto from 'crypto'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '../../lib/db'
import { customers } from '../../lib/db/schema'
import { verifyLineAccessToken } from '../../lib/lineIdentity'

// Love Pier ID — member registration + card data (Phase 1).
//
//   GET  /api/member → { member, prefill }
//   POST /api/member { name, phone, birthday? } → { member }
//
// Both require `Authorization: Bearer <LIFF access token>` and re-derive the
// LINE user id server-side (lib/lineIdentity.js), exactly like
// pages/api/customer.js — a browser-supplied lineUserId is never trusted.

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

function toMemberView(c) {
  if (!c || c.memberNo == null || !c.memberCode) return null
  return {
    memberNo: formatMemberNo(c.memberNo),
    qrPayload: toQrPayload(c.memberCode),
    pointsBalance: c.pointsBalance || 0,
    name: c.name || '',
    phone: c.phone || '',
    birthday: c.birthday || null,
    joinedAt: c.createdAt || null,
  }
}

function pickString(v) {
  return typeof v === 'string' ? v.trim() : ''
}

export default async function handler(req, res) {
  const authorization = typeof req.headers.authorization === 'string' ? req.headers.authorization : ''
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  const verifiedLine = await verifyLineAccessToken(accessToken)
  if (!verifiedLine) return res.status(401).json({ member: null, error: 'Invalid LINE session' })
  const lineUserId = verifiedLine.userId

  if (req.method === 'GET') {
    try {
      const [c] = await db
        .select()
        .from(customers)
        .where(eq(customers.lineUserId, lineUserId))
        .limit(1)

      if (!c) return res.status(200).json({ member: null, prefill: null })

      return res.status(200).json({
        member: toMemberView(c),
        // Returning delivery customers shouldn't retype what we already have.
        prefill: c.memberNo == null ? { name: c.name || '', phone: c.phone || '' } : null,
      })
    } catch (err) {
      console.error('Fetch member failed:', err)
      return res.status(200).json({ member: null, prefill: null })
    }
  }

  if (req.method === 'POST') {
    const name = pickString(req.body?.name)
    const phone = pickString(req.body?.phone)
    const birthdayRaw = pickString(req.body?.birthday)
    // Optional by design — an unparseable or empty birthday is dropped, never
    // an error. Only the shape is validated; Postgres rejects impossible dates.
    const birthday = /^\d{4}-\d{2}-\d{2}$/.test(birthdayRaw) ? birthdayRaw : null

    if (!name) return res.status(400).json({ member: null, error: 'กรุณากรอกชื่อ' })
    if (!phone) return res.status(400).json({ member: null, error: 'กรุณากรอกเบอร์โทร' })

    try {
      // 1. Find-or-attach this LINE user's customer row. Check lineUserId
      //    FIRST so an existing member/customer is always reused even if the
      //    phone typed here differs from what's on file — never split one
      //    person across two rows. Only when this LINE user has no row at all
      //    do we fall back to the upsert-by-phone in pages/api/orders.js,
      //    which attaches to a row left by a past delivery order.
      let customerId
      const [byLine] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.lineUserId, lineUserId))
        .limit(1)

      if (byLine) {
        customerId = byLine.id
        try {
          await db
            .update(customers)
            .set({ name, phone, updatedAt: sql`now()` })
            .where(eq(customers.id, customerId))
        } catch (err) {
          // e.g. this phone already belongs to a different row. Non-fatal:
          // the member card matters more than syncing contact details, same
          // convention as the customer upsert in pages/api/orders.js.
          console.error('Member contact update failed (non-fatal):', err)
        }
      } else {
        const [upserted] = await db
          .insert(customers)
          .values({ lineUserId, lineDisplayName: verifiedLine.displayName, name, phone })
          .onConflictDoUpdate({
            target: customers.phone,
            // customers_phone_unique_idx (0005) is partial — Postgres can't
            // infer it as the arbiter without repeating the same WHERE. See
            // the long note on the same upsert in pages/api/orders.js.
            targetWhere: sql`${customers.phone} <> ''`,
            set: {
              name,
              lineUserId: sql`coalesce(${customers.lineUserId}, excluded.line_user_id)`,
              lineDisplayName: sql`coalesce(${customers.lineDisplayName}, excluded.line_display_name)`,
              updatedAt: sql`now()`,
            },
          })
          .returning({ id: customers.id })
        customerId = upserted?.id
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
          birthday,
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
      const member = toMemberView(final)
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
