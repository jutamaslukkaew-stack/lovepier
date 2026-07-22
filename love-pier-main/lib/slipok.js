// SlipOK slip-verification API wrapper (https://slipok.com).
// Reads the QR embedded in a Thai bank transfer slip and checks with the bank
// that the transfer is real, the amount matches, and it hasn't been used before.
//
// Config (from /admin/settings): slipokApiKey, slipokBranchId.

// The Bill Payment / Mae Manee biller account is shared across many merchants
// under the same bank account number, so SlipOK's own "main account" check
// (triggered by log:true) doesn't recognize it and reports code 1014 even for
// a genuine payment. SlipOK's docs say to match on Ref.1 instead for this case.
//
// We match on the shop's fixed Ref.1 AND/OR its Bill Payment biller id. Both
// are printed on the shop's physical static QR sticker (not secret) and are the
// same for every order. We read them from env when available but FALL BACK to
// the known fixed values, because NEXT_PUBLIC_* vars are inlined at build time —
// if the deployed bundle was built before those vars were set in Vercel they
// bake in as undefined at runtime, which silently disabled this whole fallback
// and made every real Bill Payment slip fail with 1014 (the bug this fixes).
const BILLER_REF1 = process.env.NEXT_PUBLIC_PROMPTPAY_REF || 'REF001'
const BILLER_ID = (process.env.NEXT_PUBLIC_PROMPTPAY_ID || '010554511741402').replace(/\D/g, '')

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

  // code 1014 = "บัญชีผู้รับไม่ตรงกับบัญชีหลักของร้าน" — SlipOK's automatic
  // account-match doesn't apply to Bill Payment receivers; fall back to our own
  // Ref.1 / biller-id match (the slip read itself already succeeded here, so
  // data.data holds the parsed slip). The receiver's biller id comes back masked
  // like "XXXXXXXXXXX1402", so we compare only its trailing visible digits.
  if (code === 1014 && data?.data) {
    const d = data.data
    const slipRef1 = String(d.ref1 || '').trim()
    const recvDigits = String(d.receiver?.proxy?.value || '').replace(/\D/g, '')
    const refMatch = Boolean(BILLER_REF1) && slipRef1.toUpperCase() === BILLER_REF1.toUpperCase()
    const billerMatch = recvDigits.length >= 4 && BILLER_ID.endsWith(recvDigits)
    if (refMatch || billerMatch) {
      return {
        ok: true,
        verified: true,
        amount: Number(d.amount),
        transRef: d.transRef || d.transRefNumber || d.ref || null,
      }
    }
    console.warn('SlipOK 1014 did not match shop biller', {
      slipRef1,
      expectedRef1: BILLER_REF1,
      recvDigits,
      expectedBiller: BILLER_ID,
    })
  }

  const duplicate = code === 1012 || /ซ้ำ|duplicate/i.test(data?.message || '')
  return {
    ok: true,
    verified: false,
    duplicate,
    reason: data?.message || 'ตรวจสอบสลิปไม่ผ่าน',
  }
}
