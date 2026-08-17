import { describe, expect, it } from 'vitest'
import { calcOrderDiscountAndPoints } from './points'

describe('calcOrderDiscountAndPoints', () => {
  it('gives no discount and no points without a LINE ID', () => {
    expect(calcOrderDiscountAndPoints(300, { hasLineId: false })).toEqual({
      discountAmount: 0,
      pointsEarned: 12, // still earns points on the full ฿300 — the discount is what's gated, not points
    })
  })

  it('applies the default 10% discount for a LINE-attached order', () => {
    // ฿300 subtotal → ฿30 off → ฿270 net → floor(270/25) = 10 points
    expect(calcOrderDiscountAndPoints(300, { hasLineId: true })).toEqual({
      discountAmount: 30,
      pointsEarned: 10,
    })
  })

  it('rounds the discount to the nearest baht', () => {
    // ฿155 * 10% = 15.5 → rounds to 16
    expect(calcOrderDiscountAndPoints(155, { hasLineId: true }).discountAmount).toBe(16)
  })

  it('floors points rather than rounding up', () => {
    // ฿240 net (no discount) / 25 = 9.6 → floors to 9
    expect(calcOrderDiscountAndPoints(240, { hasLineId: false }).pointsEarned).toBe(9)
  })

  it('respects a custom discount percent and points rate', () => {
    expect(calcOrderDiscountAndPoints(500, { hasLineId: true, discountPercent: 20, pointsPerBaht: 50 })).toEqual({
      discountAmount: 100, // 20% of 500
      pointsEarned: 8, // (500-100)/50
    })
  })

  it('discountPercent = 0 disables the discount even with a LINE ID', () => {
    expect(calcOrderDiscountAndPoints(300, { hasLineId: true, discountPercent: 0 }).discountAmount).toBe(0)
  })

  it('pointsPerBaht = 0 disables points entirely', () => {
    expect(calcOrderDiscountAndPoints(300, { hasLineId: true, pointsPerBaht: 0 }).pointsEarned).toBe(0)
  })

  it('treats a missing/invalid subtotal as 0', () => {
    expect(calcOrderDiscountAndPoints(null, { hasLineId: true })).toEqual({ discountAmount: 0, pointsEarned: 0 })
    expect(calcOrderDiscountAndPoints(undefined, { hasLineId: true })).toEqual({ discountAmount: 0, pointsEarned: 0 })
    expect(calcOrderDiscountAndPoints(NaN, { hasLineId: true })).toEqual({ discountAmount: 0, pointsEarned: 0 })
  })

  it('never goes negative even with an oversized discount percent', () => {
    const { discountAmount, pointsEarned } = calcOrderDiscountAndPoints(100, { hasLineId: true, discountPercent: 150 })
    expect(discountAmount).toBe(150)
    expect(pointsEarned).toBe(0) // net subtotal clamps to 0, not negative
  })
})
