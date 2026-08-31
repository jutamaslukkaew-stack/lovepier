// LINE Messaging API webhook. Two jobs:
//
// (1) ANSWER "what is this chat's id?", because LINE_ORDER_NOTIFY_TO
//     (lib/lineMessaging.js) needs one and LINE exposes a GROUP's id through
//     no console UI whatsoever — the only way to learn it is to receive an
//     event from inside that group. So the bot announces it: once when it's
//     added to the group, and again any time someone types "id".
//
// (2) ACCEPT A PAYMENT SLIP SENT AS AN IMAGE IN THE 1:1 CHAT. The order
//     confirmation tells customers to attach their slip in this chat, and
//     they do — but until this handler existed the app never saw those
//     images, so the order sat 'pending' forever and no confirmation card
//     ever came back; a human had to type a holding reply by hand. Now the
//     image is pulled from LINE, run through the SAME verification path as
//     the website's upload field (lib/slipVerification.js), and answered
//     with a real Flex card.
//
// Setup (shop side, in LINE Developers Console > the Messaging API channel):
//   1. Webhook URL = https://www.lovepier.cafe/api/line-webhook, Use webhook ON
//   2. Invite the OA into the staff group — it replies with the group id
//   3. Put that id in LINE_ORDER_NOTIFY_TO (Vercel) and redeploy
//
// NOTE: a channel has exactly ONE webhook URL. Pointing it here replaces
// whatever was there before (SlipOK's endpoint, currently returning 401 on
// LINE's own Verify). That only affects SlipOK's own in-chat bot features —
// this app's slip checking calls SlipOK's API directly (lib/slipok.js) and
// does not involve this webhook at all.

import crypto from 'crypto'
import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '../../lib/db'
import { customers, orders } from '../../lib/db/schema'
import { processSlipForOrder } from '../../lib/slipVerification'
import { buildPaymentConfirmedFlex, buildSlipReceivedFlex } from '../../lib/orderFlex'
import { NOTIFY_TARGETS, pushOrderCardToStaff } from '../../lib/lineMessaging'
import { applyOrderStatusChange, STAFF_BUTTON_STATUSES } from '../../lib/orderStatusUpdate'

const TOKEN = process.env.LINE_MESSAGING_TOKEN || ''
const SECRET = process.env.LINE_MESSAGING_CHANNEL_SECRET || ''

// The signature is computed over the exact bytes LINE sent, so Next's JSON
// parser has to stay out of the way.
export const config = { api: { bodyParser: false } }

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function signatureValid(raw, header) {
  // Without the secret configured we can't verify. Still safe to proceed:
  // the only action this endpoint takes is replying via a replyToken, and
  // LINE issues those itself — a forged request has no usable token, so a
  // spoofed event can't make the bot message anyone.
  if (!SECRET) return true
  const expected = crypto.createHmac('sha256', SECRET).update(raw).digest('base64')
  const a = Buffer.from(expected)
  const b = Buffer.from(header || '')
  // timingSafeEqual throws on a length mismatch rather than returning false.
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

async function replyMessages(replyToken, messages) {
  if (!TOKEN || !replyToken || !messages?.length) return
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ replyToken, messages }),
    })
    if (!res.ok) console.error('LINE reply failed:', res.status, await res.text())
  } catch (err) {
    console.error('LINE reply error:', err)
  }
}

function reply(replyToken, text) {
  return replyMessages(replyToken, [{ type: 'text', text }])
}

async function fetchLineProfile(userId) {
  if (!TOKEN || !userId) return null
  try {
    const response = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    })
    if (!response.ok) {
      console.error('LINE profile fetch failed:', response.status)
      return null
    }
    return await response.json()
  } catch (error) {
    console.error('LINE profile fetch error:', error)
    return null
  }
}

/** Save a new OA friend before they ever open LIFF or place an order. */
async function handleFollow(userId) {
  if (!userId) return
  const profile = await fetchLineProfile(userId)
  const displayName = typeof profile?.displayName === 'string' ? profile.displayName.trim() : ''
  try {
    await db.insert(customers).values({
      lineUserId: userId,
      lineDisplayName: displayName,
      name: displayName,
      lineFriendStatus: true,
      lineFollowedAt: new Date(),
      lineUnfollowedAt: null,
    }).onConflictDoUpdate({
      target: customers.lineUserId,
      set: {
        lineDisplayName: displayName || sql`${customers.lineDisplayName}`,
        name: displayName ? sql`coalesce(nullif(${customers.name}, ''), ${displayName})` : sql`${customers.name}`,
        lineFriendStatus: true,
        lineFollowedAt: new Date(),
        lineUnfollowedAt: null,
        updatedAt: sql`now()`,
      },
    })
  } catch (error) {
    console.error('LINE friend upsert failed:', error)
  }
}

async function handleUnfollow(userId) {
  if (!userId) return
  try {
    await db.update(customers).set({
      lineFriendStatus: false,
      lineUnfollowedAt: new Date(),
      updatedAt: sql`now()`,
    }).where(eq(customers.lineUserId, userId))
  } catch (error) {
    console.error('LINE unfollow update failed:', error)
  }
}

// LINE keeps message media on a separate host and only hands it over to the
// channel that received it. Returns a data URL, the shape lib/slipok.js and
// lib/slipVerification.js already expect.
async function fetchMessageImage(messageId) {
  if (!TOKEN || !messageId) return null
  try {
    const res = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    })
    if (!res.ok) {
      console.error('LINE content fetch failed:', res.status, await res.text())
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    // A phone photo of a slip is well under this; the cap only stops a huge
    // upload from being read into a serverless function's memory.
    if (!buf.length || buf.length > 10 * 1024 * 1024) return null
    const mime = (res.headers.get('content-type') || 'image/jpeg').split(';')[0]
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch (err) {
    console.error('LINE content fetch error:', err)
    return null
  }
}

/**
 * A slip image arrived in a 1:1 chat. Match it to that customer's order and
 * answer with a card. Never throws — the handler must still return 200.
 */
async function handleSlipImage(event, userId) {
  // Only orders actually awaiting payment are candidates, newest first. If the
  // customer has none, this image isn't a slip we asked for (an ordinary photo,
  // a question about a dish), so we stay silent and let staff reply as people.
  let order
  try {
    ;[order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.lineUserId, userId), eq(orders.status, 'pending')))
      .orderBy(desc(orders.createdAt))
      .limit(1)
  } catch (err) {
    console.error('slip order lookup failed:', err)
    return
  }
  if (!order) return

  const imageBase64 = await fetchMessageImage(event.message?.id)
  if (!imageBase64) {
    // The image itself couldn't be retrieved, so nothing was checked and
    // nothing was stored — say so rather than implying the slip is in hand.
    await reply(event.replyToken, 'ขออภัยค่ะ ระบบเปิดรูปสลิปไม่ได้\nรบกวนส่งใหม่อีกครั้งนะคะ')
    return
  }

  const result = await processSlipForOrder(order, imageBase64)

  // Unlike the website route there's no duplicate-notification worry here:
  // this is a reply to something the customer just did, so confirming an
  // already-paid order again is the reassuring answer, not noise.
  const card =
    result.verified
      ? buildPaymentConfirmedFlex({ orderNo: order.orderNo, total: order.totalAmount, pointsEarned: order.pointsEarned })
      : buildSlipReceivedFlex({
          orderNo: order.orderNo,
          total: order.totalAmount,
          // result.error is customer-safe wording ("ยอดในสลิปไม่ตรงกับออเดอร์",
          // "สลิปนี้ถูกใช้ไปแล้ว"); absent when SlipOK simply isn't configured,
          // in which case the card's generic "staff will confirm" line stands
          // on its own.
          reason: result.error,
        })

  // Same staff card as the website upload path (pages/api/verify-slip.js) —
  // gated on !alreadyPaid there too, so a customer re-sending a slip for an
  // order that already cleared doesn't re-alert staff for nothing. The staff
  // copy carries the กำลังทำ / พร้อมแล้ว quick-action buttons; the customer's
  // reply (`card`) must not.
  if (result.verified && !result.alreadyPaid) {
    await pushOrderCardToStaff(
      buildPaymentConfirmedFlex({ orderNo: order.orderNo, total: order.totalAmount, pointsEarned: order.pointsEarned, withStaffActions: true })
    )
  }

  await replyMessages(event.replyToken, [card])
}

// A staff member tapped one of the กำลังทำ / พร้อมแล้ว / ยกเลิก buttons on an
// order card. The buttons only exist on the staff copy of a card, but a
// forwarded card must never let a customer move their own order — so this
// re-checks that the tap came from a configured LINE_ORDER_NOTIFY_TO
// destination (a staff 1:1 chat, or the staff group any member can act from)
// before it changes anything. Never throws; the handler still returns 200.
const STATUS_LABEL_TH = { preparing: 'กำลังทำ', done: 'พร้อมแล้ว', cancelled: 'ยกเลิก' }

async function handleStatusPostback(event) {
  const senderId = event.source?.userId
  const chatId = chatIdOf(event.source).id
  const fromStaff =
    (senderId && NOTIFY_TARGETS.includes(senderId)) ||
    (chatId && NOTIFY_TARGETS.includes(chatId))
  if (!fromStaff) return

  const data = new URLSearchParams(String(event.postback?.data || ''))
  if (data.get('act') !== 'status') return
  const status = data.get('status')
  const orderNo = data.get('orderNo')
  if (!orderNo || !STAFF_BUTTON_STATUSES.includes(status)) return

  const label = STATUS_LABEL_TH[status] || status
  let result
  try {
    result = await applyOrderStatusChange({ orderNo, status })
  } catch (err) {
    console.error('staff status postback failed:', orderNo, status, err)
    await reply(event.replyToken, `อัปเดตออเดอร์ ${orderNo} ไม่สำเร็จ รบกวนลองใหม่อีกครั้งนะคะ`)
    return
  }

  if (!result.ok) {
    await reply(event.replyToken, `ไม่พบออเดอร์ ${orderNo}`)
    return
  }
  if (result.unchanged) {
    await reply(event.replyToken, `ออเดอร์ ${orderNo} อยู่สถานะ "${label}" อยู่แล้ว`)
    return
  }
  await reply(
    event.replyToken,
    result.sentToLine
      ? `ออเดอร์ ${orderNo} → ${label}\nแจ้งลูกค้าทาง LINE แล้ว`
      : `ออเดอร์ ${orderNo} → ${label}\n(ออเดอร์นี้ไม่มีบัญชี LINE จึงไม่ได้แจ้งลูกค้า)`
  )
}

// A group id starts with C, a multi-person room with R, a 1:1 user with U.
function chatIdOf(source) {
  if (source?.type === 'group') return { kind: 'กลุ่ม', id: source.groupId }
  if (source?.type === 'room') return { kind: 'ห้องแชท', id: source.roomId }
  return { kind: 'แชทส่วนตัว', id: source?.userId }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const raw = await readRawBody(req)

  if (!signatureValid(raw, req.headers['x-line-signature'])) {
    return res.status(401).json({ error: 'bad signature' })
  }

  let body
  try {
    body = JSON.parse(raw.toString('utf8') || '{}')
  } catch {
    // LINE's "Verify" button sends an empty body — it only checks for a 200.
    return res.status(200).json({ ok: true })
  }

  const events = Array.isArray(body.events) ? body.events : []

  for (const event of events) {
    const { kind, id } = chatIdOf(event.source)
    if (!id) continue

    // Staff tapped a กำลังทำ / พร้อมแล้ว / ยกเลิก button on an order card.
    if (event.type === 'postback') {
      await handleStatusPostback(event)
      continue
    }

    if (event.type === 'follow' && event.source?.type === 'user') {
      await handleFollow(event.source.userId)
      continue
    }

    if (event.type === 'unfollow' && event.source?.type === 'user') {
      await handleUnfollow(event.source.userId)
      continue
    }

    const asked =
      event.type === 'message' &&
      event.message?.type === 'text' &&
      /^\/?id$/i.test((event.message.text || '').trim())

    // 'join' = the OA was just added to a group/room. Announcing the id
    // unprompted is the whole point: the shop shouldn't have to know a magic
    // word for the one action this bot exists to perform.
    if (event.type === 'join' || asked) {
      await reply(
        event.replyToken,
        `ID ของ${kind}นี้คือ\n${id}\n\nส่ง ID นี้ให้ผู้ดูแลระบบ เพื่อตั้งค่าแจ้งเตือนออเดอร์ใหม่`
      )
      continue
    }

    // A slip is only meaningful from an individual customer — images posted in
    // the staff group are not payments and must never touch an order.
    if (
      event.type === 'message' &&
      event.message?.type === 'image' &&
      event.source?.type === 'user'
    ) {
      await handleSlipImage(event, event.source.userId)
    }
  }

  // Always 200 — LINE retries and eventually disables a webhook that errors,
  // and nothing here is important enough to be worth that.
  return res.status(200).json({ ok: true })
}
