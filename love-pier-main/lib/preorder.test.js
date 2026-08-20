import { describe, expect, it } from 'vitest'
import {
  addDaysYmd,
  availableDates,
  bangkokDateParts,
  bangkokSlotToInstant,
  formatDayThai,
  formatSlotThai,
  parseClosedDays,
  slotsForDate,
  validateScheduleRequest,
  weekdayOfYmd,
} from './preorder'

// Every test injects a fixed `now`. Nothing here may depend on the wall clock
// or on the process timezone — the suite is run under several TZ values (see
// the header of preorder.js) and must give identical results in all of them.

// 2026-08-20 is a Thursday and 2026-08-26 is a Wednesday (the shop's closed
// day), which is what makes the "skips a closed day" cases below meaningful.
const THU = '2026-08-20'
const FRI = '2026-08-21'
const TUE = '2026-08-25'
const WED = '2026-08-26'
const NEXT_THU = '2026-08-27'

const HOURS = { openTime: '09:00', closeTime: '18:00', closedDays: [3] }

describe('bangkokSlotToInstant', () => {
  it('converts a Bangkok wall-clock slot to the right instant', () => {
    expect(bangkokSlotToInstant(FRI, '14:00').toISOString()).toBe('2026-08-21T07:00:00.000Z')
  })

  it('uses a fixed +07:00 in every month — Thailand has no DST', () => {
    // The test that catches a future "improvement" swapping the literal
    // offset for Intl or the host timezone: both of these must be exactly
    // 7 hours, not 7 in one month and 6 or 8 in the other.
    expect(bangkokSlotToInstant('2026-01-15', '09:00').toISOString()).toBe('2026-01-15T02:00:00.000Z')
    expect(bangkokSlotToInstant('2026-07-15', '09:00').toISOString()).toBe('2026-07-15T02:00:00.000Z')
  })

  it('round-trips through bangkokDateParts across day, month, year and leap boundaries', () => {
    for (const [ymd, hhmm] of [
      [THU, '00:00'],
      [THU, '23:00'],
      ['2026-08-31', '17:00'],
      ['2026-12-31', '23:00'],
      ['2028-02-29', '09:00'],
    ]) {
      const parts = bangkokDateParts(bangkokSlotToInstant(ymd, hhmm))
      expect(`${parts.ymd} ${parts.hhmm}`).toBe(`${ymd} ${hhmm}`)
    }
  })

  it('returns null for anything malformed rather than throwing', () => {
    for (const [ymd, hhmm] of [
      ['2026-8-21', '14:00'], // not zero-padded
      ['2026-02-31', '14:00'], // a date that does not exist
      ['2026-13-01', '14:00'],
      [FRI, '9:00'],
      [FRI, '25:00'],
      [FRI, ''],
      ['', '14:00'],
      [null, null],
      [undefined, undefined],
      ['2026-08-21T14:00', '14:00'],
    ]) {
      expect(bangkokSlotToInstant(ymd, hhmm)).toBeNull()
    }
  })
})

describe('bangkokDateParts', () => {
  it('reports the Bangkok wall clock, not the host one', () => {
    const parts = bangkokDateParts(new Date('2026-08-20T17:30:00Z'))
    expect(parts.ymd).toBe('2026-08-21') // 00:30 the next day in Bangkok
    expect(parts.hhmm).toBe('00:30')
    expect(parts.weekday).toBe(5) // Friday
  })

  it('returns null for an unparseable instant', () => {
    expect(bangkokDateParts('not a date')).toBeNull()
    expect(bangkokDateParts(new Date('nope'))).toBeNull()
  })
})

describe('weekdayOfYmd / addDaysYmd', () => {
  it('derives the weekday without consulting the clock', () => {
    expect(weekdayOfYmd(THU)).toBe(4)
    expect(weekdayOfYmd(WED)).toBe(3)
  })

  it('rejects dates that do not exist', () => {
    expect(weekdayOfYmd('2026-02-31')).toBeNull()
    expect(weekdayOfYmd('2026-13-01')).toBeNull()
    expect(weekdayOfYmd('nope')).toBeNull()
  })

  it('crosses month and year boundaries', () => {
    expect(addDaysYmd('2026-08-31', 1)).toBe('2026-09-01')
    expect(addDaysYmd('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysYmd('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('slotsForDate', () => {
  const now = new Date('2026-08-19T00:00:00Z') // well before any of these days

  it('offers whole hours from opening, and stops an hour before closing', () => {
    const slots = slotsForDate(THU, { ...HOURS, now })
    expect(slots).toEqual([
      '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    ])
    // 18:00 would promise a handover at the moment staff are shutting down.
    expect(slots).toHaveLength(9)
    expect(slots.at(-1)).toBe('17:00')
  })

  it('returns nothing on a closed day', () => {
    expect(weekdayOfYmd(WED)).toBe(3) // derived, not assumed
    expect(slotsForDate(WED, { ...HOURS, now })).toEqual([])
  })

  it('opens every day when closedDays is empty', () => {
    expect(slotsForDate(WED, { ...HOURS, closedDays: [], now })).toHaveLength(9)
  })

  it('drops slots inside the lead time', () => {
    const at0931 = new Date('2026-08-20T02:31:00Z') // 09:31 in Bangkok
    expect(slotsForDate(THU, { ...HOURS, leadMinutes: 0, now: at0931 })[0]).toBe('10:00')
    expect(slotsForDate(THU, { ...HOURS, leadMinutes: 60, now: at0931 })[0]).toBe('11:00')
  })

  it('empties out once the lead time passes the last slot', () => {
    const at1730 = new Date('2026-08-20T10:30:00Z') // 17:30 in Bangkok
    expect(slotsForDate(THU, { ...HOURS, leadMinutes: 60, now: at1730 })).toEqual([])
  })

  it('returns [] for a date in the past instead of offering it', () => {
    expect(slotsForDate('2026-08-18', { ...HOURS, now })).toEqual([])
  })

  it('never throws on degenerate opening hours', () => {
    expect(slotsForDate(THU, { ...HOURS, closeTime: '09:30', now })).toEqual([])
    expect(slotsForDate(THU, { ...HOURS, openTime: '18:00', closeTime: '09:00', now })).toEqual([])
    expect(slotsForDate(THU, { ...HOURS, openTime: 'nonsense', now })[0]).toBe('09:00')
    expect(slotsForDate('nope', { ...HOURS, now })).toEqual([])
  })
})

describe('availableDates', () => {
  it('omits closed days and never returns an empty slot list', () => {
    const now = new Date('2026-08-20T01:00:00Z') // 08:00 Thursday in Bangkok
    const days = availableDates({ ...HOURS, leadMinutes: 60, maxDaysAhead: 7, now })
    expect(days.map((d) => d.ymd)).not.toContain(WED)
    expect(days.every((d) => d.slots.length > 0)).toBe(true)
    expect(days.length).toBeLessThanOrEqual(8) // today + 7
  })

  it('starts today when today still has slots left', () => {
    const now = new Date('2026-08-20T01:00:00Z') // 08:00 Thursday
    const days = availableDates({ ...HOURS, leadMinutes: 60, maxDaysAhead: 7, now })
    expect(days[0].ymd).toBe(THU)
    expect(days[0].slots[0]).toBe('09:00')
  })

  it('skips a used-up today AND the closed day after it', () => {
    // 17:30 on Tuesday: the lead time eats what is left of today, and
    // tomorrow is the shop's Wednesday closure — so the first offer is
    // Thursday, with no special case for either.
    const now = new Date('2026-08-25T10:30:00Z')
    const days = availableDates({ ...HOURS, leadMinutes: 60, maxDaysAhead: 7, now })
    expect(days[0].ymd).toBe(NEXT_THU)
    expect(days.map((d) => d.ymd)).not.toContain(TUE)
    expect(days.map((d) => d.ymd)).not.toContain(WED)
  })

  it('respects maxDaysAhead', () => {
    const now = new Date('2026-08-20T01:00:00Z')
    expect(availableDates({ ...HOURS, maxDaysAhead: 0, now }).map((d) => d.ymd)).toEqual([THU])
    expect(availableDates({ ...HOURS, maxDaysAhead: 1, now }).map((d) => d.ymd)).toEqual([THU, FRI])
  })

  it('returns [] when nothing is bookable at all, so the UI can hide the option', () => {
    const now = new Date('2026-08-20T10:30:00Z') // 17:30, today used up
    expect(availableDates({ ...HOURS, leadMinutes: 60, maxDaysAhead: 0, now })).toEqual([])
    expect(availableDates({ ...HOURS, closedDays: [0, 1, 2, 3, 4, 5, 6], maxDaysAhead: 7, now })).toEqual([])
  })
})

describe('validateScheduleRequest', () => {
  const now = new Date('2026-08-20T01:00:00Z') // 08:00 Thursday in Bangkok
  const opts = { ...HOURS, leadMinutes: 60, maxDaysAhead: 7, now }

  const code = (scheduledDate, scheduledSlot) =>
    validateScheduleRequest({ scheduledDate, scheduledSlot }, opts).code

  it('accepts a slot the picker would offer, and returns the instant to store', () => {
    const result = validateScheduleRequest({ scheduledDate: FRI, scheduledSlot: '14:00' }, opts)
    expect(result.ok).toBe(true)
    expect(result.scheduledFor.toISOString()).toBe('2026-08-21T07:00:00.000Z')
  })

  it('rejects a malformed pair, including one field without the other', () => {
    expect(code('2026-02-31', '14:00')).toBe('MALFORMED')
    expect(code(FRI, '')).toBe('MALFORMED')
    expect(code('', '14:00')).toBe('MALFORMED')
    expect(validateScheduleRequest({}, opts).code).toBe('MALFORMED')
  })

  it('rejects a date beyond the window', () => {
    expect(code(addDaysYmd(THU, 8), '14:00')).toBe('TOO_FAR')
  })

  it('rejects a closed day', () => {
    expect(code(WED, '14:00')).toBe('CLOSED_DAY')
  })

  it('rejects times outside opening hours, including the closing hour itself', () => {
    expect(code(FRI, '08:00')).toBe('OUTSIDE_HOURS')
    expect(code(FRI, '18:00')).toBe('OUTSIDE_HOURS')
    expect(code(FRI, '23:00')).toBe('OUTSIDE_HOURS')
  })

  it('rejects a time in the past or inside the lead time', () => {
    expect(code('2026-08-18', '14:00')).toBe('TOO_SOON') // already gone
    // 08:00 now with a 90-minute lead puts the cutoff at 09:30.
    expect(validateScheduleRequest({ scheduledDate: THU, scheduledSlot: '09:00' }, { ...opts, leadMinutes: 90 }).code)
      .toBe('TOO_SOON')
  })

  it('treats the lead-time cutoff as inclusive', () => {
    // 08:00 now + a 60-minute lead lands exactly on the 09:00 slot, which
    // stays bookable. slotsForDate uses the same `>=`, so the picker and this
    // check agree on the boundary rather than disagreeing by one slot.
    expect(validateScheduleRequest({ scheduledDate: THU, scheduledSlot: '09:00' }, opts).ok).toBe(true)
  })

  it('carries the configured numbers into its messages', () => {
    expect(validateScheduleRequest({ scheduledDate: WED, scheduledSlot: '14:00' }, opts).error)
      .toContain('ร้านปิด')
    expect(validateScheduleRequest({ scheduledDate: FRI, scheduledSlot: '08:00' }, opts).error)
      .toContain('09:00–18:00')
    expect(validateScheduleRequest({ scheduledDate: addDaysYmd(THU, 8), scheduledSlot: '14:00' }, opts).error)
      .toContain('7 วัน')
  })
})

describe('parseClosedDays', () => {
  it('falls back to the shop closure only when the setting was never written', () => {
    expect(parseClosedDays(undefined)).toEqual([3])
    expect(parseClosedDays(null)).toEqual([3])
  })

  it('treats a blank value as "open every day" rather than as unset', () => {
    // The trap this exists for: '' is falsy, so the `m[K] ? … : default`
    // idiom used by the numeric settings would silently reinstate Wednesday.
    expect(parseClosedDays('')).toEqual([])
  })

  it('parses a comma list and drops anything out of range', () => {
    expect(parseClosedDays('3')).toEqual([3])
    expect(parseClosedDays('0,3')).toEqual([0, 3])
    expect(parseClosedDays(' 0 , 3 ')).toEqual([0, 3])
    expect(parseClosedDays('3,junk,9,-1')).toEqual([3])
  })
})

describe('formatDayThai', () => {
  it('abbreviates the weekday so the date select cannot overflow', () => {
    // th-TH's own ICU short weekday is 'พฤหัส'; this must stay shorter.
    expect(formatDayThai(THU)).toBe('พฤ. 20 ส.ค.')
    expect(formatDayThai(FRI)).toBe('ศ. 21 ส.ค.')
  })

  it('returns an empty string for a date that does not exist', () => {
    expect(formatDayThai('2026-02-31')).toBe('')
  })
})

describe('formatSlotThai', () => {
  it('renders a short, non-wrapping Thai label', () => {
    expect(formatSlotThai(FRI, '14:00')).toBe('ศ. 21 ส.ค. 14:00')
    expect(formatSlotThai(THU, '09:00')).toBe('พฤ. 20 ส.ค. 09:00')
  })

  it('returns an empty string rather than a broken label', () => {
    expect(formatSlotThai('2026-02-31', '14:00')).toBe('')
    expect(formatSlotThai(FRI, 'nope')).toBe('')
  })
})
