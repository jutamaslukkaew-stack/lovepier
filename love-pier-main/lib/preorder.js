// Pre-order ("สั่งล่วงหน้า") slot math for /delivery. Pure, no I/O — mirrors
// lib/deliveryFee.js and lib/points.js so it's safe to import from BOTH the
// client (the picker in components/delivery/OrderFlow.js) and the server
// (source of truth in pages/api/orders.js).
//
// THIS FILE MUST IMPORT NOTHING. Not `./db`, not `./settings`, not a date
// library. A dual-use module that reaches `./db` pulls in `postgres`, which
// needs Node builtins (`fs`, `perf_hooks`) that don't exist in the browser,
// and the client bundle fails to build. That failure is invisible to both
// `tsc --noEmit` and `vitest run` — neither builds a browser bundle — so
// `npm run build` is the only thing that catches it. See lib/points.js for
// the same rule and the split that came out of it.
//
// ── Timezone ──────────────────────────────────────────────────────────────
// The customer picks a Bangkok wall-clock slot; the DB stores an instant
// (orders.scheduled_for, timestamptz). Every conversion in either direction
// happens HERE and nowhere else, and none of it consults the host clock:
// `new Date('...+07:00')` for the way in, and a fixed +420-minute shift read
// through the getUTC* accessors for the way out. That is what makes the
// answer identical on Vercel (UTC), on a shop laptop (UTC+7), and in CI.
// Thailand has been UTC+7 with no DST since 1920 and there is no mechanism
// by which a stored instant could become ambiguous.
//
// Nothing here uses Intl/toLocale* on purpose — those read the host timezone
// unless every call passes an explicit `timeZone`, which is exactly the kind
// of thing that gets forgotten one call site at a time.

export const BANGKOK_OFFSET_MINUTES = 420 // UTC+7, fixed.
export const SLOT_MINUTES = 60
export const DEFAULT_OPEN_TIME = '09:00'
export const DEFAULT_CLOSE_TIME = '18:00'
// 0 = Sunday … 6 = Saturday. The shop closes on Wednesdays.
export const DEFAULT_CLOSED_DAYS = [3]

const THAI_WEEKDAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/
const HHMM_RE = /^\d{2}:\d{2}$/

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** 'HH:MM' -> minutes since midnight, or null if it isn't one. */
function hhmmToMinutes(hhmm) {
  if (!HHMM_RE.test(String(hhmm))) return null
  const h = parseInt(String(hhmm).slice(0, 2), 10)
  const m = parseInt(String(hhmm).slice(3, 5), 10)
  if (h > 23 || m > 59) return null
  return h * 60 + m
}

function minutesToHhmm(mins) {
  return `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`
}

/** Resolve an opening/closing time, falling back to the exported default. */
function resolveTime(value, fallback) {
  const mins = hhmmToMinutes(value)
  return mins == null ? hhmmToMinutes(fallback) : mins
}

/**
 * Settings value -> array of weekday indices the shop is closed.
 *
 * `undefined`/`null` (key never set) means "use the shop's real closure", but
 * a bare '' is a MEANINGFUL value here — it means "open every day". That's
 * why this can't use the `m[K] ? … : default` idiom the numeric settings in
 * lib/settings.js use: '' is falsy and would silently reinstate the Wednesday
 * closure the moment the shop tries to turn it off.
 */
export function parseClosedDays(value) {
  if (value == null) return [...DEFAULT_CLOSED_DAYS]
  return String(value)
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
}

function resolveClosedDays(closedDays) {
  if (Array.isArray(closedDays)) {
    return closedDays.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
  }
  return parseClosedDays(closedDays)
}

/** 'YYYY-MM-DD' -> 0..6 (Sun..Sat), or null. Calendar-only, no clock. */
export function weekdayOfYmd(ymd) {
  if (!YMD_RE.test(String(ymd))) return null
  const y = parseInt(String(ymd).slice(0, 4), 10)
  const m = parseInt(String(ymd).slice(5, 7), 10)
  const d = parseInt(String(ymd).slice(8, 10), 10)
  const t = new Date(Date.UTC(y, m - 1, d))
  // Rejects '2026-02-31' and '2026-13-01', which Date.UTC silently rolls over.
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null
  return t.getUTCDay()
}

/**
 * An instant -> the Bangkok wall-clock fields for it.
 *
 * Shift by the fixed offset, then read with the getUTC* accessors: those are
 * the only date accessors that don't consult the host timezone.
 */
export function bangkokDateParts(instant) {
  const ms = instant instanceof Date ? instant.getTime() : Date.parse(instant)
  if (!Number.isFinite(ms)) return null
  const t = new Date(ms + BANGKOK_OFFSET_MINUTES * 60000)
  const y = t.getUTCFullYear()
  const m = t.getUTCMonth() + 1
  const d = t.getUTCDate()
  const hour = t.getUTCHours()
  const minute = t.getUTCMinutes()
  return {
    y,
    m,
    d,
    hour,
    minute,
    weekday: t.getUTCDay(),
    ymd: `${y}-${pad2(m)}-${pad2(d)}`,
    hhmm: `${pad2(hour)}:${pad2(minute)}`,
    minutesOfDay: hour * 60 + minute,
  }
}

export function bangkokNowParts(now = new Date()) {
  return bangkokDateParts(now)
}

/**
 * A Bangkok wall-clock slot -> the instant to store.
 *
 * The literal '+07:00' in an ISO-8601 string is spec-mandated behaviour for
 * Date and is identical in every engine — that's the whole reason the offset
 * is written out rather than inferred from the environment.
 */
export function bangkokSlotToInstant(ymd, hhmm) {
  if (!YMD_RE.test(String(ymd)) || !HHMM_RE.test(String(hhmm))) return null
  const at = new Date(`${ymd}T${hhmm}:00+07:00`)
  if (Number.isNaN(at.getTime())) return null
  // Round-trip assert: catches anything the engine normalised rather than
  // refused (V8 accepts '2026-02-31' and yields March 3rd). Doing it here
  // means no caller downstream has to re-check.
  const back = bangkokDateParts(at)
  if (!back || back.ymd !== ymd || back.hhmm !== hhmm) return null
  return at
}

/** Calendar arithmetic on a 'YYYY-MM-DD', no timezone involved. */
export function addDaysYmd(ymd, n) {
  if (!YMD_RE.test(String(ymd))) return null
  const y = parseInt(String(ymd).slice(0, 4), 10)
  const m = parseInt(String(ymd).slice(5, 7), 10)
  const d = parseInt(String(ymd).slice(8, 10), 10)
  const t = new Date(Date.UTC(y, m - 1, d + (Number(n) || 0)))
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`
}

/**
 * Is the shop open RIGHT NOW, and is it still taking orders?
 *
 * The shop's hours have been stored since the pre-order work but were only
 * ever used for slot maths, so nothing stopped a customer ordering at 2am —
 * the order saved, PromptPay took the money, and three staff phones lit up.
 * This is the single answer every surface asks: /api/orders (the one that
 * actually blocks), /delivery, and the LINE entry card.
 *
 * `open` is whether the door is open; `accepting` is whether an ASAP order may
 * be placed, which stops `lastOrderMinutes` before closing so the kitchen is
 * not handed a ticket it cannot finish.
 *
 * Overnight hours (close <= open, e.g. 18:00–02:00) are handled: without this
 * the naive `mins >= open && mins < close` reads as "closed all day", a silent
 * bug the moment the shop extends its hours. For those, the small hours belong
 * to the PREVIOUS day's session, so that is the weekday the closed-day check
 * uses — otherwise a Wednesday closure would wrongly shut Tuesday's late trade.
 *
 * Pure: pass `now` to test it, same convention as the rest of this module.
 *
 * @returns {{open: boolean, accepting: boolean, reason: string,
 *   opensAt: string, closesAt: string, lastOrderAt: string,
 *   nextOpenYmd: string|null, nextOpenLabel: string}}
 */
export function shopOpenState({
  now = new Date(),
  openTime,
  closeTime,
  closedDays,
  lastOrderMinutes = 0,
} = {}) {
  const open = resolveTime(openTime, DEFAULT_OPEN_TIME)
  const close = resolveTime(closeTime, DEFAULT_CLOSE_TIME)
  const closedList = resolveClosedDays(closedDays)
  const lastOrder = Math.max(0, Number(lastOrderMinutes) || 0)
  const overnight = close <= open

  const opensAt = minutesToHhmm(open)
  const closesAt = minutesToHhmm(close)
  const lastOrderAt = minutesToHhmm(((close - lastOrder) % 1440 + 1440) % 1440)

  const parts = bangkokNowParts(now)
  // An unparseable clock must not silently hold the shutters open.
  if (!parts) {
    return {
      open: false, accepting: false, reason: 'unknown',
      opensAt, closesAt, lastOrderAt, nextOpenYmd: null, nextOpenLabel: '',
    }
  }

  const mins = parts.minutesOfDay
  const inHours = overnight ? (mins >= open || mins < close) : (mins >= open && mins < close)

  // Which calendar day's session are we in? Only differs before `close` on an
  // overnight schedule, where 01:00 still belongs to yesterday evening.
  const sessionYmd = overnight && mins < close ? addDaysYmd(parts.ymd, -1) : parts.ymd
  const sessionWeekday = weekdayOfYmd(sessionYmd)
  const onClosedDay = closedList.includes(sessionWeekday)

  // The next day the shop opens — today if opening is still ahead, otherwise
  // the first following day that isn't a closure. Null when every day is
  // closed, which is a misconfiguration rather than a schedule.
  let nextOpenYmd = null
  // `mins < open` covers both schedules: on an overnight one, being outside
  // hours always means we are before that same day's opening.
  const startsToday = mins < open && !closedList.includes(parts.weekday)
  if (startsToday) {
    nextOpenYmd = parts.ymd
  } else {
    for (let i = 1; i <= 7; i += 1) {
      const ymd = addDaysYmd(parts.ymd, i)
      if (!closedList.includes(weekdayOfYmd(ymd))) { nextOpenYmd = ymd; break }
    }
  }
  const nextOpenLabel = nextOpenYmd
    ? (nextOpenYmd === parts.ymd ? opensAt : `${formatDayThai(nextOpenYmd)} ${opensAt}`)
    : ''

  const base = { opensAt, closesAt, lastOrderAt, nextOpenYmd, nextOpenLabel }

  if (onClosedDay) return { ...base, open: false, accepting: false, reason: 'closed-day' }
  if (!inHours) {
    // Distinguished so each surface can say something useful: "opens at 09:00"
    // versus "opens tomorrow". On an overnight schedule the gap is always
    // before the same day's opening.
    const reason = overnight || mins < open ? 'before-open' : 'after-close'
    return { ...base, open: false, accepting: false, reason }
  }

  // Minutes left until the door shuts, crossing midnight when it has to.
  const minutesUntilClose = overnight && mins >= open ? close + 1440 - mins : close - mins
  if (minutesUntilClose <= lastOrder) {
    return { ...base, open: true, accepting: false, reason: 'last-order-passed' }
  }

  return { ...base, open: true, accepting: true, reason: 'open' }
}

/**
 * The first and last bookable slot START on a day, in minutes since midnight.
 *
 * ONE function, so what the picker offers (slotsForDate) and what the server
 * accepts (validateScheduleRequest) cannot drift apart. Two kinds of bound
 * meet here and they are NOT the same kind of number:
 *
 *   - closeTime is the moment the door shuts, so it is EXCLUSIVE: the last
 *     slot has to leave a whole slot before it. 09:00-18:00 at 60 gives
 *     09:00…17:00, exactly the nine the reservation form already offers
 *     (pages/reservation.js). An 18:00 slot would promise a handover at the
 *     moment staff are shutting down.
 *   - windowStart/windowEnd are a pickup window the shop typed in, so the end
 *     is INCLUSIVE: "รับได้ 10:00-14:00" has to offer 14:00, or the shop's own
 *     words contradict its own picker.
 *
 * Trading hours are the outer bound either way. A window can only ever narrow
 * the day, never widen it, so nothing an admin types can weaken the
 * shut-the-door rule above. That is a deliberate product decision, not a
 * limitation: a shop wanting collection before it opens has to move its
 * opening time, where the "we're closed right now" banner will see it too.
 *
 * With windowStart/windowEnd/slotMinutes all absent this returns exactly
 * { first: open, last: close - 60 }, and `m <= last` is arithmetically the
 * same loop as the `m + SLOT_MINUTES <= close` it replaced. That identity is
 * what lets an unconfigured shop keep today's behaviour bit for bit — the
 * existing tests are the proof and must pass untouched.
 */
function resolveSlotBounds(opts = {}) {
  const slotMinutes = Math.max(1, Math.floor(Number(opts.slotMinutes) || SLOT_MINUTES))
  const open = resolveTime(opts.openTime, DEFAULT_OPEN_TIME)
  const close = resolveTime(opts.closeTime, DEFAULT_CLOSE_TIME)
  if (open == null || close == null) return null

  // hhmmToMinutes, NOT resolveTime: resolveTime substitutes the module default
  // for anything unparseable, which would silently turn "no window set" into a
  // hard 09:00 and pin every shop to the same window.
  const wStart = hhmmToMinutes(opts.windowStart)
  const wEnd = hhmmToMinutes(opts.windowEnd)

  const first = wStart == null ? open : Math.max(open, wStart)
  const last = wEnd == null ? close - slotMinutes : Math.min(close - slotMinutes, wEnd)
  return { first, last, slotMinutes }
}

/**
 * Intersect every rule that can narrow when an order may be collected:
 * trading hours, the shop's pre-order pickup window, and a pickup window on
 * each ordered dish. Returns the window the picker should offer.
 *
 * { ok: true, startTime, endTime, narrowedBy } — 'HH:MM' bounds, both
 * inclusive slot starts, plus the names of the dishes that actually made the
 * window smaller (so the customer can be told WHY their choice shrank).
 *
 * { ok: false, reason } where reason is 'ITEM_CONFLICT' (two dishes whose
 * windows don't overlap each other — the fix is to split the order) or
 * 'OUTSIDE_HOURS' (the window falls outside trading hours — the fix is on the
 * shop's side). Returning a reason rather than a bare null is the difference
 * between a customer seeing an explanation and a customer seeing an empty
 * picker with no way forward.
 *
 * itemWindows: [{ name, start, end }] — blank/absent start or end means that
 * dish imposes no restriction and is skipped.
 */
export function resolvePickupWindow({
  shopOpen,
  shopClose,
  pickupOpen,
  pickupClose,
  itemWindows,
  slotMinutes,
} = {}) {
  const base = resolveSlotBounds({
    openTime: shopOpen,
    closeTime: shopClose,
    windowStart: pickupOpen,
    windowEnd: pickupClose,
    slotMinutes,
  })
  if (!base) return { ok: false, reason: 'OUTSIDE_HOURS' }
  // The shop's own pre-order window can already miss its trading hours (open
  // 09:00, pickup window typed as 07:00-08:00). Caught here so the item loop
  // below never has to distinguish "the shop did this" from "a dish did".
  if (base.first > base.last) return { ok: false, reason: 'OUTSIDE_HOURS' }

  const windows = (Array.isArray(itemWindows) ? itemWindows : [])
    .map((w) => ({ name: String(w?.name || ''), start: hhmmToMinutes(w?.start), end: hhmmToMinutes(w?.end) }))
    .filter((w) => w.start != null && w.end != null)

  // Items are folded against EACH OTHER first. Two dishes with disjoint
  // windows is a different problem with a different fix than a dish that
  // simply falls outside trading hours, and only this ordering can tell them
  // apart — fold everything at once and both come out as one empty range.
  let itemFirst = -Infinity
  let itemLast = Infinity
  for (const w of windows) {
    if (w.start > itemFirst) itemFirst = w.start
    if (w.end < itemLast) itemLast = w.end
  }
  if (itemFirst > itemLast) return { ok: false, reason: 'ITEM_CONFLICT' }

  const first = Math.max(base.first, itemFirst === -Infinity ? base.first : itemFirst)
  const last = Math.min(base.last, itemLast === Infinity ? base.last : itemLast)
  if (first > last) return { ok: false, reason: 'OUTSIDE_HOURS' }

  return {
    ok: true,
    startTime: minutesToHhmm(first),
    endTime: minutesToHhmm(last),
    narrowedBy: windows
      .filter((w) => w.start > base.first || w.end < base.last)
      .map((w) => ({ name: w.name, start: minutesToHhmm(w.start), end: minutesToHhmm(w.end) })),
  }
}

/**
 * The slots still bookable on one date. Always an array, never throws.
 *
 * opts: { openTime, closeTime, closedDays, leadMinutes, now,
 *         slotMinutes, windowStart, windowEnd }
 *
 * The last three are the pickup-window opts described on resolveSlotBounds;
 * omit them and this is the hourly, trading-hours-only grid it has always
 * been.
 */
export function slotsForDate(ymd, opts = {}) {
  const weekday = weekdayOfYmd(ymd)
  if (weekday == null) return []
  if (resolveClosedDays(opts.closedDays).includes(weekday)) return []

  const bounds = resolveSlotBounds(opts)
  if (!bounds) return []

  const leadMinutes = Math.max(0, Number(opts.leadMinutes) || 0)
  const nowMs = opts.now instanceof Date ? opts.now.getTime() : Date.now()
  const cutoff = nowMs + leadMinutes * 60000

  const out = []
  // `<= last` rather than `+ slotMinutes <= close`: resolveSlotBounds already
  // subtracted the closing allowance, and doing it there is what lets an
  // explicit pickup-window end stay inclusive while the trading close stays
  // exclusive. An inverted or impossible range simply never enters the loop.
  for (let m = bounds.first; m <= bounds.last; m += bounds.slotMinutes) {
    const hhmm = minutesToHhmm(m)
    const at = bangkokSlotToInstant(ymd, hhmm)
    // The lead-time rule is applied to EVERY date, not just today. For
    // tomorrow and beyond it's trivially satisfied, so there's no "is this
    // today" branch to get wrong — and a date in the past drops out here for
    // free rather than needing a rule of its own.
    if (at && at.getTime() >= cutoff) out.push(hhmm)
  }
  return out
}

/**
 * Every date the customer may pick, each with its remaining slots.
 *
 * Days with nothing left are omitted entirely, which is how "it's 17:30, the
 * lead time ate the rest of today" and "tomorrow is a Wednesday" both resolve
 * without a special case: the first entry is simply the next day that works.
 * An empty result means pre-ordering isn't possible right now at all, and the
 * caller should hide the affordance rather than show an empty picker.
 *
 * opts: { openTime, closeTime, closedDays, leadMinutes, maxDaysAhead, now }
 */
export function availableDates(opts = {}) {
  const now = opts.now instanceof Date ? opts.now : new Date()
  const today = bangkokDateParts(now)
  if (!today) return []
  const max = Math.max(0, Math.floor(Number(opts.maxDaysAhead) || 0))
  const out = []
  for (let i = 0; i <= max; i += 1) {
    const ymd = addDaysYmd(today.ymd, i)
    const slots = slotsForDate(ymd, { ...opts, now })
    if (slots.length > 0) out.push({ ymd, slots })
  }
  return out
}

/**
 * 'พฤ. 21 ส.ค. 14:00' — deliberately short so the LINE Flex row can't wrap
 * (LINE splits Thai mid-word, since Thai has no inter-word spaces to break
 * on — see the explicit \n in lib/orderFlex.js).
 *
 * The month/weekday names are tables rather than Intl because this must read
 * the same on a UTC server as in a browser, without every call site
 * remembering to pass timeZone.
 */
export function formatSlotThai(ymd, hhmm) {
  const day = formatDayThai(ymd)
  if (!day || !HHMM_RE.test(String(hhmm))) return ''
  return `${day} ${hhmm}`
}

/**
 * Just the date half — 'พฤ. 20 ส.ค.'.
 *
 * Used for the date <select>'s Thai option labels. th-TH's own ICU
 * `weekday: 'short'` yields 'พฤหัส', which is long enough to overflow the
 * control; these abbreviations are the ones the LINE card already uses, so
 * the two surfaces also read alike.
 */
export function formatDayThai(ymd) {
  const weekday = weekdayOfYmd(ymd)
  if (weekday == null) return ''
  const m = parseInt(String(ymd).slice(5, 7), 10)
  const d = parseInt(String(ymd).slice(8, 10), 10)
  return `${THAI_WEEKDAYS_SHORT[weekday]} ${d} ${THAI_MONTHS_SHORT[m - 1]}`
}

/** Same label, from a stored instant. */
export function formatInstantThai(instant) {
  const parts = bangkokDateParts(instant)
  if (!parts) return ''
  return formatSlotThai(parts.ymd, parts.hhmm)
}

function fail(code, error) {
  return { ok: false, code, error }
}

/**
 * The single authority on whether a requested slot is acceptable.
 *
 * Called by the client to guard the continue button and by pages/api/orders.js
 * to decide what actually gets stored — same function, same settings, so a
 * stale client build, a hand-crafted POST and a customer who sat on the
 * summary screen past the cutoff all get the answer the picker would give
 * right now.
 *
 * Returns { ok: true, scheduledFor: Date } or { ok: false, code, error }.
 */
export function validateScheduleRequest({ scheduledDate, scheduledSlot } = {}, opts = {}) {
  const now = opts.now instanceof Date ? opts.now : new Date()

  // Also the answer for "one field present, the other empty" — a truncated or
  // hand-made payload must fail, not be silently treated as an ASAP order.
  const at = bangkokSlotToInstant(scheduledDate, scheduledSlot)
  if (!at) return fail('MALFORMED', 'รูปแบบวันหรือเวลาที่เลือกไม่ถูกต้อง')

  const today = bangkokDateParts(now)
  const maxDaysAhead = Math.max(0, Math.floor(Number(opts.maxDaysAhead) || 0))
  if (today && scheduledDate > addDaysYmd(today.ymd, maxDaysAhead)) {
    return fail('TOO_FAR', `สั่งล่วงหน้าได้ไม่เกิน ${maxDaysAhead} วัน`)
  }

  if (resolveClosedDays(opts.closedDays).includes(weekdayOfYmd(scheduledDate))) {
    return fail('CLOSED_DAY', 'ร้านปิดในวันที่เลือก กรุณาเลือกวันอื่น')
  }

  // The SAME bounds the picker drew its options from, so the two can never
  // disagree about what "inside the window" means. The message names the
  // RESOLVED window, not raw trading hours — a customer refused at 09:20
  // because the dish is only collectable from 10:00 has to be told 10:00.
  const bounds = resolveSlotBounds(opts)
  const mins = hhmmToMinutes(scheduledSlot)
  if (!bounds || mins < bounds.first || mins > bounds.last) {
    const openLabel = minutesToHhmm(bounds ? bounds.first : hhmmToMinutes(DEFAULT_OPEN_TIME))
    const closeLabel = minutesToHhmm(bounds ? bounds.last : hhmmToMinutes(DEFAULT_CLOSE_TIME))
    return fail('OUTSIDE_HOURS', `เวลาที่เลือกอยู่นอกช่วงเวลารับ (${openLabel}–${closeLabel})`)
  }

  // A time in the past needs no rule of its own — slotsForDate filters on
  // `>= now + lead`, so "already gone" is a strictly stronger case of this
  // one. Don't add a redundant past-date check.
  const leadMinutes = Math.max(0, Number(opts.leadMinutes) || 0)
  if (at.getTime() < now.getTime() + leadMinutes * 60000) {
    return fail('TOO_SOON', `กรุณาเลือกเวลาล่วงหน้าอย่างน้อย ${leadMinutes} นาที`)
  }

  // Belt and braces: whatever the branches above concluded, the answer has to
  // be something the picker would actually offer right now.
  //
  // `allowCustomTime` (the shop letting customers type an exact time) relaxes
  // the GRID check and nothing else — every rule above still applies, and the
  // empty-day check below still applies, so a typed time can never land on a
  // day the picker would refuse to show. It defaults to false, which is what
  // keeps a hand-crafted POST to an un-opted-in shop failing exactly as it
  // does today.
  //
  // NOTE for whoever finally enforces preorder_items.daily_quota: count per
  // DATE or per slot bucket, never `where scheduled_for = <exact instant>`.
  // An off-grid custom time would walk straight past an exact-instant count.
  const grid = slotsForDate(scheduledDate, { ...opts, now })
  if (grid.length === 0 || (!opts.allowCustomTime && !grid.includes(scheduledSlot))) {
    return fail('UNAVAILABLE', 'เวลาที่เลือกไม่พร้อมให้บริการ กรุณาเลือกเวลาอื่น')
  }

  return { ok: true, scheduledFor: at }
}
