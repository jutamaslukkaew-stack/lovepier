import { sql } from 'drizzle-orm'
import { db } from '../../lib/db'
import { orders, customers } from '../../lib/db/schema'
import { pushNewOrderNotification, pushToUser } from '../../lib/lineMessaging'
import { buildOrderFlex } from '../../lib/orderFlex'
import { getShopSettings } from '../../lib/settings'

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
  }))
  const totalAmount = Math.round(
    items.reduce((sum, i) => sum + i.price * i.qty, 0)
  )

  const orderNo = makeOrderNo()

  try {
    await db.insert(orders).values({
      orderNo,
      lineUserId: lineUserId || null,
      customerName: name,
      phone,
      address,
      note,
      items,
      totalAmount,
      status: 'pending',
      paymentMethod: 'promptpay',
      paymentRef: paymentRef || null,
      distanceKm: distanceKm != null ? String(distanceKm) : null,
    })

    // Remember this customer for next time (auto-fill on their next order).
    if (lineUserId) {
      await db
        .insert(customers)
        .values({
          lineUserId,
          lineDisplayName: pickString(req.body?.lineDisplayName),
          name,
          phone,
          address,
        })
        .onConflictDoUpdate({
          target: customers.lineUserId,
          set: { name, phone, address, updatedAt: sql`now()` },
        })
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
      paymentRef,
      distanceKm,
    })

    // Send the order card "from the shop" to the customer (Messaging API push).
    // Complements the customer-side liff.sendMessages(); best-effort, skips
    // when no messaging token or no LINE userId.
    if (lineUserId) {
      const flex = buildOrderFlex({ orderNo, name, phone, address, items, total: totalAmount, distanceKm })
      await pushToUser(lineUserId, [flex])
    }

    // Tell the client whether automatic slip verification is available.
    let slipVerify = false
    try {
      const s = await getShopSettings()
      slipVerify = Boolean(s.slipokApiKey && s.slipokBranchId)
    } catch {}

    return res.status(200).json({ ok: true, orderNo, totalAmount, slipVerify })
  } catch (err) {
    console.error('Create order failed:', err)
    return res.status(500).json({ error: 'บันทึกออเดอร์ไม่สำเร็จ' })
  }
}
