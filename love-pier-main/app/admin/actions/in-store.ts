'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, gte, isNotNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { customers, orders, pointTransactions } from '@/lib/db/schema'
import { requireUser } from '@/lib/auth'
import { getShopSettings } from '@/lib/settings'
import { calcInStoreVisit } from '@/lib/points'
import { awardPoints } from '@/lib/pointsAward'
import { pushToUser } from '@/lib/lineMessaging'
import { buildInStoreVisitFlex } from '@/lib/orderFlex'
import { IN_STORE_METHOD, inStoreDiscountFor, type ScannedMember } from '@/lib/inStore'
import { effectiveTier, tierLabel } from '@/lib/tiers'

// Staff-side counter flow for Love Pier ID (see /admin/scan). Both actions are
// behind requireUser(), the same admin session that guards /admin/orders.
// Constants and types live in lib/inStore.ts — a 'use server' module can only
// export async functions.

const QR_PREFIX = 'LPID1:'

function money(n: number) {
  return Math.max(0, Math.floor(Number(n) || 0))
}

function formatMemberNo(memberNo: number) {
  return `LP${String(memberNo).padStart(3, '0')}`
}

// Same generator as pages/api/orders.js — in-store visits share the orders
// table, so they share its numbering too.
function makeOrderNo() {
  const d = new Date()
  const ymd =
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `LP${ymd}-${rand}`
}

/**
 * Resolve whatever the scanner produced into a member.
 *
 * Accepts either the QR payload (`LPID1:<secret>`) or a typed member number
 * (`LP002`, or just `2`) — the counter needs a manual fallback for when a
 * screen is too dim or cracked to scan, and staff can read the number off the
 * customer's card. Looking up by number is safe here because the caller is
 * already an authenticated staff member standing in front of the customer;
 * the unguessable secret is what protects the *customer-facing* side.
 */
export async function lookupMember(raw: string) {
  await requireUser()
  const input = (raw || '').trim()
  if (!input) return { ok: false as const, error: 'ยังไม่ได้สแกนหรือกรอกรหัสสมาชิก' }

  let where
  if (input.startsWith(QR_PREFIX)) {
    const code = input.slice(QR_PREFIX.length).trim()
    if (!code) return { ok: false as const, error: 'QR ไม่ถูกต้อง' }
    where = eq(customers.memberCode, code)
  } else {
    // "LP002", "lp2", "002" and "2" should all find member 2.
    const digits = input.replace(/^lp/i, '').replace(/\D/g, '')
    const memberNo = parseInt(digits, 10)
    if (!Number.isFinite(memberNo) || memberNo <= 0) {
      return { ok: false as const, error: 'รหัสสมาชิกไม่ถูกต้อง' }
    }
    where = eq(customers.memberNo, memberNo)
  }

  const [c] = await db
    .select()
    .from(customers)
    .where(and(where, isNotNull(customers.memberNo)))
    .limit(1)

  if (!c || c.memberNo == null) {
    return { ok: false as const, error: 'ไม่พบสมาชิกรายนี้' }
  }

  const settings = await getShopSettings()
  const { percent, tier, tierApplied } = inStoreDiscountFor(effectiveTier(c.tier, c.tierExpiresAt, undefined, settings.tiers), settings)

  return {
    ok: true as const,
    member: {
      customerId: c.id,
      memberNo: formatMemberNo(c.memberNo),
      name: c.name || c.lineDisplayName || '',
      pointsBalance: c.pointsBalance || 0,
      hasLine: Boolean(c.lineUserId),
      discountPercent: percent,
      pointsPerBaht: settings.inStorePointsPerBaht,
      tier,
      tierLabel: tierLabel(tier, 'th', settings.tiers),
      tierApplied,
    } satisfies ScannedMember,
  }
}

/**
 * Commit an in-store purchase: record it, credit the points, tell the customer.
 *
 * The visit is written as a paid `orders` row rather than some separate
 * table because the loyalty ledger keys off an order id — that unique
 * constraint is what stops the same purchase crediting points twice
 * (lib/pointsAward.js). Reusing it also means in-store spend shows up in
 * /admin/orders alongside everything else, with no second history to
 * reconcile.
 *
 * Rates are re-read from settings here and never taken from the client, so a
 * stale open scan tab can't apply yesterday's discount.
 */
export async function recordInStoreVisit(customerId: string, grossAmount: number, requestedPoints = 0) {
  await requireUser()

  const gross = money(grossAmount)
  if (gross <= 0) return { ok: false as const, error: 'กรุณากรอกยอดเงิน' }

  const [c] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1)
  if (!c || c.memberNo == null) return { ok: false as const, error: 'ไม่พบสมาชิกรายนี้' }

  const settings = await getShopSettings()
  // Re-resolved from the row, not from the scan tab that opened minutes ago —
  // same reasoning as the rates themselves: a tier changed in another window
  // must not be applied at yesterday's value.
  const { percent: discountPercent } = inStoreDiscountFor(effectiveTier(c.tier, c.tierExpiresAt, undefined, settings.tiers), settings)
  const pointsToRedeem = Math.min(Math.max(0, Math.floor(Number(requestedPoints) || 0)), c.pointsBalance || 0)
  const { discountAmount, pointsRedeemed, netAmount, pointsEarned } = calcInStoreVisit(gross, {
    discountPercent,
    pointsPerBaht: settings.inStorePointsPerBaht,
    pointsRedeemed: pointsToRedeem,
  })

  const memberNo = formatMemberNo(c.memberNo)
  const orderNo = makeOrderNo()

  const created = await db.transaction(async (tx) => {
    if (pointsRedeemed > 0) {
      const [updated] = await tx.update(customers)
        .set({ pointsBalance: sql`${customers.pointsBalance} - ${pointsRedeemed}`, updatedAt: sql`now()` })
        .where(and(eq(customers.id, customerId), gte(customers.pointsBalance, pointsRedeemed)))
        .returning({ id: customers.id })
      if (!updated) throw new Error('POINTS_BALANCE_CHANGED')
    }
    const [order] = await tx.insert(orders).values({
      orderNo,
      lineUserId: c.lineUserId,
      customerName: c.name || c.lineDisplayName || memberNo,
      phone: c.phone || '',
      address: '',
      note: `หน้าร้าน · สมาชิก ${memberNo}`,
      deliveryMethod: IN_STORE_METHOD,
      items: [],
      itemsSubtotal: gross,
      discountAmount,
      discountPercent,
      pointsEarned,
      pointsRedeemed,
      deliveryFee: 0,
      totalAmount: netAmount,
      // 'done', not 'paid': at the counter the money and the food have
      // already changed hands, so the sale is complete on arrival. Filing it
      // as 'paid' would leave /admin/orders offering "รับออเดอร์ · แจ้ง LINE"
      // on a walk-in that has long since left, and pressing it would push a
      // delivery-flavoured status card to that customer.
      status: 'done',
      paymentMethod: IN_STORE_METHOD,
    }).returning({ id: orders.id })
    if (pointsRedeemed > 0) {
      await tx.insert(pointTransactions).values({ orderId: order.id, customerId, phone: c.phone || '', points: -pointsRedeemed, type: 'redeem' })
    }
    return order
  })

  if (!created?.id) return { ok: false as const, error: 'บันทึกรายการไม่สำเร็จ' }

  // Best-effort from here on, matching the convention in pages/api/orders.js:
  // the sale is already recorded, so a points or LINE failure must not make
  // staff think the transaction failed and ring it up a second time.
  let pointsBalance = (c.pointsBalance || 0) - pointsRedeemed
  if (pointsEarned > 0) {
    try {
      await awardPoints({
        orderId: created.id,
        lineUserId: c.lineUserId,
        phone: c.phone,
        points: pointsEarned,
      })
      pointsBalance += pointsEarned
    } catch (error) {
      console.error('In-store points award failed (non-fatal):', orderNo, error)
    }
  }

  let sentToLine = false
  if (c.lineUserId) {
    try {
      const pushed = await pushToUser(c.lineUserId, [
        buildInStoreVisitFlex({
          memberNo,
          grossAmount: gross,
          discountAmount,
          netAmount,
          pointsEarned,
          pointsBalance,
        }),
      ])
      sentToLine = Boolean(pushed.ok)
    } catch (error) {
      console.error('In-store LINE push failed (non-fatal):', orderNo, error)
    }
  }

  console.log('In-store visit recorded:', { orderNo, memberNo, netAmount, pointsEarned, sentToLine })
  revalidatePath('/admin/orders')

  return {
    ok: true as const,
    receipt: { orderNo, memberNo, grossAmount: gross, discountAmount, pointsRedeemed, netAmount, pointsEarned, pointsBalance, sentToLine },
  }
}
