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
 * Push the shop's own order-confirmation Flex card — the SAME card design
 * the customer gets from pushToUser() — to staff's LINE (LINE_ORDER_NOTIFY_TO:
 * a personal userId or a group chat id), instead of a plain-text summary.
 * Best-effort, mirrors pushToUser's guard clauses.
 * @param {object} flexMessage  a single LINE Flex message object (e.g. from buildOrderFlex)
 */
export async function pushOrderCardToStaff(flexMessage) {
  if (!TOKEN || !TARGET || !flexMessage) return { ok: false, skipped: true }
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        to: TARGET,
        messages: [flexMessage],
      }),
    })
    if (!res.ok) {
      console.error('LINE push to staff failed:', res.status, await res.text())
      return { ok: false }
    }
    return { ok: true }
  } catch (err) {
    console.error('LINE push to staff error:', err)
    return { ok: false }
  }
}
