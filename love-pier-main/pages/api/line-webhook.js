// LINE Messaging API webhook.
//
// Its only job is to answer the question "what is this chat's id?", because
// LINE_ORDER_NOTIFY_TO (lib/lineMessaging.js) needs one and LINE exposes a
// GROUP's id through no console UI whatsoever — the only way to learn it is
// to receive an event from inside that group. So the bot announces it: once
// when it's added to the group, and again any time someone types "id".
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

async function reply(replyToken, text) {
  if (!TOKEN || !replyToken) return
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
    })
    if (!res.ok) console.error('LINE reply failed:', res.status, await res.text())
  } catch (err) {
    console.error('LINE reply error:', err)
  }
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
    }
  }

  // Always 200 — LINE retries and eventually disables a webhook that errors,
  // and nothing here is important enough to be worth that.
  return res.status(200).json({ ok: true })
}
