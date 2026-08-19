import { describe, expect, it } from 'vitest'
import { calcInStoreVisit, calcOrderDiscountAndPoints } from './points'

describe('calcOrderDiscountAndPoints', () => {
  it('does not award or redeem points without a LINE account', () => {
    expect(calcOrderDiscountAndPoints(300, { hasLineId: false, pointsRedeemed: 50 })).toEqual({ discountAmount: 0, pointsRedeemed: 0, pointsEarned: 0 })
  })

  it('awards 5 points for every ฿100 spent', () => {
    expect(calcOrderDiscountAndPoints(100, { hasLineId: true })).toEqual({ discountAmount: 0, pointsRedeemed: 0, pointsEarned: 5 })
  })

  it('floors incomplete earning bands', () => {
    expect(calcOrderDiscountAndPoints(119, { hasLineId: true }).pointsEarned).toBe(5)
  })

  it('redeems one point as one baht and earns on the remaining spend', () => {
    expect(calcOrderDiscountAndPoints(300, { hasLineId: true, pointsRedeemed: 50 })).toEqual({ discountAmount: 0, pointsRedeemed: 50, pointsEarned: 12 })
  })

  it('caps redemption while leaving ฿1 for payment verification', () => {
    expect(calcOrderDiscountAndPoints(80, { hasLineId: true, pointsRedeemed: 500 })).toEqual({ discountAmount: 0, pointsRedeemed: 79, pointsEarned: 0 })
  })

  it('supports a configured earning band', () => {
    expect(calcOrderDiscountAndPoints(500, { hasLineId: true, pointsPerBaht: 50 }).pointsEarned).toBe(10)
  })

  it('can disable earning without disabling redemption', () => {
    expect(calcOrderDiscountAndPoints(100, { hasLineId: true, pointsPerBaht: 0, pointsRedeemed: 20 })).toEqual({ discountAmount: 0, pointsRedeemed: 20, pointsEarned: 0 })
  })

  it('treats an invalid subtotal as zero', () => {
    expect(calcOrderDiscountAndPoints(null, { hasLineId: true })).toEqual({ discountAmount: 0, pointsRedeemed: 0, pointsEarned: 0 })
  })
})

describe('calcInStoreVisit', () => {
  const DEFAULTS = { discountPercent: 10, pointsPerBaht: 1 }

  it('matches the shop’s worked example: ฿700 → ฿630 and 630 points', () => {
    expect(calcInStoreVisit(700, DEFAULTS)).toEqual({
      grossAmount: 700,
      discountAmount: 70,
      netAmount: 630,
      pointsEarned: 630,
    })
  })

  it('earns on what is actually paid, not the pre-discount bill', () => {
    expect(calcInStoreVisit(1000, DEFAULTS).pointsEarned).toBe(900)
  })

  it('rounds the discount down so the shop never overgives', () => {
    // 10% of 705 is 70.5 — the customer pays 635, not 634.
    expect(calcInStoreVisit(705, DEFAULTS)).toMatchObject({ discountAmount: 70, netAmount: 635 })
  })

  it('charges full price when the discount is turned off', () => {
    expect(calcInStoreVisit(700, { discountPercent: 0, pointsPerBaht: 1 })).toMatchObject({
      discountAmount: 0,
      netAmount: 700,
      pointsEarned: 700,
    })
  })

  it('supports a slower earning band', () => {
    expect(calcInStoreVisit(700, { discountPercent: 10, pointsPerBaht: 20 }).pointsEarned).toBe(31)
  })

  it('can disable earning without disabling the discount', () => {
    expect(calcInStoreVisit(700, { discountPercent: 10, pointsPerBaht: 0 })).toMatchObject({
      netAmount: 630,
      pointsEarned: 0,
    })
  })

  it('clamps a nonsense discount percentage instead of paying the customer', () => {
    expect(calcInStoreVisit(700, { discountPercent: 500, pointsPerBaht: 1 })).toMatchObject({
      discountAmount: 700,
      netAmount: 0,
      pointsEarned: 0,
    })
  })

  it('treats an invalid or negative amount as zero', () => {
    expect(calcInStoreVisit(null, DEFAULTS).netAmount).toBe(0)
    expect(calcInStoreVisit(-500, DEFAULTS).netAmount).toBe(0)
  })
})
