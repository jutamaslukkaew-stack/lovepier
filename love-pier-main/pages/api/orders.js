import { and, eq, gte, inArray, sql } from 'drizzle-orm'
import { db } from '../../lib/db'
import { orders, customers, pointTransactions, preorderItems } from '../../lib/db/schema'
import { isStaffNotifyTarget, pushOrderCardToStaff, pushToUser } from '../../lib/lineMessaging'
import { buildOrderFlex } from '../../lib/orderFlex'
import { getShopSettings } from '../../lib/settings'
import { calcDeliveryFee } from '../../lib/deliveryFee'
import { calcOrderDiscountAndPoints } from '../../lib/points'
import { TIER_GENERAL, effectiveTier, tierDiscountPercent } from '../../lib/tiers'
import { normalizeItemOptions } from '../../lib/menuOptions'
import { verifyLineAccessToken } from '../../lib/lineIdentity'
import { formatSlotThai, validateScheduleRequest } from '../../lib/preorder'

function pickString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function makeOrderNo() {
  const d = new Date()
  const ymd =
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `LP${ymd}-${rand}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const name = pickString(req.body?.name)
  const phone = pickString(req.body?.phone)
  const address = pickString(req.body?.address)
  const note = pickString(req.body?.note)
  const paymentRef = pickString(req.body?.paymentRef)
  const lineAccessToken = pickString(req.body?.lineAccessToken)
  const distanceRaw = Number(req.body?.distanceKm)
  const distanceKm = Number.isFinite(distanceRaw) ? distanceRaw : null
  // Anything other than the literal 'delivery' is treated as pickup — a
  // missing/garbled value must never default to the one option that costs
  // the customer money.
  const deliveryMethod = req.body?.deliveryMethod === 'delivery' ? 'delivery' : 'pickup'
  const rawItems = Array.isArray(req.body?.items) ? req.body.items : []
  // Pre-order: the two raw strings the picker displayed, never a
  // client-computed instant. Both blank = an ordinary "as soon as possible"
  // order, which is the overwhelming majority.
  const scheduledDate = pickString(req.body?.scheduledDate)
  const scheduledSlot = pickString(req.body?.scheduledSlot)

  if (!name || !phone) {
    return res.status(400).json({ error: 'กรุณากรอกชื่อและเบอร์โทร' })
  }
  if (rawItems.length === 0) {
    return res.status(400).json({ error: 'ไม่มีรายการสั่งซื้อ' })
  }

  // Identity must come from LINE, never from lineUserId/displayName request
  // fields. Every delivery order belongs to a verified LINE account so the
  // shop can notify the right customer and loyalty points cannot drift.
  const verifiedLine = lineAccessToken
    ? await verifyLineAccessToken(lineAccessToken)
    : null
  if (!verifiedLine) {
    return res.status(401).json({
      error: lineAccessToken
        ? 'เซสชัน LINE หมดอายุ กรุณาเข้าสู่ระบบ LINE ใหม่อีกครั้ง'
        : 'กรุณาเข้าสู่ระบบ LINE ก่อนสั่งซื้อ',
    })
  }
  const lineUserId = verifiedLine?.userId || ''
  const lineDisplayName = verifiedLine?.displayName || ''

  // A phone already owned by another verified LINE account cannot be
  // silently re-linked. This was the path that allowed customer details and
  // notification identity to drift apart.
  if (lineUserId) {
    const [phoneOwner] = await db
      .select({ lineUserId: customers.lineUserId })
      .from(customers)
      .where(eq(customers.phone, phone))
      .limit(1)
    if (phoneOwner?.lineUserId && phoneOwner.lineUserId !== lineUserId) {
      return res.status(409).json({
        error: 'เบอร์โทรนี้ผูกกับบัญชี LINE อื่นอยู่ กรุณาใช้เบอร์ของบัญชีนี้หรือติดต่อร้านเพื่อแก้ไขข้อมูล',
      })
    }
  }

  // Scheduled orders use the dedicated Pre Order catalogue as their price
  // authority. This also prevents paused/deleted items from being ordered by
  // a stale tab and enforces each menu's minimum quantity and lead days.
  let orderItemsInput = rawItems
  let requiredPreorderLeadMinutes = 3 * 24 * 60
  if (scheduledDate || scheduledSlot) {
    const ids = [...new Set(rawItems.map((item) => pickString(item?.id)).filter(Boolean))]
    const rows = ids.length ? await db.select().from(preorderItems).where(and(
      inArray(preorderItems.id, ids), eq(preorderItems.status, 'active'), eq(preorderItems.isDeleted, false)
    )) : []
    const byId = new Map(rows.map((row) => [row.id, row]))
    if (rows.length !== ids.length || rows.some((row) => row.price == null)) {
      return res.status(400).json({ error: 'มีเมนูพรีออเดอร์ที่ปิดรับหรือยังไม่พร้อมขาย กรุณาเลือกใหม่' })
    }
    orderItemsInput = rawItems.map((item) => {
      const row = byId.get(pickString(item?.id))
      const qty = Math.max(1, parseInt(item?.qty, 10) || 1)
      if (!row || qty < row.minQuantity) return null
      requiredPreorderLeadMinutes = Math.max(requiredPreorderLeadMinutes, row.leadDays * 24 * 60)
      return { ...item, name: row.nameTh, price: row.price, qty }
    })
    if (orderItemsInput.some((item) => !item)) return res.status(400).json({ error: 'จำนวนสินค้าต่ำกว่าขั้นต่ำของเมนู' })
  }

  // Trust prices from the server-provided cart shape for normal delivery but
  // recompute the total; Pre Order prices above come from the database.
  // so the client can't tamper with the amount.
  const items = orderItemsInput.map((i) => ({
    id: pickString(i?.id),
    name: pickString(i?.name),
    price: Number(i?.price) || 0,
    qty: Math.max(1, parseInt(i?.qty, 10) || 1),
    note: pickString(i?.note),
    // Structured options — default to the first choice server-side too, same
    // as the client shows selected by default (lib/menuOptions.js), so an
    // old client build or a line that never touched these still lands on a
    // sane value rather than an empty string. Which fields appear depends on
    // the line's category, so a drink never carries a cut of chicken.
    ...normalizeItemOptions(i),
  }))
  const itemsSubtotal = Math.round(
    items.reduce((sum, i) => sum + i.price * i.qty, 0)
  )

  const orderNo = makeOrderNo()
  const s = await getShopSettings()

  // Applies to the WHOLE order below this amount — pickup is blocked too,
  // not just delivery (the shop's explicit correction: 'รับเองที่ร้านก็ต้อง
  // อยู่ในเงื่อนไขของสั่งซื้อครบ 300 บาทเช่นเดียวกัน'). The client already
  // disables the continue button for this regardless of method, but never
  // trust that alone.
  if (s.minDeliveryOrder > 0 && itemsSubtotal < s.minDeliveryOrder) {
    return res.status(400).json({ error: `ยอดสั่งซื้อไม่ถึงขั้นต่ำ (฿${s.minDeliveryOrder})` })
  }

  // Pre-order time — never trust the client's slot list. The same pure module
  // the picker uses (lib/preorder.js) is re-run here against the shop's live
  // settings, so an old client build, a hand-crafted POST, and a customer who
  // sat on the summary screen past the lead-time cutoff all get the answer
  // the picker would give right now. This is also the ONLY place the
  // customer's wall-clock pick becomes an instant: bangkokSlotToInstant
  // writes '+07:00' literally, so the stored value doesn't depend on this
  // process's timezone (UTC on Vercel, UTC+7 on a shop laptop).
  //
  // `||` not `&&`: one field without the other must fail rather than be
  // silently ignored, and validateScheduleRequest returns MALFORMED for it.
  let scheduledFor = null
  if (scheduledDate || scheduledSlot) {
    if (!s.preorderEnabled) {
      return res.status(400).json({ error: 'ขณะนี้ยังไม่เปิดให้สั่งล่วงหน้า' })
    }
    const schedule = validateScheduleRequest(
      { scheduledDate, scheduledSlot },
      {
        openTime: s.shopOpenTime,
        closeTime: s.shopCloseTime,
        closedDays: s.shopClosedDays,
        leadMinutes: Math.max(s.preorderLeadMinutes, requiredPreorderLeadMinutes),
        maxDaysAhead: s.preorderMaxDaysAhead,
      }
    )
    // 400 like the other order-level rejections above — 401 is reserved for
    // LINE identity and 409 for conflicts.
    if (!schedule.ok) return res.status(400).json({ error: schedule.error })
    scheduledFor = schedule.scheduledFor
  }

  // Recompute the delivery fee server-side from distance + settings — never
  // trust a fee number sent by the client. Outside the delivery radius the
  // shop doesn't deliver at all (the customer arranges + pays their own
  // courier), so no shop delivery fee applies regardless of configured rates.
  // Choosing 'pickup' inside the radius is free too — the fee only applies
  // when the shop is actually doing the delivering. No free-delivery
  // threshold — delivery always charges the full tiered distance fee (the
  // shop tried a free-at-฿300 incentive and removed it).
  const withinRadius = distanceKm == null || distanceKm <= s.radiusKm
  const deliveryFee = withinRadius && deliveryMethod === 'delivery'
    ? calcDeliveryFee(distanceKm, { tiers: s.deliveryFeeTiers })
    : 0

  // Member discount + loyalty points — only for orders with a LINE ID
  // attached (LIFF login completed), and only on the food/drink subtotal;
  // the delivery fee is never discounted (see lib/points.js). pointsEarned
  // is fixed here at order time and only actually credited once payment is
  // confirmed — see lib/slipVerification.js.
  const requestedPoints = Math.max(0, Math.floor(Number(req.body?.pointsToRedeem) || 0))
  let pointsBalance = 0
  let customerTier = TIER_GENERAL
  // One read for both the balance and the tier. Unconditional now (the old
  // version only ran when points were being spent) because the tier decides
  // the price of every order, not just point-redeeming ones — and the tier
  // MUST come from the row, never from the request body: 50% and 100% are
  // real money, and a browser-supplied percentage would be a self-service
  // discount for anyone who can open devtools.
  if (lineUserId) {
    const [customer] = await db
      .select({ pointsBalance: customers.pointsBalance, tier: customers.tier, tierExpiresAt: customers.tierExpiresAt })
      .from(customers)
      .where(eq(customers.lineUserId, lineUserId))
      .limit(1)
    pointsBalance = Math.max(0, customer?.pointsBalance || 0)
    // s.tiers is the shop's catalog (0015). Without it a customer in a
    // shop-created group is an unknown key here and normalizes to general —
    // charging them the wrong price and ignoring their expiry date.
    customerTier = effectiveTier(customer?.tier || TIER_GENERAL, customer?.tierExpiresAt, undefined, s.tiers)
  }
  const discountPercentForOrder = tierDiscountPercent(customerTier, {
    enabled: s.memberDiscountEnabled,
    percentByTier: s.tierDiscountPercent,
    tiers: s.tiers,
  })
  // Ceiling mirrors lib/points.js: points are spent against the POST-discount
  // amount, so a 50% member cannot "redeem" points the discount already paid
  // for. calcOrderDiscountAndPoints re-clamps this anyway; the balance is the
  // part it cannot know.
  const subtotalAfterTierDiscount = itemsSubtotal - Math.floor((itemsSubtotal * discountPercentForOrder) / 100)
  const pointsRequestedAndAvailable = Math.min(requestedPoints, pointsBalance, Math.max(0, subtotalAfterTierDiscount - 1))
  const { discountAmount, discountPercent, pointsRedeemed, pointsEarned } = calcOrderDiscountAndPoints(itemsSubtotal, {
    hasLineId: Boolean(lineUserId),
    discountPercent: discountPercentForOrder,
    pointsPerBaht: s.pointsPerBaht,
    pointsRedeemed: pointsRequestedAndAvailable,
  })
  const totalAmount = itemsSubtotal - discountAmount - pointsRedeemed + deliveryFee

  try {
    await db.transaction(async (tx) => {
      let customerId = null
      if (pointsRedeemed > 0) {
        const [updated] = await tx
          .update(customers)
          .set({
            pointsBalance: sql`${customers.pointsBalance} - ${pointsRedeemed}`,
            updatedAt: sql`now()`,
          })
          .where(and(
            eq(customers.lineUserId, lineUserId),
            gte(customers.pointsBalance, pointsRedeemed)
          ))
          .returning({ id: customers.id })
        if (!updated) throw new Error('POINTS_BALANCE_CHANGED')
        customerId = updated.id
      }

      const [created] = await tx.insert(orders).values({
        orderNo,
        lineUserId: lineUserId || null,
        customerName: name,
        phone,
        address,
        note,
        deliveryMethod,
        items,
        itemsSubtotal,
        discountAmount,
        discountPercent,
        pointsEarned,
        pointsRedeemed,
        deliveryFee,
        totalAmount,
        status: 'pending',
        paymentMethod: 'promptpay',
        paymentRef: paymentRef || null,
        distanceKm: distanceKm != null ? String(distanceKm) : null,
        // null = ASAP. drizzle's timestamp({withTimezone:true}) takes a Date.
        scheduledFor,
      }).returning({ id: orders.id })

      if (pointsRedeemed > 0) {
        await tx.insert(pointTransactions).values({
          orderId: created.id,
          customerId,
          phone,
          points: -pointsRedeemed,
          type: 'redeem',
        })
      }
    })

    // Remember this customer for next time (auto-fill on their next order via
    // /api/customer-lookup). Wrapped in try/catch and never
    // awaited-to-fail-the-order: this bookkeeping must not be able to block
    // placing a real order.
    //
    // TWO PATHS, and the LINE one has to come first. Since 2026-08-26 every
    // /member visitor is issued a card immediately, which creates a customers
    // row holding their line_user_id and, usually, a BLANK phone. line_user_id
    // is UNIQUE. So the phone-keyed upsert below — which is still right for
    // an order with no LINE session — would try to INSERT a second row for a
    // person who already has one, hit that unique constraint, and land in the
    // catch: the order saves, but their phone and address are silently never
    // recorded, and /api/customer-lookup never finds them again. Updating the
    // row that already owns this line_user_id is the only correct move.
    try {
      const [byLine] = lineUserId
        ? await db
            .select({ id: customers.id })
            .from(customers)
            .where(eq(customers.lineUserId, lineUserId))
            .limit(1)
        : []

      if (byLine) {
        // The phone is safe to write: the guard near the top of this handler
        // already rejected (409) any phone owned by a DIFFERENT verified LINE
        // account. It can still collide with an unlinked row left by an
        // order placed without a LINE session, which the catch below reports.
        await db
          .update(customers)
          .set({
            name,
            phone,
            // A pickup order can have no address. Never let that blank erase
            // the customer's last usable delivery address.
            address: sql`coalesce(nullif(${address}, ''), ${customers.address})`,
            lineDisplayName: sql`coalesce(${customers.lineDisplayName}, ${lineDisplayName})`,
            updatedAt: sql`now()`,
          })
          .where(eq(customers.id, byLine.id))
      } else {
        // No row owns this LINE account (or there is no LINE session at all):
        // fall back to the phone, which every order carries.
        await db
          .insert(customers)
          .values({
            lineUserId: lineUserId || null,
            lineDisplayName,
            name,
            phone,
            address,
          })
          .onConflictDoUpdate({
            target: customers.phone,
            // customers_phone_unique_idx (0005) is a PARTIAL index (WHERE
            // phone <> ''), so Postgres can't infer it as the ON CONFLICT
            // arbiter from `target` alone — this must repeat the same WHERE
            // or every upsert errors at the planning stage (silently
            // swallowed by the catch below) and no customer row is ever
            // written. Found 2026-08-17 while verifying loyalty-points
            // crediting: confirmed via server logs that this had been failing
            // for every phone number since 0005 shipped.
            targetWhere: sql`${customers.phone} <> ''`,
            // COALESCE so an order placed without a LINE session (LIFF
            // failed/skipped) never blanks out a lineUserId this phone
            // already had on file from an earlier order.
            set: {
              name,
              // A pickup order can have no address. Never let that blank
              // erase the customer's last usable delivery address.
              address: sql`coalesce(nullif(excluded.address, ''), ${customers.address})`,
              lineUserId: sql`coalesce(${customers.lineUserId}, excluded.line_user_id)`,
              lineDisplayName: sql`coalesce(${customers.lineDisplayName}, excluded.line_display_name)`,
              updatedAt: sql`now()`,
            },
          })
      }
    } catch (err) {
      console.error('Customer upsert failed (non-fatal):', err)
    }

    // Same Flex card design, sent to two destinations: the customer's own chat,
    // and the shop's own staff LINE (LINE_ORDER_NOTIFY_TO). Both best-effort
    // — a push failure never fails the order itself. The staff copy carries the
    // กำลังทำ / พร้อมแล้ว / ยกเลิก quick-action buttons; the customer's must not.
    const cardFields = { orderNo, name, phone, address, items, total: totalAmount, deliveryFee, discountAmount, pointsRedeemed, distanceKm, deliveryMethod, scheduledLabel: scheduledFor ? formatSlotThai(scheduledDate, scheduledSlot) : '' }
    const flex = buildOrderFlex(cardFields)
    const staffFlex = buildOrderFlex({ ...cardFields, withStaffActions: true })

    // Alert staff with the branded card (not a plain-text summary) the
    // moment the order is created — doesn't depend on the customer tapping
    // anything on their end, unlike the client-side LINE-deep-link reminder.
    const targetIsCustomer = isStaffNotifyTarget(lineUserId)
    // Staff alert is the reliable server-side path and must always run. The
    // LIFF client message is only an optional convenience and is unavailable
    // from some LINE entry points. When staff and customer are the same test
    // account, send this staff copy once and skip only the second customer
    // copy below.
    const staffPush = await pushOrderCardToStaff(staffFlex)

    // Send the order card "from the shop" to the customer too (Messaging
    // API push). Complements the customer-side liff.sendMessages(); skips
    // when there's no messaging token or no LINE userId for this order.
    const customerPush = lineUserId && !targetIsCustomer
      ? await pushToUser(lineUserId, [flex])
      : targetIsCustomer
        ? { ok: Boolean(staffPush.ok), duplicateTargetSkipped: true }
      : { ok: false, skipped: true }

    // An order the shop never hears about is an operational failure even
    // though the order itself saved fine. The low-level helper already logs
    // "LINE push to staff failed", but that only says the API call lost —
    // this line names the order that nobody was told about, so searching the
    // Vercel logs for ORDER_NOT_ALERTED lists exactly the ones to chase.
    if (!staffPush.ok) {
      console.error('ORDER_NOT_ALERTED — shop was not notified of a new order:', {
        orderNo,
        reason: staffPush.skipped
          ? 'LINE_MESSAGING_TOKEN or LINE_ORDER_NOTIFY_TO is not configured'
          : 'LINE rejected the push (see the LINE push to staff line above for the status)',
      })
    }

    const slipVerify = Boolean(s.slipokApiKey && s.slipokBranchId)

    // staffAlerted is reported separately from sentToLine: the customer
    // getting their copy and the shop getting theirs fail independently, and
    // conflating them hid a shop-side outage behind a healthy-looking
    // response. Still a 200 — the order is saved and paid for either way, so
    // failing the request here would tell the customer their order didn't go
    // through, which is worse and untrue.
    return res.status(200).json({ ok: true, orderNo, totalAmount, itemsSubtotal, discountAmount, pointsRedeemed, pointsEarned, deliveryFee, slipVerify, scheduledFor: scheduledFor ? scheduledFor.toISOString() : null, sentToLine: Boolean(customerPush.ok), staffAlerted: Boolean(staffPush.ok) })
  } catch (err) {
    if (err?.message === 'POINTS_BALANCE_CHANGED') {
      return res.status(409).json({ error: 'ยอดคะแนนมีการเปลี่ยนแปลง กรุณาลองใหม่อีกครั้ง' })
    }
    console.error('Create order failed:', err)
    return res.status(500).json({ error: 'บันทึกออเดอร์ไม่สำเร็จ' })
  }
}
