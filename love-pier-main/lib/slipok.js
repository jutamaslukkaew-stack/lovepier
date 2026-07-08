// SlipOK slip-verification API wrapper (https://slipok.com).
// Reads the QR embedded in a Thai bank transfer slip and checks with the bank
// that the transfer is real, the amount matches, and it hasn't been used before.
//
// Config (from /admin/settings): slipokApiKey, slipokBranchId.

/**
 * Verify a transfer slip image.
 * @param {object} cfg  { apiKey, branchId }
 * @param {object} input  { imageBase64, amount }
 * @returns {Promise<{ ok:boolean, verified?:boolean, amount?:number, transRef?:string,
 *                      reason?:string, duplicate?:boolean }>}
 */
export async function verifySlip({ apiKey, branchId }, { imageBase64, amount }) {
  if (!apiKey || !branchId) {
    return { ok: false, reason: 'ยังไม่ได้ตั้งค่า SlipOK' }
  }

  // Build multipart form-data with the slip image (SlipOK reads its QR).
  const base64 = String(imageBase64 || '').replace(/^data:[^;]+;base64,/, '')
  if (!base64) return { ok: false, reason: 'ไม่พบรูปสลิป' }

  let form
  try {
    const bytes = Buffer.from(base64, 'base64')
    form = new FormData()
    form.append('files', new Blob([bytes], { type: 'image/jpeg' }), 'slip.jpg')
    if (amount != null) form.append('amount', String(amount))
    form.append('log', 'true')
  } catch {
    return { ok: false, reason: 'อ่านรูปสลิปไม่ได้' }
  }

  let res
  try {
    res = await fetch(`https://api.slipok.com/api/line/apikey/${branchId}`, {
      method: 'POST',
      headers: { 'x-authorization': apiKey },
      body: form,
    })
  } catch (err) {
    console.error('SlipOK request failed:', err)
    return { ok: false, reason: 'เชื่อมต่อ SlipOK ไม่ได้' }
  }

  let data
  try {
    data = await res.json()
  } catch {
    return { ok: false, reason: 'SlipOK ตอบกลับผิดรูปแบบ' }
  }

  // SlipOK returns { success: true, data: {...} } on a valid slip.
  if (data?.success && data?.data) {
    const d = data.data
    return {
      ok: true,
      verified: true,
      amount: Number(d.amount),
      transRef: d.transRef || d.transRefNumber || d.ref || null,
    }
  }

  // Common failure codes (e.g. 1012 = duplicate slip). Surface a readable reason.
  const code = data?.code
  const duplicate = code === 1012 || /ซ้ำ|duplicate/i.test(data?.message || '')
  return {
    ok: true,
    verified: false,
    duplicate,
    reason: data?.message || 'ตรวจสอบสลิปไม่ผ่าน',
  }
}
