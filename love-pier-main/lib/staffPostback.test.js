import { describe, expect, it } from 'vitest'
import { decodeStaffPostback } from './staffPostback'

// No env snapshotting needed here (unlike lineMessaging.test.js): the targets
// are an argument, precisely so this stays a pure function.
const STAFF = ['Cstaffgroup', 'Uowner']

const tap = (over = {}) =>
  decodeStaffPostback({
    rawData: 'act=status&status=done&orderNo=LP260901-2076',
    senderId: 'Uowner',
    chatId: 'Cstaffgroup',
    notifyTargets: STAFF,
    ...over,
  })

describe('decodeStaffPostback', () => {
  it('accepts a staff tap and hands back the Thai label', () => {
    expect(tap()).toEqual({
      kind: 'ok',
      orderNo: 'LP260901-2076',
      status: 'done',
      label: 'พร้อมแล้ว',
    })
  })

  it('authorizes on the chat alone — LINE omits source.userId in some groups', () => {
    expect(tap({ senderId: undefined }).kind).toBe('ok')
  })

  it('authorizes on the sender alone, for a card forwarded to their 1:1 chat', () => {
    expect(tap({ chatId: 'Cotherplace' }).kind).toBe('ok')
  })

  it('refuses a tap from a chat and sender that are both unknown', () => {
    expect(tap({ senderId: 'Ucustomer', chatId: 'Ucustomer' }).kind).toBe('unauthorized')
  })

  it('refuses everything when LINE_ORDER_NOTIFY_TO was never set', () => {
    // The 2026-09-01 bug: with no targets the buttons cannot work, and before
    // this returned a kind the tapper saw nothing at all.
    expect(tap({ notifyTargets: [] }).kind).toBe('unauthorized')
  })

  it('ignores a postback that is not ours, so a future rich menu stays quiet', () => {
    expect(tap({ rawData: 'act=menu&page=2' })).toEqual({ kind: 'ignore' })
    expect(tap({ rawData: '' })).toEqual({ kind: 'ignore' })
  })

  it('rejects a payload with no order number', () => {
    expect(tap({ rawData: 'act=status&status=done' }).kind).toBe('bad-payload')
    expect(tap({ rawData: 'act=status&status=done&orderNo=  ' }).kind).toBe('bad-payload')
  })

  it('rejects paid — payment is confirmed by slip verification, never a button', () => {
    expect(tap({ rawData: 'act=status&status=paid&orderNo=LP1' }).kind).toBe('bad-payload')
  })

  it('rejects pending — a card cannot un-do a step', () => {
    expect(tap({ rawData: 'act=status&status=pending&orderNo=LP1' }).kind).toBe('bad-payload')
  })

  it('checks the payload before authorization, so a customer never sees the staff refusal', () => {
    // A non-status postback from an unknown chat is 'ignore', not
    // 'unauthorized' — the refusal copy is staff-only wording.
    expect(tap({ rawData: 'act=menu', senderId: 'Ucustomer', chatId: 'Ucustomer' }).kind).toBe('ignore')
  })

  it('decodes a percent-encoded order number', () => {
    expect(tap({ rawData: `act=status&status=preparing&orderNo=${encodeURIComponent('LP 260901/2076')}` }))
      .toMatchObject({ kind: 'ok', orderNo: 'LP 260901/2076', label: 'กำลังทำ' })
  })
})
