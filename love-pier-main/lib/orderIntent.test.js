import { describe, expect, it } from 'vitest'
import { classifyCustomerText } from './orderIntent'

describe('classifyCustomerText — order entry', () => {
  it('matches the exact string the rich menu sends', () => {
    expect(classifyCustomerText('ขอสั่งเดลิเวอรี')).toBe('order-entry')
  })

  it('matches the hand-typed variants and the ไม้เอก spelling', () => {
    for (const s of ['สั่งเดลิเวอรี', 'ขอสั่งเดลิเวอรี่', 'สั่งอาหาร', 'ขอสั่งอาหาร', 'สั่งเลย']) {
      expect(classifyCustomerText(s), s).toBe('order-entry')
    }
  })

  it('forgives polite particles and stray spaces', () => {
    expect(classifyCustomerText('สั่งอาหารค่ะ')).toBe('order-entry')
    expect(classifyCustomerText('สั่งอาหารครับ')).toBe('order-entry')
    expect(classifyCustomerText('  สั่งเลย  ')).toBe('order-entry')
    expect(classifyCustomerText('สั่ง อาหาร นะคะ')).toBe('order-entry')
  })
})

describe('classifyCustomerText — must NOT hijack a real question', () => {
  // The reason this is an allowlist and not a /สั่ง/ regex. Each of these is a
  // sentence a person should answer; a canned card would be wrong for all of
  // them, and the customer would have been silently intercepted.
  it.each([
    'สั่งไปแล้วนะคะ',
    'สั่งผิด',
    'สั่งเพิ่มได้ไหม',
    'สั่งไว้เมื่อวานยังไม่ได้เลยค่ะ',
    'ยกเลิกที่สั่งไปได้ไหม',
    'สั่งขั้นต่ำเท่าไหร่',
  ])('stays silent for %s', (text) => {
    expect(classifyCustomerText(text)).toBe(null)
  })

  it('stays silent for ordinary chatter', () => {
    expect(classifyCustomerText('ร้านเปิดกี่โมง')).toBe(null)
    expect(classifyCustomerText('')).toBe(null)
    expect(classifyCustomerText(undefined)).toBe(null)
  })
})

describe('classifyCustomerText — status, and no collision', () => {
  it('routes status requests to status', () => {
    expect(classifyCustomerText('เช็กสถานะออเดอร์')).toBe('status')
    expect(classifyCustomerText('ขอติดตามออเดอร์หน่อย')).toBe('status')
    expect(classifyCustomerText('เช็คสถานะ order')).toBe('status')
  })

  it('does not answer an English-only request — the status words are Thai', () => {
    // Documenting the shipped behaviour rather than asserting a wish: the LINE
    // side is deliberately Thai-only, so "check my order" reaches a human.
    expect(classifyCustomerText('check my order')).toBe(null)
  })

  it('needs BOTH a status word and an order word', () => {
    expect(classifyCustomerText('เช็กบิล')).toBe(null)
    expect(classifyCustomerText('ออเดอร์')).toBe(null)
  })

  it('prefers status when a string could read as both', () => {
    // Status is the more specific ask, so it wins the tie.
    expect(classifyCustomerText('เช็กสถานะออเดอร์ที่สั่งอาหาร')).toBe('status')
  })
})
