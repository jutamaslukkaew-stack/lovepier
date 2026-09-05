// Browser-side preparation of a payment slip before it is POSTed to
// /api/verify-slip as base64 JSON, plus the shared reading of that response.
//
// Why this exists: both slip surfaces used to hand FileReader the raw file and
// send whatever came out. Two ways that fails in the customer's hand — and
// both end the same way, with the order stuck at `pending`:
//
//   1. iPhone slips are often .heic. SlipOK cannot read one, and the server
//      has no sharp any more to convert it (62112c4), so verification fails
//      on a perfectly good payment.
//   2. A full-resolution photo base64s past Vercel's ~4.5 MB request-body
//      ceiling. The function never runs, the browser gets an HTML 413, and
//      `res.json()` throws on it — the customer saw only the catch-all
//      "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง" with nothing to act on.
//
// A `pending` order is also why no loyalty points appear: points are computed
// at order time but only banked into customers.points_balance when the order
// turns `paid` (lib/slipVerification.js / lib/orderStatusUpdate.js). Every
// slip that fails to upload is points the customer earned and never received.

const HEIC_RE = /\.(heic|heif)$/i

// Raw bytes, before base64. Base64 + the data: prefix + JSON escaping inflate
// by ~1.37x, so 3 MB lands around 4.1 MB on the wire — under Vercel's 4.5 MB
// request-body limit with room to spare. Only ever reached when compression
// is unavailable; a compressed slip is an order of magnitude smaller.
export const MAX_SLIP_BYTES = 3 * 1024 * 1024

// Long edge, in px. A transfer slip is a screenshot of a phone screen, so
// this is a ceiling rather than a target — 1800 keeps the slip's own QR
// (which SlipOK reads) crisp while cutting a 12 MP camera photo down to well
// under a megabyte.
const MAX_SLIP_EDGE = 1800

export function isImageFile(file) {
  if (!file) return false
  // HEIC files sometimes report an empty MIME type — allow the extension too.
  return Boolean(file.type?.startsWith('image/')) || HEIC_RE.test(file.name || '')
}

// Mirrors lib/upload-image.ts#normalizeHeic: heic2any first, and on failure
// fall through with the original, because the canvas decode in shrink() below
// handles HEIC natively on Safari.
async function normalizeHeic(file) {
  const isHeic =
    file.type === 'image/heic' || file.type === 'image/heif' || HEIC_RE.test(file.name || '')
  if (!isHeic) return file
  try {
    const heic2any = (await import('heic2any')).default
    const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
    const blob = Array.isArray(out) ? out[0] : out
    return new File([blob], (file.name || 'slip').replace(HEIC_RE, '') + '.jpg', {
      type: 'image/jpeg',
    })
  } catch {
    return file
  }
}

// JPEG, not the WebP the menu uploader produces: this image is forwarded to
// SlipOK, and a format the shop's provider might reject is not worth the few
// saved kilobytes.
async function shrink(file) {
  const imageCompression = (await import('browser-image-compression')).default
  const out = await imageCompression(file, {
    maxWidthOrHeight: MAX_SLIP_EDGE,
    maxSizeMB: 1.2,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.9,
  })
  return out instanceof Blob ? out : new Blob([out], { type: 'image/jpeg' })
}

function readAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('อ่านไฟล์รูปไม่ได้'))
    reader.readAsDataURL(blob)
  })
}

/**
 * File (from an <input type="file">) → data URL ready to POST.
 * Throws with a message meant for the customer.
 */
export async function prepareSlipDataUrl(file) {
  if (!isImageFile(file)) throw new Error('ไฟล์ต้องเป็นรูปภาพเท่านั้น')

  const source = await normalizeHeic(file)
  let payload
  try {
    payload = await shrink(source)
  } catch {
    // Compression unavailable (very old browser, blocked worker). Send the
    // original — but only if it fits, since the alternative is a 413 the
    // customer cannot interpret.
    if (source.size > MAX_SLIP_BYTES) {
      throw new Error('รูปสลิปใหญ่เกินไป ลองแคปหน้าจอสลิปแล้วแนบใหม่อีกครั้ง')
    }
    payload = source
  }

  if (payload.size > MAX_SLIP_BYTES) {
    throw new Error('รูปสลิปใหญ่เกินไป ลองแคปหน้าจอสลิปแล้วแนบใหม่อีกครั้ง')
  }
  const dataUrl = await readAsDataUrl(payload)
  if (!dataUrl) throw new Error('อ่านไฟล์รูปไม่ได้')
  return dataUrl
}

/**
 * What to tell the customer when /api/verify-slip did not confirm the payment.
 * Pure, so the mapping is testable without a browser: `status` is the HTTP
 * status (0 when the request never completed) and `payload` is the parsed
 * JSON body, or null when the body was not JSON at all — which is exactly
 * what a platform-level 413/502 returns.
 */
export function slipErrorMessage(status, payload) {
  if (payload?.error) return payload.error
  if (status === 401) return 'เซสชัน LINE หมดอายุ กรุณาเข้าสู่ระบบใหม่แล้วแนบสลิปอีกครั้ง'
  if (status === 404) return 'ไม่พบออเดอร์นี้ กรุณาติดต่อร้านทาง LINE'
  if (status === 413) return 'รูปสลิปใหญ่เกินไป ลองแคปหน้าจอสลิปแล้วแนบใหม่อีกครั้ง'
  if (status >= 500) return 'ระบบตรวจสลิปขัดข้องชั่วคราว\nส่งรูปสลิปเข้าแชท LINE ของร้านได้เลย เดี๋ยวร้านยืนยันให้'
  if (status === 0) return 'เชื่อมต่อไม่ได้ กรุณาลองใหม่อีกครั้ง'
  return 'ตรวจสอบสลิปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
}

/**
 * POST a prepared slip and normalise every outcome into one shape:
 * { state: 'ok' | 'stored' | 'fail', error, needsLogin }.
 *
 *   ok     — SlipOK verified it; the order is paid and points are banked
 *   stored — the image was saved but not auto-verified; staff confirm by hand
 *   fail   — nothing was recorded; `error` is safe to show the customer
 */
export async function submitSlip({ orderNo, accessToken, dataUrl }) {
  let res
  try {
    res = await fetch('/api/verify-slip', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken || ''}`,
      },
      body: JSON.stringify({ orderNo, imageBase64: dataUrl }),
    })
  } catch {
    return { state: 'fail', error: slipErrorMessage(0, null), needsLogin: false }
  }

  // A 413 from the platform (or a 502 from a cold start) is HTML, not JSON.
  // Parsing must never be what decides the customer's message.
  const payload = await res.json().catch(() => null)

  if (res.ok && payload?.ok && payload.verified) {
    return { state: 'ok', pointsEarned: payload.pointsEarned || 0, amount: payload.amount || 0 }
  }
  if (res.ok && payload?.ok && payload.stored && !payload.error) {
    return { state: 'stored' }
  }
  return {
    state: 'fail',
    error: slipErrorMessage(res.status, payload),
    needsLogin: res.status === 401,
  }
}
