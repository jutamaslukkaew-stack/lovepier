'use server'

import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { getTierCatalog } from '@/lib/tierCatalog'
import {
  INVITE_ALPHABET,
  INVITE_CODE_LENGTH,
  inviteStatus,
  isSelfServiceTier,
} from '@/lib/invites'

// Invite links (0016). Minting one hands out a discount to whoever opens it,
// so the rules live in these server actions rather than in the form — a form
// is a convenience, a server action is the boundary.

export type InviteRow = {
  id: string
  code: string
  tierKey: string
  tierLabelTh: string
  label: string
  maxUses: number | null
  useCount: number
  expiresAt: string | null
  tierExpiresAt: string | null
  isActive: boolean
  status: 'ok' | 'inactive' | 'expired' | 'exhausted'
  // The agent this link belongs to (0017). Null for an ordinary campaign
  // link that earns nobody a referral fee.
  ownerCustomerId: string | null
  ownerName: string
  createdAt: string
}

/**
 * Rejection sampling, not `% alphabet.length`.
 *
 * 256 is not a multiple of 30, so the modulo of a random byte favours the
 * first 16 letters — a bias that shrinks the real keyspace of every code the
 * shop ever prints. Discarding bytes at or above the largest usable multiple
 * costs a few extra bytes and removes it entirely.
 */
function generateCode() {
  const limit = Math.floor(256 / INVITE_ALPHABET.length) * INVITE_ALPHABET.length
  let out = ''
  while (out.length < INVITE_CODE_LENGTH) {
    for (const byte of crypto.randomBytes(INVITE_CODE_LENGTH * 2)) {
      if (byte >= limit) continue
      out += INVITE_ALPHABET[byte % INVITE_ALPHABET.length]
      if (out.length === INVITE_CODE_LENGTH) break
    }
  }
  return out
}

function revalidateInviteConsumers() {
  revalidatePath('/admin/invites')
  revalidatePath('/admin/tiers')
  // An agent's link list feeds the referral report's "where did this downline
  // come from" column.
  revalidatePath('/admin/referrals')
}

export async function listInvites(): Promise<
  { ok: true; invites: InviteRow[] } | { ok: false; needsMigration: true }
> {
  await requireUser()
  let rows
  try {
    rows = await db.execute(sql`
      select i.id, i.code, i.tier_key, i.label, i.max_uses, i.use_count,
        i.expires_at, i.tier_expires_at, i.is_active, i.created_at,
        i.owner_customer_id,
        t.label_th as tier_label_th,
        coalesce(nullif(o.name, ''), o.phone, '') as owner_name
      from group_invites i
      left join customer_tiers t on t.key = i.tier_key
      left join customers o on o.id = i.owner_customer_id
      order by i.created_at desc
    `)
  } catch {
    // Same reasoning as listTiers: before the migration runs, this is an
    // instruction to the admin, not an outage.
    return { ok: false as const, needsMigration: true as const }
  }
  const now = new Date()
  const invites = (rows as unknown as Array<Record<string, unknown>>).map((r) => {
    const invite = {
      isActive: Boolean(r.is_active),
      expiresAt: r.expires_at ? new Date(r.expires_at as string) : null,
      maxUses: r.max_uses == null ? null : Number(r.max_uses),
      useCount: Number(r.use_count ?? 0),
    }
    return {
      id: String(r.id),
      code: String(r.code),
      tierKey: String(r.tier_key),
      tierLabelTh: String(r.tier_label_th ?? r.tier_key),
      label: String(r.label ?? ''),
      maxUses: invite.maxUses,
      useCount: invite.useCount,
      expiresAt: r.expires_at ? new Date(r.expires_at as string).toISOString() : null,
      tierExpiresAt: r.tier_expires_at ? String(r.tier_expires_at).slice(0, 10) : null,
      isActive: invite.isActive,
      status: inviteStatus(invite, now),
      ownerCustomerId: r.owner_customer_id ? String(r.owner_customer_id) : null,
      ownerName: String(r.owner_name ?? ''),
      createdAt: new Date(r.created_at as string).toISOString(),
    }
  })
  return { ok: true as const, invites }
}

/** Groups a link may actually be minted for — see createInvite. */
export async function listSelfServiceTiers() {
  await requireUser()
  const tiers = await getTierCatalog()
  return tiers
    .filter((t) => t.isActive !== false && isSelfServiceTier(t))
    .map((t) => ({ key: t.key, labelTh: t.labelTh, percent: t.percent }))
}

export async function createInvite(input: {
  tierKey: string
  label?: string
  maxUses?: number | null
  expiresAt?: string | null
  tierExpiresAt?: string | null
  /** The agent who owns this link (0017). Optional. */
  ownerCustomerId?: string | null
}) {
  const user = await requireUser()
  const tiers = await getTierCatalog()
  const tier = tiers.find((t) => t.key === input.tierKey)
  if (!tier) return { ok: false as const, error: 'ไม่พบกลุ่มนี้' }

  // THE RULE FROM THE PLAN: "ยกเว้นกลุ่ม 50% และ 100% ที่เข้าเองไม่ได้ ต้องแอดมิน
  // ตั้งให้". A link is self-service by definition — anyone it is forwarded to
  // can open it — so a staff-only group must not have one at all. Checked
  // again at redemption, because a group can be made staff-only after links
  // to it are already out in the world.
  if (!isSelfServiceTier(tier)) {
    return {
      ok: false as const,
      error: `กลุ่ม "${tier.labelTh}" ตั้งให้แอดมินกำหนดเองเท่านั้น สร้างลิงก์เชิญไม่ได้`,
    }
  }
  if (tier.isActive === false) {
    return { ok: false as const, error: `กลุ่ม "${tier.labelTh}" ปิดการใช้งานอยู่` }
  }

  const maxUses =
    input.maxUses == null || input.maxUses === ('' as unknown) ? null : Math.floor(Number(input.maxUses))
  if (maxUses != null && (!Number.isFinite(maxUses) || maxUses < 1)) {
    return { ok: false as const, error: 'จำนวนครั้งที่ใช้ได้ต้องมากกว่า 0 (เว้นว่าง = ไม่จำกัด)' }
  }
  const expiresAt = input.expiresAt?.trim() || null
  const tierExpiresAt = input.tierExpiresAt?.trim() || null
  if (tierExpiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(tierExpiresAt)) {
    return { ok: false as const, error: 'วันหมดอายุสิทธิ์ไม่ถูกต้อง' }
  }

  // An owner has to be a real customer: the column is a FK, and failing here
  // with a sentence beats a foreign-key violation reaching the admin.
  const ownerCustomerId = input.ownerCustomerId?.trim() || null
  if (ownerCustomerId) {
    const owner = await db.execute(sql`select id from customers where id = ${ownerCustomerId}::uuid limit 1`)
    if ((owner as unknown as unknown[]).length === 0) {
      return { ok: false as const, error: 'ไม่พบลูกค้าที่เลือกเป็นตัวแทน' }
    }
  }

  // Retry on the unique-code collision rather than trusting 49 bits blindly.
  // At the shop's scale this loop effectively never runs twice; it exists so
  // that if it ever does, the admin gets a link instead of an error.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode()
    try {
      await db.execute(sql`
        insert into group_invites
          (code, tier_key, label, max_uses, expires_at, tier_expires_at,
           owner_customer_id, created_by)
        values (${code}, ${tier.key}, ${String(input.label || '').trim()},
          ${maxUses}, ${expiresAt}::timestamptz, ${tierExpiresAt}::date,
          ${ownerCustomerId}::uuid, ${user.email || user.id})
      `)
      revalidateInviteConsumers()
      return { ok: true as const, code }
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (!message.includes('group_invites_code_key') && !message.includes('duplicate key')) {
        throw err
      }
    }
  }
  return { ok: false as const, error: 'สร้างรหัสไม่สำเร็จ กรุณาลองใหม่' }
}

export async function setInviteActive(id: string, isActive: boolean) {
  await requireUser()
  const updated = await db.execute(sql`
    update group_invites set is_active = ${isActive}, updated_at = now()
    where id = ${id}::uuid returning id
  `)
  if ((updated as unknown as unknown[]).length === 0) {
    return { ok: false as const, error: 'ไม่พบลิงก์นี้' }
  }
  revalidateInviteConsumers()
  return { ok: true as const }
}

/**
 * Delete, allowed only for a link nobody has used.
 *
 * Once it has been redeemed the row is the record of how those customers got
 * their group — deleting it cascades the redemptions away and leaves no
 * answer to "why is this person on 15%". Switching it off achieves the only
 * thing deletion is actually wanted for.
 */
export async function deleteInvite(id: string) {
  await requireUser()
  const [row] = (await db.execute(sql`
    select use_count,
      (select count(*)::int from group_invite_redemptions r where r.invite_id = ${id}::uuid) as redemptions
    from group_invites where id = ${id}::uuid
  `)) as unknown as Array<Record<string, unknown>>
  if (!row) return { ok: false as const, error: 'ไม่พบลิงก์นี้' }
  const used = Number(row.redemptions ?? 0) || Number(row.use_count ?? 0)
  if (used > 0) {
    return {
      ok: false as const,
      error: `ลิงก์นี้มีคนใช้ไปแล้ว ${used} คน — ปิดการใช้งานแทนการลบ เพื่อเก็บประวัติว่าใครเข้ากลุ่มมาทางไหน`,
    }
  }
  await db.execute(sql`delete from group_invites where id = ${id}::uuid`)
  revalidateInviteConsumers()
  return { ok: true as const }
}
