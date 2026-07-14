import { describe, expect, it } from 'vitest'
import { calcDeliveryFee } from './deliveryFee'

describe('calcDeliveryFee', () => {
  it('is 0 when distance is unknown', () => {
    expect(calcDeliveryFee(null, { baseFee: 20, perKmRate: 5 })).toBe(0)
    expect(calcDeliveryFee(undefined, { baseFee: 20, perKmRate: 5 })).toBe(0)
    expect(calcDeliveryFee(NaN, { baseFee: 20, perKmRate: 5 })).toBe(0)
  })

  it('is 0 when both base fee and per-km rate are unset', () => {
    expect(calcDeliveryFee(3.4)).toBe(0)
  })

  it('applies base fee + distance × rate, rounded to the nearest baht', () => {
    // 20 + 3.4 * 10 = 54
    expect(calcDeliveryFee(3.4, { baseFee: 20, perKmRate: 10 })).toBe(54)
  })

  it('rounds to the nearest baht', () => {
    // 0 + 2.5 * 3 = 7.5 → rounds to 8
    expect(calcDeliveryFee(2.5, { baseFee: 0, perKmRate: 3 })).toBe(8)
  })

  it('never goes negative for 0 distance', () => {
    expect(calcDeliveryFee(0, { baseFee: 15, perKmRate: 5 })).toBe(15)
  })

  it('clamps negative distance to 0 km of travel', () => {
    expect(calcDeliveryFee(-5, { baseFee: 10, perKmRate: 5 })).toBe(10)
  })
})
