// SlipOK slip-verification, proxied through the Webhook Gateway
// (../../webhook-gateway — a separate deployment/repo).
//
// love-pier-main no longer talks to SlipOK directly: it POSTs the slip image
// to the Gateway, which holds the real SLIPOK_API_KEY/SLIPOK_BRANCH_ID and
// calls SlipOK itself. This keeps SlipOK credentials out of this app
// entirely, and means a SlipOK contract change only touches the Gateway's
// adapter (webhook-gateway/lib/providers/slipok.ts).
//
// Config: GATEWAY_URL, GATEWAY_SHARED_SECRET (env vars — see .env.example).
//
// The `apiKey`/`branchId` args below are the same ones /admin/settings
// stores (slipokApiKey/slipokBranchId). They're kept only as a presence
// gate — "has SlipOK been configured at all" — their actual values are
// never sent anywhere; the Gateway uses its own env vars regardless.

const GATEWAY_URL = process.env.GATEWAY_URL
const GATEWAY_SHARED_SECRET = process.env.GATEWAY_SHARED_SECRET

/**
 * Verify a transfer slip image via the Webhook Gateway.
 * @param {object} cfg  { apiKey, branchId } — presence-only gate, see above.
 * @param {object} input  { imageBase64, amount }
 * @returns {Promise<{ ok:boolean, verified?:boolean, amount?:number, transRef?:string,
 *                      reason?:string, duplicate?:boolean }>}
 */
export async function verifySlip({ apiKey, branchId }, { imageBase64, amount }) {
  if (!apiKey || !branchId) {
    return { ok: false, reason: 'ยังไม่ได้ตั้งค่า SlipOK' }
  }
  if (!GATEWAY_URL || !GATEWAY_SHARED_SECRET) {
    console.error('Webhook Gateway not configured: set GATEWAY_URL / GATEWAY_SHARED_SECRET')
    return { ok: false, reason: 'ยังไม่ได้ตั้งค่า Webhook Gateway' }
  }

  const base64 = String(imageBase64 || '').replace(/^data:[^;]+;base64,/, '')
  if (!base64) return { ok: false, reason: 'ไม่พบรูปสลิป' }

  let res
  try {
    res = await fetch(`${GATEWAY_URL.replace(/\/$/, '')}/api/webhook/slip-verify`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-gateway-secret': GATEWAY_SHARED_SECRET,
      },
      body: JSON.stringify({ imageBase64, amount }),
    })
  } catch (err) {
    console.error('Webhook Gateway request failed:', err)
    return { ok: false, reason: 'เชื่อมต่อ Webhook Gateway ไม่ได้' }
  }

  let data
  try {
    data = await res.json()
  } catch {
    return { ok: false, reason: 'Webhook Gateway ตอบกลับผิดรูปแบบ' }
  }

  if (!res.ok) {
    console.error('Webhook Gateway rejected request:', res.status, data)
    return { ok: false, reason: data?.reason || 'Webhook Gateway ปฏิเสธคำขอ' }
  }

  // The Gateway returns exactly this module's original { ok, verified,
  // amount, transRef, reason, duplicate } shape — pass it straight through.
  return data
}
