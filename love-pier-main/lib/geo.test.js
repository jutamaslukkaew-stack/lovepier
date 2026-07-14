import { describe, expect, it } from 'vitest'
import { haversineKm } from './geo'

describe('haversineKm', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineKm(13.2537115, 100.9287388, 13.2537115, 100.9287388)).toBe(0)
  })

  it('matches a known reference distance (Bangkok ↔ Chiang Mai ≈ 583 km)', () => {
    // Bangkok (13.7563, 100.5018) to Chiang Mai (18.7883, 98.9853)
    const km = haversineKm(13.7563, 100.5018, 18.7883, 98.9853)
    expect(km).toBeGreaterThan(570)
    expect(km).toBeLessThan(600)
  })

  it('is symmetric — direction does not matter', () => {
    const a = haversineKm(13.2537115, 100.9287388, 13.2717, 100.9287)
    const b = haversineKm(13.2717, 100.9287, 13.2537115, 100.9287388)
    expect(a).toBeCloseTo(b, 6)
  })

  it('scales roughly linearly for small north-south offsets', () => {
    // 1 degree of latitude ≈ 111 km
    const km = haversineKm(13.0, 100.9, 14.0, 100.9)
    expect(km).toBeGreaterThan(108)
    expect(km).toBeLessThan(114)
  })
})
