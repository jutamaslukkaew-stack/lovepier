import { describe, expect, it, vi } from 'vitest'

// Only noticeFor is under test — it is deliberately pure so it can be reached
// without standing up Drizzle. The module still imports ./db at load time, so
// stub that (and the other server-only side-effect modules) first.
vi.mock('./db', () => ({ db: {} }))
vi.mock('./db/schema', () => ({ orders: {} }))
vi.mock('./lineMessaging', () => ({ pushToUser: vi.fn() }))
vi.mock('./orderFlex', () => ({ buildOrderStatusFlex: vi.fn() }))
vi.mock('./pointsAward', () => ({ awardPoints: vi.fn() }))

const { noticeFor } = await import('./orderStatusUpdate')
const { IN_STORE_METHOD } = await import('./inStore')

const card = { type: 'flex' }

describe('noticeFor', () => {
  it('says sent when LINE accepted the push', () => {
    expect(noticeFor({ lineUserId: 'U1', deliveryMethod: 'delivery', message: card, pushed: { ok: true } }))
      .toBe('sent')
  })

  it('distinguishes a blocked customer from a failed send', () => {
    // This is the whole point of the enum. Both used to surface to staff as
    // "ออเดอร์นี้ไม่มีบัญชี LINE" — so nobody followed up on a customer who
    // was never actually told.
    expect(noticeFor({ lineUserId: 'U1', deliveryMethod: 'delivery', message: card, pushed: { ok: false, status: 403 } }))
      .toBe('blocked')
    expect(noticeFor({ lineUserId: 'U1', deliveryMethod: 'delivery', message: card, pushed: { ok: false, status: 500 } }))
      .toBe('failed')
    expect(noticeFor({ lineUserId: 'U1', deliveryMethod: 'delivery', message: card, pushed: { ok: false } }))
      .toBe('failed')
  })

  it('says no-line only when the order really has no LINE account', () => {
    expect(noticeFor({ lineUserId: null, deliveryMethod: 'delivery', message: card, pushed: null }))
      .toBe('no-line')
  })

  it('treats an in-store sale as deliberately not notified', () => {
    // The customer already has a paper receipt from the counter.
    expect(noticeFor({ lineUserId: 'U1', deliveryMethod: IN_STORE_METHOD, message: null, pushed: null }))
      .toBe('in-store')
  })

  it('says no-card when this status has no customer-facing card', () => {
    expect(noticeFor({ lineUserId: 'U1', deliveryMethod: 'pickup', message: null, pushed: null }))
      .toBe('no-card')
  })

  it('checks no-line before in-store, so a walk-in without LINE reads as no-line', () => {
    expect(noticeFor({ lineUserId: null, deliveryMethod: IN_STORE_METHOD, message: null, pushed: null }))
      .toBe('no-line')
  })
})
