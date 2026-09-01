// LINE Messaging API — push a "new order" alert to the shop.
// Best-effort: never throws, so a notification failure can't break checkout.
//
// Requires two env vars (from the LINE OA's Messaging API channel):
//   LINE_MESSAGING_TOKEN   — long-lived channel access token
//   LINE_ORDER_NOTIFY_TO   — where to push the alert. One id, or several
//                            separated by commas.
//
// Several ids on purpose (2026-08-24 journey review): the alert used to go to
// one staff GROUP, and in a group with many members LINE's own notification
// gets muted/buried and orders were missed. The shop's decision was to push
// to exactly two people's 1:1 chats plus the cashier device, so this parses a
// list. A single id still works unchanged — that's the same string with no
// comma in it.

const TOKEN = process.env.LINE_MESSAGING_TOKEN || ''

// Capped so a mistyped value can't fan one order out into a dozen pushes
// against the OA's monthly message quota (see the standing followUp about
// watching it — every extra destination is another billed message per order).
const MAX_TARGETS = 5

export const NOTIFY_TARGETS = (process.env.LINE_ORDER_NOTIFY_TO || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)
  .slice(0, MAX_TARGETS)

export function isLineNotifyConfigured() {
  return Boolean(TOKEN && NOTIFY_TARGETS.length)
}

// A common setup mistake is putting the customer's personal user id in the
// staff destination. In that case sending both the staff copy and customer
// copy produces two identical cards in the same chat. Callers use this guard
// to send only once. Still relevant with a list: one of the two staff members
// may well order from the shop themselves.
export function isStaffNotifyTarget(userId) {
  return Boolean(userId && NOTIFY_TARGETS.includes(userId))
}

/**
 * Push any LINE messages from the OA to one destination (Messaging API).
 * `to` is any LINE destination id — a customer's userId, a group, or a room;
 * the push endpoint treats all three the same. Best-effort, never throws.
 *
 * The returned `status` matters to callers that have to TELL somebody what
 * happened: 403 means the customer blocked the OA (a human should follow up),
 * while `skipped` means we never even tried. Collapsing those into one false
 * is what made staff read "this order has no LINE account" for a customer who
 * had one — see noticeFor() in lib/orderStatusUpdate.js.
 *
 * @param {string} to  LINE destination id (U… user, C… group, R… room)
 * @param {object[]} messages  LINE message objects (e.g. a Flex message)
 * @returns {Promise<{ok: boolean, skipped?: boolean, status?: number}>}
 */
export async function pushMessages(to, messages) {
  if (!TOKEN || !to || !Array.isArray(messages) || messages.length === 0) {
    // Was previously silent — indistinguishable in the logs from a genuine
    // send, which cost real debugging time tracing a "notification didn't
    // arrive" report back to a missing env var. Log which precondition failed.
    console.warn('LINE push skipped:', { hasToken: Boolean(TOKEN), hasTo: Boolean(to), messageCount: messages?.length ?? 0 })
    return { ok: false, skipped: true }
  }
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ to, messages }),
    })
    if (!res.ok) {
      console.error('LINE push failed:', res.status, await res.text())
      return { ok: false, status: res.status }
    }
    console.log('LINE push ok:', to.slice(0, 6) + '…')
    return { ok: true }
  } catch (err) {
    console.error('LINE push error:', err)
    return { ok: false }
  }
}

/**
 * Push to a customer. Thin alias for pushMessages — kept because "push to the
 * customer" and "push to whatever chat this is" read very differently at the
 * call sites even though LINE's endpoint doesn't distinguish them.
 */
export function pushToUser(userId, messages) {
  return pushMessages(userId, messages)
}

/**
 * Reply to an inbound event using its replyToken. Free (a reply does not count
 * against the OA's monthly push quota) but single-use and short-lived.
 * Best-effort, never throws — but unlike the old version it REPORTS failure so
 * replyOrPush can fall back instead of the message silently vanishing.
 *
 * @returns {Promise<{ok: boolean, skipped?: boolean, status?: number}>}
 */
export async function replyMessages(replyToken, messages) {
  if (!TOKEN || !replyToken || !Array.isArray(messages) || messages.length === 0) {
    console.warn('LINE reply skipped:', { hasToken: Boolean(TOKEN), hasReplyToken: Boolean(replyToken), messageCount: messages?.length ?? 0 })
    return { ok: false, skipped: true }
  }
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ replyToken, messages }),
    })
    if (!res.ok) {
      console.error('LINE reply failed:', res.status, await res.text())
      return { ok: false, status: res.status }
    }
    return { ok: true }
  } catch (err) {
    console.error('LINE reply error:', err)
    return { ok: false }
  }
}

/**
 * Answer an inbound event: reply if we can, push if the reply didn't land.
 *
 * A reply token is single-use and expires, so a slow handler (a cold start
 * plus a couple of DB round trips) can find itself holding a dead token — and
 * the old code's answer to that was to log and move on, which is exactly the
 * "I tapped the button and nothing happened" report this exists to prevent.
 *
 * The push is a genuine fallback, never speculative: a reply is free and a
 * push is billed, so we only pay when the free path actually failed.
 *
 * @param {{replyToken?: string, to?: string, messages: object[]}} args
 * @returns {Promise<{ok: boolean, via: 'reply' | 'push' | 'none'}>}
 */
export async function replyOrPush({ replyToken, to, messages }) {
  const replied = await replyMessages(replyToken, messages)
  if (replied.ok) return { ok: true, via: 'reply' }
  if (!to) return { ok: false, via: 'none' }
  console.warn('LINE reply did not land, falling back to push:', to.slice(0, 6) + '…')
  const pushed = await pushMessages(to, messages)
  return { ok: Boolean(pushed.ok), via: pushed.ok ? 'push' : 'none' }
}

/**
 * Push the shop's own order-confirmation Flex card — the SAME card design
 * the customer gets from pushToUser() — to every staff destination in
 * LINE_ORDER_NOTIFY_TO (personal userIds, a group id, or a mix), instead of a
 * plain-text summary. Best-effort, mirrors pushToUser's guard clauses.
 *
 * Destinations are independent: one bad id (a staff member who blocked the
 * OA, a group the bot was removed from) must not stop the others from being
 * alerted, so failures are collected rather than thrown. `ok` means at least
 * one destination received the card — the shop was notified — while `sent`
 * and `failed` say how many, because "one of two got it" is a real state
 * worth seeing in the logs.
 *
 * @param {object} flexMessage  a single LINE Flex message object (e.g. from buildOrderFlex)
 */
export async function pushOrderCardToStaff(flexMessage) {
  if (!TOKEN || !NOTIFY_TARGETS.length || !flexMessage) {
    // Same reasoning as pushToUser's skip log — this is the exact call the
    // shop's staff-alert card depends on, and a silent skip here previously
    // looked identical to a real send in the logs.
    console.warn('LINE push to staff skipped:', { hasToken: Boolean(TOKEN), targetCount: NOTIFY_TARGETS.length, hasMessage: Boolean(flexMessage) })
    return { ok: false, skipped: true, sent: 0, failed: 0 }
  }

  const results = await Promise.allSettled(
    NOTIFY_TARGETS.map(async (target) => {
      const res = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify({
          to: target,
          messages: [flexMessage],
        }),
      })
      if (!res.ok) {
        // Read the body here, inside the per-target task: LINE names the
        // offending id nowhere in the response, so the log line has to.
        throw new Error(`${res.status} ${await res.text()}`)
      }
      return target
    })
  )

  let sent = 0
  results.forEach((result, i) => {
    const label = NOTIFY_TARGETS[i].slice(0, 6) + '…'
    if (result.status === 'fulfilled') {
      sent += 1
      console.log('LINE push to staff ok:', label)
    } else {
      console.error('LINE push to staff failed:', label, result.reason?.message || result.reason)
    }
  })

  return { ok: sent > 0, sent, failed: NOTIFY_TARGETS.length - sent }
}
