import { and, desc, eq, ne, sql } from 'drizzle-orm'
import { db } from '../../lib/db'
import { customers, orders } from '../../lib/db/schema'
import { verifyLineAccessToken } from '../../lib/lineIdentity'
import { loadInviteContext, publicInvite } from '../../lib/inviteLookup'
import { getShopSettings } from '../../lib/settings'
import { tierLabel } from '../../lib/tiers'

// Redeem an invite link (0016).
//
//   GET  /api/join?code=…  → { invite }   preview, no writes, no auth
//   POST /api/join { code } → { joined }  puts the caller in the group
//
// POST requires `Authorization: Bearer <LIFF access token>` and re-derives the
// LINE user id server-side, exactly like /api/member and /api/customer — a
// browser-supplied lineUserId is never trusted. This endpoint MOVES MONEY (a
// tier is a standing discount on every future order), so every rule the plan
// states is enforced here, not in the page:
//
//   • staff-only groups can never be joined by a link, even if a link exists
//   • a link that is off / expired / used up is refused
//   • one person can hold one group; a new link overwrites the old group
//   • redeeming twice is a no-op, not a second use off a limited link
//
// GET exists so the page can say "You're joining คอนโด — 15%" BEFORE asking
// the customer to log in. It deliberately reveals only the group label: an
// invite code is a bearer token, and someone who has it already knows which
// link they were sent.

// Resolution lives in lib/inviteLookup.js so this endpoint and the page's
// getServerSideProps cannot disagree about whether a link is usable.
export default async function handler(req, res) {
  const raw = req.method === 'GET' ? req.query?.code : req.body?.code
  const ctx = await loadInviteContext(raw)

  if (!ctx.ok) {
    const status =
      ctx.reason === 'invalid_code' ? 400
      : ctx.reason === 'not_found' ? 404
      : ctx.reason === 'gone' ? 410
      : 500
    const message =
      ctx.reason === 'invalid_code' ? 'ลิงก์เชิญไม่ถูกต้อง'
      : ctx.reason === 'not_found' ? 'ไม่พบลิงก์เชิญนี้'
      : ctx.reason === 'gone' ? 'กลุ่มของลิงก์นี้ถูกลบไปแล้ว'
      : 'เกิดข้อผิดพลาด'
    return res.status(status).json({ error: ctx.reason, message })
  }

  const { code, row: invite, tier, tiers, usable, selfService } = ctx

  if (req.method === 'GET') {
    return res.status(200).json({ invite: publicInvite(ctx) })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  if (!selfService) {
    return res.status(403).json({ error: 'staff_only', message: 'กลุ่มนี้ต้องให้ทางร้านเป็นผู้กำหนดให้' })
  }
  if (!usable) {
    return res.status(410).json({ error: 'unusable', message: 'ลิงก์เชิญนี้ใช้ไม่ได้แล้ว' })
  }

  const authorization = typeof req.headers.authorization === 'string' ? req.headers.authorization : ''
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  const verifiedLine = await verifyLineAccessToken(accessToken)
  if (!verifiedLine) return res.status(401).json({ error: 'auth', message: 'เซสชัน LINE หมดอายุ' })
  const lineUserId = verifiedLine.userId

  const settings = await getShopSettings()

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Find-or-create this LINE user's customer row. Same find-or-attach
      //    shape as /api/member: check lineUserId first so a returning
      //    customer is never split across two rows.
      const [byLine] = await tx
        .select({
          id: customers.id,
          tier: customers.tier,
          name: customers.name,
          referredByCustomerId: customers.referredByCustomerId,
        })
        .from(customers)
        .where(eq(customers.lineUserId, lineUserId))
        .limit(1)

      let customerId = byLine?.id
      let previousTier = byLine?.tier || 'general'
      // Undefined for a brand-new row, which is the same as "no referrer yet".
      const existingReferrer = byLine?.referredByCustomerId || null

      if (!customerId) {
        // No row yet. Reuse a phone this LINE account has already ordered
        // with, so the invite does not create a duplicate of someone who is
        // already a customer. Skipped when another row owns that phone — the
        // unique index would reject it and merging two people is not this
        // endpoint's job.
        let phone = ''
        try {
          const [lastOrder] = await tx
            .select({ phone: orders.phone })
            .from(orders)
            .where(and(eq(orders.lineUserId, lineUserId), ne(orders.phone, '')))
            .orderBy(desc(orders.createdAt))
            .limit(1)
          if (lastOrder?.phone) {
            const [taken] = await tx
              .select({ id: customers.id })
              .from(customers)
              .where(eq(customers.phone, lastOrder.phone))
              .limit(1)
            if (!taken) phone = lastOrder.phone
          }
        } catch {
          // Non-fatal: a customer with no phone is still a customer.
        }
        const inserted = await tx.execute(sql`
          insert into customers (line_user_id, line_display_name, name, phone, tier)
          values (${lineUserId}, ${verifiedLine.displayName || ''},
            ${verifiedLine.displayName || ''}, ${phone}, 'general')
          returning id
        `)
        customerId = inserted[0]?.id
        previousTier = 'general'
      }
      if (!customerId) throw new Error('customer_upsert_failed')

      // 2. Claim a use ATOMICALLY. Two people opening the last slot of a
      //    limited link at the same moment must not both get in: the WHERE
      //    re-checks the limit inside the same UPDATE that increments it, so
      //    the loser gets zero rows back rather than a stale read.
      //
      //    Skipped entirely when this customer already redeemed this link —
      //    coming back to the page is the normal case and must not cost a use.
      const [already] = await tx.execute(sql`
        select id from group_invite_redemptions
        where invite_id = ${invite.id}::uuid and customer_id = ${customerId}::uuid limit 1
      `)

      if (!already) {
        const claimed = await tx.execute(sql`
          update group_invites set use_count = use_count + 1, updated_at = now()
          where id = ${invite.id}::uuid
            and is_active = true
            and (expires_at is null or expires_at > now())
            and (max_uses is null or use_count < max_uses)
          returning id
        `)
        if (claimed.length === 0) return { raced: true }

        await tx.execute(sql`
          insert into group_invite_redemptions
            (invite_id, customer_id, previous_tier, new_tier)
          values (${invite.id}::uuid, ${customerId}::uuid, ${previousTier}, ${tier.key})
          on conflict (invite_id, customer_id) do nothing
        `)
      }

      // 3. Apply the group. "ลูกค้าหนึ่งคนอยู่ได้กลุ่มเดียว เข้าลิงก์กลุ่มใหม่ทับกลุ่ม
      //    เดิม" — this overwrites rather than merging, and the previous group
      //    is preserved in customer_tier_history below.
      //
      //    A customer an admin has placed in a STAFF-ONLY group is left alone:
      //    an SCC employee on 50% must not be demoted to 15% by tapping a
      //    condo link somebody forwarded them.
      const previousTierEntry = tiers.find((t) => t.key === previousTier)
      const locked = previousTierEntry ? previousTierEntry.staffOnly === true : false

      if (!locked) {
        await tx.execute(sql`
          update customers
          set tier = ${tier.key}, tier_expires_at = ${invite.tier_expires_at}::date,
            updated_at = now()
          where id = ${customerId}::uuid
        `)
        await tx.execute(sql`
          insert into customer_tier_history
            (customer_id, previous_tier, new_tier, new_expires_at, changed_by)
          values (${customerId}::uuid, ${previousTier}, ${tier.key},
            ${invite.tier_expires_at}::date, ${'invite:' + code})
        `)
      }

      // 4. WHO INVITED THEM (0017, plan ผัง 3). The invite's owner becomes
      //    this customer's agent — but only if they do not already have one:
      //    "ใครชวนก็เป็นคนนั้นตลอด เข้าลิงก์ตัวแทนคนอื่นทีหลังไม่เปลี่ยนเจ้าของ
      //    เพื่อกันการแย่งลูกทีม". So this is an UPDATE ... WHERE
      //    referred_by_customer_id IS NULL, not an assignment.
      //
      //    Nothing here can fail the join. A customer who got their discount
      //    must keep it even if the attribution could not be written, so every
      //    guard below simply skips the write.
      let referralRecorded = false
      const agentId = invite.owner_customer_id
      if (settings.referralEnabled && agentId && !existingReferrer && agentId !== customerId) {
        // The cap the plan left open ("ยังไม่จำกัดจำนวนลูกทีมต่อตัวแทน ... แต่
        // เตรียมช่องไว้"). 0 means no cap, which is the default.
        const cap = Math.max(0, Number(settings.referralMaxDownline) || 0)
        let underCap = true
        if (cap > 0) {
          const [row] = await tx.execute(sql`
            select count(*)::int as n from customers
            where referred_by_customer_id = ${agentId}::uuid
          `)
          underCap = Number(row?.n ?? 0) < cap
        }
        if (underCap) {
          // WHERE ... IS NULL is the guard, not the `if` above: two links
          // opened at once would both pass the read, and only one may win.
          const claimed = await tx.execute(sql`
            update customers
            set referred_by_customer_id = ${agentId}::uuid, referred_at = now(),
              updated_at = now()
            where id = ${customerId}::uuid and referred_by_customer_id is null
            returning id
          `)
          referralRecorded = claimed.length > 0
        }
      }

      return { customerId, previousTier, locked, referralRecorded }
    })

    if (result.raced) {
      return res.status(410).json({ error: 'unusable', message: 'ลิงก์เชิญนี้ถูกใช้ครบแล้ว' })
    }

    return res.status(200).json({
      joined: {
        // `locked` = they were already in a staff-assigned group and keep it.
        // Reported honestly so the page can say so rather than claiming a
        // move that did not happen.
        applied: !result.locked,
        keptExistingTier: result.locked ? tierLabel(result.previousTier, 'th', tiers) : null,
        tierKey: result.locked ? result.previousTier : tier.key,
        tierLabel: tierLabel(result.locked ? result.previousTier : tier.key, 'th', tiers),
        discountPercent: result.locked
          ? tiers.find((t) => t.key === result.previousTier)?.percent ?? 0
          : tier.percent,
        tierExpiresAt: result.locked ? null : invite.tier_expires_at || null,
      },
    })
  } catch (err) {
    console.error('Invite redemption failed:', err)
    return res.status(500).json({ error: 'server', message: 'เข้ากลุ่มไม่สำเร็จ กรุณาลองใหม่' })
  }
}
