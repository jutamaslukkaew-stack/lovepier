import { describe, expect, it } from 'vitest'
import { buildOrderEntryFlex, buildWelcomeFlex } from './orderFlex'

const URL = 'https://liff.line.me/2010601364-PyUPQa7l'

// Every string a Flex bubble renders, flattened — lets a test assert on copy
// without walking LINE's nested box structure.
const textsOf = (card) => {
  const out = []
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!node || typeof node !== 'object') return
    if (node.type === 'text' && typeof node.text === 'string') out.push(node.text)
    Object.values(node).forEach(walk)
  }
  walk(card.contents)
  return out
}

const buttonsOf = (card) => {
  const out = []
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!node || typeof node !== 'object') return
    if (node.type === 'button' && node.action) out.push(node.action)
    Object.values(node).forEach(walk)
  }
  walk(card.contents)
  return out
}

describe('buildOrderEntryFlex', () => {
  const card = buildOrderEntryFlex({ orderUrl: URL })

  it('promises exactly what the customer will receive in this chat', () => {
    // This is the whole point of the card — the reason a customer should not
    // mute the OA. If this line goes, Purpose 1 goes with it.
    const promise = textsOf(card).find((t) => t.includes('ใบเสร็จ'))
    expect(promise).toBeTruthy()
    expect(promise).toContain('ยืนยันการชำระเงิน')
    expect(promise).toContain('แจ้งเมื่ออาหารพร้อม')
    expect(promise).toContain('แชทนี้')
  })

  it('breaks the Thai promise line explicitly — LINE would split it mid-word', () => {
    expect(textsOf(card).find((t) => t.includes('ใบเสร็จ'))).toContain('\n')
  })

  it('sends the customer to the order flow with the shared button label', () => {
    expect(buttonsOf(card)).toEqual([{ type: 'uri', label: 'สั่งเลย', uri: URL }])
  })

  it('does not repeat the shop name — cardHeader already prints it', () => {
    expect(textsOf(card).filter((t) => t === 'Love Pier Beach Cafe')).toHaveLength(1)
  })

  it('has an altText that stands alone on a lock screen', () => {
    expect(card.altText).toBe('พร้อมรับออเดอร์แล้ว — เลือกเมนูและสั่งได้เลย')
  })
})

describe('buildWelcomeFlex', () => {
  it('greets the customer by name when there is one', () => {
    expect(textsOf(buildWelcomeFlex({ orderUrl: URL, displayName: 'แก้ว' })))
      .toContain('สวัสดีค่ะ คุณแก้ว')
  })

  it('omits the greeting line entirely when there is no name', () => {
    expect(textsOf(buildWelcomeFlex({ orderUrl: URL, displayName: '' })).some((t) => t.startsWith('สวัสดี')))
      .toBe(false)
  })

  it('drops a long display name rather than wrapping the card to three lines', () => {
    // Truncating someone's name mid-word is worse than not using it, and the
    // card must not scroll.
    const long = 'ชื่อยาวมากเกินยี่สิบตัวอักษรแน่นอนเลยครับ'
    expect(textsOf(buildWelcomeFlex({ orderUrl: URL, displayName: long })).some((t) => t.includes(long)))
      .toBe(false)
  })

  it('makes the same in-chat promise as the entry card', () => {
    expect(textsOf(buildWelcomeFlex({ orderUrl: URL, displayName: 'แก้ว' })).some((t) => t.includes('ใบเสร็จ')))
      .toBe(true)
  })

  it('teaches the typed fallback for someone who arrived from a QR code', () => {
    expect(textsOf(buildWelcomeFlex({ orderUrl: URL, displayName: '' })).some((t) => t.includes('เช็กสถานะออเดอร์')))
      .toBe(true)
  })

  it('ends at the order flow', () => {
    expect(buttonsOf(buildWelcomeFlex({ orderUrl: URL, displayName: 'แก้ว' })))
      .toEqual([{ type: 'uri', label: 'สั่งเลย', uri: URL }])
  })
})

describe('the two cards agree with lib/orderIntent.js and ORDER_SETUP.md', () => {
  it('teaches a status phrase the matcher actually accepts', async () => {
    const { classifyCustomerText } = await import('./orderIntent')
    const hint = textsOf(buildWelcomeFlex({ orderUrl: URL, displayName: '' }))
      .find((t) => t.includes('เช็กสถานะออเดอร์'))
    // Pull the quoted phrase out of the hint and check the bot would answer it.
    const quoted = hint.match(/"([^"]+)"/)[1]
    expect(classifyCustomerText(quoted)).toBe('status')
  })
})
