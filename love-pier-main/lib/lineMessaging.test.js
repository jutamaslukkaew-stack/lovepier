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
