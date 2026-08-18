import { afterEach, describe, expect, it, vi } from 'vitest'
import { verifyLineAccessToken } from './lineIdentity'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('verifyLineAccessToken', () => {
  it('rejects a missing token', async () => {
    expect(await verifyLineAccessToken('')).toBeNull()
  })

  it('returns the LINE-owned identity after token and profile verification', async () => {
    vi.stubEnv('LINE_LOGIN_CHANNEL_ID', 'verified-channel')
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ client_id: 'verified-channel' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ userId: 'Uverified', displayName: 'Verified user', pictureUrl: 'https://example.com/p.jpg' }) }))

    await expect(verifyLineAccessToken('valid-token')).resolves.toEqual({
      userId: 'Uverified',
      displayName: 'Verified user',
      pictureUrl: 'https://example.com/p.jpg',
    })
  })

  it('rejects a token issued for another LINE Login channel', async () => {
    vi.stubEnv('LINE_LOGIN_CHANNEL_ID', 'verified-channel')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ client_id: 'another-channel' }),
    }))
    expect(await verifyLineAccessToken('wrong-channel-token')).toBeNull()
  })
})
