import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REFERRAL_MONTHS,
  DEFAULT_REFERRAL_PERCENT,
  isPaidOrder,
  isWithinReferralWindow,
  referralFeeForCustomer,
  referralFeeForOrder,
  referralWindowEnd,
} from './referrals'

const paid = (over = {}) => ({
  status: 'paid', itemsSubtotal: 1000, discountAmount: 0, deliveryFee: 50,
  pointsRedeemed: 0, createdAt: '2026-09-01T00:00:00.000Z', ...over,
})

describe('which orders count', () => {
  it('counts every status that means the transfer was verified', () => {
    for (const status of ['paid', 'preparing', 'done']) {
      expect(isPaidOrder({ status })).toBe(true)
    }
  })

  it('ignores orders that were never paid for', () => {
    // The plan is explicit: "นับเฉพาะออเดอร์ที่ยืนยันการชำระเงินแล้ว".
    expect(isPaidOrder({ status: 'pending' })).toBe(false)
    expect(isPaidOrder({ status: 'cancelled' })).toBe(false)
    expect(referralFeeForOrder(paid({ status: 'cancelled' }))).toBe(0)
  })
})

describe('what one order is worth', () => {
  it('takes the percentage off food after discount', () => {
    expect(referralFeeForOrder(paid(), 5)).toBe(50)
    expect(referralFeeForOrder(paid({ discountAmount: 200 }), 5)).toBe(40)
  })

  it('never pays on the delivery fee', () => {
    // Mirrors the existing rule that a member discount never touches delivery.
    const cheapDelivery = referralFeeForOrder(paid({ deliveryFee: 0 }), 5)
    const dearDelivery = referralFeeForOrder(paid({ deliveryFee: 500 }), 5)
    expect(cheapDelivery).toBe(dearDelivery)
  })

  it('does not let a points balance erase the agent fee', () => {
    // Documented assumption: points are a payment instrument the customer
    // already earned, not a reduction in what the food sold for.
    expect(referralFeeForOrder(paid({ pointsRedeemed: 900 }), 5)).toBe(50)
  })

  it('floors rather than rounds, so the shop never overpays', () => {
    expect(referralFeeForOrder(paid({ itemsSubtotal: 199 }), 5)).toBe(9) // 9.95
  })

  it('cannot go negative or over 100%', () => {
    expect(referralFeeForOrder(paid({ discountAmount: 5000 }), 5)).toBe(0)
    expect(referralFeeForOrder(paid(), -5)).toBe(0)
    expect(referralFeeForOrder(paid(), 500)).toBe(1000)
  })
})

describe('the six-month window', () => {
  it('counts from recruitment, not from the first order', () => {
    // "นาฬิกา 6 เดือนเริ่มนับตั้งแต่วันที่ลูกค้าเข้าระบบ ไม่ใช่วันที่สั่งครั้งแรก"
    expect(referralWindowEnd('2026-03-15T00:00:00.000Z').toISOString())
      .toBe('2026-09-15T00:00:00.000Z')
  })

  it('does not spill a month-end date into the following month', () => {
    // Naive setMonth() turns 31 Aug + 6 into 3 March.
    expect(referralWindowEnd('2026-08-31T00:00:00.000Z').toISOString())
      .toBe('2027-02-28T00:00:00.000Z')
  })

  it('excludes an order placed before the customer was recruited', () => {
    // A customer can be recruited long after their first order; the agent
    // does not get paid for business that predates them.
    expect(isWithinReferralWindow('2026-03-15T00:00:00.000Z', '2026-01-01T00:00:00.000Z')).toBe(false)
  })

  it('is half-open at the far end', () => {
    const from = '2026-03-15T00:00:00.000Z'
    expect(isWithinReferralWindow(from, '2026-09-14T23:59:59.000Z')).toBe(true)
    expect(isWithinReferralWindow(from, '2026-09-15T00:00:00.000Z')).toBe(false)
  })

  it('pays nothing for a customer with no referral date', () => {
    expect(isWithinReferralWindow(null, '2026-09-01T00:00:00.000Z')).toBe(false)
  })

  it('honours a shop-configured window length', () => {
    expect(isWithinReferralWindow('2026-03-15T00:00:00.000Z', '2026-09-01T00:00:00.000Z', 3)).toBe(false)
    expect(isWithinReferralWindow('2026-03-15T00:00:00.000Z', '2026-09-01T00:00:00.000Z', 12)).toBe(true)
  })
})

describe('totalling one downline customer', () => {
  const downline = { referredAt: '2026-03-15T00:00:00.000Z' }

  it('adds up only the paid, in-window orders', () => {
    const orders = [
      paid({ createdAt: '2026-04-01T00:00:00.000Z' }),                       // in
      paid({ createdAt: '2026-04-02T00:00:00.000Z', status: 'pending' }),    // unpaid
      paid({ createdAt: '2026-01-01T00:00:00.000Z' }),                       // before
      paid({ createdAt: '2027-01-01T00:00:00.000Z' }),                       // after
      paid({ createdAt: '2026-09-14T00:00:00.000Z', itemsSubtotal: 500 }),   // in
    ]
    expect(referralFeeForCustomer(downline, orders, { percent: 5 })).toEqual({
      orderCount: 2,
      fee: 50 + 25,
    })
  })

  it('handles a customer with no orders at all', () => {
    expect(referralFeeForCustomer(downline, [], { percent: 5 })).toEqual({ orderCount: 0, fee: 0 })
    expect(referralFeeForCustomer(downline, undefined, { percent: 5 })).toEqual({ orderCount: 0, fee: 0 })
  })

  it('defaults to the plan-documented 5% over 6 months', () => {
    expect(DEFAULT_REFERRAL_PERCENT).toBe(5)
    expect(DEFAULT_REFERRAL_MONTHS).toBe(6)
    expect(referralFeeForCustomer(downline, [paid({ createdAt: '2026-04-01T00:00:00.000Z' })]))
      .toEqual({ orderCount: 1, fee: 50 })
  })
})
