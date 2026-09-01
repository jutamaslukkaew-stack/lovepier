// Decides whether a customer's chat message is one of the two rich-menu
// buttons, with no I/O — so the cases that MUST NOT match are testable.
//
// Dependency-free on purpose: pages/api/line-webhook.js imports lib/db, so
// nothing in that file can be unit-tested.

// "สั่ง" is an ordinary word in this shop's chats — customers write
// "สั่งไปแล้วนะคะ", "สั่งผิด", "สั่งเพิ่มได้ไหม" all day. A fuzzy matcher would
// steal those from a human who could actually answer, and reply with a card
// that is wrong for the question. So: an exact allowlist. The first entry is
// what the rich menu sends; the rest are the handful people type by hand.
const ORDER_ENTRY_TEXTS = new Set([
  'ขอสั่งเดลิเวอรี',
  'ขอสั่งเดลิเวอรี่',
  'สั่งเดลิเวอรี',
  'สั่งเดลิเวอรี่',
  'ขอสั่งอาหาร',
  'สั่งอาหาร',
  'สั่งเลย',
])

// Status words are safe to match loosely — nobody says "เช็กสถานะออเดอร์" to a
// cafe meaning anything else.
const STATUS_WORD = /สถานะ|ติดตาม|เช็ก|เช็ค/
const ORDER_WORD = /ออเดอร์|order/i

// Thai is written without spaces and polite particles are optional, so
// "สั่งอาหารค่ะ" and "สั่ง อาหาร" are the same request as "สั่งอาหาร".
function normalizeIntent(text) {
  return String(text || '')
    .replace(/\s+/g, '')
    .replace(/(ค่ะ|คะ|ค่า|ครับ|คับ|นะ|ๆ)+$/u, '')
}

/**
 * Classify a 1:1 chat message.
 *
 * Status is checked FIRST: it is the more specific request, so a string that
 * somehow satisfied both should resolve to it.
 *
 * @param {string} text  the raw message text
 * @returns {'status' | 'order-entry' | null}  null means "a real question for a real person"
 */
export function classifyCustomerText(text) {
  const raw = String(text || '').trim()
  if (!raw) return null
  if (STATUS_WORD.test(raw) && ORDER_WORD.test(raw)) return 'status'
  if (ORDER_ENTRY_TEXTS.has(normalizeIntent(raw))) return 'order-entry'
  return null
}

// Exported for the docs check and for tests — ORDER_SETUP.md pins these exact
// strings because the rich menu is configured by hand in LINE OA Manager, and
// a mismatch soft-fails silently (the message lands in the chat, the bot says
// nothing, staff answer it by hand, nobody files a bug).
export { ORDER_ENTRY_TEXTS }
