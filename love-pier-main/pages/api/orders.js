import { sql } from 'drizzle-orm'
import { db } from '../../lib/db'
import { orders, customers } from '../../lib/db/schema'
import { pushNewOrderNotification, pushToUser } from '../../lib/lineMessaging'
import { buildOrderFlex } from '../../lib/orderFlex'
import { getShopSettings } from '../../lib/settings'
import { calcDeliveryFee } from '../../lib/deliveryFee'

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
  }))
  const itemsSubtotal = Math.round(
    items.reduce((sum, i) => sum + i.price * i.qty, 0)
  )

  const orderNo = makeOrderNo()
  const s = await getShopSettings()

  // Minimum order only gates shop delivery (a small order still costs the
  // shop nothing extra to hand over the counter for pickup) — re-checked here
  // because the client-side disabled button is a UX nicety, not the guard.
  if (deliveryMethod === 'delivery' && s.deliveryMinOrder > 0 && itemsSubtotal < s.deliveryMinOrder) {
    return res.status(400).json({ error: `ยอดสั่งอาหารต้องถึง ฿${s.deliveryMinOrder} จึงจะให้ร้านจัดส่งได้` })
  }
  // Recompute the delivery fee server-side from distance + settings — never
  // trust a fee number sent by the client. Outside the delivery radius the
  // shop doesn't deliver at all (the customer arranges + pays their own
  // courier), so no shop delivery fee applies regardless of configured rates.
  // Choosing 'pickup' inside the radius is free too — the fee only applies
  // when the shop is actually doing the delivering.
  const withinRadius = distanceKm == null || distanceKm <= s.radiusKm
  const deliveryFee = withinRadius && deliveryMethod === 'delivery'
    ? calcDeliveryFee(distanceKm, { baseFee: s.deliveryBaseFee, perKmRate: s.deliveryPerKmRate })
    : 0
  const totalAmount = itemsSubtotal + deliveryFee

  try {
    await db.insert(orders).values({
      orderNo,
      lineUserId: lineUserId || null,
      customerName: name,
      phone,
      address,
      note,
      deliveryMethod,
      items,
      itemsSubtotal,
      deliveryFee,
      totalAmount,
      status: 'pending',
      paymentMethod: 'promptpay',
      paymentRef: paymentRef || null,
      distanceKm: distanceKm != null ? String(distanceKm) : null,
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

    // Alert the shop staff on LINE. Best-effort — don't fail the order if it errors.
    await pushNewOrderNotification({
      orderNo,
      customerName: name,
      phone,
      address,
      note,
      items,
      totalAmount,
      deliveryFee,
      paymentRef,
      distanceKm,
      deliveryMethod,
    })

    // Send the order card "from the shop" to the customer (Messaging API push).
    // Complements the customer-side liff.sendMessages(); best-effort, skips
    // when no messaging token or no LINE userId.
    if (lineUserId) {
      const flex = buildOrderFlex({ orderNo, name, phone, address, items, total: totalAmount, deliveryFee, distanceKm, deliveryMethod })
      await pushToUser(lineUserId, [flex])
    }

    const slipVerify = Boolean(s.slipokApiKey && s.slipokBranchId)

    return res.status(200).json({ ok: true, orderNo, totalAmount, itemsSubtotal, deliveryFee, slipVerify })
  } catch (err) {
    console.error('Create order failed:', err)
    return res.status(500).json({ error: 'บันทึกออเดอร์ไม่สำเร็จ' })
  }
}
