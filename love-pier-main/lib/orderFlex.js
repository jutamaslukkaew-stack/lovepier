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
export function buildOrderFlex({ orderNo, name, phone, address, items = [], total, deliveryFee, discountAmount, pointsRedeemed, distanceKm, deliveryMethod, scheduledLabel }) {
  const orderUrl = `${SITE_URL}/order/${encodeURIComponent(orderNo)}`

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
        {
          type: 'button',
          style: 'primary',
          color: '#3a2818',
          height: 'sm',
          action: { type: 'uri', label: 'ตรวจสอบออเดอร์', uri: orderUrl },
        },
        {
          type: 'text',
          text: 'กรุณาแนบสลิปการโอนเพื่อยืนยันการชำระเงิน',
          size: 'xxs',
          color: '#aaaaaa',
          wrap: true,
          align: 'center',
        },
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
export function buildPaymentConfirmedFlex({ orderNo, total, pointsEarned }) {
  const orderUrl = `${SITE_URL}/order/${encodeURIComponent(orderNo)}`

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
  const orderUrl = `${SITE_URL}/order/${encodeURIComponent(orderNo)}`

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
  const orderUrl = `${SITE_URL}/order/${encodeURIComponent(orderNo)}`
  const pickup = deliveryMethod === 'pickup'
  const copy = {
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
          : status === 'preparing'
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
