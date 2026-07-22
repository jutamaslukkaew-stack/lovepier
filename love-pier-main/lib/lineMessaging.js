// LINE Messaging API — push a "new order" alert to the shop.
// Best-effort: never throws, so a notification failure can't break checkout.
//
// Requires two env vars (from the LINE OA's Messaging API channel):
//   LINE_MESSAGING_TOKEN   — long-lived channel access token
//   LINE_ORDER_NOTIFY_TO   — userId or groupId to push the alert to

const TOKEN = process.env.LINE_MESSAGING_TOKEN || ''
const TARGET = process.env.LINE_ORDER_NOTIFY_TO || ''

export function isLineNotifyConfigured() {
  return Boolean(TOKEN && TARGET)
}

/**
 * Push any LINE messages from the OA to a specific user (Messaging API).
 * Used to send the order card "from the shop" to the customer. Best-effort.
 * @param {string} userId  the customer's LINE userId
 * @param {object[]} messages  LINE message objects (e.g. a Flex message)
 */
export async function pushToUser(userId, messages) {
  if (!TOKEN || !userId || !Array.isArray(messages) || messages.length === 0) {
    return { ok: false, skipped: true }
  }
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ to: userId, messages }),
    })
    if (!res.ok) {
      console.error('LINE push to user failed:', res.status, await res.text())
      return { ok: false }
    }
    return { ok: true }
  } catch (err) {
    console.error('LINE push to user error:', err)
    return { ok: false }
  }
}

/**
 * @param {object} order
 * @param {string} order.orderNo
 * @param {string} order.customerName
 * @param {string} order.phone
 * @param {string} order.address
 * @param {string} [order.note]
 * @param {Array<{name:string, qty:number}>} order.items
 * @param {number} order.totalAmount
 * @param {string} [order.paymentRef]
 */
export async function pushNewOrderNotification(order) {
  if (!TOKEN || !TARGET) return { ok: false, skipped: true }

  const lines = (order.items || [])
    .map((i) => `• ${i.name} ×${i.qty}`)
    .join('\n')

  const text =
    `ออเดอร์ใหม่ ${order.orderNo}\n` +
    `━━━━━━━━━━━━━━\n` +
    `ชื่อ: ${order.customerName}\n` +
    `เบอร์โทร: ${order.phone}\n` +
    (order.address ? `ที่อยู่: ${order.address}\n` : '') +
    (order.note ? `หมายเหตุ: ${order.note}\n` : '') +
    (order.distanceKm != null ? `ระยะจัดส่ง: ${order.distanceKm} กม.\n` : '') +
    `━━━━━━━━━━━━━━\n` +
    `${lines}\n` +
    (order.deliveryFee ? `ค่าจัดส่ง ฿${order.deliveryFee}\n` : '') +
    `รวม ฿${order.totalAmount}` +
    (order.paymentRef ? `\nRef: ${order.paymentRef}` : '')

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        to: TARGET,
        messages: [{ type: 'text', text }],
      }),
    })
    if (!res.ok) {
      console.error('LINE push failed:', res.status, await res.text())
      return { ok: false }
    }
    return { ok: true }
  } catch (err) {
    console.error('LINE push error:', err)
    return { ok: false }
  }
}
