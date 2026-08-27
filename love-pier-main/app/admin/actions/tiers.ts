'use server'

import { revalidatePath } from 'next/cache'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { TIER_GENERAL } from '@/lib/tiers'

// Customer groups (migration 0015) — the admin side of what used to be a
// hard-coded array in lib/tiers.js plus four fixed rows in `settings`.
//
// Every write here changes what somebody pays on their next order, so the
// rules that protect that are enforced HERE, not in the form: a form can be
// bypassed, a server action is the actual boundary. requireUser() is the same
// admin session that guards the rest of /admin — there is deliberately no
// customer-facing path into this file.

export type TierRow = {
  key: string
  labelTh: string
  labelEn: string
  discountPercent: number
  staffOnly: boolean
  sortOrder: number
  isActive: boolean
  /** How many customers currently carry this key — including expired ones. */
  customerCount: number
}

// Mirrors the CHECK in migration 0015. Lowercase snake so the key is safe in
// a URL and readable in a log line.
const KEY_PATTERN = /^[a-z][a-z0-9_]{0,31}$/

function cleanPercent(value: unknown) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return null
  if (n < 0 || n > 100) return null
  return n
}

/**
 * Distinguishes "no groups" from "no table". Until `npm run
 * db:migrate-tier-catalog` has run against this database the table does not
 * exist, and a bare throw here renders the generic admin error page — which
 * tells whoever is looking at it nothing about what to do. The pricing path
 * does not need this guard: lib/tierCatalog.js already falls back to the four
 * built-in groups, so orders keep pricing correctly before the migration.
 */
export async function listTiers(): Promise<
  { ok: true; tiers: TierRow[] } | { ok: false; needsMigration: true }
> {
  await requireUser()
  let rows
  try {
    // A correlated count, not a join: a handful of groups against the whole
    // customer table, and the count is what stops an admin deleting a group
    // people are still in.
    rows = await db.execute(sql`
      select t.key, t.label_th, t.label_en, t.discount_percent, t.staff_only,
        t.sort_order, t.is_active,
        (select count(*)::int from customers c where c.tier = t.key) as customer_count
      from customer_tiers t
      order by t.sort_order asc, t.key asc
    `)
  } catch {
    return { ok: false as const, needsMigration: true as const }
  }
  const tiers = (rows as unknown as Array<Record<string, unknown>>).map((r) => ({
    key: String(r.key),
    labelTh: String(r.label_th ?? ''),
    labelEn: String(r.label_en ?? ''),
    discountPercent: Number(r.discount_percent ?? 0),
    staffOnly: Boolean(r.staff_only),
    sortOrder: Number(r.sort_order ?? 0),
    isActive: Boolean(r.is_active),
    customerCount: Number(r.customer_count ?? 0),
  }))
  return { ok: true as const, tiers }
}

/**
 * Every write path revalidates the same set. The catalog is read on the
 * pricing path (lib/settings.js) and on three admin screens, so a stale cache
 * here shows an admin one rate while customers are charged another.
 */
function revalidateTierConsumers() {
  revalidatePath('/admin/tiers')
  revalidatePath('/admin/customers')
  revalidatePath('/admin/members')
  revalidatePath('/admin/settings')
}

export async function createTier(input: {
  key: string
  labelTh: string
  labelEn?: string
  discountPercent: number
  staffOnly: boolean
  sortOrder?: number
}) {
  await requireUser()
  const key = String(input.key || '').trim().toLowerCase()
  if (!KEY_PATTERN.test(key)) {
    return { ok: false as const, error: 'รหัสกลุ่มต้องเป็น a–z, 0–9 และ _ เท่านั้น ขึ้นต้นด้วยตัวอักษร' }
  }
  const labelTh = String(input.labelTh || '').trim()
  if (!labelTh) return { ok: false as const, error: 'ต้องตั้งชื่อกลุ่ม' }
  const percent = cleanPercent(input.discountPercent)
  if (percent === null) return { ok: false as const, error: 'ส่วนลดต้องอยู่ระหว่าง 0–100' }

  const existing = await db.execute(sql`select 1 from customer_tiers where key = ${key} limit 1`)
  if ((existing as unknown as unknown[]).length > 0) {
    return { ok: false as const, error: `มีกลุ่มรหัส "${key}" อยู่แล้ว` }
  }

  await db.execute(sql`
    insert into customer_tiers (key, label_th, label_en, discount_percent, staff_only, sort_order)
    values (${key}, ${labelTh}, ${String(input.labelEn || '').trim()}, ${percent},
      ${Boolean(input.staffOnly)}, ${Number(input.sortOrder) || 100})
  `)
  revalidateTierConsumers()
  return { ok: true as const }
}

/**
 * The KEY is never editable. Customers carry it on their row; renaming it
 * would strand every one of them in a group that no longer exists and drop
 * them to general at the next order. Retire the group and make a new one
 * instead — that at least leaves the old rate in force for the people in it.
 */
export async function updateTier(key: string, input: {
  labelTh: string
  labelEn?: string
  discountPercent: number
  staffOnly: boolean
  sortOrder?: number
}) {
  await requireUser()
  const labelTh = String(input.labelTh || '').trim()
  if (!labelTh) return { ok: false as const, error: 'ต้องตั้งชื่อกลุ่ม' }
  const percent = cleanPercent(input.discountPercent)
  if (percent === null) return { ok: false as const, error: 'ส่วนลดต้องอยู่ระหว่าง 0–100' }

  // 'general' is what every unknown and expired tier falls back to. It may be
  // repriced — 10% is policy, not a constant — but it may not be made
  // staff-only, which would mean the default group nobody can be put into.
  const staffOnly = key === TIER_GENERAL ? false : Boolean(input.staffOnly)

  const updated = await db.execute(sql`
    update customer_tiers set
      label_th = ${labelTh},
      label_en = ${String(input.labelEn || '').trim()},
      discount_percent = ${percent},
      staff_only = ${staffOnly},
      sort_order = ${Number(input.sortOrder) || 100},
      updated_at = now()
    where key = ${key}
    returning key
  `)
  if ((updated as unknown as unknown[]).length === 0) {
    return { ok: false as const, error: 'ไม่พบกลุ่มนี้' }
  }
  revalidateTierConsumers()
  return { ok: true as const }
}

/**
 * Retire or reinstate. Retiring does NOT change anyone's price — customers
 * keep the key and lib/tierCatalog.js keeps returning the row — it only stops
 * the group being offered in the pickers.
 */
export async function setTierActive(key: string, isActive: boolean) {
  await requireUser()
  if (key === TIER_GENERAL && !isActive) {
    return { ok: false as const, error: 'กลุ่มลูกค้าทั่วไปเป็นค่าเริ่มต้นของทุกคน ปิดไม่ได้' }
  }
  const updated = await db.execute(sql`
    update customer_tiers set is_active = ${isActive}, updated_at = now()
    where key = ${key} returning key
  `)
  if ((updated as unknown as unknown[]).length === 0) {
    return { ok: false as const, error: 'ไม่พบกลุ่มนี้' }
  }
  revalidateTierConsumers()
  return { ok: true as const }
}

/**
 * Hard delete, allowed only for a group nobody is in.
 *
 * With customers in it, deleting would silently move them to general at their
 * next order — a price change nobody asked for and no record of why. That is
 * what `is_active = false` is for, and the error says so.
 */
export async function deleteTier(key: string) {
  await requireUser()
  if (key === TIER_GENERAL) {
    return { ok: false as const, error: 'กลุ่มลูกค้าทั่วไปเป็นค่าเริ่มต้นของทุกคน ลบไม่ได้' }
  }
  const [row] = (await db.execute(sql`
    select (select count(*)::int from customers c where c.tier = ${key}) as customer_count
  `)) as unknown as Array<Record<string, unknown>>
  const count = Number(row?.customer_count ?? 0)
  if (count > 0) {
    return {
      ok: false as const,
      error: `ยังมีลูกค้า ${count} คนอยู่ในกลุ่มนี้ — ปิดการใช้งานแทนการลบ เพื่อไม่ให้ราคาของพวกเขาเปลี่ยนเอง`,
    }
  }
  const deleted = await db.execute(sql`delete from customer_tiers where key = ${key} returning key`)
  if ((deleted as unknown as unknown[]).length === 0) {
    return { ok: false as const, error: 'ไม่พบกลุ่มนี้' }
  }
  revalidateTierConsumers()
  return { ok: true as const }
}
