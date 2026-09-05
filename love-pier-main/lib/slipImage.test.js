import { afterEach, describe, expect, it, vi } from 'vitest'
import { isImageFile, slipErrorMessage, submitSlip } from './slipImage'

describe('isImageFile', () => {
  it('accepts an ordinary image', () => {
    expect(isImageFile({ name: 'slip.jpg', type: 'image/jpeg' })).toBe(true)
  })

  it('accepts a HEIC that reports no MIME type at all', () => {
    expect(isImageFile({ name: 'IMG_0421.HEIC', type: '' })).toBe(true)
  })

  it('rejects a non-image', () => {
    expect(isImageFile({ name: 'slip.pdf', type: 'application/pdf' })).toBe(false)
  })

  it('rejects nothing at all', () => {
    expect(isImageFile(null)).toBe(false)
  })
})

describe('slipErrorMessage', () => {
  it('prefers the server’s own wording when there is one', () => {
    expect(slipErrorMessage(200, { error: 'ยอดเงินไม่ตรงกับออเดอร์' })).toBe('ยอดเงินไม่ตรงกับออเดอร์')
  })

  it('explains a body-size rejection the customer can act on', () => {
    // A 413 comes from the platform as HTML, so there is no JSON payload —
    // the exact case that used to surface as "เกิดข้อผิดพลาด".
    expect(slipErrorMessage(413, null)).toMatch(/ใหญ่เกินไป/)
  })

  it('points at the LINE chat when the verifier itself is down', () => {
    expect(slipErrorMessage(502, null)).toMatch(/แชท LINE/)
  })

  it('tells an expired session to log in again', () => {
    expect(slipErrorMessage(401, null)).toMatch(/เข้าสู่ระบบ/)
  })

  it('has an answer for a request that never completed', () => {
    expect(slipErrorMessage(0, null)).toMatch(/เชื่อมต่อ/)
  })
})

describe('submitSlip', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetch(impl) {
    vi.stubGlobal('fetch', vi.fn(impl))
  }

  it('reports a verified payment with the points it banked', async () => {
    stubFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, verified: true, pointsEarned: 6, amount: 135 }),
    }))
    expect(await submitSlip({ orderNo: 'LP1', accessToken: 't', dataUrl: 'data:,' })).toEqual({
      state: 'ok',
      pointsEarned: 6,
      amount: 135,
    })
  })

  it('separates "saved but not auto-verified" from a failure', async () => {
    stubFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, verified: false, stored: true }),
    }))
    expect(await submitSlip({ orderNo: 'LP1', accessToken: 't', dataUrl: 'data:,' })).toEqual({
      state: 'stored',
    })
  })

  it('survives a non-JSON error body instead of throwing on it', async () => {
    stubFetch(async () => ({
      ok: false,
      status: 413,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON')
      },
    }))
    const res = await submitSlip({ orderNo: 'LP1', accessToken: 't', dataUrl: 'data:,' })
    expect(res.state).toBe('fail')
    expect(res.error).toMatch(/ใหญ่เกินไป/)
  })

  it('flags an expired session so the caller can offer a re-login', async () => {
    stubFetch(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: 'กรุณาเข้าสู่ระบบ LINE ใหม่อีกครั้ง' }),
    }))
    const res = await submitSlip({ orderNo: 'LP1', accessToken: '', dataUrl: 'data:,' })
    expect(res).toMatchObject({ state: 'fail', needsLogin: true })
  })

  it('turns a dropped connection into a message, not an exception', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch')
    })
    const res = await submitSlip({ orderNo: 'LP1', accessToken: 't', dataUrl: 'data:,' })
    expect(res).toMatchObject({ state: 'fail', needsLogin: false })
  })
})
