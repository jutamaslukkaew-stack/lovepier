'use server'

import { revalidatePath } from 'next/cache'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema'
import { requireUser } from '@/lib/auth'
import { ORDER_STATUSES, type OrderStatus } from '@/app/admin/orders/status'
import { pushToUser } from '@/lib/lineMessaging'
import { buildOrderStatusFlex } from '@/lib/orderFlex'

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
    })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1)

  if (!order) return { ok: false as const, error: 'ไม่พบออเดอร์' }
  if (order.status === status) return { ok: true as const, sentToLine: false, unchanged: true }

  await db.update(orders).set({ status }).where(eq(orders.id, id))

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
    }
  }
  revalidatePath('/admin/orders')
  return { ok: true as const, sentToLine }
}
