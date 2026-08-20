'use server'

import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export type CustomerRow = {
  id: string; name: string; phone: string; address: string
  lineLinked: boolean; lineDisplayName: string
  memberNo: number | null; birthday: string | null; pointsBalance: number
  orderCount: number; lastOrderAt: string | null; createdAt: string
}

export type CustomerOrderRow = {
  id: string; orderNo: string; items: unknown; totalAmount: number; status: string
  deliveryMethod: string; pointsEarned: number; pointsRedeemed: number
  scheduledFor: string | null; createdAt: string
}

export type PointHistoryRow = {
  id: string; orderId: string; orderNo: string; points: number; type: string; createdAt: string
}

export type CustomerDetail = CustomerRow & {
  updatedAt: string; totalSpend: number; averageSpend: number
  channelCounts: { delivery: number; pickup: number; inStore: number; preorder: number }
  pointsEarnedTotal: number; pointsRedeemedTotal: number
  favoriteItems: Array<{ name: string; qty: number }>
  orders: CustomerOrderRow[]; pointHistory: PointHistoryRow[]
}

export async function listCustomers(): Promise<CustomerRow[]> {
  await requireUser()
  const rows = await db.execute(sql`
    select c.id, c.name, c.phone, c.address, c.line_display_name,
      c.member_no, c.birthday, c.points_balance,
      (c.line_user_id is not null) as line_linked, c.created_at,
      coalesce(o.order_count, 0)::int as order_count, o.last_order_at
    from customers c
    left join (
      select phone, count(*)::int as order_count, max(created_at) as last_order_at
      from orders where phone <> '' group by phone
    ) o on o.phone = c.phone
    where c.phone <> ''
    order by o.last_order_at desc nulls last, c.created_at desc
  `)
  return (rows as unknown as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id), name: String(r.name ?? ''), phone: String(r.phone ?? ''),
    address: String(r.address ?? ''), lineLinked: Boolean(r.line_linked),
    lineDisplayName: String(r.line_display_name ?? ''),
    memberNo: r.member_no == null ? null : Number(r.member_no),
    birthday: r.birthday ? String(r.birthday) : null,
    pointsBalance: Number(r.points_balance ?? 0), orderCount: Number(r.order_count ?? 0),
    lastOrderAt: r.last_order_at ? new Date(r.last_order_at as string).toISOString() : null,
    createdAt: new Date(r.created_at as string).toISOString(),
  }))
}

export async function listMembers(): Promise<CustomerRow[]> {
  return (await listCustomers()).filter((customer) => customer.memberNo != null)
}

export async function getCustomerDetail(id: string): Promise<CustomerDetail | null> {
  await requireUser()
  const customerRows = await db.execute(sql`
    select id, name, phone, address, line_user_id, line_display_name,
      member_no, birthday, points_balance, created_at, updated_at
    from customers where id = ${id}::uuid limit 1
  `)
  const c = (customerRows as unknown as Array<Record<string, unknown>>)[0]
  if (!c) return null
  const phone = String(c.phone ?? '')
  const lineUserId = c.line_user_id ? String(c.line_user_id) : ''

  const orderRows = await db.execute(sql`
    select id, order_no, items, total_amount, status, delivery_method,
      points_earned, points_redeemed, scheduled_for, created_at
    from orders
    where (${phone} <> '' and phone = ${phone})
       or (${lineUserId} <> '' and line_user_id = ${lineUserId})
    order by created_at desc limit 200
  `)
  const customerOrders: CustomerOrderRow[] = (orderRows as unknown as Array<Record<string, unknown>>).map((o) => ({
    id: String(o.id), orderNo: String(o.order_no), items: o.items,
    totalAmount: Number(o.total_amount ?? 0), status: String(o.status ?? ''),
    deliveryMethod: String(o.delivery_method ?? ''), pointsEarned: Number(o.points_earned ?? 0),
    pointsRedeemed: Number(o.points_redeemed ?? 0),
    scheduledFor: o.scheduled_for ? new Date(o.scheduled_for as string).toISOString() : null,
    createdAt: new Date(o.created_at as string).toISOString(),
  }))

  const pointRows = await db.execute(sql`
    select pt.id, pt.order_id, coalesce(o.order_no, '') as order_no,
      pt.points, pt.type, pt.created_at
    from point_transactions pt left join orders o on o.id = pt.order_id
    where pt.customer_id = ${id}::uuid or (${phone} <> '' and pt.phone = ${phone})
    order by pt.created_at desc limit 200
  `)
  const pointHistory: PointHistoryRow[] = (pointRows as unknown as Array<Record<string, unknown>>).map((p) => ({
    id: String(p.id), orderId: String(p.order_id), orderNo: String(p.order_no ?? ''),
    points: Number(p.points ?? 0), type: String(p.type ?? ''),
    createdAt: new Date(p.created_at as string).toISOString(),
  }))

  const completedOrders = customerOrders.filter((o) => o.status !== 'cancelled')
  const totalSpend = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0)
  const favoriteMap = new Map<string, number>()
  for (const order of completedOrders) {
    if (!Array.isArray(order.items)) continue
    for (const raw of order.items as Array<Record<string, unknown>>) {
      const name = String(raw.name ?? '').trim()
      if (name) favoriteMap.set(name, (favoriteMap.get(name) ?? 0) + Math.max(0, Number(raw.qty) || 0))
    }
  }

  return {
    id: String(c.id), name: String(c.name ?? ''), phone, address: String(c.address ?? ''),
    lineLinked: Boolean(c.line_user_id), lineDisplayName: String(c.line_display_name ?? ''),
    memberNo: c.member_no == null ? null : Number(c.member_no),
    birthday: c.birthday ? String(c.birthday) : null,
    pointsBalance: Number(c.points_balance ?? 0), orderCount: customerOrders.length,
    lastOrderAt: customerOrders[0]?.createdAt ?? null,
    createdAt: new Date(c.created_at as string).toISOString(),
    updatedAt: new Date(c.updated_at as string).toISOString(), totalSpend,
    averageSpend: completedOrders.length ? Math.round(totalSpend / completedOrders.length) : 0,
    channelCounts: {
      delivery: customerOrders.filter((o) => o.deliveryMethod === 'delivery').length,
      pickup: customerOrders.filter((o) => o.deliveryMethod === 'pickup').length,
      inStore: customerOrders.filter((o) => o.deliveryMethod === 'in-store').length,
      preorder: customerOrders.filter((o) => Boolean(o.scheduledFor)).length,
    },
    pointsEarnedTotal: pointHistory.filter((p) => p.points > 0).reduce((sum, p) => sum + p.points, 0),
    pointsRedeemedTotal: customerOrders.reduce((sum, o) => sum + o.pointsRedeemed, 0),
    favoriteItems: [...favoriteMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty })),
    orders: customerOrders, pointHistory,
  }
}
