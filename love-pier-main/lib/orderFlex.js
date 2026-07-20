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
      { type: 'text', text: '✅', flex: 0, size: 'sm' },
      { type: 'text', text: label, size: 'sm', color: '#8c8c8c', flex: 0, margin: 'sm' },
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

function plainRow(icon, label, value) {
  return {
    type: 'box',
    layout: 'baseline',
    margin: 'md',
    contents: [
      { type: 'text', text: icon, flex: 0, size: 'sm' },
      { type: 'text', text: label, size: 'sm', color: '#8c8c8c', flex: 0, margin: 'sm' },
      { type: 'text', text: value, size: 'sm', color: '#333333', align: 'end', wrap: true },
    ],
  }
}

export function buildOrderFlex({ orderNo, name, phone, address, items = [], total, deliveryFee, distanceKm }) {
  const orderUrl = `${SITE_URL}/order/${encodeURIComponent(orderNo)}`

  const itemRows = items.map((i) => ({
    type: 'box',
    layout: 'horizontal',
    margin: 'sm',
    contents: [
      { type: 'text', text: `${i.name}`, size: 'sm', color: '#555555', flex: 5, wrap: true },
      { type: 'text', text: `x${i.qty}`, size: 'sm', color: '#aaaaaa', flex: 1, align: 'center' },
      { type: 'text', text: `฿${money((Number(i.price) || 0) * (Number(i.qty) || 0))}`, size: 'sm', color: '#333333', flex: 3, align: 'end' },
    ],
  }))

  const detail = [
    checkRow('ชื่อ', String(name || '-')),
    checkRow('เบอร์โทร', String(phone || '-'), phone ? { type: 'uri', label: 'call', uri: `tel:${String(phone).replace(/[^0-9+]/g, '')}` } : undefined),
  ]
  if (address) detail.push(plainRow('📍', 'ที่อยู่', String(address)))
  if (distanceKm != null) detail.push(plainRow('🛵', 'ระยะส่ง', `${distanceKm} กม.`))
  detail.push(plainRow('💳', 'ชำระโดย', 'QR PromptPay'))

  const bubble = {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#2d6a1f',
      paddingAll: '18px',
      contents: [
        { type: 'text', text: '🛒 รับออเดอร์แล้ว', color: '#ffffff', weight: 'bold', size: 'xl' },
        { type: 'text', text: 'Love Pier Beach Cafe', color: '#d7ecd0', size: 'xs', margin: 'sm' },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        { type: 'text', text: `เลขที่ออเดอร์`, size: 'xs', color: '#aaaaaa', align: 'center' },
        { type: 'text', text: String(orderNo), weight: 'bold', size: 'xl', align: 'center', color: '#2d6a1f' },
        { type: 'separator', margin: 'lg' },

        // items
        { type: 'box', layout: 'vertical', margin: 'lg', contents: itemRows },
        { type: 'separator', margin: 'lg' },

        // customer details with ✅ rows
        { type: 'box', layout: 'vertical', margin: 'sm', contents: detail },
        { type: 'separator', margin: 'lg' },

        // delivery fee (only when there is one)
        ...(deliveryFee
          ? [plainRow('🛵', 'ค่าจัดส่ง', `฿${money(deliveryFee)}`)]
          : []),

        // total
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'lg',
          contents: [
            { type: 'text', text: '💰 ยอดชำระ', weight: 'bold', size: 'md', color: '#333333' },
            { type: 'text', text: `฿${money(total)}`, weight: 'bold', size: 'lg', color: '#2d6a1f', align: 'end' },
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
          color: '#2d6a1f',
          height: 'sm',
          action: { type: 'uri', label: '🧾 ตรวจสอบออเดอร์', uri: orderUrl },
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
export function buildPaymentConfirmedFlex({ orderNo, total }) {
  const orderUrl = `${SITE_URL}/order/${encodeURIComponent(orderNo)}`

  const bubble = {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#2d6a1f',
      paddingAll: '18px',
      contents: [
        { type: 'text', text: '✅ ชำระเงินสำเร็จ', color: '#ffffff', weight: 'bold', size: 'xl' },
        { type: 'text', text: 'Love Pier Beach Cafe', color: '#d7ecd0', size: 'xs', margin: 'sm' },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        { type: 'text', text: 'เลขที่ออเดอร์', size: 'xs', color: '#aaaaaa', align: 'center' },
        { type: 'text', text: String(orderNo), weight: 'bold', size: 'xl', align: 'center', color: '#2d6a1f' },
        { type: 'separator', margin: 'lg' },
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'lg',
          contents: [
            { type: 'text', text: '💰 ยอดที่ชำระ', weight: 'bold', size: 'md', color: '#333333' },
            { type: 'text', text: `฿${money(total)}`, weight: 'bold', size: 'lg', color: '#2d6a1f', align: 'end' },
          ],
        },
        {
          type: 'text',
          text: 'ขอบคุณที่อุดหนุน Love Pier 🌊 กำลังเตรียมออเดอร์ให้แล้ว',
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
          color: '#2d6a1f',
          height: 'sm',
          action: { type: 'uri', label: '🧾 ตรวจสอบออเดอร์', uri: orderUrl },
        },
      ],
    },
  }

  return { type: 'flex', altText: `ชำระเงินสำเร็จ ${orderNo} — ฿${money(total)}`, contents: bubble }
}
