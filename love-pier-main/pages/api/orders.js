import { and, eq, gte, sql } from 'drizzle-orm'
import { db } from '../../lib/db'
import { orders, customers, pointTransactions } from '../../lib/db/schema'
import { pushOrderCardToStaff, pushToUser } from '../../lib/lineMessaging'
import { buildOrderFlex } from '../../lib/orderFlex'
import { getShopSettings } from '../../lib/settings'
import { calcDeliveryFee } from '../../lib/deliveryFee'
import { calcOrderDiscountAndPoints } from '../../lib/points'
import { SWEETNESS_OPTIONS, COFFEE_BEAN_OPTIONS } from '../../lib/menuOptions'

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
  const lineUserId = pickString(req.body?.lineUserId)
  const distanceRaw = Number(req.body?.distanceKm)
  const distanceKm = Number.isFinite(distanceRaw) ? distanceRaw : null
  // Anything other than the literal 'delivery' is treated as pickup — a
  // missing/garbled value must never default to the one option that costs
  // the customer money.
  const deliveryMethod = req.body?.deliveryMethod === 'delivery' ? 'delivery' : 'pickup'
  const rawItems = Array.isArray(req.body?.items) ? req.body.items : []

  if (!name || !phone) {
    return res.status(400).json({ error: 'กรุณากรอกชื่อและเบอร์โทร' })
  }
  if (rawItems.length === 0) {
    return res.status(400).json({ error: 'ไม่มีรายการสั่งซื้อ' })
  }

  // Trust prices from the server-provided cart shape but recompute the total
  // so the client can't tamper with the amount.
  const items = rawItems.map((i) => ({
    id: pickString(i?.id),
    name: pickString(i?.name),
    price: Number(i?.price) || 0,
    qty: Math.max(1, parseInt(i?.qty, 10) || 1),
    note: pickString(i?.note),
    // Structured options — default to the first choice server-side too, same
    // as the client shows selected by default (lib/menuOptions.js), so an
    // old client build or a line that never touched these still lands on a
    // sane value rather than an empty string.
    sweetness: SWEETNESS_OPTIONS.includes(i?.sweetness) ? i.sweetness : SWEETNESS_OPTIONS[0],
    coffeeBean: COFFEE_BEAN_OPTIONS.includes(i?.coffeeBean) ? i.coffeeBean : COFFEE_BEAN_OPTIONS[0],
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
  if (lineUserId && requestedPoints > 0) {
    const [customer] = await db
      .select({ pointsBalance: customers.pointsBalance })
      .from(customers)
      .where(eq(customers.lineUserId, lineUserId))
      .limit(1)
    pointsBalance = Math.max(0, customer?.pointsBalance || 0)
  }
  const pointsRequestedAndAvailable = Math.min(requestedPoints, pointsBalance, Math.max(0, itemsSubtotal - 1))
  const { discountAmount, pointsRedeemed, pointsEarned } = calcOrderDiscountAndPoints(itemsSubtotal, {
    hasLineId: Boolean(lineUserId),
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
        pointsEarned,
        pointsRedeemed,
        deliveryFee,
        totalAmount,
        status: 'pending',
        paymentMethod: 'promptpay',
        paymentRef: paymentRef || null,
        distanceKm: distanceKm != null ? String(distanceKm) : null,
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
    // /api/customer-lookup) — keyed on phone, not lineUserId, since phone is
    // required on every order but LINE login can fail or be skipped. Wrapped
    // in try/catch and never awaited-to-fail-the-order: a phone reused under
    // a different lineUserId would hit that column's own unique constraint,
    // and this bookkeeping must not be able to block placing a real order.
    try {
      await db
        .insert(customers)
        .values({
          lineUserId: lineUserId || null,
          lineDisplayName: pickString(req.body?.lineDisplayName),
          name,
          phone,
          address,
        })
        .onConflictDoUpdate({
          target: customers.phone,
          // customers_phone_unique_idx (0005) is a PARTIAL index (WHERE
          // phone <> ''), so Postgres can't infer it as the ON CONFLICT
          // arbiter from `target` alone — this must repeat the same WHERE or
          // every upsert errors at the planning stage (silently swallowed by
          // the catch below) and no customer row is ever written. Found
          // 2026-08-17 while verifying loyalty-points crediting: confirmed
          // via server logs that this had been failing for every phone
          // number since 0005 shipped.
          targetWhere: sql`${customers.phone} <> ''`,
          // COALESCE so an order placed without a LINE session (LIFF
          // failed/skipped) never blanks out a lineUserId this phone already
          // had on file from an earlier order.
          set: {
            name,
            address,
            lineUserId: sql`coalesce(excluded.line_user_id, ${customers.lineUserId})`,
            lineDisplayName: sql`coalesce(excluded.line_display_name, ${customers.lineDisplayName})`,
            updatedAt: sql`now()`,
          },
        })
    } catch (err) {
      console.error('Customer upsert failed (non-fatal):', err)
    }

    // Same Flex card, sent to two destinations: the customer's own chat,
    // and the shop's own staff LINE (LINE_ORDER_NOTIFY_TO). Both best-effort
    // — a push failure never fails the order itself.
    const flex = buildOrderFlex({ orderNo, name, phone, address, items, total: totalAmount, deliveryFee, discountAmount, pointsRedeemed, distanceKm, deliveryMethod })

    // Alert staff with the branded card (not a plain-text summary) the
    // moment the order is created — doesn't depend on the customer tapping
    // anything on their end, unlike the client-side LINE-deep-link reminder.
    await pushOrderCardToStaff(flex)

    // Send the order card "from the shop" to the customer too (Messaging
    // API push). Complements the customer-side liff.sendMessages(); skips
    // when there's no messaging token or no LINE userId for this order.
    if (lineUserId) {
      await pushToUser(lineUserId, [flex])
    }

    const slipVerify = Boolean(s.slipokApiKey && s.slipokBranchId)

    return res.status(200).json({ ok: true, orderNo, totalAmount, itemsSubtotal, discountAmount, pointsRedeemed, pointsEarned, deliveryFee, slipVerify })
  } catch (err) {
    if (err?.message === 'POINTS_BALANCE_CHANGED') {
      return res.status(409).json({ error: 'ยอดคะแนนมีการเปลี่ยนแปลง กรุณาลองใหม่อีกครั้ง' })
    }
    console.error('Create order failed:', err)
    return res.status(500).json({ error: 'บันทึกออเดอร์ไม่สำเร็จ' })
  }
}
