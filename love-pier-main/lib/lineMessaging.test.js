import { afterEach, describe, expect, it, vi } from 'vitest'

// This module snapshots LINE_ORDER_NOTIFY_TO / LINE_MESSAGING_TOKEN at import
// time (they're module-level consts, read once per serverless cold start),
// so every case has to set the environment and then import a FRESH copy.
// vi.stubEnv alone would be read too late.
async function loadWith(notifyTo, token = 'test-token') {
  vi.resetModules()
  vi.stubEnv('LINE_MESSAGING_TOKEN', token)
  vi.stubEnv('LINE_ORDER_NOTIFY_TO', notifyTo)
  return import('./lineMessaging')
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('NOTIFY_TARGETS parsing', () => {
  it('reads a single id, the pre-2026-08-24 shape', async () => {
    const { NOTIFY_TARGETS, isLineNotifyConfigured } = await loadWith('Cgroup123')
    expect(NOTIFY_TARGETS).toEqual(['Cgroup123'])
    expect(isLineNotifyConfigured()).toBe(true)
  })

  it('splits a comma-separated list and trims each id', async () => {
    const { NOTIFY_TARGETS } = await loadWith(' Uadmin1 , Uadmin2 ,Ucashier ')
    expect(NOTIFY_TARGETS).toEqual(['Uadmin1', 'Uadmin2', 'Ucashier'])
  })

  it('drops empty entries from a trailing or doubled comma', async () => {
    const { NOTIFY_TARGETS } = await loadWith('Uadmin1,,Uadmin2,')
    expect(NOTIFY_TARGETS).toEqual(['Uadmin1', 'Uadmin2'])
  })

  it('caps the list at five so one typo cannot multiply the message quota', async () => {
    const { NOTIFY_TARGETS } = await loadWith('U1,U2,U3,U4,U5,U6,U7')
    expect(NOTIFY_TARGETS).toEqual(['U1', 'U2', 'U3', 'U4', 'U5'])
  })

  it('is unconfigured when the variable is blank or only commas', async () => {
    const { NOTIFY_TARGETS, isLineNotifyConfigured } = await loadWith(' , ')
    expect(NOTIFY_TARGETS).toEqual([])
    expect(isLineNotifyConfigured()).toBe(false)
  })

  it('is unconfigured without a channel token, even with targets', async () => {
    const { isLineNotifyConfigured } = await loadWith('Uadmin1', '')
    expect(isLineNotifyConfigured()).toBe(false)
  })
})

describe('isStaffNotifyTarget', () => {
  it('recognizes any id in the list, not just the first', async () => {
    const { isStaffNotifyTarget } = await loadWith('Uadmin1,Uadmin2')
    expect(isStaffNotifyTarget('Uadmin1')).toBe(true)
    expect(isStaffNotifyTarget('Uadmin2')).toBe(true)
  })

  it('is false for an ordinary customer and for a blank id', async () => {
    const { isStaffNotifyTarget } = await loadWith('Uadmin1,Uadmin2')
    expect(isStaffNotifyTarget('Ucustomer')).toBe(false)
    expect(isStaffNotifyTarget('')).toBe(false)
    expect(isStaffNotifyTarget(undefined)).toBe(false)
  })
})

describe('pushOrderCardToStaff', () => {
  const flex = { type: 'flex', altText: 'order' }

  it('pushes once per destination', async () => {
    const { pushOrderCardToStaff } = await loadWith('Uadmin1,Uadmin2')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await expect(pushOrderCardToStaff(flex)).resolves.toEqual({ ok: true, sent: 2, failed: 0 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).to).toBe('Uadmin1')
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).to).toBe('Uadmin2')
  })

  it('still alerts the other admin when one destination is rejected', async () => {
    const { pushOrderCardToStaff } = await loadWith('Uadmin1,Uadmin2')
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 403, text: async () => 'blocked' })
      .mockResolvedValueOnce({ ok: true }))

    // ok stays true: the shop WAS told. `failed` is what says one seat missed it.
    await expect(pushOrderCardToStaff(flex)).resolves.toEqual({ ok: true, sent: 1, failed: 1 })
  })

  it('reports failure only when every destination fails', async () => {
    const { pushOrderCardToStaff } = await loadWith('Uadmin1,Uadmin2')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    await expect(pushOrderCardToStaff(flex)).resolves.toEqual({ ok: false, sent: 0, failed: 2 })
  })

  it('skips without throwing when nothing is configured', async () => {
    const { pushOrderCardToStaff } = await loadWith('')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(pushOrderCardToStaff(flex)).resolves.toEqual({ ok: false, skipped: true, sent: 0, failed: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('pushMessages', () => {
  const msgs = [{ type: 'text', text: 'hi' }]

  it('reports the HTTP status so callers can tell "blocked" from "broken"', async () => {
    const { pushMessages } = await loadWith('Uadmin1')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => 'blocked' }))

    // 403 is the one failure a human has to act on — see noticeFor().
    await expect(pushMessages('Ucustomer', msgs)).resolves.toEqual({ ok: false, status: 403 })
  })

  it('has no status when the request never reached LINE', async () => {
    const { pushMessages } = await loadWith('Uadmin1')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    await expect(pushMessages('Ucustomer', msgs)).resolves.toEqual({ ok: false })
  })
})

describe('replyOrPush', () => {
  const msgs = [{ type: 'text', text: 'ออเดอร์ LP1 → พร้อมแล้ว' }]

  it('replies and does NOT push — a reply is free, a push is billed', async () => {
    const { replyOrPush } = await loadWith('Cstaff')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await expect(replyOrPush({ replyToken: 'tok', to: 'Cstaff', messages: msgs }))
      .resolves.toEqual({ ok: true, via: 'reply' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain('/message/reply')
  })

  it('falls back to a push when the reply token has expired', async () => {
    // The failure this exists for: a cold start plus two DB round trips can
    // outlive the token, and the old code just logged and moved on — which
    // the tapper experiences as a button that does nothing.
    const { replyOrPush } = await loadWith('Cstaff')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'Invalid reply token' })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await expect(replyOrPush({ replyToken: 'stale', to: 'Cstaff', messages: msgs }))
      .resolves.toEqual({ ok: true, via: 'push' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toContain('/message/push')
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).to).toBe('Cstaff')
  })

  it('gives up quietly when the reply fails and there is nowhere to push', async () => {
    const { replyOrPush } = await loadWith('Cstaff')
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'bad' })
    vi.stubGlobal('fetch', fetchMock)

    await expect(replyOrPush({ replyToken: 'stale', to: undefined, messages: msgs }))
      .resolves.toEqual({ ok: false, via: 'none' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
