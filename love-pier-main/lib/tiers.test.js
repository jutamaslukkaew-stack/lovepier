import { describe, expect, it } from 'vitest'
import { DEFAULT_TIERS, effectiveTier, isTierExpired, isTierKey, normalizeTier, tierDiscountPercent, tierLabel } from './tiers'

const ON = { enabled: true }

describe('normalizeTier', () => {
  it('accepts the four built-in tiers', () => {
    for (const t of DEFAULT_TIERS) expect(normalizeTier(t.key)).toBe(t.key)
  })

  it('reads anything unrecognized as general rather than throwing', () => {
    // A row written by a newer deploy, a typo, or the pre-migration default.
    expect(normalizeTier('vip')).toBe('general')
    expect(normalizeTier('')).toBe('general')
    expect(normalizeTier(null)).toBe('general')
    expect(normalizeTier(undefined)).toBe('general')
  })

  it('is strict about what counts as a tier key', () => {
    expect(isTierKey('scc')).toBe(true)
    expect(isTierKey('SCC')).toBe(false)
  })
})

describe('tierDiscountPercent', () => {
  it('gives everyone 0% while the master switch is off', () => {
    // The default, and the rollback lever: no deploy needed to restore the
    // 2026-08-17 no-discount behaviour.
    for (const t of DEFAULT_TIERS) expect(tierDiscountPercent(t.key)).toBe(0)
  })

  it('uses each tier default from the journey document when unconfigured', () => {
    expect(tierDiscountPercent('general', ON)).toBe(10)
    expect(tierDiscountPercent('condo', ON)).toBe(15)
    expect(tierDiscountPercent('scc', ON)).toBe(50)
    expect(tierDiscountPercent('staff', ON)).toBe(100)
  })

  it('prefers the shop-configured rate over the default', () => {
    expect(tierDiscountPercent('condo', { enabled: true, percentByTier: { condo: 20 } })).toBe(20)
  })

  it('honours a configured zero rather than treating it as unset', () => {
    // `0` is falsy; a `||` fallback here would silently reinstate 15%.
    expect(tierDiscountPercent('condo', { enabled: true, percentByTier: { condo: 0 } })).toBe(0)
  })

  it('falls back per tier, not all-or-nothing', () => {
    const opts = { enabled: true, percentByTier: { general: 5 } }
    expect(tierDiscountPercent('general', opts)).toBe(5)
    expect(tierDiscountPercent('scc', opts)).toBe(50)
  })

  it('clamps and rounds a nonsense configured rate', () => {
    expect(tierDiscountPercent('general', { enabled: true, percentByTier: { general: 500 } })).toBe(100)
    expect(tierDiscountPercent('general', { enabled: true, percentByTier: { general: -5 } })).toBe(0)
    expect(tierDiscountPercent('general', { enabled: true, percentByTier: { general: 12.4 } })).toBe(12)
    expect(tierDiscountPercent('general', { enabled: true, percentByTier: { general: 'abc' } })).toBe(10)
  })

  it('treats an unknown tier as general instead of giving 0%', () => {
    expect(tierDiscountPercent('vip', ON)).toBe(10)
  })
})

describe('tierLabel', () => {
  it('labels every tier in both languages', () => {
    for (const t of DEFAULT_TIERS) {
      expect(tierLabel(t.key, 'th')).toBe(t.labelTh)
      expect(tierLabel(t.key, 'en')).toBe(t.labelEn)
    }
  })

  it('never returns undefined for an unknown tier', () => {
    expect(tierLabel('vip')).toBe(tierLabel('general'))
  })
})

describe('tier policy', () => {
  it('keeps the 50% and 100% tiers staff-assignable only', () => {
    // The document requires affiliated-staff status to be verified by a
    // person; nothing customer-facing may put someone in these.
    expect(DEFAULT_TIERS.filter((t) => t.staffOnly).map((t) => t.key)).toEqual(['scc', 'staff'])
  })
})

describe('tier expiry', () => {
  const now = new Date('2026-08-25T05:00:00.000Z')

  it('keeps a special tier through its expiry date in Bangkok', () => {
    expect(isTierExpired('condo', '2026-08-25', now)).toBe(false)
    expect(effectiveTier('condo', '2026-08-25', now)).toBe('condo')
  })

  it('falls an expired special tier back to general', () => {
    expect(isTierExpired('scc', '2026-08-24', now)).toBe(true)
    expect(effectiveTier('scc', '2026-08-24', now)).toBe('general')
  })

  it('never marks the general tier expired', () => {
    expect(isTierExpired('general', '2020-01-01', now)).toBe(false)
  })
})

// ── The catalog (migration 0015) ────────────────────────────────────────────
//
// The shop can now create groups. Everything above still describes the
// behaviour with no catalog passed, which is what the four built-in groups
// get; these describe what changes when one is.

const CATALOG = [
  { key: 'general', percent: 10, labelTh: 'ลูกค้าทั่วไป', labelEn: 'General', staffOnly: false, isActive: true },
  { key: 'condo', percent: 15, labelTh: 'คอนโด', labelEn: 'Condo', staffOnly: false, isActive: true },
  { key: 'agent', percent: 5, labelTh: 'ตัวแทน', labelEn: 'Agent', staffOnly: true, isActive: true },
  { key: 'oldclub', percent: 25, labelTh: 'สมาชิกเก่า', labelEn: 'Old club', staffOnly: true, isActive: false },
]

describe('shop-created groups', () => {
  it('recognises a group that exists only in the catalog', () => {
    // Without the catalog 'agent' is not a tier at all, and every function
    // below would quietly answer as if the customer were general.
    expect(isTierKey('agent')).toBe(false)
    expect(isTierKey('agent', CATALOG)).toBe(true)
    expect(normalizeTier('agent', CATALOG)).toBe('agent')
  })

  it('prices a shop-created group at its own rate, not general\'s', () => {
    const opts = { enabled: true, percentByTier: { general: 10, agent: 5 }, tiers: CATALOG }
    expect(tierDiscountPercent('agent', opts)).toBe(5)
    // The bug this guards: drop `tiers` and the 5% group silently bills at 10%.
    expect(tierDiscountPercent('agent', { enabled: true, percentByTier: { general: 10, agent: 5 } })).toBe(10)
  })

  it('lets a shop-created group expire like any other special group', () => {
    const now = new Date('2026-08-25T05:00:00.000Z')
    expect(isTierExpired('agent', '2026-08-24', now, CATALOG)).toBe(true)
    expect(effectiveTier('agent', '2026-08-24', now, CATALOG)).toBe('general')
    // Unknown to the built-in list, so it reads as general and general never
    // expires — an agent whose access ran out would keep it forever.
    expect(isTierExpired('agent', '2026-08-24', now)).toBe(false)
  })

  it('keeps pricing a retired group for customers still in it', () => {
    // Retiring a group must not move anyone's price; it only stops the group
    // being offered. lib/tierCatalog.js therefore returns inactive rows too.
    const opts = { enabled: true, percentByTier: { oldclub: 25 }, tiers: CATALOG }
    expect(tierDiscountPercent('oldclub', opts)).toBe(25)
  })

  it('labels a shop-created group with its own name', () => {
    expect(tierLabel('agent', 'th', CATALOG)).toBe('ตัวแทน')
    expect(tierLabel('agent', 'th')).toBe('ลูกค้าทั่วไป')
  })

  it('falls back to the built-in groups when the catalog is unusable', () => {
    // An empty array means the read failed, not that the shop deleted every
    // group — 'general' is not deletable. Answering 0% for everyone here
    // would be a silent, shop-wide price change.
    for (const tiers of [[], null, undefined]) {
      expect(tierDiscountPercent('condo', { enabled: true, tiers })).toBe(15)
    }
  })

  it('survives a catalog with no general row', () => {
    const odd = [{ key: 'condo', percent: 15, labelTh: 'คอนโด', labelEn: 'Condo', staffOnly: false }]
    expect(normalizeTier('nope', odd)).toBe('general')
    expect(() => tierDiscountPercent('nope', { enabled: true, tiers: odd })).not.toThrow()
  })
})
