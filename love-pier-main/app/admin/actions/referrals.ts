'use server'

import { revalidatePath } from 'next/cache'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { getShopSettings } from '@/lib/settings'
import { PAID_ORDER_STATUSES, referralFeeForCustomer } from '@/lib/referrals'

// Referral fees owed to agents (0017, plan ผัง 3).
//
// This module REPORTS and RECORDS PAYMENTS. It never moves money and never
// converts anything into loyalty points: "ระบบไม่โอนเงินและไม่แปลงเป็นแต้ม —
// หน้าที่ของมันคือรวมตัวเลขให้ตรวจสอบได้ แล้วร้านจ่ายเอง".
//
// Outstanding is computed as accrued − paid, every time, from the orders
// themselves. Nothing caches a total, so an order that gets cancelled after
// the fact simply stops counting rather than leaving a stale balance behind.

export type DownlineRow = {
  customerId: string
  name: string
  phone: string
  referredAt: string
  windowEndsAt: string | null
  orderCount: number
  fee: number
}

export type AgentRow = {
  customerId: string
  name: string
  phone: string
  downlineCount: number
  orderCount: number
  accrued: number
  paid: number
  outstanding: number
  downline: DownlineRow[]
}

export type ReferralReport =
  | { ok: false; needsMigration: true }
  | { ok: false; disabled: true }
  | { ok: true; percent: number; months: number; agents: AgentRow[] }

export async function getReferralReport(): Promise<ReferralReport> {
  await requireUser()
  const settings = await getShopSettings()
  if (!settings.referralEnabled) return { ok: false as const, disabled: true as const }

  const percent = Number(settings.referralPercent) || 0
  const months = Number(settings.referralMonths) || 0

  let rows
  try {
    // One query for every downline order in one pass.
    //
    // Orders join to a customer on phone OR line_user_id, which is the same
    // rule /admin/customers uses to list a customer's orders — there is no
    // customer_id on orders. Using a different rule here would make the
    // referral total disagree with the order list on the customer's own page.
    //
    // Status filtering happens in SQL as well as in lib/referrals.js: the
    // pure function is the authority, this just avoids dragging every pending
    // and cancelled order across the wire.
    rows = await db.execute(sql`
      select
        a.id   as agent_id,
        coalesce(nullif(a.name, ''), a.line_display_name, '') as agent_name,
        a.phone as agent_phone,
        d.id   as downline_id,
        coalesce(nullif(d.name, ''), d.line_display_name, '') as downline_name,
        d.phone as downline_phone,
        d.referred_at,
        o.id   as order_id,
        o.items_subtotal,
        o.discount_amount,
        o.status,
        o.created_at as order_created_at
      from customers d
      join customers a on a.id = d.referred_by_customer_id
      left join orders o
        on o.status = any(${PAID_ORDER_STATUSES})
       and (
             (d.phone <> '' and o.phone = d.phone)
          or (d.line_user_id is not null and o.line_user_id = d.line_user_id)
           )
      where d.referred_by_customer_id is not null
      order by a.id, d.referred_at desc, o.created_at desc
    `)
  } catch {
    return { ok: false as const, needsMigration: true as const }
  }

  let payoutRows
  try {
    payoutRows = await db.execute(sql`
      select agent_customer_id, coalesce(sum(amount), 0)::int as paid
      from referral_payouts group by agent_customer_id
    `)
  } catch {
    return { ok: false as const, needsMigration: true as const }
  }
  const paidByAgent = new Map(
    (payoutRows as unknown as Array<Record<string, unknown>>).map((r) => [
      String(r.agent_customer_id),
      Number(r.paid ?? 0),
    ])
  )

  // Regroup the flat join into agent → downline → orders. A LEFT JOIN means a
  // downline with no qualifying orders still appears (with a zero), which is
  // information the shop wants: it is the difference between "this agent
  // recruited nobody" and "they recruited five people who never came back".
  const agents = new Map<string, AgentRow & { _orders: Map<string, unknown[]> }>()
  const downlineMeta = new Map<string, { referredAt: string; orders: Record<string, unknown>[] }>()

  for (const raw of rows as unknown as Array<Record<string, unknown>>) {
    const agentId = String(raw.agent_id)
    if (!agents.has(agentId)) {
      agents.set(agentId, {
        customerId: agentId,
        name: String(raw.agent_name ?? ''),
        phone: String(raw.agent_phone ?? ''),
        downlineCount: 0,
        orderCount: 0,
        accrued: 0,
        paid: 0,
        outstanding: 0,
        downline: [],
        _orders: new Map(),
      })
    }
    const downlineId = String(raw.downline_id)
    if (!downlineMeta.has(downlineId)) {
      downlineMeta.set(downlineId, {
        referredAt: raw.referred_at ? new Date(raw.referred_at as string).toISOString() : '',
        orders: [],
      })
      const agent = agents.get(agentId)!
      agent.downlineCount += 1
      agent.downline.push({
        customerId: downlineId,
        name: String(raw.downline_name ?? ''),
        phone: String(raw.downline_phone ?? ''),
        referredAt: raw.referred_at ? new Date(raw.referred_at as string).toISOString() : '',
        windowEndsAt: null,
        orderCount: 0,
        fee: 0,
      })
    }
    if (raw.order_id) {
      downlineMeta.get(downlineId)!.orders.push({
        status: String(raw.status),
        itemsSubtotal: Number(raw.items_subtotal ?? 0),
        discountAmount: Number(raw.discount_amount ?? 0),
        createdAt: raw.order_created_at,
      })
    }
  }

  const { referralWindowEnd } = await import('@/lib/referrals')

  for (const agent of agents.values()) {
    for (const d of agent.downline) {
      const meta = downlineMeta.get(d.customerId)!
      // The pure function decides what counts — the window, the statuses and
      // the percentage all live in lib/referrals.js, which the tests pin.
      const { orderCount, fee } = referralFeeForCustomer(
        { referredAt: meta.referredAt },
        meta.orders,
        { percent, months }
      )
      d.orderCount = orderCount
      d.fee = fee
      const end = referralWindowEnd(meta.referredAt, months)
      d.windowEndsAt = end ? end.toISOString() : null
      agent.orderCount += orderCount
      agent.accrued += fee
    }
    agent.paid = paidByAgent.get(agent.customerId) ?? 0
    // Can go negative if the shop over-paid; shown as-is rather than clamped,
    // because hiding an overpayment is how it gets paid twice.
    agent.outstanding = agent.accrued - agent.paid
    // Biggest debt first — this is a list to work through, not a directory.
    agent.downline.sort((x, y) => y.fee - x.fee)
  }

  const list = [...agents.values()]
    .map(({ _orders, ...rest }) => rest)
    .sort((a, b) => b.outstanding - a.outstanding)

  return { ok: true as const, percent, months, agents: list }
}

/**
 * Record money the shop has handed over.
 *
 * Does not mark specific orders as settled — see the migration for why this is
 * a running balance rather than a per-period statement.
 */
export async function recordReferralPayout(input: {
  agentCustomerId: string
  amount: number
  orderCount?: number
  note?: string
}) {
  const user = await requireUser()
  const amount = Math.floor(Number(input.amount))
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false as const, error: 'จำนวนเงินต้องมากกว่า 0' }
  }
  const [agent] = (await db.execute(
    sql`select id from customers where id = ${input.agentCustomerId}::uuid limit 1`
  )) as unknown as Array<Record<string, unknown>>
  if (!agent) return { ok: false as const, error: 'ไม่พบตัวแทนรายนี้' }

  await db.execute(sql`
    insert into referral_payouts (agent_customer_id, amount, order_count, note, paid_by)
    values (${input.agentCustomerId}::uuid, ${amount}, ${Math.max(0, Number(input.orderCount) || 0)},
      ${String(input.note || '').trim()}, ${user.email || user.id})
  `)
  revalidatePath('/admin/referrals')
  return { ok: true as const }
}

/** Payment history for one agent, newest first. */
export async function listPayouts(agentCustomerId: string) {
  await requireUser()
  const rows = await db.execute(sql`
    select id, amount, order_count, note, paid_by, created_at
    from referral_payouts where agent_customer_id = ${agentCustomerId}::uuid
    order by created_at desc limit 50
  `)
  return (rows as unknown as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    amount: Number(r.amount ?? 0),
    orderCount: Number(r.order_count ?? 0),
    note: String(r.note ?? ''),
    paidBy: String(r.paid_by ?? ''),
    createdAt: new Date(r.created_at as string).toISOString(),
  }))
}
