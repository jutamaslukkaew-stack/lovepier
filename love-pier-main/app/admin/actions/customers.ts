'use server'

import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export type CustomerRow = {
  id: string
  name: string
  phone: string
  address: string
  lineLinked: boolean
  orderCount: number
  lastOrderAt: string | null
  createdAt: string
}

// One row per customer we've collected a phone number for (see
// pages/api/orders.js — every order upserts here, keyed on phone). Kept for
// the shop to eventually target repeat customers with a broadcast; this page
// is just the list, not a message sender.
export async function listCustomers(): Promise<CustomerRow[]> {
  await requireUser()
  const rows = await db.execute(sql`
    select
      c.id,
      c.name,
      c.phone,
      c.address,
      (c.line_user_id is not null) as line_linked,
      c.created_at,
      coalesce(o.order_count, 0)::int as order_count,
      o.last_order_at
    from customers c
    left join (
      select phone, count(*)::int as order_count, max(created_at) as last_order_at
      from orders
      where phone <> ''
      group by phone
    ) o on o.phone = c.phone
    where c.phone <> ''
    order by o.last_order_at desc nulls last, c.created_at desc
  `)

  return (rows as unknown as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    name: String(r.name ?? ''),
    phone: String(r.phone ?? ''),
    address: String(r.address ?? ''),
    lineLinked: Boolean(r.line_linked),
    orderCount: Number(r.order_count ?? 0),
    lastOrderAt: r.last_order_at ? new Date(r.last_order_at as string).toISOString() : null,
    createdAt: new Date(r.created_at as string).toISOString(),
  }))
}
