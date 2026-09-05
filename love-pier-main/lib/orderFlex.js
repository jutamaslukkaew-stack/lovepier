// Builds a LINE Flex Message (order-confirmation card, Tassana-style) for an order.
// Used both by liff.sendMessages() (customer side) and the Messaging API push
// (shop side), so the card looks identical whichever way it's sent.
import { OPTION_GROUPS } from './menuOptions'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lovepier.cafe'

function money(n) {
  return `${(Number(n) || 0).toLocaleString('th-TH')}`
}

// Status light in the header's top-right corner. In the shop's LINE group the
// cards scroll past fast and every header is the same espresso block, so staff
// were reading the title to tell "new order" from "paid". The dot carries that
// distinction at a glance; the title still says it in words, so the colour is a
// shortcut, not the only signal.
//
// Colours are semantic rather than brand — a traffic light only works if it
// reads as one. All clear 3:1 against the espresso header.
const STATUS_DOT = {
  waiting: '#e8a33d', // something is still outstanding — payment, or the cooking
  done: '#5cbf62', // settled: money cleared, or the order finished
  alert: '#e2725b', // a human has to look at this one
}

function cardHeader(title, dotColor, backgroundColor = '#3a2818') {
  const heading = {
    type: 'box',
    layout: 'vertical',
    flex: 1,
    contents: [
      { type: 'text', text: title, color: '#ffffff', weight: 'bold', size: 'xl', wrap: true },
      { type: 'text', text: 'Love Pier Beach Cafe', color: '#c9a96e', size: 'xs', margin: 'sm' },
    ],
  }
  return {
    type: 'box',
    layout: 'horizontal',
    backgroundColor,
    paddingAll: '18px',
    contents: dotColor
      ? [
          heading,
          {
            type: 'box',
            layout: 'vertical',
            flex: 0,
            width: '20px',
            height: '20px',
            cornerRadius: '999px',
            backgroundColor: dotColor,
            contents: [{ type: 'filler' }],
          },
        ]
      : [heading],
  }
}

// Forward-only kitchen buttons for the cards that land in the STAFF chat only
// (never a customer's copy — gated by the withStaffActions flag at the call
// site). Each is a postback to /api/line-webhook, which re-checks that the
// tapper is a configured staff destination before it changes anything.
function staffActionButtons(orderNo) {
  const postback = (label, status) => ({
    type: 'postback',
    label,
    data: `act=status&status=${status}&orderNo=${encodeURIComponent(orderNo)}`,
    displayText: `${label} · ${orderNo}`,
  })
  return [
    {
      type: 'box',
      layout: 'horizontal',
      spacing: 'sm',
      contents: [
        { type: 'button', style: 'secondary', height: 'sm', action: postback('กำลังทำ', 'preparing') },
        { type: 'button', style: 'primary', color: '#3a2818', height: 'sm', action: postback('พร้อมแล้ว', 'done') },
      ],
    },
    { type: 'button', style: 'link', height: 'sm', color: '#b34a3a', action: postback('ยกเลิกออเดอร์', 'cancelled') },
  ]
}

function checkRow(label, value, action) {
  return {
    type: 'box',
    layout: 'baseline',
    margin: 'md',
    contents: [
      { type: 'text', text: label, size: 'sm', color: '#8c8c8c', flex: 0 },
      {
        type: 'text',
        text: value,
        size: 'sm',
        color: action ? '#1a73e8' : '#333333',
        align: 'end',
        wrap: true,
        ...(action ? { action } : {}),
      },
    ],
  }
}

function plainRow(label, value) {
  return {
    type: 'box',
    layout: 'baseline',
    margin: 'md',
    contents: [
      { type: 'text', text: label, size: 'sm', color: '#8c8c8c', flex: 0 },
      { type: 'text', text: value, size: 'sm', color: '#333333', align: 'end', wrap: true },
    ],
  }
}

// scheduledLabel: a pre-order's pickup/delivery time, already formatted by
// lib/preorder.js#formatSlotThai (e.g. 'ศ. 21 ส.ค. 14:00'). Blank/absent for
// an ordinary ASAP order, which is the majority — the row then doesn't exist
// at all rather than rendering an empty value.
//
// NOTE this builder has TWO call sites — pages/api/orders.js (the server push
// to staff and to the customer) and components/delivery/OrderFlow.js (the
// customer's own inbound copy via sendMessagesToChat). Passing a new field at
// only one of them half-ships it silently: one copy shows the time and the
// other doesn't.
export function buildOrderFlex({ orderNo, name, phone, address, items = [], total, deliveryFee, discountAmount, pointsRedeemed, distanceKm, deliveryMethod, scheduledLabel, withStaffActions = false }) {
  const orderUrl = `${SITE_URL}/delivery?order=${encodeURIComponent(orderNo)}`

  const itemRows = items.flatMap((i) => {
    const row = {
      type: 'box',
      layout: 'horizontal',
      margin: 'sm',
      contents: [
        { type: 'text', text: `${i.name}`, size: 'sm', color: '#555555', flex: 5, wrap: true },
        { type: 'text', text: `x${i.qty}`, size: 'sm', color: '#aaaaaa', flex: 1, align: 'center' },
        { type: 'text', text: `฿${money((Number(i.price) || 0) * (Number(i.qty) || 0))}`, size: 'sm', color: '#333333', flex: 3, align: 'end' },
      ],
    }
    // Structured options (see lib/menuOptions.js) — shown as a sub-line
    // alongside the free-text note, same xxs/gray treatment. Read from the
    // group list rather than named one by one, so a group added there reaches
    // the kitchen's card without a second edit here.
    const optionBits = OPTION_GROUPS.map((g) => i[g.field]).filter(Boolean).join(' · ')
    const subLines = [
      optionBits ? { type: 'text', text: optionBits, size: 'xxs', color: '#8c8c8c', margin: 'xs', wrap: true } : null,
      i.note ? { type: 'text', text: `— ${i.note}`, size: 'xxs', color: '#8c8c8c', margin: 'xs', wrap: true } : null,
    ].filter(Boolean)
    return [row, ...subLines]
  })

  const detail = [
    checkRow('ชื่อ', String(name || '-')),
    checkRow('เบอร์โทร', String(phone || '-'), phone ? { type: 'uri', label: 'call', uri: `tel:${String(phone).replace(/[^0-9+]/g, '')}` } : undefined),
    plainRow('รับอาหาร', deliveryMethod === 'pickup' ? 'รับที่ร้าน' : 'ให้ร้านจัดส่ง'),
  ]
  // "How" and "when" belong next to each other, above the address. Label kept
  // to four characters so it sits in the same width band as its neighbours
  // (ชื่อ / รับอาหาร / ที่อยู่ / ระยะส่ง) and the value column doesn't jump.
  if (scheduledLabel) detail.push(plainRow('รับเวลา', String(scheduledLabel)))
  if (address) detail.push(plainRow('ที่อยู่', String(address)))
  if (distanceKm != null) detail.push(plainRow('ระยะส่ง', `${distanceKm} กม.`))
  detail.push(plainRow('ชำระโดย', 'QR ของร้าน'))

  const bubble = {
    type: 'bubble',
    header: cardHeader('รับออเดอร์แล้ว', STATUS_DOT.waiting),
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        { type: 'text', text: `เลขที่ออเดอร์`, size: 'xs', color: '#aaaaaa', align: 'center' },
        { type: 'text', text: String(orderNo), weight: 'bold', size: 'xl', align: 'center', color: '#4a3520' },
        { type: 'separator', margin: 'lg' },

        // items
        { type: 'box', layout: 'vertical', margin: 'lg', contents: itemRows },
        { type: 'separator', margin: 'lg' },

        // customer details
        { type: 'box', layout: 'vertical', margin: 'sm', contents: detail },
        { type: 'separator', margin: 'lg' },

        // member discount (only when there is one)
        ...(discountAmount
          ? [plainRow('ส่วนลดสมาชิก', `-฿${money(discountAmount)}`)]
          : []),
        ...(pointsRedeemed
          ? [plainRow('ส่วนลดจากคะแนน', `-฿${money(pointsRedeemed)}`)]
          : []),

        // delivery fee (only when there is one)
        ...(deliveryFee
          ? [plainRow('ค่าจัดส่ง', `฿${money(deliveryFee)}`)]
          : []),

        // total
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'lg',
          contents: [
            { type: 'text', text: 'ยอดชำระ', weight: 'bold', size: 'md', color: '#333333' },
            { type: 'text', text: `฿${money(total)}`, weight: 'bold', size: 'lg', color: '#4a3520', align: 'end' },
          ],
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        ...(withStaffActions ? staffActionButtons(orderNo) : []),
        {
          type: 'button',
          style: withStaffActions ? 'link' : 'primary',
          color: '#3a2818',
          height: 'sm',
          action: { type: 'uri', label: 'ตรวจสอบออเดอร์', uri: orderUrl },
        },
        ...(withStaffActions
          ? []
          : [{
              type: 'text',
              text: 'กรุณาแนบสลิปการโอนเพื่อยืนยันการชำระเงิน',
              size: 'xxs',
              color: '#aaaaaa',
              wrap: true,
              align: 'center',
            }]),
      ],
    },
  }

  // The altText is all a locked phone's LINE notification shows, so a
  // pre-order says so there rather than only inside the card.
  const altText = scheduledLabel
    ? `รับออเดอร์แล้ว ${orderNo} — รับ ${scheduledLabel} — รวม ฿${money(total)}`
    : `รับออเดอร์แล้ว ${orderNo} — รวม ฿${money(total)}`
  return { type: 'flex', altText, contents: bubble }
}

// Sent right after SlipOK auto-verifies a payment (pages/api/verify-slip.js),
// so the customer sees a Love Pier-branded confirmation alongside SlipOK's own
// reply card in the LINE chat.
export function buildPaymentConfirmedFlex({ orderNo, total, pointsEarned, withStaffActions = false }) {
  const orderUrl = `${SITE_URL}/delivery?order=${encodeURIComponent(orderNo)}`

  const bubble = {
    type: 'bubble',
    header: cardHeader('ชำระเงินสำเร็จ', STATUS_DOT.done),
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        { type: 'text', text: 'เลขที่ออเดอร์', size: 'xs', color: '#aaaaaa', align: 'center' },
        { type: 'text', text: String(orderNo), weight: 'bold', size: 'xl', align: 'center', color: '#4a3520' },
        { type: 'separator', margin: 'lg' },
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'lg',
          contents: [
            { type: 'text', text: 'ยอดที่ชำระ', weight: 'bold', size: 'md', color: '#333333' },
            { type: 'text', text: `฿${money(total)}`, weight: 'bold', size: 'lg', color: '#4a3520', align: 'end' },
          ],
        },
        ...(pointsEarned
          ? [{
              type: 'text',
              text: `+${money(pointsEarned)} แต้มสะสม`,
              size: 'sm',
              weight: 'bold',
              color: '#b06d2b',
              align: 'center',
              margin: 'md',
            }]
          : []),
        {
          type: 'text',
          // Explicit line break — Thai has no word-spacing, so LINE's
          // auto-wrap was splitting mid-word ("ออเด" / "อร์") when this ran
          // as one long line. \n in a Flex text is honored as a real break.
          text: 'ขอบคุณที่อุดหนุน Love Pier\nกำลังเตรียมออเดอร์ให้แล้ว',
          size: 'xs',
          color: '#8c8c8c',
          wrap: true,
          margin: 'md',
          align: 'center',
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        ...(withStaffActions ? staffActionButtons(orderNo) : []),
        {
          type: 'button',
          style: withStaffActions ? 'link' : 'primary',
          color: '#3a2818',
          height: 'sm',
          action: { type: 'uri', label: 'ตรวจสอบออเดอร์', uri: orderUrl },
        },
        // The customer's only route to their balance. /rewards is linked from
        // nowhere else in the app, so before this the points banked one line
        // above were unreachable unless someone typed the URL. Staff copy
        // excluded — it is not their balance, and the card is already three
        // buttons deep.
        ...(!withStaffActions && pointsEarned
          ? [{
              type: 'button',
              style: 'link',
              height: 'sm',
              action: { type: 'uri', label: 'ดูคะแนนสะสม', uri: `${SITE_URL}/rewards` },
            }]
          : []),
      ],
    },
  }

  return { type: 'flex', altText: `ชำระเงินสำเร็จ ${orderNo} — ฿${money(total)}`, contents: bubble }
}

/**
 * Shown when a slip arrived but could NOT be auto-confirmed — a wrong amount,
 * an unreadable QR, SlipOK being unconfigured, or a slip already used. The
 * customer is told staff will check by hand, so the chat never dead-ends on
 * silence (which is what used to happen: the slip landed in the chat, the app
 * never saw it, and a human had to type a holding reply).
 *
 * Deliberately NOT styled as an error — from the customer's side they have
 * paid and done their part; the shop simply hasn't confirmed yet.
 */
export function buildSlipReceivedFlex({ orderNo, total, reason }) {
  const orderUrl = `${SITE_URL}/delivery?order=${encodeURIComponent(orderNo)}`

  const bubble = {
    type: 'bubble',
    header: cardHeader('ได้รับสลิปแล้ว', STATUS_DOT.alert),
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        { type: 'text', text: 'เลขที่ออเดอร์', size: 'xs', color: '#aaaaaa', align: 'center' },
        { type: 'text', text: String(orderNo), weight: 'bold', size: 'xl', align: 'center', color: '#4a3520' },
        { type: 'separator', margin: 'lg' },
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'lg',
          contents: [
            { type: 'text', text: 'ยอดที่ต้องชำระ', weight: 'bold', size: 'md', color: '#333333' },
            { type: 'text', text: `฿${money(total)}`, weight: 'bold', size: 'lg', color: '#4a3520', align: 'end' },
          ],
        },
        ...(reason
          ? [{ type: 'text', text: String(reason), size: 'xs', color: '#b06d2b', wrap: true, margin: 'md', align: 'center' }]
          : []),
        {
          // Same explicit-newline treatment as the confirmed card — Thai gives
          // LINE's auto-wrap no word boundaries to break on.
          type: 'text',
          text: 'ทางร้านกำลังตรวจสอบการชำระเงิน\nและจะยืนยันให้อีกครั้งนะคะ',
          size: 'xs',
          color: '#8c8c8c',
          wrap: true,
          margin: 'md',
          align: 'center',
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#3a2818',
          height: 'sm',
          action: { type: 'uri', label: 'ตรวจสอบออเดอร์', uri: orderUrl },
        },
      ],
    },
  }

  return { type: 'flex', altText: `ได้รับสลิปแล้ว ${orderNo} — ฿${money(total)}`, contents: bubble }
}

// Sent when staff changes an order status in /admin/orders. This closes the
// operational loop: changing the dropdown is not merely an internal database
// update; the customer immediately receives the same status in their LINE chat.
export function buildOrderStatusFlex({ orderNo, status, deliveryMethod }) {
  const orderUrl = `${SITE_URL}/delivery?order=${encodeURIComponent(orderNo)}`
  const pickup = deliveryMethod === 'pickup'
  const copy = {
    // Never pushed on a status CHANGE (nothing moves an order back to
    // pending), but the "เช็กสถานะออเดอร์" reply in pages/api/line-webhook.js
    // needs it — an unpaid order is the most likely thing a customer asks
    // about, and returning null there would answer their question with silence.
    pending: {
      title: 'รอชำระเงิน',
      detail: 'กรุณาแนบสลิปการโอนในแชทนี้ เพื่อยืนยันการชำระเงินค่ะ',
    },
    paid: {
      title: 'ยืนยันการชำระเงินแล้ว',
      detail: 'ร้านได้รับยอดชำระของคุณเรียบร้อยแล้ว',
    },
    preparing: {
      title: 'ร้านกำลังเตรียมออเดอร์',
      detail: 'กำลังจัดเตรียมอาหารของคุณ กรุณารอสักครู่นะคะ',
    },
    done: {
      title: pickup ? 'ออเดอร์พร้อมให้รับแล้ว' : 'ออเดอร์พร้อมจัดส่งแล้ว',
      detail: pickup
        ? 'สามารถมารับอาหารที่ Love Pier Beach Cafe ได้เลยค่ะ'
        : 'ทางร้านกำลังดำเนินการจัดส่งออเดอร์ให้คุณค่ะ',
    },
    cancelled: {
      title: 'ออเดอร์ถูกยกเลิก',
      detail: 'หากมีข้อสงสัย กรุณาติดต่อร้านผ่าน LINE ได้เลยค่ะ',
    },
  }[status]

  if (!copy) return null

  return {
    type: 'flex',
    altText: `${copy.title} ${orderNo}`,
    contents: {
      type: 'bubble',
      header: cardHeader(
        copy.title,
        status === 'cancelled'
          ? STATUS_DOT.alert
          : status === 'preparing' || status === 'pending'
            ? STATUS_DOT.waiting
            : STATUS_DOT.done,
        status === 'cancelled' ? '#7a3030' : '#3a2818'
      ),
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          { type: 'text', text: 'เลขที่ออเดอร์', size: 'xs', color: '#aaaaaa', align: 'center' },
          { type: 'text', text: String(orderNo), weight: 'bold', size: 'xl', align: 'center', color: '#4a3520' },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: copy.detail, size: 'sm', color: '#555555', wrap: true, align: 'center', margin: 'md' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [{
          type: 'button',
          style: 'primary',
          color: '#3a2818',
          height: 'sm',
          action: { type: 'uri', label: 'ตรวจสอบออเดอร์', uri: orderUrl },
        }],
      },
    },
  }
}

/**
 * Answer for "เช็กสถานะออเดอร์" when the customer has nothing in flight.
 *
 * A plain "you have no orders" would be a dead end, and the customer asked
 * precisely because they were thinking about their food — so the card ends
 * where they were already headed. `orderUrl` is the LIFF link when one is
 * configured (opens inside LINE, already logged in) and the plain site URL
 * otherwise.
 */
export function buildNoActiveOrderFlex({ orderUrl }) {
  return {
    type: 'flex',
    altText: 'ตอนนี้ยังไม่มีออเดอร์ที่กำลังดำเนินการ',
    contents: {
      type: 'bubble',
      header: cardHeader('ไม่มีออเดอร์ที่กำลังดำเนินการ', STATUS_DOT.done),
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [{
          type: 'text',
          text: 'ตอนนี้คุณยังไม่มีออเดอร์ที่กำลังดำเนินการค่ะ\nสั่งเลยได้ที่ปุ่มด้านล่างนะคะ',
          size: 'sm',
          color: '#555555',
          wrap: true,
          align: 'center',
        }],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [{
          type: 'button',
          style: 'primary',
          color: '#3a2818',
          height: 'sm',
          action: { type: 'uri', label: 'สั่งเลย', uri: orderUrl },
        }],
      },
    },
  }
}

// The one promise both entry cards make, and the reason a customer should not
// mute this OA. Naming the three specific messages is what turns it from
// boilerplate into something checkable. The explicit \n is load-bearing: Thai
// gives LINE's auto-wrap no word boundary and it will break mid-word without
// one (same treatment as the confirmed/received cards above).
const UPDATES_PROMISE = 'ใบเสร็จ ยืนยันการชำระเงิน และแจ้งเมื่ออาหารพร้อม\nจะส่งเข้าแชทนี้ทั้งหมด'

/**
 * Answer to the rich menu's "ขอสั่งเดลิเวอรี" button.
 *
 * The button is a TEXT action, not a LIFF link, on purpose: the tap posts the
 * customer's own message into the chat, which proves this userId is a live,
 * unblocked friend of the OA before we promise to send them anything. A LIFF
 * link would open the order flow with nothing entering the chat and no such
 * proof — and LINE Login is a different channel from the Messaging API, so a
 * logged-in customer is NOT necessarily someone we can push to.
 */
export function buildOrderEntryFlex({ orderUrl, shopState = null }) {
  // Answering "พร้อมรับออเดอร์แล้ว" at 2am is how the shop ends up with an
  // order nobody can cook, so the card has to know the hours. `null` keeps the
  // always-open behaviour for any caller that hasn't got the settings.
  const closed = Boolean(shopState) && !shopState.accepting
  const lastOrderPassed = closed && shopState.reason === 'last-order-passed'

  const title = lastOrderPassed
    ? 'วันนี้ปิดรับออเดอร์แล้ว'
    : closed ? 'ตอนนี้ร้านปิดอยู่' : 'พร้อมรับออเดอร์แล้ว'

  const lead = lastOrderPassed
    ? `วันนี้รับออเดอร์ถึง ${shopState.lastOrderAt} น. ค่ะ${shopState.nextOpenLabel ? `\nเปิดรับอีกครั้ง ${shopState.nextOpenLabel} น.` : ''}`
    : closed
      ? (shopState.nextOpenLabel
          ? `เปิดอีกครั้ง ${shopState.nextOpenLabel} น. ค่ะ\nกดดูเมนูไว้ก่อนได้เลยนะคะ`
          : 'ตอนนี้ยังไม่เปิดรับออเดอร์ค่ะ')
      : 'กดปุ่มด้านล่างเพื่อเลือกเมนูและสั่งได้เลยค่ะ'

  return {
    type: 'flex',
    altText: closed ? `${title} — ${shopState.nextOpenLabel ? `เปิดอีกครั้ง ${shopState.nextOpenLabel} น.` : 'ดูเมนูได้'}` : 'พร้อมรับออเดอร์แล้ว — เลือกเมนูและสั่งได้เลย',
    contents: {
      type: 'bubble',
      // cardHeader already prints "Love Pier Beach Cafe" underneath, so the
      // title must not repeat the shop name.
      header: cardHeader(title, closed ? STATUS_DOT.waiting : STATUS_DOT.done),
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: lead,
            size: 'sm',
            color: '#555555',
            wrap: true,
            align: 'center',
          },
          {
            type: 'text',
            text: `${UPDATES_PROMISE}ค่ะ`,
            size: 'xs',
            color: '#8c8c8c',
            wrap: true,
            align: 'center',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [{
          type: 'button',
          style: 'primary',
          color: '#3a2818',
          height: 'sm',
          // When closed, send them to the menu rather than an order flow that
          // will only refuse them — the tap should go somewhere that works.
          action: closed
            ? { type: 'uri', label: 'ดูเมนู', uri: `${SITE_URL}/menu` }
            // Same label as buildNoActiveOrderFlex — one button to learn.
            : { type: 'uri', label: 'สั่งเลย', uri: orderUrl },
        }],
      },
    },
  }
}

/**
 * Sent on the `follow` event — the one moment a customer is guaranteed to be
 * looking at this chat. It used to be a silent DB write with the replyToken
 * thrown away.
 *
 * This is also the ONLY way to reach someone who added the OA from a QR code
 * or a poster and will never tap a rich menu.
 *
 * NOTE: LINE OA Manager has its own built-in greeting that fires on the same
 * event. It must be turned OFF or the customer gets two welcomes — see
 * ORDER_SETUP.md.
 */
export function buildWelcomeFlex({ orderUrl, displayName }) {
  // Long display names are common and would wrap the greeting to three lines
  // on a card that must not scroll; drop the line entirely rather than truncate
  // someone's name mid-word.
  const name = typeof displayName === 'string' ? displayName.trim() : ''
  const greeting = name && name.length <= 20 ? `สวัสดีค่ะ คุณ${name}` : ''

  return {
    type: 'flex',
    altText: 'ยินดีต้อนรับสู่ Love Pier Beach Cafe — สั่งเดลิเวอรีได้จากแชทนี้เลยค่ะ',
    contents: {
      type: 'bubble',
      header: cardHeader('ยินดีต้อนรับค่ะ', STATUS_DOT.done),
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          ...(greeting
            ? [{ type: 'text', text: greeting, size: 'sm', color: '#4a3520', weight: 'bold', wrap: true, align: 'center' }]
            : []),
          {
            type: 'text',
            text: 'สั่งเดลิเวอรีและสั่งล่วงหน้าได้จากแชทนี้เลยค่ะ',
            size: 'sm',
            color: '#555555',
            wrap: true,
            align: 'center',
          },
          {
            type: 'text',
            text: UPDATES_PROMISE,
            size: 'xs',
            color: '#8c8c8c',
            wrap: true,
            align: 'center',
          },
          // Teaches the typed fallback for customers who lose the rich menu
          // or arrive here from a QR code.
          {
            type: 'text',
            text: 'พิมพ์ "เช็กสถานะออเดอร์" เพื่อดูออเดอร์ล่าสุดได้ตลอดค่ะ',
            size: 'xxs',
            color: '#aaaaaa',
            wrap: true,
            align: 'center',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [{
          type: 'button',
          style: 'primary',
          color: '#3a2818',
          height: 'sm',
          action: { type: 'uri', label: 'สั่งเลย', uri: orderUrl },
        }],
      },
    },
  }
}

/**
 * Receipt card pushed to a member right after staff scan their Love Pier ID
 * at the counter (see app/admin/actions/in-store.ts).
 *
 * Unlike the order cards above there is nothing for the customer to track or
 * act on — the food is already in their hands — so this card has no footer
 * button and no order link. It exists to close the loop: the customer should
 * see their points land while still standing at the till, which is what makes
 * the member card feel worth showing next time.
 */
export function buildInStoreVisitFlex({ memberNo, grossAmount, discountAmount, netAmount, pointsEarned, pointsBalance }) {
  const bubble = {
    type: 'bubble',
    header: cardHeader('ขอบคุณที่ใช้บริการ', STATUS_DOT.done),
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        { type: 'text', text: 'แต้มที่ได้รับ', size: 'xs', color: '#aaaaaa', align: 'center' },
        {
          type: 'text',
          text: `+${money(pointsEarned)}`,
          weight: 'bold',
          size: 'xxl',
          align: 'center',
          color: '#b06d2b',
        },
        { type: 'separator', margin: 'lg' },
        plainRow('รหัสสมาชิก', String(memberNo)),
        plainRow('ยอดเต็ม', `฿${money(grossAmount)}`),
        // Only worth a line when there actually was one — a "ส่วนลด ฿0" row
        // reads like the member benefit failed to apply.
        ...(discountAmount > 0 ? [plainRow('ส่วนลดสมาชิก', `-฿${money(discountAmount)}`)] : []),
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'lg',
          contents: [
            { type: 'text', text: 'ยอดที่ชำระ', weight: 'bold', size: 'md', color: '#333333' },
            { type: 'text', text: `฿${money(netAmount)}`, weight: 'bold', size: 'lg', color: '#4a3520', align: 'end' },
          ],
        },
        { type: 'separator', margin: 'lg' },
        {
          type: 'text',
          text: `แต้มสะสมทั้งหมด ${money(pointsBalance)} แต้ม`,
          size: 'sm',
          color: '#8c8c8c',
          align: 'center',
          margin: 'lg',
        },
        {
          type: 'text',
          // Explicit break — Thai has no word spacing, so LINE's auto-wrap
          // splits mid-word on a long single line (see buildPaymentConfirmedFlex).
          text: 'แต้มสะสมใช้เป็นส่วนลดได้\n1 แต้ม = 1 บาท',
          size: 'xs',
          color: '#8c8c8c',
          wrap: true,
          margin: 'md',
          align: 'center',
        },
      ],
    },
  }

  return {
    type: 'flex',
    altText: `ขอบคุณที่ใช้บริการ — ได้รับ ${money(pointsEarned)} แต้ม`,
    contents: bubble,
  }
}

/**
 * Staff-only alert: a slip arrived but SlipOK did not clear it, so the order
 * is still `pending` and only a human can settle it.
 *
 * Added 2026-09-05. Until now this was the silent case in the whole payment
 * path — the customer was told "ทางร้านจะตรวจสอบให้เองนะคะ" and nobody told
 * the shop, so the order (and the loyalty points it earns on payment, which
 * are only banked once it turns `paid`) waited for a review that was never
 * triggered.
 *
 * No status buttons: confirming payment stays a deliberate look at the slip in
 * /admin/orders, the same rule lib/staffPostback.js keeps for the LINE
 * quick-actions. The button is the way there.
 */
export function buildSlipNeedsReviewFlex({ orderNo, total, reason }) {
  const bubble = {
    type: 'bubble',
    header: cardHeader('สลิปรอตรวจสอบ', STATUS_DOT.alert),
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        { type: 'text', text: 'เลขที่ออเดอร์', size: 'xs', color: '#aaaaaa', align: 'center' },
        { type: 'text', text: String(orderNo), weight: 'bold', size: 'xl', align: 'center', color: '#4a3520' },
        { type: 'separator', margin: 'lg' },
        plainRow('ยอดที่ต้องได้รับ', `฿${money(total)}`),
        ...(reason
          ? [{ type: 'text', text: String(reason), size: 'xs', color: '#b06d2b', wrap: true, margin: 'md', align: 'center' }]
          : []),
        {
          type: 'text',
          text: 'ลูกค้าแนบสลิปแล้ว แต่ระบบยืนยันอัตโนมัติไม่ได้\nรบกวนเปิดดูสลิปแล้วกดยืนยันชำระเงิน',
          size: 'xs',
          color: '#8c8c8c',
          wrap: true,
          margin: 'md',
          align: 'center',
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#3a2818',
          height: 'sm',
          action: { type: 'uri', label: 'เปิดหน้าออเดอร์', uri: `${SITE_URL}/admin/orders` },
        },
      ],
    },
  }

  return {
    type: 'flex',
    altText: `สลิปรอตรวจสอบ — ออเดอร์ ${orderNo}`,
    contents: bubble,
  }
}
