import { describe, expect, it } from 'vitest'
import { calcInStoreVisit, calcOrderDiscountAndPoints } from './points'

describe('calcOrderDiscountAndPoints', () => {
  it('does not award or redeem points without a LINE account', () => {
    expect(calcOrderDiscountAndPoints(300, { hasLineId: false, pointsRedeemed: 50 })).toEqual({ discountAmount: 0, discountPercent: 0, pointsRedeemed: 0, pointsEarned: 0 })
  })

  it('awards 5 points for every ฿100 spent', () => {
    expect(calcOrderDiscountAndPoints(100, { hasLineId: true })).toEqual({ discountAmount: 0, discountPercent: 0, pointsRedeemed: 0, pointsEarned: 5 })
  })

  it('floors incomplete earning bands', () => {
    expect(calcOrderDiscountAndPoints(119, { hasLineId: true }).pointsEarned).toBe(5)
  })

  it('redeems one point as one baht and earns on the remaining spend', () => {
    expect(calcOrderDiscountAndPoints(300, { hasLineId: true, pointsRedeemed: 50 })).toEqual({ discountAmount: 0, discountPercent: 0, pointsRedeemed: 50, pointsEarned: 12 })
  })

  it('caps redemption while leaving ฿1 for payment verification', () => {
    expect(calcOrderDiscountAndPoints(80, { hasLineId: true, pointsRedeemed: 500 })).toEqual({ discountAmount: 0, discountPercent: 0, pointsRedeemed: 79, pointsEarned: 0 })
  })

  it('supports a configured earning band', () => {
    expect(calcOrderDiscountAndPoints(500, { hasLineId: true, pointsPerBaht: 50 }).pointsEarned).toBe(10)
  })

  it('can disable earning without disabling redemption', () => {
    expect(calcOrderDiscountAndPoints(100, { hasLineId: true, pointsPerBaht: 0, pointsRedeemed: 20 })).toEqual({ discountAmount: 0, discountPercent: 0, pointsRedeemed: 20, pointsEarned: 0 })
  })

  it('treats an invalid subtotal as zero', () => {
    expect(calcOrderDiscountAndPoints(null, { hasLineId: true })).toEqual({ discountAmount: 0, discountPercent: 0, pointsRedeemed: 0, pointsEarned: 0 })
  })
})

describe('calcOrderDiscountAndPoints — tier discount', () => {
  it('takes the tier percentage off the food subtotal', () => {
    // General 10% on ฿600: pays ฿540, earns on the ฿540.
    expect(calcOrderDiscountAndPoints(600, { hasLineId: true, discountPercent: 10 })).toEqual({
      discountAmount: 60,
      discountPercent: 10,
      pointsRedeemed: 0,
      pointsEarned: 27,
    })
  })

  it('applies each persona rate from the journey document', () => {
    const at = (pct) => calcOrderDiscountAndPoints(1000, { hasLineId: true, discountPercent: pct })
    expect(at(10).discountAmount).toBe(100) // ลูกค้าทั่วไป
    expect(at(15).discountAmount).toBe(150) // คอนโด / แนะนำพิเศษ
    expect(at(50).discountAmount).toBe(500) // พนักงานในเครือ (SCC)
    expect(at(100).discountAmount).toBe(1000) // ทีมงาน
  })

  it('rounds the discount down so the shop never overgives', () => {
    // 15% of 305 is 45.75 — the customer saves ฿45, not ฿46.
    expect(calcOrderDiscountAndPoints(305, { hasLineId: true, discountPercent: 15 }).discountAmount).toBe(45)
  })

  it('gives no discount to an order with no LINE account attached', () => {
    expect(calcOrderDiscountAndPoints(600, { hasLineId: false, discountPercent: 50 })).toEqual({
      discountAmount: 0,
      discountPercent: 0,
      pointsRedeemed: 0,
      pointsEarned: 0,
    })
  })

  it('redeems points against the already-discounted amount', () => {
    // ฿600 at 50% = ฿300, then 100 points = ฿200 payable, earning 10.
    expect(calcOrderDiscountAndPoints(600, { hasLineId: true, discountPercent: 50, pointsRedeemed: 100 })).toEqual({
      discountAmount: 300,
      discountPercent: 50,
      pointsRedeemed: 100,
      pointsEarned: 10,
    })
  })

  it('leaves ฿1 payable at 100% so the slip check still has a transaction', () => {
    // The team tier is the case that would otherwise produce a ฿0 PromptPay
    // QR and an order no slip could ever confirm.
    const r = calcOrderDiscountAndPoints(600, { hasLineId: true, discountPercent: 100, pointsRedeemed: 500 })
    expect(r).toEqual({ discountAmount: 600, discountPercent: 100, pointsRedeemed: 0, pointsEarned: 0 })
  })

  it('cannot be pushed past 100% or below 0%', () => {
    expect(calcOrderDiscountAndPoints(600, { hasLineId: true, discountPercent: 500 }).discountAmount).toBe(600)
    expect(calcOrderDiscountAndPoints(600, { hasLineId: true, discountPercent: -20 }).discountAmount).toBe(0)
  })

  it('behaves exactly as before when the master switch resolves to 0%', () => {
    expect(calcOrderDiscountAndPoints(300, { hasLineId: true, discountPercent: 0, pointsRedeemed: 50 })).toEqual({
      discountAmount: 0,
      discountPercent: 0,
      pointsRedeemed: 50,
      pointsEarned: 12,
    })
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
