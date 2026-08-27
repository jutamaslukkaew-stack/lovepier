'use server'

import { revalidatePath } from 'next/cache'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { effectiveTier, isTierExpired, isTierKey, normalizeTier, tierLabel } from '@/lib/tiers'
import { getTierCatalog } from '@/lib/tierCatalog'

export type CustomerRow = {
  id: string; name: string; phone: string; address: string
  lineLinked: boolean; lineDisplayName: string
  lineFriend: boolean; lineFollowedAt: string | null
  memberNo: number | null; birthday: string | null; pointsBalance: number
  tier: string; assignedTier: string; tierExpiresAt: string | null; tierExpired: boolean
  // Resolved here rather than in the page because the label of a shop-created
  // group only exists in the catalog, and the catalog is a server read. A
  // client component calling tierLabel() would fall back to the four built-in
  // names and quietly print "ลูกค้าทั่วไป" over someone's real group.
  tierLabelTh: string
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
      c.member_no, c.birthday, c.points_balance, c.tier, c.tier_expires_at,
      c.line_friend_status, c.line_followed_at,
      (c.line_user_id is not null) as line_linked, c.created_at,
      coalesce(o.order_count, 0)::int as order_count, o.last_order_at
    from customers c
    left join (
      select phone, count(*)::int as order_count, max(created_at) as last_order_at
      from orders where phone <> '' group by phone
    ) o on o.phone = c.phone
    order by o.last_order_at desc nulls last, c.created_at desc
  `)
  // Once for the whole page, not per row — the catalog is the same for all.
  const tiers = await getTierCatalog()
  return (rows as unknown as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id), name: String(r.name ?? ''), phone: String(r.phone ?? ''),
    address: String(r.address ?? ''), lineLinked: Boolean(r.line_linked),
    lineDisplayName: String(r.line_display_name ?? ''),
    lineFriend: Boolean(r.line_friend_status),
    lineFollowedAt: r.line_followed_at ? new Date(r.line_followed_at as string).toISOString() : null,
    memberNo: r.member_no == null ? null : Number(r.member_no),
    birthday: r.birthday ? String(r.birthday) : null,
    pointsBalance: Number(r.points_balance ?? 0),
    assignedTier: normalizeTier(r.tier as string, tiers),
    tier: effectiveTier(r.tier as string, r.tier_expires_at, undefined, tiers),
    tierExpiresAt: r.tier_expires_at ? String(r.tier_expires_at).slice(0, 10) : null,
    tierExpired: isTierExpired(r.tier as string, r.tier_expires_at, undefined, tiers),
    tierLabelTh: tierLabel(effectiveTier(r.tier as string, r.tier_expires_at, undefined, tiers), 'th', tiers),
    orderCount: Number(r.order_count ?? 0),
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
      member_no, birthday, points_balance, tier, tier_expires_at,
      line_friend_status, line_followed_at, created_at, updated_at
    from customers where id = ${id}::uuid limit 1
  `)
  const c = (customerRows as unknown as Array<Record<string, unknown>>)[0]
  if (!c) return null
  const tiers = await getTierCatalog()
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
    lineFriend: Boolean(c.line_friend_status),
    lineFollowedAt: c.line_followed_at ? new Date(c.line_followed_at as string).toISOString() : null,
    memberNo: c.member_no == null ? null : Number(c.member_no),
    birthday: c.birthday ? String(c.birthday) : null,
    pointsBalance: Number(c.points_balance ?? 0),
    assignedTier: normalizeTier(c.tier as string, tiers),
    tier: effectiveTier(c.tier as string, c.tier_expires_at, undefined, tiers),
    tierExpiresAt: c.tier_expires_at ? String(c.tier_expires_at).slice(0, 10) : null,
    tierExpired: isTierExpired(c.tier as string, c.tier_expires_at, undefined, tiers),
    tierLabelTh: tierLabel(effectiveTier(c.tier as string, c.tier_expires_at, undefined, tiers), 'th', tiers),
    orderCount: customerOrders.length,
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

/**
 * Move a customer between discount tiers.
 *
 * Staff-only by construction — there is no customer-facing path to this, and
 * there must not be: the 50% and 100% tiers are real money, and the journey
 * document requires affiliated-staff status to be verified by a person
 * ("ต้องมีการยืนยันสถานะพนักงาน"). requireUser() is the same admin session
 * that guards the rest of /admin.
 *
 * The tier only changes what FUTURE orders cost. Past orders keep the
 * percentage they were placed at, in orders.discount_percent.
 */
export async function setCustomerTier(id: string, tier: string, expiresAt?: string | null) {
  const user = await requireUser()
  // Validated against the LIVE catalog, not a hard-coded list — since 0015 the
  // shop can create groups, and this is the write path that would otherwise
  // reject every one of them. Retired groups are in the catalog too, so an
  // admin can still move someone back into one deliberately; what stops a
  // retired group being picked by accident is the picker not offering it.
  const tiers = await getTierCatalog()
  if (!isTierKey(tier, tiers)) return { ok: false as const, error: 'กลุ่มลูกค้าไม่ถูกต้อง' }
  const expiry = tier === 'general' || !expiresAt ? null : expiresAt
  if (expiry && !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
    return { ok: false as const, error: 'วันหมดอายุไม่ถูกต้อง' }
  }

  const rows = await db.transaction(async (tx) => {
    const before = await tx.execute(sql`select tier, tier_expires_at from customers where id = ${id}::uuid limit 1`)
    const previous = (before as unknown as Array<Record<string, unknown>>)[0]
    if (!previous) return []
    const updated = await tx.execute(sql`
      update customers set tier = ${tier}, tier_expires_at = ${expiry}::date, updated_at = now()
      where id = ${id}::uuid returning id
    `)
    await tx.execute(sql`
      insert into customer_tier_history
        (customer_id, previous_tier, new_tier, previous_expires_at, new_expires_at, changed_by)
      values (${id}::uuid, ${String(previous.tier || 'general')}, ${tier},
        ${previous.tier_expires_at ? String(previous.tier_expires_at).slice(0, 10) : null}::date,
        ${expiry}::date, ${user.email || user.id})
    `)
    return updated
  })
  if ((rows as unknown as unknown[]).length === 0) {
    return { ok: false as const, error: 'ไม่พบลูกค้ารายนี้' }
  }

  revalidatePath(`/admin/customers/${id}`)
  revalidatePath('/admin/customers')
  revalidatePath('/admin/members')
  return { ok: true as const }
}

/** Import all current OA friends when LINE enables the followers endpoint. */
export async function syncLineOaFriends() {
  await requireUser()
  const token = process.env.LINE_MESSAGING_TOKEN || ''
  if (!token) return { ok: false as const, error: 'ยังไม่ได้ตั้งค่า LINE Messaging token' }

  const userIds: string[] = []
  let start = ''
  do {
    const url = new URL('https://api.line.me/v2/bot/followers/ids')
    url.searchParams.set('limit', '1000')
    if (start) url.searchParams.set('start', start)
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    if (response.status === 403) {
      return { ok: false as const, error: 'LINE อนุญาตให้ดึงเพื่อนเดิมเฉพาะบัญชี Verified หรือ Premium เท่านั้น' }
    }
    if (!response.ok) return { ok: false as const, error: `LINE ตอบกลับ ${response.status}` }
    const data = await response.json() as { userIds?: string[]; next?: string }
    userIds.push(...(Array.isArray(data.userIds) ? data.userIds : []))
    start = typeof data.next === 'string' ? data.next : ''
  } while (start && userIds.length < 50000)

  let synced = 0
  for (let offset = 0; offset < userIds.length; offset += 10) {
    const batch = userIds.slice(offset, offset + 10)
    await Promise.all(batch.map(async (userId) => {
      const profileResponse = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(userId)}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
      })
      if (!profileResponse.ok) return
      const profile = await profileResponse.json() as { displayName?: string }
      const displayName = typeof profile.displayName === 'string' ? profile.displayName.trim() : ''
      await db.execute(sql`
        insert into customers (line_user_id, line_display_name, name, line_friend_status, line_followed_at)
        values (${userId}, ${displayName}, ${displayName}, true, now())
        on conflict (line_user_id) do update set
          line_display_name = coalesce(nullif(${displayName}, ''), customers.line_display_name),
          name = coalesce(nullif(customers.name, ''), ${displayName}),
          line_friend_status = true, line_unfollowed_at = null, updated_at = now()
      `)
      synced += 1
    }))
  }

  revalidatePath('/admin/customers')
  revalidatePath('/admin/members')
  return { ok: true as const, synced, total: userIds.length }
}
