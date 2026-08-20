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
 * The hourly slots still bookable on one date. Always an array, never throws.
 *
 * opts: { openTime, closeTime, closedDays, leadMinutes, now }
 */
export function slotsForDate(ymd, opts = {}) {
  const weekday = weekdayOfYmd(ymd)
  if (weekday == null) return []
  if (resolveClosedDays(opts.closedDays).includes(weekday)) return []

  const open = resolveTime(opts.openTime, DEFAULT_OPEN_TIME)
  const close = resolveTime(opts.closeTime, DEFAULT_CLOSE_TIME)
  if (open == null || close == null) return []

  const leadMinutes = Math.max(0, Number(opts.leadMinutes) || 0)
  const nowMs = opts.now instanceof Date ? opts.now.getTime() : Date.now()
  const cutoff = nowMs + leadMinutes * 60000

  const out = []
  // The last slot is the last whole hour that still leaves a full hour before
  // closing: 09:00-18:00 yields 09:00…17:00, exactly the nine the reservation
  // form already offers (pages/reservation.js). An 18:00 slot would promise a
  // handover at the moment staff are shutting down.
  for (let m = open; m + SLOT_MINUTES <= close; m += SLOT_MINUTES) {
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

  const open = resolveTime(opts.openTime, DEFAULT_OPEN_TIME)
  const close = resolveTime(opts.closeTime, DEFAULT_CLOSE_TIME)
  const mins = hhmmToMinutes(scheduledSlot)
  if (open == null || close == null || mins < open || mins + SLOT_MINUTES > close) {
    const openLabel = minutesToHhmm(open ?? hhmmToMinutes(DEFAULT_OPEN_TIME))
    const closeLabel = minutesToHhmm(close ?? hhmmToMinutes(DEFAULT_CLOSE_TIME))
    return fail('OUTSIDE_HOURS', `เวลาที่เลือกอยู่นอกเวลาทำการ (${openLabel}–${closeLabel})`)
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
  if (!slotsForDate(scheduledDate, { ...opts, now }).includes(scheduledSlot)) {
    return fail('UNAVAILABLE', 'เวลาที่เลือกไม่พร้อมให้บริการ กรุณาเลือกเวลาอื่น')
  }

  return { ok: true, scheduledFor: at }
}
