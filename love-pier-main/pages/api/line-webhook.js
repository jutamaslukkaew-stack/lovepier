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
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '../../lib/db'
import { customers, orders } from '../../lib/db/schema'
import { processSlipForOrder } from '../../lib/slipVerification'
import { buildNoActiveOrderFlex, buildOrderEntryFlex, buildOrderStatusFlex, buildPaymentConfirmedFlex, buildSlipReceivedFlex, buildWelcomeFlex } from '../../lib/orderFlex'
import { classifyCustomerText } from '../../lib/orderIntent'
import { markFriended, markUnfriended } from '../../lib/lineFriendship'
import { NOTIFY_TARGETS, pushOrderCardToStaff, replyMessages, replyOrPush } from '../../lib/lineMessaging'
import { applyOrderStatusChange } from '../../lib/orderStatusUpdate'
import { decodeStaffPostback } from '../../lib/staffPostback'

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

function reply(replyToken, text) {
  return replyMessages(replyToken, [{ type: 'text', text }])
}

// Answer an event, surviving a reply token that has already expired — see
// replyOrPush in lib/lineMessaging.js. Used for the staff status buttons,
// where a lost message reads to the tapper as "the button does nothing".
function answer(event, text) {
  return replyOrPush({
    replyToken: event.replyToken,
    to: chatIdOf(event.source).id,
    messages: [{ type: 'text', text }],
  })
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

/**
 * Save a new OA friend before they ever open LIFF or place an order — and say
 * hello. This is the one moment the customer is guaranteed to be looking at
 * the chat, and it used to produce nothing at all: the replyToken was thrown
 * away and only the DB row was written.
 *
 * Order matters: fetch the name (one fast LINE call, needed for the card),
 * REPLY, then write the row. The upsert is the slow part and must not sit in
 * front of a single-use, short-lived reply token.
 */
async function handleFollow(event, userId) {
  if (!userId) return
  const profile = await fetchLineProfile(userId)
  const displayName = typeof profile?.displayName === 'string' ? profile.displayName.trim() : ''

  // Its own try/catch: a failed greeting must still leave the durable write to
  // run, since that is what makes the customer pushable at all.
  try {
    await replyMessages(event.replyToken, [
      buildWelcomeFlex({ orderUrl: ORDER_ENTRY_URL, displayName }),
    ])
  } catch (error) {
    console.error('welcome card failed (non-fatal):', error)
  }

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

const handleUnfollow = markUnfriended

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

// The delivery LIFF app, so "สั่งเลย" opens inside LINE already logged in.
// Falls back to the plain URL when no LIFF id is configured.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lovepier.cafe'
const DELIVERY_LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || ''
const ORDER_ENTRY_URL = DELIVERY_LIFF_ID
  ? `https://liff.line.me/${DELIVERY_LIFF_ID}`
  : `${SITE_URL}/delivery`

// Statuses worth reporting on. A finished or cancelled order is not something
// the customer is waiting on, and surfacing last week's order when they ask
// about today's would be worse than saying there is nothing in flight.
const LIVE_STATUSES = ['pending', 'paid', 'preparing']

/**
 * The customer asked about their order — from the rich menu, or by typing.
 * Answers with their newest order still in flight, or an invitation to order.
 *
 * Same shape as handleSlipImage below: newest matching order for this LINE
 * user, reply with a card. Never throws — the handler must still return 200.
 */
async function handleOrderStatusRequest(event, userId) {
  let order
  try {
    ;[order] = await db
      .select({
        orderNo: orders.orderNo,
        status: orders.status,
        deliveryMethod: orders.deliveryMethod,
      })
      .from(orders)
      .where(and(eq(orders.lineUserId, userId), inArray(orders.status, LIVE_STATUSES)))
      .orderBy(desc(orders.createdAt))
      .limit(1)
  } catch (err) {
    console.error('order status lookup failed:', err)
    await reply(event.replyToken, 'ขออภัยค่ะ ระบบดึงสถานะออเดอร์ไม่ได้ รบกวนลองใหม่อีกครั้งนะคะ')
    return
  }

  const card = order
    ? buildOrderStatusFlex({
        orderNo: order.orderNo,
        status: order.status,
        deliveryMethod: order.deliveryMethod,
      })
    : buildNoActiveOrderFlex({ orderUrl: ORDER_ENTRY_URL })

  // buildOrderStatusFlex returns null for a status it has no copy for. That
  // shouldn't happen for LIVE_STATUSES, but answering nothing is the one
  // outcome this feature exists to prevent.
  await replyMessages(event.replyToken, [card || buildNoActiveOrderFlex({ orderUrl: ORDER_ENTRY_URL })])
}

/**
 * The customer tapped the rich menu's "ขอสั่งเดลิเวอรี" button (a Text action,
 * so it arrives as an ordinary message) or typed one of its variants.
 *
 * Two things happen because of this, both of which a direct LIFF link would
 * lose: the customer's own message lands in the chat where staff can see it,
 * and the tap proves this userId is a live, unblocked friend — so the order
 * card, payment confirmation and status updates we promise on the card will
 * actually arrive.
 *
 * Never throws — the handler must still return 200.
 */
async function handleOrderEntryRequest(event, userId) {
  // Reply FIRST. The card is static, so nothing needs the database before it
  // goes out, and a reply token is single-use and short-lived — a cold start
  // plus a DB round trip is exactly what kills one.
  await replyMessages(event.replyToken, [buildOrderEntryFlex({ orderUrl: ORDER_ENTRY_URL })])
  await markFriended(userId)
}

// What to tell staff about the customer's copy. Every line has to answer the
// only question staff actually have — "do I need to tell them myself?" — so
// the two states that mean YES are the two that carry a warning sign.
const NOTICE_LINE_TH = {
  sent: 'แจ้งลูกค้าทาง LINE แล้ว',
  'no-line': '(ออเดอร์นี้ไม่มีบัญชี LINE จึงไม่ได้แจ้งลูกค้า)',
  'in-store': '(ออเดอร์หน้าร้าน ไม่ต้องแจ้งลูกค้า)',
  'no-card': '(สถานะนี้ไม่มีการ์ดแจ้งลูกค้า)',
  blocked: '⚠️ ลูกค้าบล็อก LINE ของร้านอยู่ รบกวนโทรแจ้งนะคะ',
  failed: '⚠️ ส่ง LINE ให้ลูกค้าไม่สำเร็จ รบกวนแจ้งลูกค้าเองนะคะ',
}

// A staff member tapped one of the กำลังทำ / พร้อมแล้ว / ยกเลิก buttons on an
// order card. The buttons only exist on the staff copy of a card, but a
// forwarded card must never let a customer move their own order — so
// decodeStaffPostback re-checks that the tap came from a configured
// LINE_ORDER_NOTIFY_TO destination before anything changes.
//
// EVERY outcome answers the tapper. The one exception is an unrecognized
// `act`, which isn't ours to answer. A silent refusal here was the 2026-09-01
// bug: staff tapped พร้อมแล้ว, saw only LINE's own echo bubble, and had no way
// to tell a working button from a misconfigured LINE_ORDER_NOTIFY_TO.
// Never throws; the handler still returns 200.
async function handleStatusPostback(event) {
  const senderId = event.source?.userId
  const chatId = chatIdOf(event.source).id
  const decoded = decodeStaffPostback({
    rawData: event.postback?.data,
    senderId,
    chatId,
    notifyTargets: NOTIFY_TARGETS,
  })

  // Prefixes only — enough to compare against LINE_ORDER_NOTIFY_TO without
  // writing whole customer ids into the logs. Formatted into the message
  // string rather than passed as an object because some log viewers keep only
  // the first argument, and this line is the one that explains an
  // `unauthorized` verdict to whoever is debugging it.
  const short = (v) => (v ? v.slice(0, 6) + '…' : '-')
  console.log(
    `staff postback: kind=${decoded.kind} chat=${short(chatId)} sender=${short(senderId)} targets=${NOTIFY_TARGETS.length}`
  )

  if (decoded.kind === 'ignore') {
    console.warn('unrecognized postback data:', event.postback?.data)
    return
  }

  if (decoded.kind === 'bad-payload') {
    await answer(event, 'ปุ่มนี้ใช้งานไม่ได้แล้ว รบกวนเปิดการ์ดออเดอร์ใบล่าสุดแล้วกดใหม่นะคะ')
    return
  }

  // Deliberately not the chat's id: a customer holding a forwarded card would
  // read a configuration instruction as an invitation to poke further. The
  // `id` command below says the same thing to whoever genuinely needs it.
  if (decoded.kind === 'unauthorized') {
    await answer(
      event,
      'ยังไม่ได้ตั้งค่าให้แชทนี้กดปุ่มออเดอร์ได้ค่ะ\n\nถ้านี่คือแชทของพนักงาน รบกวนพิมพ์คำว่า  id  ในแชทนี้ แล้วส่ง ID ที่ได้ให้ผู้ดูแลระบบไปตั้งค่า'
    )
    return
  }

  const { orderNo, status, label } = decoded
  let result
  try {
    result = await applyOrderStatusChange({ orderNo, status })
  } catch (err) {
    console.error('staff status postback failed:', orderNo, status, err)
    await answer(event, `อัปเดตออเดอร์ ${orderNo} ไม่สำเร็จ รบกวนลองใหม่อีกครั้งนะคะ`)
    return
  }

  if (!result.ok) {
    await answer(event, `ไม่พบออเดอร์ ${orderNo}`)
    return
  }
  if (result.unchanged) {
    await answer(event, `ออเดอร์ ${orderNo} อยู่สถานะ "${label}" อยู่แล้ว`)
    return
  }
  const notice = NOTICE_LINE_TH[result.customerNotice] || NOTICE_LINE_TH.failed
  await answer(event, `ออเดอร์ ${orderNo} → ${label}\n${notice}`)
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
    // The single most confusing failure this endpoint has: every event is
    // dropped here, so from the shop's side the bot is simply dead. The usual
    // cause is LINE_MESSAGING_CHANNEL_SECRET holding the LIFF/Login channel's
    // secret instead of the Messaging API channel's.
    console.error('LINE webhook signature mismatch — check that LINE_MESSAGING_CHANNEL_SECRET is the Messaging API channel secret', {
      hasSecret: Boolean(SECRET),
      headerPresent: Boolean(req.headers['x-line-signature']),
      bodyBytes: raw.length,
    })
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

  // If the shop reports that nothing happens and this line never appears in
  // the logs, LINE isn't calling us at all and the fix is in the console
  // (Webhook URL, "Use webhook", or Response settings → Chat off) — not here.
  console.log('LINE webhook events:', events.map((e) => `${e.type}:${e.source?.type}`).join(',') || '(empty)')

  for (const event of events) {
    // One bad event must not take the whole batch down with it: an uncaught
    // throw here becomes a 500, and LINE retries then disables a webhook that
    // keeps erroring — the outcome the final `return 200` exists to avoid.
    try {
      // Postbacks first, and deliberately ahead of the `!id` guard below: a
      // postback carries everything it needs in its own data plus a reply
      // token, and LINE omits source.userId for a user who hasn't accepted
      // the OA's privacy policy. Making a staff button depend on that is how
      // it silently stops working.
      if (event.type === 'postback') {
        await handleStatusPostback(event)
        continue
      }

      const { kind, id } = chatIdOf(event.source)
      if (!id) continue

      if (event.type === 'follow' && event.source?.type === 'user') {
        await handleFollow(event, event.source.userId)
        continue
      }

      if (event.type === 'unfollow' && event.source?.type === 'user') {
        await handleUnfollow(event.source.userId)
        continue
      }

      const text = event.type === 'message' && event.message?.type === 'text'
        ? (event.message.text || '').trim()
        : ''

      const asked = /^\/?id$/i.test(text)

      // 'join' = the OA was just added to a group/room. Announcing the id
      // unprompted is the whole point: the shop shouldn't have to know a magic
      // word for the one action this bot exists to perform.
      if (event.type === 'join' || asked) {
        // Whether THIS chat is configured is the answer the shop actually
        // needs — it turns "the buttons do nothing" into a one-word check.
        // Only a count of the other destinations, never their ids.
        const configured = NOTIFY_TARGETS.includes(id)
        const state = configured
          ? '✅ แชทนี้ตั้งค่ารับออเดอร์เรียบร้อยแล้ว'
          : `⚠️ แชทนี้ยังไม่ได้ตั้งค่ารับออเดอร์ (ตอนนี้ตั้งไว้ ${NOTIFY_TARGETS.length} ปลายทาง)\nส่ง ID นี้ให้ผู้ดูแลระบบ เพื่อตั้งค่า LINE_ORDER_NOTIFY_TO`
        await reply(event.replyToken, `ID ของ${kind}นี้คือ\n${id}\n\n${state}`)
        continue
      }

      // The two rich menu buttons. Both are Text actions rather than LIFF
      // links, so they arrive here as ordinary messages — see
      // buildOrderEntryFlex for why that matters. Customers also type these.
      //
      // 1:1 chats ONLY. In the staff group "ออเดอร์" and "สั่งอาหาร" are
      // ordinary words people use with each other all day; a bot that answered
      // every one of those would be unusable. Matching lives in
      // lib/orderIntent.js so the strings that must NOT match are testable.
      if (event.source?.type === 'user') {
        const intent = classifyCustomerText(text)
        if (intent === 'status') {
          await handleOrderStatusRequest(event, event.source.userId)
          continue
        }
        if (intent === 'order-entry') {
          await handleOrderEntryRequest(event, event.source.userId)
          continue
        }
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
    } catch (err) {
      console.error('LINE webhook event handler threw (non-fatal):', event.type, err)
    }
  }

  // Always 200 — LINE retries and eventually disables a webhook that errors,
  // and nothing here is important enough to be worth that.
  return res.status(200).json({ ok: true })
}
