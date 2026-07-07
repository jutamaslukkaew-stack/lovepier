// Builds a LINE Flex Message (order-detail card, LINE MAN style) for an order.
// Sent into the shop's LINE chat via liff.sendMessages() right after checkout.

function money(n) {
  return `฿${Math.round(Number(n) || 0)}`
}

export function buildOrderFlex({ orderNo, name, phone, address, items = [], total, distanceKm }) {
  const itemRows = items.map((i) => ({
    type: 'box',
    layout: 'horizontal',
    margin: 'sm',
    contents: [
      { type: 'text', text: String(i.name || ''), size: 'sm', color: '#555555', flex: 5, wrap: true },
      { type: 'text', text: `x${i.qty}`, size: 'sm', color: '#999999', flex: 1, align: 'center' },
      { type: 'text', text: money((Number(i.price) || 0) * (Number(i.qty) || 0)), size: 'sm', color: '#111111', flex: 3, align: 'end' },
    ],
  }))

  const infoRow = (label, value) => ({
    type: 'box',
    layout: 'horizontal',
    margin: 'sm',
    contents: [
      { type: 'text', text: label, size: 'sm', color: '#999999', flex: 3 },
      { type: 'text', text: value, size: 'sm', color: '#111111', flex: 4, align: 'end', wrap: true },
    ],
  })

  const recipient = [
    { type: 'text', text: 'ผู้รับ', size: 'xs', color: '#999999' },
    { type: 'text', text: String(name || ''), size: 'md', weight: 'bold', wrap: true },
    { type: 'text', text: String(phone || ''), size: 'sm', color: '#555555' },
  ]
  if (address) recipient.push({ type: 'text', text: String(address), size: 'sm', color: '#555555', wrap: true })
  if (distanceKm != null)
    recipient.push({ type: 'text', text: `📍 ระยะจัดส่ง ${distanceKm} กม.`, size: 'sm', color: '#2d6a1f' })

  const bubble = {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#4a3520',
      paddingAll: '16px',
      contents: [
        { type: 'text', text: 'Love Pier Beach Cafe', color: '#ffffff', weight: 'bold', size: 'lg' },
        { type: 'text', text: 'ออเดอร์เดลิเวอรี', color: '#e6d9c7', size: 'xs', margin: 'xs' },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        { type: 'text', text: String(orderNo), weight: 'bold', size: 'xl', align: 'center' },
        {
          type: 'text',
          text: new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }),
          size: 'xs',
          color: '#aaaaaa',
          align: 'center',
        },
        { type: 'separator', margin: 'md' },
        { type: 'box', layout: 'vertical', margin: 'md', spacing: 'xs', contents: recipient },
        { type: 'separator', margin: 'md' },
        { type: 'box', layout: 'vertical', margin: 'md', contents: itemRows },
        { type: 'separator', margin: 'md' },
        infoRow('ประเภท', 'เดลิเวอรี'),
        infoRow('ชำระเงิน', 'PromptPay'),
        { type: 'separator', margin: 'md' },
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'md',
          contents: [
            { type: 'text', text: 'รวมทั้งหมด', weight: 'bold', size: 'lg', flex: 1 },
            { type: 'text', text: money(total), weight: 'bold', size: 'lg', color: '#2d6a1f', align: 'end', flex: 1 },
          ],
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: 'กรุณาแนบสลิปการโอนในแชทนี้เพื่อยืนยันการชำระเงิน',
          size: 'xs',
          color: '#999999',
          wrap: true,
          align: 'center',
        },
      ],
    },
  }

  return { type: 'flex', altText: `ออเดอร์ ${orderNo} — รวม ${money(total)}`, contents: bubble }
}
