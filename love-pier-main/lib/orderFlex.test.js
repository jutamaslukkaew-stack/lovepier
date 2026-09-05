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

describe('buildOrderEntryFlex — outside opening hours', () => {
  const CLOSED = {
    open: false, accepting: false, reason: 'after-close',
    opensAt: '09:00', closesAt: '18:00', lastOrderAt: '18:00',
    nextOpenYmd: '2026-09-05', nextOpenLabel: 'ส. 5 ก.ย. 09:00',
  }

  it('does not claim to be ready for orders when the shop is shut', () => {
    // The whole reason the card reads the hours: answering "พร้อมรับออเดอร์
    // แล้ว" at 2am is how the shop gets an order nobody can cook.
    const texts = textsOf(buildOrderEntryFlex({ orderUrl: URL, shopState: CLOSED }))
    expect(texts).toContain('ตอนนี้ร้านปิดอยู่')
    expect(texts).not.toContain('พร้อมรับออเดอร์แล้ว')
  })

  it('says when it opens again', () => {
    const promise = textsOf(buildOrderEntryFlex({ orderUrl: URL, shopState: CLOSED }))
      .find((t) => t.includes('เปิดอีกครั้ง'))
    expect(promise).toContain('ส. 5 ก.ย. 09:00')
  })

  it('sends the tap somewhere that works instead of a flow that will refuse it', () => {
    const [button] = buttonsOf(buildOrderEntryFlex({ orderUrl: URL, shopState: CLOSED }))
    expect(button.label).toBe('ดูเมนู')
    expect(button.uri).not.toBe(URL)
    expect(button.uri).toMatch(/\/menu$/)
  })

  it('distinguishes "closed" from "we stopped taking orders for today"', () => {
    const lastOrder = { ...CLOSED, open: true, reason: 'last-order-passed', lastOrderAt: '17:30' }
    const texts = textsOf(buildOrderEntryFlex({ orderUrl: URL, shopState: lastOrder }))
    expect(texts).toContain('วันนี้ปิดรับออเดอร์แล้ว')
    expect(texts.some((t) => t.includes('17:30'))).toBe(true)
  })

  it('still promises the in-chat updates while closed', () => {
    expect(textsOf(buildOrderEntryFlex({ orderUrl: URL, shopState: CLOSED })).some((t) => t.includes('ใบเสร็จ')))
      .toBe(true)
  })

  it('behaves exactly as before when no shop state is supplied', () => {
    // Any caller without the settings must keep working, not fall shut.
    const card = buildOrderEntryFlex({ orderUrl: URL })
    expect(textsOf(card)).toContain('พร้อมรับออเดอร์แล้ว')
    expect(buttonsOf(card)[0].label).toBe('สั่งเลย')
  })

  it('is open for business when the state says accepting', () => {
    const open = { ...CLOSED, open: true, accepting: true, reason: 'open' }
    expect(textsOf(buildOrderEntryFlex({ orderUrl: URL, shopState: open }))).toContain('พร้อมรับออเดอร์แล้ว')
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

describe('buildSlipNeedsReviewFlex', () => {
  it('names the order and the amount the shop should have received', async () => {
    const { buildSlipNeedsReviewFlex } = await import('./orderFlex')
    const texts = textsOf(buildSlipNeedsReviewFlex({ orderNo: 'LP260905-1234', total: 285 }))
    expect(texts).toContain('LP260905-1234')
    expect(texts.some((t) => t.includes('285'))).toBe(true)
  })

  it('carries the machine reason when there is one', async () => {
    const { buildSlipNeedsReviewFlex } = await import('./orderFlex')
    const texts = textsOf(buildSlipNeedsReviewFlex({ orderNo: 'LP1', total: 100, reason: 'amount mismatch: slip 90 vs order 100' }))
    expect(texts.some((t) => t.includes('amount mismatch'))).toBe(true)
  })

  it('sends staff to the admin orders page and offers no one-tap paid button', async () => {
    const { buildSlipNeedsReviewFlex } = await import('./orderFlex')
    const actions = buttonsOf(buildSlipNeedsReviewFlex({ orderNo: 'LP1', total: 100 }))
    // Confirming payment stays a deliberate look at the slip — the same rule
    // lib/staffPostback.js keeps for the LINE quick-actions.
    expect(actions.every((a) => a.type === 'uri')).toBe(true)
    expect(actions[0].uri).toMatch(/\/admin\/orders$/)
  })
})

describe('buildPaymentConfirmedFlex — the customer’s route to their points', () => {
  // Asserted on the label, not the URL: the destination is a liff.line.me
  // link when the shop has a /rewards LIFF app and the plain page when it
  // does not, and both are correct.
  const rewardsButton = (card) => buttonsOf(card).find((a) => a.label === 'ดูคะแนนสะสม')

  it('offers the rewards page when points were actually banked', async () => {
    const { buildPaymentConfirmedFlex } = await import('./orderFlex')
    const action = rewardsButton(buildPaymentConfirmedFlex({ orderNo: 'LP1', total: 300, pointsEarned: 15 }))
    expect(action?.type).toBe('uri')
    expect(action.uri).toMatch(/\/rewards$|^https:\/\/liff\.line\.me\//)
  })

  it('leaves it off when the order earned nothing', async () => {
    const { buildPaymentConfirmedFlex } = await import('./orderFlex')
    expect(rewardsButton(buildPaymentConfirmedFlex({ orderNo: 'LP1', total: 15, pointsEarned: 0 }))).toBeUndefined()
  })

  it('keeps the staff copy free of it', async () => {
    const { buildPaymentConfirmedFlex } = await import('./orderFlex')
    expect(rewardsButton(buildPaymentConfirmedFlex({ orderNo: 'LP1', total: 300, pointsEarned: 15, withStaffActions: true }))).toBeUndefined()
  })
})
