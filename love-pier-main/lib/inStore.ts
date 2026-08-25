// Shared constants/types for the in-store Love Pier ID counter flow.
//
// These live here rather than in app/admin/actions/in-store.ts because a
// 'use server' module may only export async functions — a plain const or type
// export there makes Next.js drop the whole module's exports at build time.

import { TIER_GENERAL, normalizeTier, tierDiscountPercent } from './tiers'

// Tags orders created by /admin/scan so in-store visits can be told apart
// from real delivery/pickup orders in /admin/orders and later reporting.
// Nothing else in the app writes this value.
export const IN_STORE_METHOD = 'in-store'

export type ScannedMember = {
  customerId: string
  memberNo: string
  name: string
  pointsBalance: number
  hasLine: boolean
  discountPercent: number
  pointsPerBaht: number
  tier: string
  /** True when discountPercent came from the tier rather than the counter rate. */
  tierApplied: boolean
}

/**
 * What percentage a member gets at the counter.
 *
 * Two rates meet here and neither can simply win. The shop set a deliberate
 * walk-in rate (in_store_discount_percent, 10% by default) that is separate
 * from delivery — but the 2026-08-24 tiers describe people, not channels: an
 * SCC employee on 50% who is told "10%, this is the counter" has not been
 * given the discount the shop agreed to.
 *
 * When grouped discounts are enabled, the same tier rate is used at the
 * counter and online. With the master switch off, the legacy counter rate is
 * the rollback behaviour.
 */
export function inStoreDiscountFor(
  tier: string | null | undefined,
  settings: {
    inStoreDiscountPercent?: number
    memberDiscountEnabled?: boolean
    tierDiscountPercent?: Record<string, number>
  }
): { percent: number; tier: string; tierApplied: boolean } {
  const key = normalizeTier(tier)
  const useTier = Boolean(settings.memberDiscountEnabled)
  const percent = useTier
    ? tierDiscountPercent(key, {
        enabled: true,
        percentByTier: settings.tierDiscountPercent || {},
      })
    : Math.max(0, Number(settings.inStoreDiscountPercent) || 0)
  return { percent, tier: key, tierApplied: useTier }
}
