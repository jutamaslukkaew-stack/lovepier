'use server'

import { revalidatePath } from 'next/cache'
import { desc, isNotNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema'
import { requireUser } from '@/lib/auth'
import { ORDER_STATUSES, type OrderStatus } from '@/app/admin/orders/status'
import { applyOrderStatusChange } from '@/lib/orderStatusUpdate'

export async function listOrders() {
  await requireUser()
  return db
    .select()
    .from(orders)
    .orderBy(
      // Upcoming pre-orders float to the top as a due-soonest-first prep
      // queue; everything else — ASAP orders, in-store rows, and pre-orders
      // whose time has already passed — keeps the existing newest-first order
      // underneath, untouched. Key 2 is NULL for the whole second group, so
      // every row there ties and falls through to created_at.
      //
      // Rejected: `desc(coalesce(scheduled_for, created_at))`, which would
      // park a pre-order three days out permanently above every fresh order.
      //
      // now() is compared against a timestamptz, so this is an absolute
      // comparison and doesn't care what timezone the server runs in.
      sql`case when ${orders.scheduledFor} is not null
                and ${orders.scheduledFor} >= now() then 0 else 1 end`,
      sql`case when ${orders.scheduledFor} is not null
                and ${orders.scheduledFor} >= now() then ${orders.scheduledFor} end asc`,
      desc(orders.createdAt)
    )
    .limit(200)
}

export async function listPreorders() {
  await requireUser()
  return db
    .select()
    .from(orders)
    .where(isNotNull(orders.scheduledFor))
    .orderBy(
      // Future slots are the prep queue. Once their time passes, keep them
      // underneath in most-recent-slot-first order for quick history lookup.
      sql`case when ${orders.scheduledFor} >= now() then 0 else 1 end`,
      sql`case when ${orders.scheduledFor} >= now() then ${orders.scheduledFor} end asc`,
      desc(orders.scheduledFor)
    )
    .limit(200)
}

export async function setOrderStatus(id: string, status: string) {
  await requireUser()
  if (!ORDER_STATUSES.includes(status as OrderStatus)) {
    return { ok: false as const, error: 'สถานะไม่ถูกต้อง' }
  }
  // Shared with the staff LINE quick-action buttons (pages/api/line-webhook.js)
  // so the dropdown and a button tap do exactly the same thing: update the
  // row, credit points on pending→paid, push the customer their status card.
  const result = await applyOrderStatusChange({ id, status })
  if (!result.ok) return { ok: false as const, error: result.error || 'อัปเดตสถานะไม่สำเร็จ' }

  revalidatePath('/admin/orders')
  revalidatePath('/admin/preorders')
  return {
    ok: true as const,
    // customerNotice says WHY the customer was or wasn't told, so the toast
    // can distinguish "nothing to do" from "go call them".
    customerNotice: result.customerNotice,
    sentToLine: result.sentToLine ?? false,
    unchanged: result.unchanged,
  }
}
