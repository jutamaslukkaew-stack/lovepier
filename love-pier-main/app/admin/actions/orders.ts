'use server'

import { revalidatePath } from 'next/cache'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema'
import { requireUser } from '@/lib/auth'
import { ORDER_STATUSES, type OrderStatus } from '@/app/admin/orders/status'
import { pushToUser } from '@/lib/lineMessaging'
import { buildOrderStatusFlex } from '@/lib/orderFlex'
import { awardPoints } from '@/lib/pointsAward'

export async function listOrders() {
  await requireUser()
  return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(200)
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
  if (order.lineUserId) {
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
  return { ok: true as const, sentToLine }
}
