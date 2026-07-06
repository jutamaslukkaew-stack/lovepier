// PromptPay QR payload generator (EMVCo / Bank of Thailand standard).
// Produces the raw string that gets encoded into the QR image.
// No external dependency — this is the same algorithm the `promptpay-qr` npm lib uses.

function tag(id, value) {
  const len = value.length.toString().padStart(2, '0')
  return `${id}${len}${value}`
}

// Normalise the PromptPay target:
//  - phone number  → 13 digits: 0066 + number without the leading 0
//  - national ID / tax ID (13 digits) → used as-is
//  - e-wallet ID (15 digits) → used as-is
function normalizeTarget(id) {
  const digits = id.replace(/\D/g, '')
  if (digits.length >= 15) return { tagId: '03', value: digits }
  if (digits.length >= 13) return { tagId: '02', value: digits }
  // phone
  const local = digits.replace(/^0/, '')
  return { tagId: '01', value: ('0066' + local) }
}

function crc16(payload) {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/**
 * Build a PromptPay payload string.
 * @param {string} target  Shop phone number, national ID, or e-wallet ID.
 * @param {number} [amount]  Amount in THB. Omit for a static (no-amount) QR.
 * @returns {string} EMVCo payload ready to be rendered as a QR code.
 */
export function promptpayPayload(target, amount) {
  const { tagId, value } = normalizeTarget(target)

  const merchantAccount = tag(
    '29',
    tag('00', 'A000000677010111') + tag(tagId, value)
  )

  const parts = [
    tag('00', '01'),                       // payload format indicator
    tag('01', amount != null ? '12' : '11'), // 12 = dynamic (one-time), 11 = static
    merchantAccount,
    tag('53', '764'),                      // currency = THB
    tag('58', 'TH'),                       // country
  ]

  if (amount != null) {
    parts.push(tag('54', Number(amount).toFixed(2)))
  }

  const withoutCrc = parts.join('') + '6304' // 63 = CRC, length 04
  return withoutCrc + crc16(withoutCrc)
}

/**
 * Build a PromptPay **Bill Payment** payload (company / นิติบุคคล Biller ID QR).
 * This is a different template (tag 30) from the transfer QR above.
 * @param {string} billerId  15-digit Biller ID (e.g. 010554511741402).
 * @param {number} [amount]  Amount in THB. Omit for a static QR.
 * @param {string} [ref1]  Reference 1 — use the order/payment ref so the shop
 *   can reconcile the incoming payment with the order. Alphanumeric.
 * @param {string} [ref2]  Reference 2 — optional.
 * @returns {string} EMVCo payload ready to be rendered as a QR code.
 */
export function billPaymentPayload(billerId, amount, ref1, ref2) {
  const bid = String(billerId).replace(/\D/g, '')
  const clean = (s) => String(s || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()

  let merchant = tag('00', 'A000000677010112') + tag('01', bid)
  if (ref1) merchant += tag('02', clean(ref1))
  if (ref2) merchant += tag('03', clean(ref2))

  const parts = [
    tag('00', '01'),
    tag('01', amount != null ? '12' : '11'),
    tag('30', merchant),                   // 30 = bill payment merchant account
    tag('53', '764'),
    tag('58', 'TH'),
  ]
  if (amount != null) {
    parts.push(tag('54', Number(amount).toFixed(2)))
  }

  const withoutCrc = parts.join('') + '6304'
  return withoutCrc + crc16(withoutCrc)
}

/**
 * Convenience dispatcher used by the checkout. Picks the right template based
 * on `type` ('biller' → bill payment, otherwise phone/ID transfer).
 */
export function buildPaymentPayload({ type, target, amount, ref1 }) {
  if (type === 'biller') return billPaymentPayload(target, amount, ref1)
  return promptpayPayload(target, amount)
}
