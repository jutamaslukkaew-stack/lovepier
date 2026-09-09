import { describe, expect, it } from 'vitest'
import {
  addDaysYmd,
  availableDates,
  bangkokDateParts,
  bangkokSlotToInstant,
  customTimeOptions,
  formatDayThai,
  formatSlotThai,
  parseClosedDays,
  resolvePickupWindow,
  shopOpenState,
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

  it('offers whole hours from opening through closing time', () => {
    const slots = slotsForDate(THU, { ...HOURS, now })
    expect(slots).toEqual([
      '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
    ])
    // Closing time is collectable (2026-09-09). It used to stop at 17:00 to
    // leave a whole slot before the door shut; a shop that wants that back
    // sets a pickup window or shop_last_order_minutes, both of which say so.
    expect(slots).toHaveLength(10)
    expect(slots.at(-1)).toBe('18:00')
  })

  it('returns nothing on a closed day', () => {
    expect(weekdayOfYmd(WED)).toBe(3) // derived, not assumed
    expect(slotsForDate(WED, { ...HOURS, now })).toEqual([])
  })

  it('opens every day when closedDays is empty', () => {
    expect(slotsForDate(WED, { ...HOURS, closedDays: [], now })).toHaveLength(10)
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
    // Opening at 09:00 and closing at 09:30 leaves exactly one collectable
    // moment on an hourly grid, and 09:00 is it.
    expect(slotsForDate(THU, { ...HOURS, closeTime: '09:30', now })).toEqual(['09:00'])
    expect(slotsForDate(THU, { ...HOURS, openTime: '18:00', closeTime: '09:00', now })).toEqual([])
    expect(slotsForDate(THU, { ...HOURS, openTime: 'nonsense', now })[0]).toBe('09:00')
    expect(slotsForDate('nope', { ...HOURS, now })).toEqual([])
  })
})

describe('availableDates', () => {
  it('can enforce the Pre Order catalogue minimum of three full days', () => {
    const now = new Date('2026-08-20T01:00:00Z') // Thu 08:00 Bangkok
    const days = availableDates({ ...HOURS, leadMinutes: 3 * 24 * 60, maxDaysAhead: 7, now })
    expect(days[0].ymd).toBe('2026-08-23')
    expect(days[0].slots[0]).toBe('09:00')
  })

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

  it('rejects times outside opening hours, but accepts the closing hour', () => {
    expect(code(FRI, '08:00')).toBe('OUTSIDE_HOURS')
    expect(code(FRI, '23:00')).toBe('OUTSIDE_HOURS')
    // The picker offers 18:00, so the server has to accept it. These two read
    // the same bounds for exactly this reason.
    expect(validateScheduleRequest({ scheduledDate: FRI, scheduledSlot: '18:00' }, opts).ok).toBe(true)
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
    // The RESOLVED window, not raw trading hours. They coincide here, but a
    // shop can narrow the window per dish, and then the message has to name
    // what it actually resolved to — or a customer refused at 09:20 is told to
    // try a time that is also refused.
    expect(validateScheduleRequest({ scheduledDate: FRI, scheduledSlot: '08:00' }, opts).error)
      .toContain('09:00–18:00')
    expect(validateScheduleRequest({ scheduledDate: addDaysYmd(THU, 8), scheduledSlot: '14:00' }, opts).error)
      .toContain('7 วัน')
  })
})

describe('slotsForDate — slot interval', () => {
  const now = new Date('2026-08-19T00:00:00Z') // well before any of these days

  it('halves the grid at 30 minutes without moving either end', () => {
    const slots = slotsForDate(FRI, { ...HOURS, now, slotMinutes: 30 })
    expect(slots).toHaveLength(19)
    expect(slots[0]).toBe('09:00')
    // Both ends are the shop's own hours whatever the interval — the interval
    // is spacing and nothing else. It used to shorten the day by one slot.
    expect(slots.at(-1)).toBe('18:00')
  })

  it('falls back to hourly on a missing or unusable interval', () => {
    const hourly = slotsForDate(FRI, { ...HOURS, now })
    expect(slotsForDate(FRI, { ...HOURS, now, slotMinutes: 0 })).toEqual(hourly)
    expect(slotsForDate(FRI, { ...HOURS, now, slotMinutes: 'ทุกครึ่งชั่วโมง' })).toEqual(hourly)
    expect(slotsForDate(FRI, { ...HOURS, now, slotMinutes: null })).toEqual(hourly)
  })

  it('fills a short day with more offers, not with a later last one', () => {
    // 09:00-09:30 is one hourly offer and two half-hourly ones. The extra
    // offer is 09:30, INSIDE the day — the interval never moves the end.
    expect(slotsForDate(FRI, { ...HOURS, now, closeTime: '09:30' })).toEqual(['09:00'])
    expect(slotsForDate(FRI, { ...HOURS, now, closeTime: '09:30', slotMinutes: 30 }))
      .toEqual(['09:00', '09:30'])
  })
})

describe('slotsForDate — pickup window', () => {
  const now = new Date('2026-08-19T00:00:00Z') // well before any of these days

  it('treats the window end as the last bookable slot, not as a closing time', () => {
    // The whole point of the inclusive end: a shop that writes "รับได้
    // 10:00-14:00" must see 14:00 in its own picker.
    const slots = slotsForDate(FRI, { ...HOURS, now, windowStart: '10:00', windowEnd: '14:00' })
    expect(slots[0]).toBe('10:00')
    expect(slots.at(-1)).toBe('14:00')
    expect(slots).not.toContain('09:00')
    expect(slots).not.toContain('15:00')
  })

  it('never lets a window widen the day past trading hours', () => {
    const slots = slotsForDate(FRI, { ...HOURS, now, windowStart: '07:00', windowEnd: '23:00' })
    expect(slots).toEqual(slotsForDate(FRI, { ...HOURS, now }))
  })

  it('returns nothing for an inverted or unreachable window', () => {
    expect(slotsForDate(FRI, { ...HOURS, now, windowStart: '14:00', windowEnd: '10:00' })).toEqual([])
    expect(slotsForDate(FRI, { ...HOURS, now, windowStart: '06:00', windowEnd: '08:00' })).toEqual([])
  })

  it('still refuses a closed day however narrow the window', () => {
    expect(slotsForDate(WED, { ...HOURS, now, windowStart: '10:00', windowEnd: '14:00' })).toEqual([])
  })
})

describe('resolvePickupWindow', () => {
  const SHOP = { shopOpen: '09:00', shopClose: '18:00' }

  it('falls back to the whole trading day when nothing is configured', () => {
    expect(resolvePickupWindow(SHOP)).toMatchObject({ ok: true, startTime: '09:00', endTime: '18:00' })
  })

  it('reports the same end whatever the interval', () => {
    expect(resolvePickupWindow({ ...SHOP, slotMinutes: 30 }))
      .toMatchObject({ ok: true, startTime: '09:00', endTime: '18:00' })
  })

  it('clamps the shop-wide pre-order window to trading hours', () => {
    // The confirmed product decision: a pickup window can only ever narrow
    // the day. 08:00 with the shop opening at 09:00 has no effect.
    expect(resolvePickupWindow({ ...SHOP, pickupOpen: '08:00', pickupClose: '16:00' }))
      .toMatchObject({ ok: true, startTime: '09:00', endTime: '16:00' })
  })

  it('takes the tightest bound across overlapping dishes', () => {
    const out = resolvePickupWindow({
      ...SHOP,
      itemWindows: [
        { name: 'ขนมจีน', start: '10:00', end: '14:00' },
        { name: 'แกงเขียวหวาน', start: '11:00', end: '16:00' },
      ],
    })
    expect(out).toMatchObject({ ok: true, startTime: '11:00', endTime: '14:00' })
    expect(out.narrowedBy.map((w) => w.name)).toEqual(['ขนมจีน', 'แกงเขียวหวาน'])
  })

  it('names only the dishes that actually narrowed the window', () => {
    const out = resolvePickupWindow({
      ...SHOP,
      itemWindows: [
        { name: 'ขนมจีน', start: '10:00', end: '14:00' },
        { name: 'ข้าวเหนียว', start: '', end: '' },
      ],
    })
    expect(out.narrowedBy.map((w) => w.name)).toEqual(['ขนมจีน'])
  })

  it('reports two dishes that cannot share a time as an item conflict', () => {
    expect(resolvePickupWindow({
      ...SHOP,
      itemWindows: [
        { name: 'ขนมจีน', start: '10:00', end: '12:00' },
        { name: 'ข้าวหมกไก่', start: '15:00', end: '17:00' },
      ],
    })).toEqual({ ok: false, reason: 'ITEM_CONFLICT' })
  })

  it('distinguishes one dish falling outside trading hours from a dish conflict', () => {
    // Same emptiness, different fix — the shop changes its hours here, and
    // the customer splits the order in the case above.
    expect(resolvePickupWindow({
      ...SHOP,
      itemWindows: [{ name: 'ขนมปังเช้า', start: '06:00', end: '08:00' }],
    })).toEqual({ ok: false, reason: 'OUTSIDE_HOURS' })
  })

  it('reports a shop-wide window outside trading hours as OUTSIDE_HOURS', () => {
    expect(resolvePickupWindow({ ...SHOP, pickupOpen: '19:00', pickupClose: '21:00' }))
      .toEqual({ ok: false, reason: 'OUTSIDE_HOURS' })
  })
})

describe('validateScheduleRequest — custom times', () => {
  const NOW = new Date('2026-08-20T01:00:00Z') // 08:00 in Bangkok
  const opts = { ...HOURS, leadMinutes: 60, maxDaysAhead: 7, now: NOW }

  it('accepts an off-grid time only when the shop opted in', () => {
    const req = { scheduledDate: FRI, scheduledSlot: '14:20' }
    expect(validateScheduleRequest(req, opts).code).toBe('UNAVAILABLE')
    expect(validateScheduleRequest(req, { ...opts, allowCustomTime: true }).ok).toBe(true)
  })

  it('still applies every non-grid rule to a typed time', () => {
    const custom = { ...opts, allowCustomTime: true }
    expect(validateScheduleRequest({ scheduledDate: WED, scheduledSlot: '14:20' }, custom).code)
      .toBe('CLOSED_DAY')
    expect(validateScheduleRequest({ scheduledDate: THU, scheduledSlot: '08:20' }, custom).code)
      .toBe('OUTSIDE_HOURS')
    expect(validateScheduleRequest({ scheduledDate: THU, scheduledSlot: '09:20' }, { ...custom, leadMinutes: 24 * 60 }).code)
      .toBe('TOO_SOON')
    expect(validateScheduleRequest({ scheduledDate: addDaysYmd(THU, 8), scheduledSlot: '14:20' }, custom).code)
      .toBe('TOO_FAR')
  })

  it('refuses a typed time outside the resolved pickup window', () => {
    const custom = { ...opts, allowCustomTime: true, windowStart: '10:00', windowEnd: '14:00' }
    expect(validateScheduleRequest({ scheduledDate: FRI, scheduledSlot: '09:20' }, custom).code)
      .toBe('OUTSIDE_HOURS')
    expect(validateScheduleRequest({ scheduledDate: FRI, scheduledSlot: '13:40' }, custom).ok).toBe(true)
  })

  it('refuses a typed time on a day the picker would never offer', () => {
    // The empty-grid check has to survive allowCustomTime, or a typed time
    // becomes a way to book a day that is entirely used up.
    const custom = { ...opts, allowCustomTime: true, windowStart: '06:00', windowEnd: '08:00' }
    expect(validateScheduleRequest({ scheduledDate: FRI, scheduledSlot: '07:20' }, custom).code)
      .toBe('OUTSIDE_HOURS')
  })
})

describe('customTimeOptions', () => {
  const NOW = new Date('2026-08-20T01:00:00Z') // 08:00 in Bangkok
  const opts = { ...HOURS, leadMinutes: 60, now: NOW }

  it('offers five-minute steps between the same bounds as the grid', () => {
    const times = customTimeOptions(FRI, opts)
    expect(times[0]).toBe('09:00')
    expect(times[1]).toBe('09:05')
    // The LAST value is the grid's last slot, not close - 5. This is the whole
    // reason the function exists rather than slotsForDate({ slotMinutes: 5 }).
    expect(times.at(-1)).toBe(slotsForDate(FRI, opts).at(-1))
    expect(times.at(-1)).toBe('18:00')
  })

  it('keeps an explicit pickup window inclusive, as the grid does', () => {
    const windowed = { ...opts, windowStart: '10:00', windowEnd: '14:00', slotMinutes: 30 }
    const times = customTimeOptions(FRI, windowed)
    expect(times[0]).toBe('10:00')
    expect(times.at(-1)).toBe('14:00')
  })

  it('applies the lead time and the closed days', () => {
    // 08:00 + 60 minutes, so today starts at 09:00 anyway; push the lead out
    // and the early part of the day has to disappear.
    expect(customTimeOptions(THU, { ...opts, leadMinutes: 3 * 60 })[0]).toBe('11:00')
    expect(customTimeOptions(WED, opts)).toEqual([])
  })

  it('offers nothing on a day the grid has nothing left on', () => {
    // The two must agree: a day the date <select> refuses to list must not be
    // reachable by choosing an hour and a minute either.
    const late = { ...opts, now: new Date('2026-08-20T11:00:00Z') } // 18:00 Bangkok
    expect(slotsForDate(THU, late)).toEqual([])
    expect(customTimeOptions(THU, late)).toEqual([])
  })

  it('only returns times validateScheduleRequest will accept', () => {
    const windowed = { ...opts, windowStart: '10:00', windowEnd: '14:00', slotMinutes: 30, maxDaysAhead: 7 }
    for (const hhmm of customTimeOptions(FRI, windowed)) {
      const res = validateScheduleRequest(
        { scheduledDate: FRI, scheduledSlot: hhmm },
        { ...windowed, allowCustomTime: true }
      )
      expect(res.ok, `${hhmm} -> ${res.code}`).toBe(true)
    }
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

// A Bangkok wall-clock time -> the instant to feed shopOpenState as `now`.
const at = (ymd, hhmm) => new Date(`${ymd}T${hhmm}:00+07:00`)

describe('shopOpenState', () => {
  it('is open and accepting during opening hours', () => {
    const s = shopOpenState({ now: at(THU, '12:00'), ...HOURS })
    expect(s).toMatchObject({ open: true, accepting: true, reason: 'open' })
    expect(s.opensAt).toBe('09:00')
    expect(s.closesAt).toBe('18:00')
  })

  it('is shut before opening, and says when it opens today', () => {
    const s = shopOpenState({ now: at(THU, '08:59'), ...HOURS })
    expect(s).toMatchObject({ open: false, accepting: false, reason: 'before-open' })
    expect(s.nextOpenYmd).toBe(THU)
    expect(s.nextOpenLabel).toBe('09:00')
  })

  it('opens exactly on the minute and shuts exactly on the minute', () => {
    expect(shopOpenState({ now: at(THU, '09:00'), ...HOURS }).open).toBe(true)
    // 18:00 is closing time, not the last minute of trade.
    expect(shopOpenState({ now: at(THU, '18:00'), ...HOURS }).open).toBe(false)
    expect(shopOpenState({ now: at(THU, '17:59'), ...HOURS }).open).toBe(true)
  })

  it('after closing, points at the next day with the Thai date', () => {
    const s = shopOpenState({ now: at(THU, '19:00'), ...HOURS })
    expect(s).toMatchObject({ open: false, accepting: false, reason: 'after-close' })
    expect(s.nextOpenYmd).toBe(FRI)
    expect(s.nextOpenLabel).toBe('ศ. 21 ส.ค. 09:00')
  })

  it('is shut all day on a closed day and skips it when looking ahead', () => {
    const s = shopOpenState({ now: at(WED, '12:00'), ...HOURS })
    expect(s).toMatchObject({ open: false, accepting: false, reason: 'closed-day' })
    expect(s.nextOpenYmd).toBe(NEXT_THU)
  })

  it('from the day before a closure, skips to the day after it', () => {
    expect(shopOpenState({ now: at(TUE, '19:00'), ...HOURS }).nextOpenYmd).toBe(NEXT_THU)
  })

  it('treats an empty closed-days list as open every day', () => {
    // '' is meaningful — see parseClosedDays.
    expect(shopOpenState({ now: at(WED, '12:00'), ...HOURS, closedDays: '' }).open).toBe(true)
  })
})

describe('shopOpenState — last-order cutoff', () => {
  const WITH_CUTOFF = { ...HOURS, lastOrderMinutes: 30 }

  it('stops accepting before the door shuts, while still reading as open', () => {
    // The kitchen must not be handed a ticket it cannot finish.
    const s = shopOpenState({ now: at(THU, '17:40'), ...WITH_CUTOFF })
    expect(s).toMatchObject({ open: true, accepting: false, reason: 'last-order-passed' })
    expect(s.lastOrderAt).toBe('17:30')
  })

  it('accepts right up to the cutoff', () => {
    expect(shopOpenState({ now: at(THU, '17:29'), ...WITH_CUTOFF }).accepting).toBe(true)
    expect(shopOpenState({ now: at(THU, '17:30'), ...WITH_CUTOFF }).accepting).toBe(false)
  })

  it('defaults to accepting right up to closing time', () => {
    expect(shopOpenState({ now: at(THU, '17:59'), ...HOURS }).accepting).toBe(true)
    expect(shopOpenState({ now: at(THU, '17:59'), ...HOURS }).lastOrderAt).toBe('18:00')
  })
})

describe('shopOpenState — overnight hours', () => {
  // 18:00 -> 02:00. Without the wrap-around branch this reads as "closed all
  // day", which is the silent bug the moment the shop extends its hours.
  const LATE = { openTime: '18:00', closeTime: '02:00', closedDays: [] }

  it('is open late in the evening and in the small hours', () => {
    expect(shopOpenState({ now: at(THU, '23:00'), ...LATE }).open).toBe(true)
    expect(shopOpenState({ now: at(FRI, '01:00'), ...LATE }).open).toBe(true)
  })

  it('is shut between closing and the next opening', () => {
    expect(shopOpenState({ now: at(FRI, '02:00'), ...LATE }).open).toBe(false)
    const s = shopOpenState({ now: at(FRI, '10:00'), ...LATE })
    expect(s).toMatchObject({ open: false, reason: 'before-open' })
    expect(s.nextOpenLabel).toBe('18:00')
  })

  it('counts the small hours as the PREVIOUS day for the closed-day check', () => {
    // Wednesday is closed. 01:00 Thursday is still Wednesday night's trade,
    // so it must be shut — while 01:00 Wednesday belongs to Tuesday and is open.
    const closedWed = { ...LATE, closedDays: [3] }
    expect(shopOpenState({ now: at(NEXT_THU, '01:00'), ...closedWed }).open).toBe(false)
    expect(shopOpenState({ now: at(WED, '01:00'), ...closedWed }).open).toBe(true)
  })

  it('applies the cutoff across midnight', () => {
    const s = shopOpenState({ now: at(FRI, '01:45'), ...LATE, lastOrderMinutes: 30 })
    expect(s).toMatchObject({ open: true, accepting: false })
    expect(s.lastOrderAt).toBe('01:30')
  })
})

describe('shopOpenState — bad input never silently opens the shop', () => {
  it('falls back to the documented defaults for an unparseable time', () => {
    // The admin form takes free text, so '9am' is storable. Falling back is
    // fine; pretending to be open at 03:00 would not be.
    const s = shopOpenState({ now: at(THU, '03:00'), openTime: '9am', closeTime: 'nope', closedDays: [] })
    expect(s.opensAt).toBe('09:00')
    expect(s.closesAt).toBe('18:00')
    expect(s.open).toBe(false)
  })

  it('is shut when the clock itself is unreadable', () => {
    expect(shopOpenState({ now: new Date('nonsense'), ...HOURS }))
      .toMatchObject({ open: false, accepting: false, reason: 'unknown' })
  })

  it('is shut, not crashed, when every day is a closed day', () => {
    const s = shopOpenState({ now: at(THU, '12:00'), ...HOURS, closedDays: [0, 1, 2, 3, 4, 5, 6] })
    expect(s).toMatchObject({ open: false, reason: 'closed-day', nextOpenYmd: null, nextOpenLabel: '' })
  })
})
