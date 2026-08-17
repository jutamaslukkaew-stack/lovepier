import { describe, expect, it } from 'vitest'
import { calcOrderDiscountAndPoints } from './points'

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
