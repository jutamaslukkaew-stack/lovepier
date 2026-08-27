import { describe, expect, it } from 'vitest'
import {
  INVITE_ALPHABET,
  INVITE_CODE_LENGTH,
  inviteStatus,
  inviteUrl,
  isInviteCode,
  isInviteUsable,
  isSelfServiceTier,
  normalizeInviteCode,
} from './invites'

describe('invite codes', () => {
  it('leaves out the glyphs people misread', () => {
    // The whole reason for a custom alphabet: these are the pairs that get
    // transcribed wrongly off a printed QR or over the phone.
    for (const c of ['I', 'L', 'O', 'U', '0', '1']) {
      expect(INVITE_ALPHABET).not.toContain(c)
    }
  })

  it('accepts a code written the way people actually write it', () => {
    const code = 'ABCD'.padEnd(INVITE_CODE_LENGTH, 'X')
    expect(normalizeInviteCode(` ${code.toLowerCase()} `)).toBe(code)
    expect(normalizeInviteCode('ABCD-EFGH-JK')).toBe('ABCDEFGHJK')
    expect(isInviteCode('abcd-efgh-jk')).toBe(true)
  })

  it('rejects anything that is not exactly a code', () => {
    expect(isInviteCode('')).toBe(false)
    expect(isInviteCode('ABCDEFGHJ')).toBe(false) // one short
    expect(isInviteCode('ABCDEFGHJKM')).toBe(false) // one long
    // Contains excluded glyphs — must fail rather than being "corrected",
    // which could turn a typo into somebody else's real code.
    expect(isInviteCode('ABCDEFGHI0')).toBe(false)
  })
})

describe('inviteStatus', () => {
  const now = new Date('2026-08-27T00:00:00.000Z')
  const base = { isActive: true, expiresAt: null, maxUses: null, useCount: 0 }

  it('passes a plain unlimited link', () => {
    expect(inviteStatus(base, now)).toBe('ok')
    expect(isInviteUsable(base, now)).toBe(true)
  })

  it('reports a switched-off link as off even once it has also expired', () => {
    // Order matters: the admin turned it off, and that is the honest reason.
    const invite = { ...base, isActive: false, expiresAt: '2020-01-01T00:00:00Z' }
    expect(inviteStatus(invite, now)).toBe('inactive')
  })

  it('expires on the boundary rather than a moment after', () => {
    expect(inviteStatus({ ...base, expiresAt: now }, now)).toBe('expired')
    expect(inviteStatus({ ...base, expiresAt: new Date(now.getTime() + 1000) }, now)).toBe('ok')
  })

  it('counts uses against the limit', () => {
    expect(inviteStatus({ ...base, maxUses: 3, useCount: 2 }, now)).toBe('ok')
    expect(inviteStatus({ ...base, maxUses: 3, useCount: 3 }, now)).toBe('exhausted')
    // No limit set means no limit, however many times it has been used.
    expect(inviteStatus({ ...base, maxUses: null, useCount: 9999 }, now)).toBe('ok')
  })

  it('treats a missing invite as unusable rather than throwing', () => {
    expect(inviteStatus(null, now)).toBe('inactive')
  })
})

describe('isSelfServiceTier', () => {
  it('refuses the groups the plan says an admin must assign', () => {
    // "ยกเว้นกลุ่ม 50% และ 100% ที่เข้าเองไม่ได้ ต้องแอดมินตั้งให้"
    expect(isSelfServiceTier({ key: 'scc', staffOnly: true })).toBe(false)
    expect(isSelfServiceTier({ key: 'condo', staffOnly: false })).toBe(true)
  })

  it('refuses a group it cannot find, rather than allowing it', () => {
    expect(isSelfServiceTier(undefined)).toBe(false)
    expect(isSelfServiceTier(null)).toBe(false)
  })
})

describe('inviteUrl', () => {
  it('builds a link that survives a trailing slash on the origin', () => {
    expect(inviteUrl('https://lovepier.cafe/', 'ABCDEFGHJK')).toBe(
      'https://lovepier.cafe/join?code=ABCDEFGHJK'
    )
  })
})
