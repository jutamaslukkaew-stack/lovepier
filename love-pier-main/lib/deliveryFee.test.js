import { describe, expect, it } from 'vitest'
import { calcDeliveryFee, DEFAULT_DELIVERY_FEE_TIERS } from './deliveryFee'

describe('calcDeliveryFee', () => {
  it('is 0 when distance is unknown', () => {
    expect(calcDeliveryFee(null)).toBe(0)
    expect(calcDeliveryFee(undefined)).toBe(0)
    expect(calcDeliveryFee(NaN)).toBe(0)
  })

  it('uses the default tiers (20/30/40/50 baht per 1km band) when none are given', () => {
    expect(calcDeliveryFee(0.4)).toBe(20)
    expect(calcDeliveryFee(1)).toBe(20)
    expect(calcDeliveryFee(1.8)).toBe(20)
    expect(calcDeliveryFee(2)).toBe(20)
    expect(calcDeliveryFee(2.1)).toBe(30)
    expect(calcDeliveryFee(3)).toBe(30)
    expect(calcDeliveryFee(3.5)).toBe(40)
    expect(calcDeliveryFee(4)).toBe(40)
    expect(calcDeliveryFee(4.9)).toBe(50)
    expect(calcDeliveryFee(5)).toBe(50)
  })

  it('keeps charging the last tier fee beyond its upper bound, rather than falling through to 0', () => {
    expect(calcDeliveryFee(8)).toBe(50)
  })

  it('never goes negative for 0 distance', () => {
    expect(calcDeliveryFee(0)).toBe(20)
  })

  it('clamps negative distance to 0 km of travel', () => {
    expect(calcDeliveryFee(-5)).toBe(20)
  })

  it('accepts a custom tier list', () => {
    const tiers = [{ upToKm: 5, fee: 15 }, { upToKm: 10, fee: 25 }]
    expect(calcDeliveryFee(3, { tiers })).toBe(15)
    expect(calcDeliveryFee(7, { tiers })).toBe(25)
    expect(calcDeliveryFee(20, { tiers })).toBe(25)
  })

  it('sorts an out-of-order tier list before matching', () => {
    const tiers = [{ upToKm: 10, fee: 25 }, { upToKm: 5, fee: 15 }]
    expect(calcDeliveryFee(3, { tiers })).toBe(15)
  })

  it('exports the default tiers for reuse (e.g. seeding settings)', () => {
    expect(DEFAULT_DELIVERY_FEE_TIERS).toEqual([
      { upToKm: 2, fee: 20 },
      { upToKm: 3, fee: 30 },
      { upToKm: 4, fee: 40 },
      { upToKm: 5, fee: 50 },
    ])
  })
})
