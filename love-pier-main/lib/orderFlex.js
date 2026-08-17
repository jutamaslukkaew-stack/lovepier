// Builds a LINE Flex Message (order-confirmation card, Tassana-style) for an order.
// Used both by liff.sendMessages() (customer side) and the Messaging API push
// (shop side), so the card looks identical whichever way it's sent.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lovepier.cafe'

function money(n) {
  return `${(Number(n) || 0).toLocaleString('th-TH')}`
}

function checkRow(label, value, action) {
  return {
    type: 'box',
    layout: 'baseline',
    margin: 'md',
    contents: [
      { type: 'text', text: label, size: 'sm', color: '#8c8c8c', flex: 0 },
      {
        type: 'text',
        text: value,
        size: 'sm',
        color: action ? '#1a73e8' : '#333333',
        align: 'end',
        wrap: true,
        ...(action ? { action } : {}),
      },
    ],
  }
}

function plainRow(label, value) {
  return {
    type: 'box',
    layout: 'baseline',
    margin: 'md',
    contents: [
      { type: 'text', text: label, size: 'sm', color: '#8c8c8c', flex: 0 },
      { type: 'text', text: value, size: 'sm', color: '#333333', align: 'end', wrap: true },
    ],
  }
}

export function buildOrderFlex({ orderNo, name, phone, address, items = [], total, deliveryFee, discountAmount, distanceKm, deliveryMethod }) {
  const orderUrl = `${SITE_URL}/order/${encodeURIComponent(orderNo)}`

  const itemRows = items.flatMap((i) => {
    const row = {
      type: 'box',
      layout: 'horizontal',
      margin: 'sm',
      contents: [
        { type: 'text', text: `${i.name}`, size: 'sm', color: '#555555', flex: 5, wrap: true },
        { type: 'text', text: `x${i.qty}`, size: 'sm', color: '#aaaaaa', flex: 1, align: 'center' },
        { type: 'text', text: `฿${money((Number(i.price) || 0) * (Number(i.qty) || 0))}`, size: 'sm', color: '#333333', flex: 3, align: 'end' },
      ],
    }
    // Structured options (see lib/menuOptions.js) — shown as a sub-line
    // alongside the free-text note, same xxs/gray treatment.
    const optionBits = [i.sweetness, i.coffeeBean].filter(Boolean).join(' · ')
    const subLines = [
      optionBits ? { type: 'text', text: optionBits, size: 'xxs', color: '#8c8c8c', margin: 'xs', wrap: true } : null,
      i.note ? { type: 'text', text: `— ${i.note}`, size: 'xxs', color: '#8c8c8c', margin: 'xs', wrap: true } : null,
    ].filter(Boolean)
    return [row, ...subLines]
  })

  const detail = [
    checkRow('ชื่อ', String(name || '-')),
    checkRow('เบอร์โทร', String(phone || '-'), phone ? { type: 'uri', label: 'call', uri: `tel:${String(phone).replace(/[^0-9+]/g, '')}` } : undefined),
    plainRow('รับอาหาร', deliveryMethod === 'pickup' ? 'รับที่ร้าน' : 'ให้ร้านจัดส่ง'),
  ]
  if (address) detail.push(plainRow('ที่อยู่', String(address)))
  if (distanceKm != null) detail.push(plainRow('ระยะส่ง', `${distanceKm} กม.`))
  detail.push(plainRow('ชำระโดย', 'QR ของร้าน'))

  const bubble = {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#3a2818',
      paddingAll: '18px',
      contents: [
        { type: 'text', text: 'รับออเดอร์แล้ว', color: '#ffffff', weight: 'bold', size: 'xl' },
        { type: 'text', text: 'Love Pier Beach Cafe', color: '#c9a96e', size: 'xs', margin: 'sm' },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        { type: 'text', text: `เลขที่ออเดอร์`, size: 'xs', color: '#aaaaaa', align: 'center' },
        { type: 'text', text: String(orderNo), weight: 'bold', size: 'xl', align: 'center', color: '#4a3520' },
        { type: 'separator', margin: 'lg' },

        // items
        { type: 'box', layout: 'vertical', margin: 'lg', contents: itemRows },
        { type: 'separator', margin: 'lg' },

        // customer details
        { type: 'box', layout: 'vertical', margin: 'sm', contents: detail },
        { type: 'separator', margin: 'lg' },

        // member discount (only when there is one)
        ...(discountAmount
          ? [plainRow('ส่วนลดสมาชิก', `-฿${money(discountAmount)}`)]
          : []),

        // delivery fee (only when there is one)
        ...(deliveryFee
          ? [plainRow('ค่าจัดส่ง', `฿${money(deliveryFee)}`)]
          : []),

        // total
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'lg',
          contents: [
            { type: 'text', text: 'ยอดชำระ', weight: 'bold', size: 'md', color: '#333333' },
            { type: 'text', text: `฿${money(total)}`, weight: 'bold', size: 'lg', color: '#4a3520', align: 'end' },
          ],
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#3a2818',
          height: 'sm',
          action: { type: 'uri', label: 'ตรวจสอบออเดอร์', uri: orderUrl },
        },
        {
          type: 'text',
          text: 'กรุณาแนบสลิปการโอนเพื่อยืนยันการชำระเงิน',
          size: 'xxs',
          color: '#aaaaaa',
          wrap: true,
          align: 'center',
        },
      ],
    },
  }

  return { type: 'flex', altText: `รับออเดอร์แล้ว ${orderNo} — รวม ฿${money(total)}`, contents: bubble }
}

// Sent right after SlipOK auto-verifies a payment (pages/api/verify-slip.js),
// so the customer sees a Love Pier-branded confirmation alongside SlipOK's own
// reply card in the LINE chat.
export function buildPaymentConfirmedFlex({ orderNo, total, pointsEarned }) {
  const orderUrl = `${SITE_URL}/order/${encodeURIComponent(orderNo)}`

  const bubble = {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#3a2818',
      paddingAll: '18px',
      contents: [
        { type: 'text', text: 'ชำระเงินสำเร็จ', color: '#ffffff', weight: 'bold', size: 'xl' },
        { type: 'text', text: 'Love Pier Beach Cafe', color: '#c9a96e', size: 'xs', margin: 'sm' },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        { type: 'text', text: 'เลขที่ออเดอร์', size: 'xs', color: '#aaaaaa', align: 'center' },
        { type: 'text', text: String(orderNo), weight: 'bold', size: 'xl', align: 'center', color: '#4a3520' },
        { type: 'separator', margin: 'lg' },
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'lg',
          contents: [
            { type: 'text', text: 'ยอดที่ชำระ', weight: 'bold', size: 'md', color: '#333333' },
            { type: 'text', text: `฿${money(total)}`, weight: 'bold', size: 'lg', color: '#4a3520', align: 'end' },
          ],
        },
        ...(pointsEarned
          ? [{
              type: 'text',
              text: `+${money(pointsEarned)} แต้มสะสม`,
              size: 'sm',
              weight: 'bold',
              color: '#b06d2b',
              align: 'center',
              margin: 'md',
            }]
          : []),
        {
          type: 'text',
          // Explicit line break — Thai has no word-spacing, so LINE's
          // auto-wrap was splitting mid-word ("ออเด" / "อร์") when this ran
          // as one long line. \n in a Flex text is honored as a real break.
          text: 'ขอบคุณที่อุดหนุน Love Pier\nกำลังเตรียมออเดอร์ให้แล้ว',
          size: 'xs',
          color: '#8c8c8c',
          wrap: true,
          margin: 'md',
          align: 'center',
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#3a2818',
          height: 'sm',
          action: { type: 'uri', label: 'ตรวจสอบออเดอร์', uri: orderUrl },
        },
      ],
    },
  }

  return { type: 'flex', altText: `ชำระเงินสำเร็จ ${orderNo} — ฿${money(total)}`, contents: bubble }
}

/**
 * Shown when a slip arrived but could NOT be auto-confirmed — a wrong amount,
 * an unreadable QR, SlipOK being unconfigured, or a slip already used. The
 * customer is told staff will check by hand, so the chat never dead-ends on
 * silence (which is what used to happen: the slip landed in the chat, the app
 * never saw it, and a human had to type a holding reply).
 *
 * Deliberately NOT styled as an error — from the customer's side they have
 * paid and done their part; the shop simply hasn't confirmed yet.
 */
export function buildSlipReceivedFlex({ orderNo, total, reason }) {
  const orderUrl = `${SITE_URL}/order/${encodeURIComponent(orderNo)}`

  const bubble = {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#3a2818',
      paddingAll: '18px',
      contents: [
        { type: 'text', text: 'ได้รับสลิปแล้ว', color: '#ffffff', weight: 'bold', size: 'xl' },
        { type: 'text', text: 'Love Pier Beach Cafe', color: '#c9a96e', size: 'xs', margin: 'sm' },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        { type: 'text', text: 'เลขที่ออเดอร์', size: 'xs', color: '#aaaaaa', align: 'center' },
        { type: 'text', text: String(orderNo), weight: 'bold', size: 'xl', align: 'center', color: '#4a3520' },
        { type: 'separator', margin: 'lg' },
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'lg',
          contents: [
            { type: 'text', text: 'ยอดที่ต้องชำระ', weight: 'bold', size: 'md', color: '#333333' },
            { type: 'text', text: `฿${money(total)}`, weight: 'bold', size: 'lg', color: '#4a3520', align: 'end' },
          ],
        },
        ...(reason
          ? [{ type: 'text', text: String(reason), size: 'xs', color: '#b06d2b', wrap: true, margin: 'md', align: 'center' }]
          : []),
        {
          // Same explicit-newline treatment as the confirmed card — Thai gives
          // LINE's auto-wrap no word boundaries to break on.
          type: 'text',
          text: 'ทางร้านกำลังตรวจสอบการชำระเงิน\nและจะยืนยันให้อีกครั้งนะคะ',
          size: 'xs',
          color: '#8c8c8c',
          wrap: true,
          margin: 'md',
          align: 'center',
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#3a2818',
          height: 'sm',
          action: { type: 'uri', label: 'ตรวจสอบออเดอร์', uri: orderUrl },
        },
      ],
    },
  }

  return { type: 'flex', altText: `ได้รับสลิปแล้ว ${orderNo} — ฿${money(total)}`, contents: bubble }
}
