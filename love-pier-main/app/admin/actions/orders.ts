'use server'

import { revalidatePath } from 'next/cache'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema'
import { requireUser } from '@/lib/auth'
import { ORDER_STATUSES, type OrderStatus } from '@/app/admin/orders/status'

export async function listOrders() {
  await requireUser()
  return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(200)
}

export async function setOrderStatus(id: string, status: string) {
  await requireUser()
  if (!ORDER_STATUSES.includes(status as OrderStatus)) {
    return { ok: false as const, error: 'สถานะไม่ถูกต้อง' }
  }
  await db.update(orders).set({ status }).where(eq(orders.id, id))
  revalidatePath('/admin/orders')
  return { ok: true as const }
}
