'use server'

import { revalidatePath } from 'next/cache'
import { desc, eq, isNotNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema'
import { requireUser } from '@/lib/auth'
import { ORDER_STATUSES, type OrderStatus } from '@/app/admin/orders/status'
import { pushToUser } from '@/lib/lineMessaging'
import { buildOrderStatusFlex } from '@/lib/orderFlex'
import { awardPoints } from '@/lib/pointsAward'
import { IN_STORE_METHOD } from '@/lib/inStore'

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
  const [order] = await db
    .select({
      orderNo: orders.orderNo,
      lineUserId: orders.lineUserId,
      deliveryMethod: orders.deliveryMethod,
      status: orders.status,
      phone: orders.phone,
      pointsEarned: orders.pointsEarned,
    })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1)

  if (!order) return { ok: false as const, error: 'ไม่พบออเดอร์' }
  if (order.status === status) return { ok: true as const, sentToLine: false, unchanged: true }

  await db.update(orders).set({ status }).where(eq(orders.id, id))

  // Manual payment confirmation must have the same loyalty outcome as an
  // automatically verified slip. awardPoints is idempotent by order id, so a
  // later retry or status change cannot credit the customer twice.
  if (status === 'paid' && order.status === 'pending' && order.pointsEarned > 0) {
    try {
      await awardPoints({
        orderId: id,
        lineUserId: order.lineUserId,
        phone: order.phone,
        points: order.pointsEarned,
      })
    } catch (error) {
      console.error('manual payment points failed (non-fatal):', order.orderNo, error)
    }
  }

  let sentToLine = false
  // In-store sales (from /admin/scan) already sent the customer their receipt
  // card at the counter. buildOrderStatusFlex only speaks in delivery/pickup
  // terms ("ออเดอร์พร้อมจัดส่งแล้ว"), so pushing it for a walk-in would be
  // actively wrong — skip it and just record the status change.
  if (order.lineUserId && order.deliveryMethod !== IN_STORE_METHOD) {
    const message = buildOrderStatusFlex({
      orderNo: order.orderNo,
      status,
      deliveryMethod: order.deliveryMethod,
    })
    if (message) {
      const pushed = await pushToUser(order.lineUserId, [message])
      sentToLine = Boolean(pushed.ok)
      console.log('Admin order status notification:', {
        orderNo: order.orderNo,
        from: order.status,
        to: status,
        sentToLine,
      })
    }
  }
  revalidatePath('/admin/orders')
  revalidatePath('/admin/preorders')
  return { ok: true as const, sentToLine }
}
