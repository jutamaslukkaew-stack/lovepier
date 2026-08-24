import { db } from './db'
import { settings } from './db/schema'
import { DEFAULT_DELIVERY_FEE_TIERS } from './deliveryFee'
// Safe to import here: lib/preorder.js is pure and imports nothing at all.
import { DEFAULT_CLOSE_TIME, DEFAULT_OPEN_TIME, parseClosedDays } from './preorder'

// Keys stored in the `settings` table (edited from /admin/settings).
export const SETTING_KEYS = {
  distanceMethod: 'distance_method', // 'straight' | 'google'
  shopLat: 'shop_lat',
  shopLng: 'shop_lng',
  radiusKm: 'delivery_radius_km',
  // Minimum cart subtotal (baht) required to choose shop delivery — 0 (or
  // unset) disables the requirement. Re-added 2026-08-12 after being fully
  // removed the same day; this time it's a plain hard minimum, not bundled
  // with a free-delivery incentive (see note_2026_08_12_fee_tiers_and_line_notify).
  minOrder: 'delivery_min_order',
  googleApiKey: 'google_maps_api_key',
  slipokApiKey: 'slipok_api_key',
  slipokBranchId: 'slipok_branch_id',
  // Flat delivery fee per 1km distance band (replaced the old base+per-km
  // formula — see lib/deliveryFee.js). Each key holds that band's fee in baht.
  deliveryFeeTier2km: 'delivery_fee_tier_2km', // 0–2 km
  deliveryFeeTier3km: 'delivery_fee_tier_3km', // 2–3 km
  deliveryFeeTier4km: 'delivery_fee_tier_4km', // 3–4 km
  deliveryFeeTier5km: 'delivery_fee_tier_5km', // 4–5 km
  // Loyalty points earned per baht of (post-discount) item subtotal — see
  // lib/points.js#calcOrderDiscountAndPoints. 0 disables points entirely.
  pointsPerBaht: 'loyalty_baht_per_point_v2',
  // ── Tier discounts (2026-08-24 journey review) ────────────────────────
  // Master switch, off by default like preorderEnabled below: the code ships
  // inert, the shop turns it on when the rates are agreed, and flipping it
  // back off is the rollback with no deploy. This matters more here than
  // usual — turning it on takes 10% off every delivery order.
  memberDiscountEnabled: 'member_discount_enabled',
  // % off itemsSubtotal per customer tier (lib/tiers.js), never off the
  // delivery fee. An unset key falls back to that tier's own default, so a
  // shop that never opens this form still gets the documented 10/15/50/100.
  tierDiscountGeneral: 'tier_discount_general',
  tierDiscountCondo: 'tier_discount_condo',
  tierDiscountScc: 'tier_discount_scc',
  tierDiscountStaff: 'tier_discount_staff',
  // ── In-store (Love Pier ID QR scanned at the counter — /admin/scan) ──
  // Deliberately separate from the delivery rates above: the shop wanted a
  // different, more generous rate for walk-ins, and coupling them would mean
  // one can't change without moving the other.
  // Baht of (post-discount) spend per 1 point. Default 1 = ฿1 earns 1 point.
  inStorePointsPerBaht: 'in_store_baht_per_point',
  // % off the amount the customer actually pays in store. 0 disables it.
  inStoreDiscountPercent: 'in_store_discount_percent',
  // Whether the Summary step shows the sweetness/coffee-bean pickers per
  // cart item (lib/menuOptions.js). Off by default — added 2026-08-17 so
  // the shop can turn it on later without a code change; unset/anything
  // other than the literal string 'true' reads as off.
  menuOptionsEnabled: 'menu_customization_enabled',
  // ── Pre-order ("สั่งล่วงหน้า" — the summary step lets the customer pick a
  // day and hour to receive the order; payment is still immediate). ──
  // Master switch, off by default like menuOptionsEnabled above: the code can
  // ship inert and the shop turns it on when they're ready. Also the rollback
  // lever — flipping this off restores exactly the previous behaviour with no
  // deploy. Anything other than the literal string 'true' reads as off.
  preorderEnabled: 'preorder_enabled',
  // The shop's real trading hours, deliberately NOT prefixed `preorder_`:
  // until now these existed only as hard-coded translated strings in six
  // display files (pages/reservation.js, index.js, about.js, location.js,
  // components/MenuOverlay.js, partials.js). This is the first machine-readable
  // copy, and a later "we're closed right now" banner should read these too.
  shopOpenTime: 'shop_open_time', // 'HH:MM'
  shopCloseTime: 'shop_close_time', // 'HH:MM'
  // Comma-separated weekday indices, 0=Sunday … 6=Saturday. Defaults to '3'
  // (Wednesday). A BLANK value means "open every day" and is meaningful —
  // see parseClosedDays, and the note on the read below.
  shopClosedDays: 'shop_closed_days',
  // How far ahead of the chosen slot the order must be placed, and how many
  // days ahead the picker offers. Both are policy rather than trading hours.
  preorderLeadMinutes: 'preorder_lead_minutes',
  preorderMaxDaysAhead: 'preorder_max_days_ahead',
}

function num(v) {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : NaN
}

/**
 * Read shop settings from the DB, falling back to env vars, then defaults.
 * Used server-side (API routes + admin).
 */
export async function getShopSettings() {
  let rows = []
  try {
    rows = await db.select().from(settings)
  } catch {
    rows = []
  }
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]))

  return {
    distanceMethod: m[SETTING_KEYS.distanceMethod] || 'straight',
    shopLat: m[SETTING_KEYS.shopLat] ? num(m[SETTING_KEYS.shopLat]) : num(process.env.SHOP_LAT),
    shopLng: m[SETTING_KEYS.shopLng] ? num(m[SETTING_KEYS.shopLng]) : num(process.env.SHOP_LNG),
    radiusKm: m[SETTING_KEYS.radiusKm]
      ? num(m[SETTING_KEYS.radiusKm])
      : num(process.env.DELIVERY_RADIUS_KM) || 5,
    minDeliveryOrder: m[SETTING_KEYS.minOrder] ? num(m[SETTING_KEYS.minOrder]) : 300,
    googleApiKey: m[SETTING_KEYS.googleApiKey] || process.env.GOOGLE_MAPS_API_KEY || '',
    slipokApiKey: m[SETTING_KEYS.slipokApiKey] || process.env.SLIPOK_API_KEY || '',
    slipokBranchId: m[SETTING_KEYS.slipokBranchId] || process.env.SLIPOK_BRANCH_ID || '',
    deliveryFeeTiers: [
      { upToKm: 2, fee: m[SETTING_KEYS.deliveryFeeTier2km] ? num(m[SETTING_KEYS.deliveryFeeTier2km]) : NaN },
      { upToKm: 3, fee: m[SETTING_KEYS.deliveryFeeTier3km] ? num(m[SETTING_KEYS.deliveryFeeTier3km]) : NaN },
      { upToKm: 4, fee: m[SETTING_KEYS.deliveryFeeTier4km] ? num(m[SETTING_KEYS.deliveryFeeTier4km]) : NaN },
      { upToKm: 5, fee: m[SETTING_KEYS.deliveryFeeTier5km] ? num(m[SETTING_KEYS.deliveryFeeTier5km]) : NaN },
    ].map((tier, i) => ({
      ...tier,
      fee: Number.isFinite(tier.fee) ? tier.fee : DEFAULT_DELIVERY_FEE_TIERS[i].fee,
    })),
    pointsPerBaht: m[SETTING_KEYS.pointsPerBaht] ? num(m[SETTING_KEYS.pointsPerBaht]) : 20,
    memberDiscountEnabled: m[SETTING_KEYS.memberDiscountEnabled] === 'true',
    // Only the keys the shop has actually set. Absent tiers are filled in by
    // lib/tiers.js#tierDiscountPercent from each tier's own default, so a
    // blank settings table still hands out the documented rates rather than
    // silently zeroing a tier. NaN is dropped for the same reason.
    tierDiscountPercent: Object.fromEntries(
      [
        ['general', m[SETTING_KEYS.tierDiscountGeneral]],
        ['condo', m[SETTING_KEYS.tierDiscountCondo]],
        ['scc', m[SETTING_KEYS.tierDiscountScc]],
        ['staff', m[SETTING_KEYS.tierDiscountStaff]],
      ]
        // `!= null` not a truthiness check: '0' is a meaningful value the
        // shop can set to switch one tier off without touching the others.
        .filter(([, v]) => v != null && v !== '' && Number.isFinite(num(v)))
        .map(([k, v]) => [k, num(v)])
    ),
    inStorePointsPerBaht: m[SETTING_KEYS.inStorePointsPerBaht]
      ? num(m[SETTING_KEYS.inStorePointsPerBaht])
      : 1,
    inStoreDiscountPercent: m[SETTING_KEYS.inStoreDiscountPercent]
      ? num(m[SETTING_KEYS.inStoreDiscountPercent])
      : 10,
    menuOptionsEnabled: m[SETTING_KEYS.menuOptionsEnabled] === 'true',
    preorderEnabled: m[SETTING_KEYS.preorderEnabled] === 'true',
    shopOpenTime: m[SETTING_KEYS.shopOpenTime] || DEFAULT_OPEN_TIME,
    shopCloseTime: m[SETTING_KEYS.shopCloseTime] || DEFAULT_CLOSE_TIME,
    // NOT the `m[K] ? … : default` idiom the numeric settings above use: a
    // bare '' is a meaningful value here (open every day) and is falsy, so
    // that idiom would silently reinstate the Wednesday closure the moment
    // the shop turned it off. parseClosedDays distinguishes unset from blank.
    shopClosedDays: parseClosedDays(m[SETTING_KEYS.shopClosedDays]),
    preorderLeadMinutes: m[SETTING_KEYS.preorderLeadMinutes]
      ? num(m[SETTING_KEYS.preorderLeadMinutes])
      : 60,
    preorderMaxDaysAhead: m[SETTING_KEYS.preorderMaxDaysAhead]
      ? num(m[SETTING_KEYS.preorderMaxDaysAhead])
      : 7,
  }
}
