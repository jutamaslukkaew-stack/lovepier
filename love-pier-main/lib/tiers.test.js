import { describe, expect, it } from 'vitest'
import { TIERS, effectiveTier, isTierExpired, isTierKey, normalizeTier, tierDiscountPercent, tierLabel } from './tiers'

const ON = { enabled: true }

describe('normalizeTier', () => {
  it('accepts the four defined tiers', () => {
    for (const t of TIERS) expect(normalizeTier(t.key)).toBe(t.key)
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
    for (const t of TIERS) expect(tierDiscountPercent(t.key)).toBe(0)
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
    for (const t of TIERS) {
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
    expect(TIERS.filter((t) => t.staffOnly).map((t) => t.key)).toEqual(['scc', 'staff'])
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
