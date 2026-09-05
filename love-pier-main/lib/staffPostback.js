// Decides what a tap on a staff order-card button MEANS, with no I/O.
//
// This lives apart from pages/api/line-webhook.js for one reason: that route
// imports lib/db, so nothing in it can be unit-tested. Every branch here is a
// customer- or staff-visible outcome, and the branch that matters most
// (`unauthorized`) is a misconfiguration that used to be invisible — the
// button simply did nothing — so it is worth testing properly.
//
// Deliberately dependency-free: importing STAFF_BUTTON_STATUSES from
// lib/orderStatusUpdate.js would drag Drizzle in, so this module OWNS the list
// and that module re-exports it.

// The subset a LINE quick-action button may set: forward-only kitchen steps
// plus cancel. 'paid' is deliberately excluded — payment is confirmed by slip
// verification, never a button — and so is 'pending' (a card can't un-do a
// step).
export const STAFF_BUTTON_STATUSES = ['preparing', 'done', 'cancelled']

export const STATUS_LABEL_TH = { preparing: 'กำลังทำ', done: 'พร้อมแล้ว', cancelled: 'ยกเลิก' }

/**
 * Classify a postback event's payload + sender.
 *
 * Note the ORDER of the checks: the payload is parsed BEFORE authorization is
 * considered. That way an `unauthorized` verdict can only ever come from a
 * status button — which only exists on a staff card — so a future rich-menu
 * postback from a customer can never trigger the staff-only refusal copy.
 *
 * @param {{rawData?: string, senderId?: string, chatId?: string, notifyTargets?: string[]}} args
 * @returns {{kind: 'ignore'|'bad-payload'|'unauthorized'|'ok', orderNo?: string, status?: string, label?: string}}
 */
export function decodeStaffPostback({ rawData, senderId, chatId, notifyTargets = [] }) {
  const data = new URLSearchParams(String(rawData || ''))

  // Not one of ours. Stay silent rather than replying — staffActionButtons is
  // the only postback producer today, but the moment a rich menu or a datetime
  // picker is added, an "I don't understand" reply here would make the bot
  // chatty in every customer chat.
  if (data.get('act') !== 'status') return { kind: 'ignore' }

  const status = data.get('status') || ''
  const orderNo = (data.get('orderNo') || '').trim()

  // A card old enough to predate a rename, or a hand-crafted payload. The
  // tapper still deserves an answer — silence here reads exactly like the
  // misconfiguration case and sends staff hunting in the wrong place.
  if (!orderNo || !STAFF_BUTTON_STATUSES.includes(status)) {
    return { kind: 'bad-payload' }
  }

  // A staff card can be forwarded, so the buttons must re-check the tapper
  // rather than trusting that only staff hold one. Either the person or the
  // chat being a configured destination is enough: LINE_ORDER_NOTIFY_TO may
  // list 1:1 user ids, a staff group, or a mix, and in a group LINE does not
  // always send source.userId.
  const authorized =
    (Boolean(senderId) && notifyTargets.includes(senderId)) ||
    (Boolean(chatId) && notifyTargets.includes(chatId))
  if (!authorized) return { kind: 'unauthorized' }

  return { kind: 'ok', orderNo, status, label: STATUS_LABEL_TH[status] || status }
}
