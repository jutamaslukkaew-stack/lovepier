// Guided 6-step order flow for /delivery: welcome → distance check → menu →
// order summary → confirm & pay → success. Replaces the old DeliveryGate
// (auto-gate + separate CartDrawer sheet) with a single linear wizard so the
// out-of-radius warning and the payment confirmation both require an
// explicit, un-skippable acknowledgement instead of a bottom-sheet a
// customer could dismiss without reading.
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import PageHero from '../PageHero'
import { useLanguage } from '../../lib/language'
import { useCart } from '../../lib/cart'
import { useChrome } from '../../lib/chrome'
import { isLiffConfigured, loginAndGetProfile, getProfileIfLoggedIn, sendMessagesToChat } from '../../lib/liff'
import { setDeliverySessionProfile, setDeliverySessionDistance } from '../../lib/deliverySession'
import { buildPaymentPayload } from '../../lib/promptpay'
import { buildOrderFlex } from '../../lib/orderFlex'
import LocatingAnimation from './LocatingAnimation'
import MenuExperience from '../menu/MenuExperience'

// Leaflet touches `window` at import time — must never be pulled into the
// server bundle, hence ssr:false.
const DeliveryRadiusMap = dynamic(() => import('./DeliveryRadiusMap'), { ssr: false })

const PROMPTPAY_ID = process.env.NEXT_PUBLIC_PROMPTPAY_ID || ''
const PROMPTPAY_TYPE = process.env.NEXT_PUBLIC_PROMPTPAY_TYPE || ''
const PROMPTPAY_REF = process.env.NEXT_PUBLIC_PROMPTPAY_REF || ''
const PROMPTPAY_REF2 = process.env.NEXT_PUBLIC_PROMPTPAY_REF2 || ''
const PROMPTPAY_TERMINAL_LABEL = process.env.NEXT_PUBLIC_PROMPTPAY_TERMINAL_LABEL || ''
const LINE_OA_ID = process.env.NEXT_PUBLIC_LINE_OA_ID || '@lovepier.cafe'

// Our own per-order reference, for display/reconciliation only (shown in the
// LINE message, stored on the order) — NOT embedded in the QR. The QR's own
// Ref.1 must be the biller's fixed PROMPTPAY_REF; this biller's SCB Mae Manee
// setup rejects any other value ("เลขที่อ้างอิงไม่ถูกต้อง").
function makePaymentRef() {
  return Date.now().toString().slice(-10)
}

const STEP_ORDER = ['welcome', 'distance', 'method', 'menu', 'summary', 'payment', 'success']

const COPY = {
  th: {
    back: 'ย้อนกลับ',
    close: 'ปิด',
    next: 'ถัดไป',
    // step 1 — welcome
    welcomeSubtitle: 'อาหารและเครื่องดื่มริมทะเล',
    welcomeHeading: 'สั่งอาหารกลับบ้านได้เลย',
    welcomeLead: 'ชำระเงินด้วยการสแกน QR ของร้าน',
    welcomeSpecialNote: (r) => `พิเศษสำหรับลูกค้า สั่งอาหารและเครื่องดื่มครบ 300 บาท ทางร้านมีบริการจัดส่งถึงมือ เมื่ออยู่ในรัศมี ${r} กม.`,
    welcomeStep1: 'เลือกเมนูที่ต้องการ แล้วยืนยันออเดอร์',
    welcomeStep2: (r) => `ทางร้านสามารถจัดส่งให้เองได้ในรัศมี ${r} กม.`,
    welcomeStep3: 'อยู่ไกลกว่านั้นก็ยังสั่งได้ เพียงเรียก Grab, LINE MAN หรือแมสเซนเจอร์เจ้าอื่นมารับอาหารที่ร้านเอง',
    startOrder: 'เริ่มสั่งอาหาร',
    loggingIn: 'กำลังเข้าสู่ระบบ LINE...',
    loginFailed: 'เข้าสู่ระบบ LINE ไม่สำเร็จ กรุณาลองใหม่',
    retry: 'ลองอีกครั้ง',
    // step 2 — distance
    distanceTitle: 'ตรวจสอบระยะทางจัดส่ง',
    requestLocation: 'ขอตำแหน่งปัจจุบัน',
    locating: 'กำลังค้นหาตำแหน่งของคุณ...',
    calculating: 'กำลังคำนวณระยะทาง...',
    withinRadius: (km) => `พบตำแหน่งแล้ว — ห่างจากร้าน ${km} กม.`,
    inServiceArea: 'อยู่ในพื้นที่บริการของร้าน ไปเลือกเมนูต่อได้เลย',
    canOrderNow: (r) => `ยินดีด้วย คุณอยู่ในรัศมี ${r} กม. สามารถสั่งอาหารได้เลย`,
    canOrderUnknown: 'คุณสามารถสั่งอาหารได้ตามปกติ',
    distanceBadge: (km) => `ห่างจากร้าน ${km} กม.`,
    outOfRadiusHeading: 'นอกพื้นที่บริการจัดส่ง',
    outOfRadius: (km, r) => `ห่างจากร้าน ${km} กม. — นอกระยะจัดส่ง ${r} กม.`,
    outOfRadiusNote: 'คุณยังสั่งอาหารได้ตามปกติ แต่ร้านจัดส่งได้เฉพาะในรัศมีที่กำหนด — กรุณาเรียก Grab, LINE MAN หรือแมสเซนเจอร์เจ้าอื่น มารับอาหารที่หน้าร้านด้วยตนเอง และรับผิดชอบค่าส่งส่วนนี้เอง',
    ackCheckbox: 'ฉันอ่านและเข้าใจเงื่อนไขข้างต้นแล้ว',
    gpsDenied: 'คุณไม่ได้อนุญาตให้เข้าถึงตำแหน่ง',
    gpsTimeout: 'ค้นหาตำแหน่งไม่สำเร็จ (หมดเวลา)',
    gpsUnsupported: 'เบราว์เซอร์นี้ไม่รองรับการหาตำแหน่ง',
    testModeToggle: 'โหมดทดสอบระยะทาง',
    simulateWithin: 'จำลอง: อยู่ในรัศมี',
    simulateOutside: 'จำลอง: นอกรัศมี',
    // step 3 — delivery method
    methodTitle: 'รับอาหารอย่างไร',
    methodDeliveryLabel: 'ให้ร้านจัดส่ง',
    methodDeliveryDesc: (fee) => `จัดส่งถึงที่ • ค่าจัดส่ง ฿${fee}`,
    methodPickupLabel: 'รับเองที่ร้าน',
    methodPickupDesc: 'ไม่มีค่าจัดส่ง — มารับเองหรือเรียก Grab, LINE MAN มารับที่ร้าน',
    methodOutOfRadiusNote: 'ร้านจัดส่งได้เฉพาะในรัศมีที่กำหนด คุณจึงรับอาหารได้ด้วยวิธีนี้เท่านั้น',
    // step 4 — menu
    menuHint: 'เลือกเมนู แตะ + เพื่อเพิ่มจำนวน แล้วกดตะกร้าเพื่อไปต่อ',
    // step 5 — summary
    summaryTitle: 'สรุปออเดอร์',
    emptyCart: 'ยังไม่มีรายการในตะกร้า',
    backToMenu: 'กลับไปเลือกเมนู',
    itemNotePlaceholder: 'หมายเหตุ เช่น หวานน้อย, นมอัลมอนด์',
    itemsSubtotalLabel: 'ค่าอาหาร',
    deliveryFeeLabel: 'ค่าจัดส่ง',
    selfArranged: 'ลูกค้าจัดการเอง',
    total: 'รวมทั้งหมด',
    name: 'ชื่อผู้รับ',
    phone: 'เบอร์โทร',
    address: 'ที่อยู่จัดส่ง',
    addressOptionalNote: '(ไม่บังคับ — คุณเรียก Grab/LINE MAN มารับเองที่ร้าน)',
    note: 'หมายเหตุ (ไม่บังคับ)',
    phoneFound: 'พบข้อมูลลูกค้าเดิม กรอกชื่อและที่อยู่ให้อัตโนมัติ',
    orderRecapTitle: 'ตรวจสอบรายการก่อนชำระเงิน',
    noteLabel: 'หมายเหตุ',
    fillRequired: 'กรุณากรอกชื่อและเบอร์โทร',
    fillAddress: 'กรุณากรอกที่อยู่จัดส่ง',
    minOrderNotice: (remaining, min) => `สั่งอาหารเพิ่มอีก ฿${remaining} ให้ครบ ฿${min} จึงจะเลือกให้ร้านจัดส่งได้`,
    switchToPickup: 'เปลี่ยนเป็นรับเองที่ร้านแทน',
    // step 5 — payment
    paymentTitle: 'ยืนยันและชำระเงิน',
    paymentMethod: 'ช่องทางชำระเงิน',
    promptpayLabel: 'QR โค้ดของร้าน',
    payHint: 'สแกน QR ของร้านด้วยแอปธนาคาร แล้วติ๊กยืนยันด้านล่าง',
    amount: 'ยอดชำระ',
    noPromptpay: 'ยังไม่ได้ตั้งค่า QR รับเงินของร้าน กรุณาแจ้งร้านทาง LINE',
    confirmCheckbox: 'ฉันตรวจสอบรายการและยอดเงินถูกต้องแล้ว ยืนยันสั่งซื้อ',
    submit: 'สั่งซื้อและชำระเงิน',
    submitting: 'กำลังส่ง...',
    // step 6 — success
    successTitle: 'สั่งซื้อสำเร็จ!',
    orderNo: 'เลขที่ออเดอร์',
    sentToShop: 'ส่งออเดอร์ให้ร้านทาง LINE แล้ว',
    waitingDelivery: 'ร้านกำลังเตรียมอาหารและจะจัดส่งให้ภายในรัศมีบริการ กรุณาแนบสลิปการโอนเพื่อยืนยันการชำระเงิน',
    pickupInstruction: 'กรุณามารับอาหารด้วยตนเอง หรือเรียก Grab, LINE MAN หรือแมสเซนเจอร์เจ้าอื่น มารับที่ร้าน Love Pier Beach Cafe เมื่อร้านแจ้งว่าอาหารพร้อม และกรุณาแนบสลิปการโอนเพื่อยืนยันการชำระเงิน',
    attachSlip: 'แนบสลิปเพื่อยืนยันการชำระเงิน',
    verifyingSlip: 'กำลังตรวจสอบสลิป...',
    slipVerified: 'ยืนยันการชำระเงินแล้ว',
    slipUploaded: 'แนบสลิปแล้ว รอร้านตรวจสอบ',
    slipRetry: 'แนบสลิปใหม่อีกครั้ง',
    verifyHint: 'ระบบตรวจสลิปอัตโนมัติ (จับสลิปปลอมได้)',
    sendSlip: 'ส่งสลิปทาง LINE',
    done: 'เสร็จสิ้น — สั่งใหม่',
  },
  en: {
    back: 'Back',
    close: 'Close',
    next: 'Next',
    welcomeSubtitle: 'Beachside food and drinks.',
    welcomeHeading: 'You can order takeaway',
    welcomeLead: "Pay by scanning the shop's QR code.",
    welcomeSpecialNote: (r) => `A special perk for our customers — spend ฿300 or more on food and drinks and we'll deliver straight to you within ${r} km.`,
    welcomeStep1: 'Choose what you want and confirm the order',
    welcomeStep2: (r) => `We can deliver to you ourselves within ${r} km`,
    welcomeStep3: 'Further away? You can still order — just send Grab, LINE MAN, or another courier to collect it from the shop',
    startOrder: 'Start ordering',
    loggingIn: 'Logging in with LINE...',
    loginFailed: 'LINE login failed. Please try again.',
    retry: 'Retry',
    distanceTitle: 'Delivery distance check',
    requestLocation: 'Request current location',
    locating: 'Finding your location...',
    calculating: 'Calculating distance...',
    withinRadius: (km) => `Location found — ${km} km from the shop`,
    inServiceArea: "You're inside our delivery area — go ahead and pick a menu.",
    canOrderNow: (r) => `Good news — you're within our ${r} km radius. You can order now.`,
    canOrderUnknown: 'You can go ahead and order.',
    distanceBadge: (km) => `${km} km from the shop`,
    outOfRadiusHeading: 'Outside our delivery area',
    outOfRadius: (km, r) => `${km} km from the shop — outside the ${r} km delivery area`,
    outOfRadiusNote: "You can still place an order, but we only deliver within our radius — please arrange your own rider (Grab, LINE MAN, or another courier/messenger service) to pick up the food from the shop, and cover that delivery cost yourself.",
    ackCheckbox: 'I have read and understood the above',
    gpsDenied: 'Location permission was denied',
    gpsTimeout: 'Locating timed out',
    gpsUnsupported: "This browser doesn't support location",
    testModeToggle: 'Distance test mode',
    simulateWithin: 'Simulate: within radius',
    simulateOutside: 'Simulate: outside radius',
    methodTitle: 'How would you like to receive it?',
    methodDeliveryLabel: 'Shop delivers',
    methodDeliveryDesc: (fee) => `Delivered to you • Delivery fee ฿${fee}`,
    methodPickupLabel: 'Pick up yourself',
    methodPickupDesc: 'No delivery fee — come yourself or send Grab/LINE MAN to the shop',
    methodOutOfRadiusNote: "We only deliver within our radius, so this is the only way to receive your order.",
    menuHint: 'Pick items, tap + to add, then tap the cart to continue',
    summaryTitle: 'Order summary',
    emptyCart: 'Your cart is empty',
    backToMenu: 'Back to menu',
    itemNotePlaceholder: 'Note, e.g. less sweet, almond milk',
    itemsSubtotalLabel: 'Food total',
    deliveryFeeLabel: 'Delivery fee',
    selfArranged: 'Arranged by customer',
    total: 'Total',
    name: 'Recipient name',
    phone: 'Phone',
    address: 'Delivery address',
    addressOptionalNote: "(optional — you'll arrange your own Grab/LINE MAN pickup)",
    note: 'Note (optional)',
    phoneFound: "Found your details from a past order — name and address filled in",
    orderRecapTitle: 'Review before you pay',
    noteLabel: 'Note',
    fillRequired: 'Please enter name and phone',
    fillAddress: 'Please enter a delivery address',
    minOrderNotice: (remaining, min) => `Add ฿${remaining} more to reach the ฿${min} minimum for delivery`,
    switchToPickup: 'Switch to pickup instead',
    paymentTitle: 'Confirm & pay',
    paymentMethod: 'Payment method',
    promptpayLabel: "The shop's QR code",
    payHint: "Scan the shop's QR with your banking app, then tick confirm below",
    amount: 'Amount',
    noPromptpay: 'The shop payment QR is not set up yet — please contact us on LINE',
    confirmCheckbox: "I've checked the order and total — confirm purchase",
    submit: 'Place order & pay',
    submitting: 'Sending...',
    successTitle: 'Order placed!',
    orderNo: 'Order no.',
    sentToShop: 'Order sent to the shop on LINE',
    waitingDelivery: "We're preparing your order and will deliver within our service radius. Please attach your payment slip to confirm.",
    pickupInstruction: 'Please come collect it yourself, or send Grab, LINE MAN, or another rider/courier to pick up the food from Love Pier Beach Cafe once the shop confirms it is ready — and please attach your payment slip to confirm.',
    attachSlip: 'Attach slip to confirm payment',
    verifyingSlip: 'Verifying slip...',
    slipVerified: 'Payment verified',
    slipUploaded: 'Slip attached — pending review',
    slipRetry: 'Attach a different slip',
    verifyHint: 'Automatic slip check (detects fakes)',
    sendSlip: 'Send slip via LINE',
    done: 'Done — order again',
  },
  zh: {
    back: '返回',
    close: '关闭',
    next: '下一步',
    welcomeSubtitle: '海边美食与饮品。',
    welcomeHeading: '现可点餐外带',
    welcomeLead: '扫描本店二维码付款。',
    welcomeSpecialNote: (r) => `尊享服务 — 餐饮消费满 300 泰铢，${r} 公里内本店专人配送到手。`,
    welcomeStep1: '选好菜品并确认订单',
    welcomeStep2: (r) => `${r} 公里内可由本店为您配送`,
    welcomeStep3: '超出范围仍可下单，只需自行安排 Grab、LINE MAN 或其他快递员到店取餐',
    startOrder: '开始点餐',
    loggingIn: '正在使用 LINE 登录...',
    loginFailed: 'LINE 登录失败，请重试',
    retry: '重试',
    distanceTitle: '配送距离检查',
    requestLocation: '获取当前位置',
    locating: '正在定位您的位置...',
    calculating: '正在计算距离...',
    withinRadius: (km) => `已定位 — 距离门店 ${km} 公里`,
    inServiceArea: '您在配送范围内，可以继续选择菜单。',
    canOrderNow: (r) => `好消息 — 您在 ${r} 公里配送范围内，现在可以下单了。`,
    canOrderUnknown: '您现在可以正常下单。',
    distanceBadge: (km) => `距离门店 ${km} 公里`,
    outOfRadiusHeading: '超出配送范围',
    outOfRadius: (km, r) => `距离门店 ${km} 公里 — 超出 ${r} 公里配送范围`,
    outOfRadiusNote: '您仍然可以下单，但本店仅在配送范围内配送 — 请自行安排 Grab、LINE MAN 或其他快递员到店取餐，配送费用由您自行承担。',
    ackCheckbox: '我已阅读并理解以上内容',
    gpsDenied: '您未允许访问位置信息',
    gpsTimeout: '定位超时',
    gpsUnsupported: '此浏览器不支持定位',
    testModeToggle: '距离测试模式',
    simulateWithin: '模拟：范围内',
    simulateOutside: '模拟：范围外',
    methodTitle: '您希望如何取餐？',
    methodDeliveryLabel: '由本店配送',
    methodDeliveryDesc: (fee) => `送货上门 • 配送费 ฿${fee}`,
    methodPickupLabel: '自行到店取餐',
    methodPickupDesc: '无需配送费 — 亲自到店或安排 Grab/LINE MAN 到店取餐',
    methodOutOfRadiusNote: '本店仅在配送范围内配送，因此您只能以此方式取餐。',
    menuHint: '选择菜品，点击 + 添加，然后点击购物车继续',
    summaryTitle: '订单摘要',
    emptyCart: '购物车是空的',
    backToMenu: '返回菜单',
    itemNotePlaceholder: '备注，例如少糖、杏仁奶',
    itemsSubtotalLabel: '餐点小计',
    deliveryFeeLabel: '配送费',
    selfArranged: '顾客自行安排',
    total: '总计',
    name: '收件人姓名',
    phone: '电话',
    address: '配送地址',
    addressOptionalNote: '（选填 — 您将自行安排 Grab/LINE MAN 到店取餐）',
    note: '备注（选填）',
    phoneFound: '已找到您上次的资料，姓名和地址已自动填写',
    orderRecapTitle: '付款前请核对订单',
    noteLabel: '备注',
    fillRequired: '请填写姓名和电话',
    fillAddress: '请填写配送地址',
    minOrderNotice: (remaining, min) => `还差 ฿${remaining} 才能达到配送最低消费 ฿${min}`,
    switchToPickup: '改为自取',
    paymentTitle: '确认并付款',
    paymentMethod: '付款方式',
    promptpayLabel: '本店二维码',
    payHint: '用银行 App 扫描二维码，然后在下方勾选确认',
    amount: '金额',
    noPromptpay: '本店收款二维码尚未设置 — 请通过 LINE 联系我们',
    confirmCheckbox: '我已核对订单和金额，确认下单',
    submit: '下单并付款',
    submitting: '发送中...',
    successTitle: '下单成功！',
    orderNo: '订单号',
    sentToShop: '订单已通过 LINE 发送给店家',
    waitingDelivery: '我们正在备餐，将在配送范围内为您送达。请附上付款凭证以确认。',
    pickupInstruction: '请在店家通知餐点备好后，亲自到店取餐，或自行安排 Grab、LINE MAN 或其他骑手/快递员到 Love Pier Beach Cafe 取餐 — 并请附上付款凭证以确认。',
    attachSlip: '上传凭证以确认付款',
    verifyingSlip: '正在核验凭证...',
    slipVerified: '付款已确认',
    slipUploaded: '凭证已上传 — 等待店家核对',
    slipRetry: '重新上传凭证',
    verifyHint: '自动核验凭证（可识别伪造）',
    sendSlip: '通过 LINE 发送凭证',
    done: '完成 — 再次下单',
  },
}

const inputCls =
  'w-full rounded-xl border border-black/15 bg-[#faf8f5] px-3.5 py-2.5 text-[14px] text-ink placeholder-black/30 focus:border-[#4a3520] focus:outline-none focus:ring-1 focus:ring-[#4a3520]/30 transition-colors'

// Shared width for every step's content column — keeps the flow feeling
// like one consistent app screen instead of pages with mismatched margins.
const CONTENT_WIDTH = 'max-w-md'

function StepHeader({ t, step, onBack }) {
  const idx = STEP_ORDER.indexOf(step)
  // --nav-h is "how tall the sticky chrome at the top of the page is"; anything
  // that sticks below it offsets by it (the menu tab bar, gallery, activities).
  // The site Nav normally publishes it, but OrderFlow hides the Nav, so THIS
  // header is the chrome and must publish it instead — otherwise the tab bar
  // offsets by the 64px fallback (or a stale value left by the previous page)
  // and floats below this header with a strip of hero showing through the gap.
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => document.documentElement.style.setProperty('--nav-h', `${el.offsetHeight}px`)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      ro.disconnect()
      document.documentElement.style.removeProperty('--nav-h')
    }
    // Re-asserted on every step so it wins even if the Nav's unmount cleanup
    // happens to run after this effect and clears the value.
  }, [step])

  return (
    <div ref={ref} className="sticky top-0 z-[60] bg-[#f5f2ee]/95 backdrop-blur-sm border-b border-black/10 px-4 py-3">
      <div className={`${CONTENT_WIDTH} mx-auto flex items-center gap-3`}>
        {onBack ? (
          <button onClick={onBack} className="text-[#4a3520] hover:text-[#3a2818] text-5xl leading-none shrink-0 w-10 h-10 flex items-center justify-center -ml-2" aria-label={t.back}>‹</button>
        ) : (
          <span className="w-8 shrink-0" />
        )}
        <div className="flex-1 flex items-center gap-1.5">
          {STEP_ORDER.map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= idx ? 'bg-[#4a3520]' : 'bg-black/10'}`} />
          ))}
        </div>
        {/* w-6/h-6 rather than the bare glyph's 20px box: this pair is the only
            way out of the wizard on every step, and 24px is the minimum
            reliable touch target. */}
        <Link href="/" className="text-black/40 hover:text-black text-lg leading-none shrink-0 w-6 h-6 flex items-center justify-center -mr-0.5" aria-label={t.close}>✕</Link>
      </div>
    </div>
  )
}

// Primary action button, pinned to the bottom of the viewport — the
// checkout-app pattern of a persistent CTA bar instead of a button that
// scrolls away with the content.
function StickyActionBar({ children }) {
  return (
    <div className="sticky bottom-0 left-0 right-0 bg-[#f5f2ee]/95 backdrop-blur-sm border-t border-black/10 px-5 pt-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <div className={`${CONTENT_WIDTH} mx-auto`}>{children}</div>
    </div>
  )
}

export default function OrderFlow({ dbMenuData, dbPromotions, heroTitle, radiusKm = 5, minDeliveryOrder = 300 }) {
  const { lang } = useLanguage()
  const t = COPY[lang] || COPY.en
  const { items, addItem, removeItem, updateNote, clearCart, totalQty, totalPrice } = useCart()
  const { setHidden: setChromeHidden } = useChrome()

  const [step, setStep] = useState('welcome')

  // Once the customer commits to ordering (past the welcome screen), hide
  // the site nav/footer so the flow reads as a dedicated full-screen app
  // rather than a webpage with marketing chrome wrapped around it.
  useEffect(() => {
    setChromeHidden(step !== 'welcome')
  }, [step, setChromeHidden])
  // Restore normal chrome if the customer navigates away entirely (separate
  // effect so this only fires on unmount, not on every step change).
  useEffect(() => () => setChromeHidden(false), [setChromeHidden])

  // Steps swap in place (no real page navigation), so nothing resets scroll
  // on its own — without this, a step reached after scrolling down on the
  // last one (summary is tall: cart + phone/name/address/note) renders
  // already scrolled, burying whatever's new at the top of the next step.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step])

  // step 1 — welcome / login
  const [profile, setProfile] = useState(null)
  const [loginPhase, setLoginPhase] = useState('idle') // idle | logging-in | failed

  // step 2 — distance
  const [locatePhase, setLocatePhase] = useState('idle') // idle | locating | calculating | found | gps-error
  const [gpsErrorCode, setGpsErrorCode] = useState(null)
  const [coords, setCoords] = useState(null)
  const [distanceResult, setDistanceResult] = useState(null)
  const [ackOutOfRadius, setAckOutOfRadius] = useState(false)
  const [testModeOpen, setTestModeOpen] = useState(false)

  // step 3 — delivery method: 'delivery' (shop delivers) | 'pickup' (customer
  // or their own rider collects at the shop). Forced to 'pickup' outside the
  // radius (the shop never delivers out there); an explicit choice inside it.
  const [deliveryMethod, setDeliveryMethod] = useState(null)

  // step 4 — summary / contact
  const [form, setForm] = useState({ name: '', phone: '', address: '', note: '' })
  const [summaryError, setSummaryError] = useState('')
  // 'idle' | 'checking' | 'found' | 'notfound' — drives the small note under
  // the phone field once it looks complete. See the lookup effect below.
  const [phoneLookup, setPhoneLookup] = useState('idle')

  // step 5 — payment
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [paymentRef, setPaymentRef] = useState('')
  const [confirmPay, setConfirmPay] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // step 6 — success
  const [orderNo, setOrderNo] = useState('')
  const [completed, setCompleted] = useState(null)
  const [sentToLine, setSentToLine] = useState(false)
  const [slipVerify, setSlipVerify] = useState(false)
  const [slipStatus, setSlipStatus] = useState('idle')
  const [slipError, setSlipError] = useState('')

  const triedSilentLoginRef = useRef(false)
  const lineLookupDoneRef = useRef(false)

  const withinRadius = distanceResult?.withinRadius !== false // null/unknown treated as "shop delivers"
  const itemsSubtotal = Math.round(totalPrice)
  // The 'method' step (where deliveryMethod is picked) comes BEFORE the menu
  // step, so the cart total isn't known yet when the customer chooses
  // delivery — this can only be enforced once they reach the summary, after
  // adding items. minDeliveryOrder<=0 disables the requirement entirely.
  const belowMinOrder = deliveryMethod === 'delivery' && minDeliveryOrder > 0 && itemsSubtotal < minDeliveryOrder
  // Only a chosen (or forced) 'delivery' method inside the radius, once past
  // the minimum, ever costs anything — 'pickup' is always free, the shop
  // never delivers outside its radius regardless of what the fee settings
  // say, and while belowMinOrder the shop isn't actually delivering yet (the
  // continue button is disabled), so no fee should show until it's real. No
  // free-delivery threshold above the minimum — delivery always charges the
  // tiered fee once it's actually chosen.
  const deliveryFee = deliveryMethod === 'delivery' && withinRadius && !belowMinOrder ? (distanceResult?.deliveryFee || 0) : 0
  const amount = itemsSubtotal + deliveryFee

  // Silently pick up an already-logged-in LINE session (e.g. after a login
  // redirect back to this page) so returning customers aren't asked twice.
  useEffect(() => {
    if (!isLiffConfigured() || triedSilentLoginRef.current) return
    triedSilentLoginRef.current = true
    getProfileIfLoggedIn().then((p) => {
      if (p) { setProfile(p); setDeliverySessionProfile(p) }
    })
  }, [])

  // TEMP DEBUG — remove after retrieving the shop's userId for
  // LINE_ORDER_NOTIFY_TO. Only fires with ?showUserId=1 in the URL, so it
  // can never show up for a real customer's normal visit.
  useEffect(() => {
    if (!profile?.userId || typeof window === 'undefined') return
    if (new URLSearchParams(window.location.search).get('showUserId') === '1') {
      window.alert('Your LINE userId: ' + profile.userId)
    }
  }, [profile])

  // As soon as we know who the customer is via LINE (either an explicit
  // login on the welcome step, or the silent-login effect above), look them
  // up by lineUserId so name/phone/address are ready before they even reach
  // the summary step — no typing required. This is the "recognize them from
  // their LINE account" path; the phone-based effect below is the fallback
  // for a customer whose LINE session has no matching order on file yet (or
  // who never completed LINE login at all) but who has ordered by phone
  // before. Only fills fields that are still blank, same rule as the phone
  // lookup, so it never clobbers something already typed. Guarded by a ref
  // (not just `profile`) so it fires once per login rather than once per
  // render — reset in resetFlow() so "order again" re-fills for the next order.
  useEffect(() => {
    const uid = profile?.userId
    if (!uid || lineLookupDoneRef.current) return
    lineLookupDoneRef.current = true
    fetch(`/api/customer?lineUserId=${encodeURIComponent(uid)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data?.customer) return
        setForm((f) => ({
          ...f,
          name: f.name.trim() ? f.name : data.customer.name || f.name,
          phone: f.phone.trim() ? f.phone : data.customer.phone || f.phone,
          address: f.address.trim() ? f.address : data.customer.address || f.address,
        }))
        setPhoneLookup('found')
      })
      .catch(() => {})
  }, [profile])

  // Phone is asked first on the summary form specifically so this can run
  // before the customer has typed a name/address — once the phone looks
  // complete, check whether we've seen it before and, if so, fill in their
  // name/address for them. Only fills fields that are still blank, so it can
  // never clobber something the customer already typed. Debounced so it
  // fires once they pause, not on every keystroke. Also the fallback for
  // customers the lineUserId lookup above didn't already fill in.
  useEffect(() => {
    const digits = form.phone.replace(/\D/g, '')
    if (digits.length < 9) { setPhoneLookup('idle'); return }
    setPhoneLookup('checking')
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customer-lookup?phone=${encodeURIComponent(form.phone.trim())}`)
        const data = await res.json()
        if (data?.customer) {
          setForm((f) => ({
            ...f,
            name: f.name.trim() ? f.name : data.customer.name || f.name,
            address: f.address.trim() ? f.address : data.customer.address || f.address,
          }))
          setPhoneLookup('found')
        } else {
          setPhoneLookup('notfound')
        }
      } catch {
        setPhoneLookup('notfound')
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [form.phone])

  // ── Step 1: welcome + LINE login ─────────────────────────────────────
  async function handleStart() {
    if (isLiffConfigured() && !profile) {
      setLoginPhase('logging-in')
      try {
        const p = await loginAndGetProfile()
        if (p) {
          setProfile(p)
          setDeliverySessionProfile(p)
          setLoginPhase('idle')
          setStep('distance')
        }
        // else: liff.login() redirected the page away — nothing else to do.
      } catch {
        setLoginPhase('failed')
      }
      return
    }
    setStep('distance')
  }

  // ── Step 2: GPS + distance ────────────────────────────────────────────
  async function fetchDistance(lat, lng) {
    try {
      const res = await fetch('/api/delivery-distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      })
      const data = await res.json()
      setDistanceResult(data)
      if (data.distanceKm != null) {
        setDeliverySessionDistance({
          distanceKm: data.distanceKm,
          deliveryFee: data.deliveryFee || 0,
          withinRadius: data.withinRadius,
          radiusKm: data.radiusKm,
        })
      }
    } catch {
      setDistanceResult(null)
    } finally {
      setLocatePhase('found')
    }
  }

  function startLocating() {
    setGpsErrorCode(null)
    if (!('geolocation' in navigator)) {
      setGpsErrorCode('unsupported')
      setLocatePhase('gps-error')
      return
    }
    setLocatePhase('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCoords({ lat, lng })
        setLocatePhase('calculating')
        fetchDistance(lat, lng)
      },
      (err) => {
        setGpsErrorCode(
          err.code === err.PERMISSION_DENIED ? 'denied' : err.code === err.TIMEOUT ? 'timeout' : 'unsupported'
        )
        setLocatePhase('gps-error')
      },
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }

  // Test-mode "simulate" buttons: fetch the real shop settings (radius +
  // coordinates) via a throwaway probe call, then feed the API a synthetic
  // point that's genuinely near/far enough — so the simulated result is
  // computed by the same real pipeline, not a hardcoded fixture.
  async function simulateDistance(kind) {
    setGpsErrorCode(null)
    setLocatePhase('calculating')
    try {
      const probe = await fetch('/api/delivery-distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: 0, lng: 0 }),
      }).then((r) => r.json())
      if (probe.shopLat == null) {
        setDistanceResult(probe)
        setLocatePhase('found')
        return
      }
      const radius = probe.radiusKm || 5
      const kmOffset = kind === 'within' ? Math.max(0.5, radius * 0.4) : radius + 3
      const degOffset = kmOffset / 111
      const lat = probe.shopLat + degOffset
      const lng = probe.shopLng
      setCoords({ lat, lng })
      await fetchDistance(lat, lng)
    } catch {
      setGpsErrorCode('unsupported')
      setLocatePhase('gps-error')
    }
  }

  const distanceContinueEnabled = locatePhase === 'found' && (withinRadius || ackOutOfRadius)

  // ── Step 2 → 3: within the radius the customer picks a method; outside it
  // the shop never delivers, so pickup is the only option and there's
  // nothing to choose — skip straight past the method screen.
  function goToMethodOrMenu() {
    if (withinRadius) {
      setStep('method')
    } else {
      setDeliveryMethod('pickup')
      setStep('menu')
    }
  }

  const methodContinueEnabled = Boolean(deliveryMethod)

  // ── Step 3: menu — hand the floating cart button to advance the wizard ──
  function goToSummaryFromMenu() {
    setStep('summary')
  }

  // ── Step 4 → 5: build the PromptPay QR for the current total ────────────
  async function goToPayment() {
    setSummaryError('')
    // Belt-and-suspenders — the continue button is already disabled while
    // belowMinOrder, this just stops a stray call from slipping through.
    if (belowMinOrder) return
    if (!form.name.trim() || !form.phone.trim()) {
      setSummaryError(t.fillRequired)
      return
    }
    if (deliveryMethod === 'delivery' && !form.address.trim()) {
      setSummaryError(t.fillAddress)
      return
    }
    setStep('payment')
    if (PROMPTPAY_ID && amount > 0) {
      try {
        const ref = makePaymentRef()
        setPaymentRef(ref)
        const QRCode = (await import('qrcode')).default
        const payload = buildPaymentPayload({
          type: PROMPTPAY_TYPE,
          target: PROMPTPAY_ID,
          amount,
          ref1: PROMPTPAY_REF,
          ref2: PROMPTPAY_REF2,
          terminalLabel: PROMPTPAY_TERMINAL_LABEL,
        })
        const url = await QRCode.toDataURL(payload, { margin: 1, width: 320 })
        setQrDataUrl(url)
      } catch {
        setQrDataUrl('')
      }
    } else {
      setQrDataUrl('')
    }
  }

  // ── Step 5: submit order ─────────────────────────────────────────────
  async function submitOrder() {
    setSubmitError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          address: form.address,
          note: form.note,
          paymentRef,
          distanceKm: distanceResult?.distanceKm ?? null,
          deliveryMethod: deliveryMethod || 'pickup',
          lineUserId: profile?.userId || '',
          lineDisplayName: profile?.displayName || '',
          items: items.map((i) => ({ id: i.id, name: i.name, price: parseFloat(i.price) || 0, qty: i.qty, note: i.note || '' })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'error')

      const finalDeliveryFee = data.deliveryFee || 0
      const finalTotal = data.totalAmount ?? amount

      const flex = buildOrderFlex({
        orderNo: data.orderNo,
        name: form.name,
        phone: form.phone,
        address: form.address,
        items: items.map((i) => ({ name: i.name, price: parseFloat(i.price) || 0, qty: i.qty, note: i.note || '' })),
        total: finalTotal,
        deliveryFee: finalDeliveryFee,
        distanceKm: distanceResult?.distanceKm ?? null,
        deliveryMethod,
      })
      const sent = await sendMessagesToChat([flex])
      setSentToLine(sent)

      setCompleted({
        lines: items.map((i) => `• ${i.name} x${i.qty}` + (i.note ? ` (${i.note})` : '')).join('\n'),
        total: finalTotal,
        deliveryFee: finalDeliveryFee,
        distanceKm: distanceResult?.distanceKm ?? null,
        withinRadius,
        deliveryMethod,
      })
      setSlipVerify(Boolean(data.slipVerify))
      setOrderNo(data.orderNo)
      setStep('success')
      clearCart()
    } catch (err) {
      setSubmitError(err.message || (lang === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong'))
    } finally {
      setSubmitting(false)
    }
  }

  function handleSlipFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setSlipError('')
    setSlipStatus('verifying')
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const res = await fetch('/api/verify-slip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderNo, imageBase64: reader.result }),
        })
        const data = await res.json()
        if (data.ok && data.verified) {
          setSlipStatus('ok')
        } else if (data.ok && data.stored && !data.error) {
          setSlipStatus('stored')
        } else {
          setSlipStatus('fail')
          setSlipError(data.error || 'ตรวจสอบสลิปไม่สำเร็จ')
        }
      } catch {
        setSlipStatus('fail')
        setSlipError('เกิดข้อผิดพลาด ลองใหม่อีกครั้ง')
      }
    }
    reader.onerror = () => {
      setSlipStatus('fail')
      setSlipError('อ่านไฟล์รูปไม่ได้')
    }
    reader.readAsDataURL(file)
  }

  function sendSlipViaLine() {
    const lines = completed?.lines || ''
    const total = completed?.total ?? 0
    const refLine = paymentRef ? `\nRef: ${paymentRef}` : ''
    const distanceLine = completed?.distanceKm != null ? `\n${completed.distanceKm} กม.` : ''
    const feeLine = completed?.deliveryFee ? `\n${t.deliveryFeeLabel} ฿${completed.deliveryFee}` : ''
    const msg = encodeURIComponent(
      `${t.orderNo} ${orderNo}${refLine}\n${lines}${feeLine}\n\n${t.total} ฿${total}${distanceLine}\n\n(แนบสลิปการโอนในแชทนี้ได้เลยครับ)`
    )
    window.open(`https://line.me/R/oaMessage/${LINE_OA_ID}/?${msg}`, '_blank')
  }

  function resetFlow() {
    setStep('welcome')
    setOrderNo('')
    setCompleted(null)
    setSentToLine(false)
    setSlipVerify(false)
    setSlipStatus('idle')
    setSlipError('')
    setForm({ name: '', phone: '', address: '', note: '' })
    setPhoneLookup('idle')
    // Re-arm the LINE lookup so "order again" re-fills the fresh blank form —
    // profile itself doesn't change on reset, so without this the ref guard
    // would skip it (it already fired once for this login).
    lineLookupDoneRef.current = false
    setDistanceResult(null)
    setLocatePhase('idle')
    setAckOutOfRadius(false)
    setDeliveryMethod(null)
    setQrDataUrl('')
    setPaymentRef('')
    setConfirmPay(false)
  }

  // ═══════════════════════════════════════════════════════════════════
  // Step 1 — Welcome
  // ═══════════════════════════════════════════════════════════════════
  if (step === 'welcome') {
    // The CTA deliberately sits BELOW the hero rather than inside it. Tapping it
    // starts a LINE login and then asks for GPS, and customers were meeting both
    // prompts with no idea why — so the radius and what the button does have to
    // be readable before it is reachable. The hero is also height-capped, so this
    // copy would not fit inside it.
    const steps = [t.welcomeStep1, t.welcomeStep2(radiusKm), t.welcomeStep3]
    return (
      // Fills the screen below the nav on purpose: at natural height the copy
      // ends partway down and the black footer starts in the same viewport, so
      // the screen read as a page cut in half rather than as a finished one.
      // Letting the cream block take the slack puts the footer just below the
      // fold, where it belongs.
      <div className="flex flex-col min-h-[calc(100dvh-var(--nav-h,64px))] sm:min-h-0">
        <div className="shrink-0">
          <PageHero title={heroTitle} subtitle={t.welcomeSubtitle} compact />
        </div>
        <section
          className="flex-1 bg-[#f5f2ee] px-6 pt-8 flex flex-col"
          style={{ paddingBottom: 'max(1.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className={`${CONTENT_WIDTH} mx-auto w-full flex-1 flex flex-col`}>
            {/* Outranks the hero title on purpose. The band above is ambience;
                this line is what the customer came to find out. Thai needs the
                looser leading for its tone marks. */}
            <h2 className="font-display font-light text-[clamp(28px,8vw,34px)] text-ink leading-[1.35]">{t.welcomeHeading}</h2>
            <p className="mt-2 text-[13px] text-black/55 font-light leading-relaxed">{t.welcomeLead}</p>

            {/* Same warm cocoa-tinted note style as the success step's
                waitingDelivery box — reused here rather than introducing a
                new banner treatment for what is still an informational note,
                not a warning (those stay amber, e.g. the out-of-radius box). */}
            <p className="mt-4 rounded-xl bg-[#efe9e1] border border-[#4a3520]/15 px-4 py-3 text-[13px] leading-relaxed text-[#4a3520]">
              {t.welcomeSpecialNote(radiusKm)}
            </p>

            <ol className="mt-6 space-y-3.5">
              {steps.map((line, i) => (
                <li key={i} className="flex gap-3 items-start">
                  {/* Outlined, not filled: cocoa is the colour the customer
                      touches, and three solid discs marching down the margin
                      were competing with the one thing here that is tappable. */}
                  <span
                    aria-hidden="true"
                    className="shrink-0 mt-0.5 w-6 h-6 rounded-full border border-[#4a3520]/25 text-[#4a3520] text-[11px] font-semibold flex items-center justify-center tabular-nums"
                  >
                    {i + 1}
                  </span>
                  <span className="text-[13px] text-ink/80 leading-relaxed">{line}</span>
                </li>
              ))}
            </ol>

            {/* mt-auto, so whatever height is left over lands between the steps
                and the button instead of pooling under it — the button sits at
                the bottom of the screen, in reach of a thumb. pt-7 keeps the
                gap honest when there is no slack to hand out. */}
            <div className="mt-auto pt-7">
              <button
                onClick={handleStart}
                disabled={loginPhase === 'logging-in'}
                className="w-full py-3.5 rounded-xl bg-[#4a3520] text-white font-semibold text-[14px] tracking-wide hover:bg-[#3a2818] transition-colors disabled:opacity-60"
              >
                {loginPhase === 'logging-in' ? t.loggingIn : t.startOrder}
              </button>
              {loginPhase === 'failed' && (
                <p className="mt-3 text-[12px] text-red-700 flex items-center justify-center gap-2">
                  {t.loginFailed}
                  <button onClick={handleStart} className="underline">{t.retry}</button>
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════
  // Step 2 — Distance check
  // ═══════════════════════════════════════════════════════════════════
  if (step === 'distance') {
    const gpsErrorText =
      gpsErrorCode === 'denied' ? t.gpsDenied :
      gpsErrorCode === 'timeout' ? t.gpsTimeout :
      gpsErrorCode === 'unsupported' ? t.gpsUnsupported : ''

    const statusText =
      locatePhase === 'locating' ? t.locating :
      locatePhase === 'calculating' ? t.calculating : ''

    return (
      <div className="min-h-[100dvh] flex flex-col bg-[#f5f2ee]">
        <StepHeader t={t} step={step} onBack={() => setStep('welcome')} />
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          <div className={`w-full ${CONTENT_WIDTH}`}>
            {locatePhase !== 'found' && (
              <h1 className="text-[13px] font-semibold tracking-wide text-[#4a3520]/50 text-center uppercase mb-1">
                {t.distanceTitle}
              </h1>
            )}

            {locatePhase === 'idle' && (
              <div className="flex flex-col items-center gap-3 py-10">
                <button
                  onClick={startLocating}
                  className="px-6 py-3.5 rounded-xl bg-[#4a3520] text-white font-semibold text-[14px] hover:bg-[#3a2818] transition"
                >
                  {t.requestLocation}
                </button>
                <button
                  onClick={() => setTestModeOpen((v) => !v)}
                  className="text-[11px] text-black/35 hover:text-black/60 underline underline-offset-2"
                >
                  {t.testModeToggle}
                </button>
                {testModeOpen && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => simulateDistance('within')}
                      className="px-3 py-2 rounded-lg border border-black/15 text-[11px] text-black/55 hover:bg-black/[0.04] transition"
                    >
                      {t.simulateWithin}
                    </button>
                    <button
                      onClick={() => simulateDistance('outside')}
                      className="px-3 py-2 rounded-lg border border-black/15 text-[11px] text-black/55 hover:bg-black/[0.04] transition"
                    >
                      {t.simulateOutside}
                    </button>
                  </div>
                )}
              </div>
            )}

            {(locatePhase === 'locating' || locatePhase === 'calculating') && (
              <LocatingAnimation
                phase={locatePhase === 'calculating' ? 'calculating' : 'locating'}
                statusText={statusText}
                tone="neutral"
              />
            )}

            {locatePhase === 'gps-error' && (
              <div className="flex flex-col gap-2 py-8">
                <p className="text-[13px] text-red-600 text-center mb-1">{gpsErrorText}</p>
                <button
                  onClick={startLocating}
                  className="w-full py-3 rounded-xl border border-[#4a3520]/25 text-[#4a3520] font-semibold text-[13px] hover:bg-[#4a3520]/[0.04] transition"
                >
                  {t.retry}
                </button>
                <button
                  onClick={() => setTestModeOpen((v) => !v)}
                  className="text-[11px] text-black/35 hover:text-black/60 underline underline-offset-2 self-center mt-1"
                >
                  {t.testModeToggle}
                </button>
                {testModeOpen && (
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => simulateDistance('within')} className="px-3 py-2 rounded-lg border border-black/15 text-[11px] text-black/55 hover:bg-black/[0.04] transition">{t.simulateWithin}</button>
                    <button onClick={() => simulateDistance('outside')} className="px-3 py-2 rounded-lg border border-black/15 text-[11px] text-black/55 hover:bg-black/[0.04] transition">{t.simulateOutside}</button>
                  </div>
                )}
              </div>
            )}

            {locatePhase === 'found' && withinRadius && distanceResult?.distanceKm != null && (
              <div className="text-center mb-6">
                <p className="text-[11px] tracking-[0.25em] uppercase text-[#4a3520]/40 mb-2">{t.distanceTitle}</p>
                <h1 className="font-display text-[26px] text-ink leading-snug mb-3">{t.canOrderNow(distanceResult.radiusKm)}</h1>
                <span className="inline-block text-[12px] font-medium tracking-wide text-[#4a3520]/70 border border-[#4a3520]/20 px-4 py-1.5 rounded-full">
                  {t.distanceBadge(distanceResult.distanceKm)}
                </span>
              </div>
            )}

            {locatePhase === 'found' && distanceResult?.distanceKm == null && (
              <div className="text-center mb-6">
                <p className="text-[11px] tracking-[0.25em] uppercase text-[#4a3520]/40 mb-2">{t.distanceTitle}</p>
                <h1 className="font-display text-[26px] text-ink leading-snug">{t.canOrderUnknown}</h1>
              </div>
            )}

            {locatePhase === 'found' && !withinRadius && (
              <>
                <div className="text-center mb-4">
                  <p className="text-[11px] tracking-[0.25em] uppercase text-amber-700/60 mb-2">{t.distanceTitle}</p>
                  <h1 className="font-display text-[24px] text-ink leading-snug mb-3">{t.outOfRadiusHeading}</h1>
                  <span className="inline-block text-[12px] font-medium tracking-wide text-amber-800 border border-amber-300 px-4 py-1.5 rounded-full">
                    {t.outOfRadius(distanceResult.distanceKm, distanceResult.radiusKm)}
                  </span>
                </div>
                <div className="mb-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-[13px] text-amber-800 leading-relaxed text-center">
                  {t.outOfRadiusNote}
                </div>
                <label className="flex items-start gap-2 mb-3 px-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={ackOutOfRadius}
                    onChange={(e) => setAckOutOfRadius(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#4a3520] shrink-0"
                  />
                  <span className="text-[13px] text-[#4a3520] leading-snug">{t.ackCheckbox}</span>
                </label>
              </>
            )}

            {locatePhase === 'found' && distanceResult?.shopLat != null && (
              <div className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden h-40 mb-3">
                <DeliveryRadiusMap
                  shopLat={distanceResult.shopLat}
                  shopLng={distanceResult.shopLng}
                  userLat={coords?.lat}
                  userLng={coords?.lng}
                  radiusKm={distanceResult.radiusKm}
                  withinRadius={distanceResult.withinRadius}
                />
              </div>
            )}

          </div>
        </div>
        {locatePhase === 'found' && (
          <StickyActionBar>
            <button
              onClick={goToMethodOrMenu}
              disabled={!distanceContinueEnabled}
              className="w-full py-3.5 rounded-xl bg-[#4a3520] text-white font-semibold text-[14px] tracking-wide hover:bg-[#3a2818] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t.next}
            </button>
          </StickyActionBar>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════
  // Step 3 — Delivery method
  // ═══════════════════════════════════════════════════════════════════
  // Only reached within the radius (goToMethodOrMenu skips it otherwise) —
  // an explicit choice between shop-delivery and self pickup, where before
  // this was decided implicitly by distance alone and pickup wasn't offered
  // to anyone within range who'd rather skip the delivery fee.
  if (step === 'method') {
    const previewFee = distanceResult?.deliveryFee || 0
    return (
      <div className="min-h-[100dvh] flex flex-col bg-[#f5f2ee]">
        <StepHeader t={t} step={step} onBack={() => setStep('distance')} />
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          <div className={`w-full ${CONTENT_WIDTH}`}>
            <h1 className="font-display text-[22px] text-ink text-center mb-6">{t.methodTitle}</h1>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setDeliveryMethod('delivery')}
                className={`text-left rounded-2xl border px-4 py-3.5 transition-colors ${
                  deliveryMethod === 'delivery'
                    ? 'border-[#4a3520] bg-[#4a3520]/[0.04]'
                    : 'border-black/10 bg-white hover:border-black/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${deliveryMethod === 'delivery' ? 'border-[#4a3520]' : 'border-black/20'}`}
                  >
                    {deliveryMethod === 'delivery' && <span className="w-2 h-2 rounded-full bg-[#4a3520]" />}
                  </span>
                  <span className="flex-1">
                    <span className="block text-[14px] font-medium text-ink">{t.methodDeliveryLabel}</span>
                    <span className="block text-[12px] text-black/50 mt-0.5">{t.methodDeliveryDesc(previewFee)}</span>
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryMethod('pickup')}
                className={`text-left rounded-2xl border px-4 py-3.5 transition-colors ${
                  deliveryMethod === 'pickup'
                    ? 'border-[#4a3520] bg-[#4a3520]/[0.04]'
                    : 'border-black/10 bg-white hover:border-black/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${deliveryMethod === 'pickup' ? 'border-[#4a3520]' : 'border-black/20'}`}
                  >
                    {deliveryMethod === 'pickup' && <span className="w-2 h-2 rounded-full bg-[#4a3520]" />}
                  </span>
                  <span className="flex-1">
                    <span className="block text-[14px] font-medium text-ink">{t.methodPickupLabel}</span>
                    <span className="block text-[12px] text-black/50 mt-0.5">{t.methodPickupDesc}</span>
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
        <StickyActionBar>
          <button
            onClick={() => setStep('menu')}
            disabled={!methodContinueEnabled}
            className="w-full py-3.5 rounded-xl bg-[#4a3520] text-white font-semibold text-[14px] tracking-wide hover:bg-[#3a2818] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t.next}
          </button>
        </StickyActionBar>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════
  // Step 4 — Menu
  // ═══════════════════════════════════════════════════════════════════
  if (step === 'menu') {
    return (
      <div className="min-h-[100dvh]">
        <StepHeader t={t} step={step} onBack={() => setStep(withinRadius ? 'method' : 'distance')} />
        <p className="text-center text-[12px] text-black/45 py-2 bg-[#f5f2ee]">{t.menuHint}</p>
        <MenuExperience
          dbMenuData={dbMenuData}
          dbPromotions={dbPromotions}
          showAddToCart
          heroTitle={heroTitle}
          onCartClick={goToSummaryFromMenu}
        />
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════
  // Step 5 — Order summary
  // ═══════════════════════════════════════════════════════════════════
  if (step === 'summary') {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-[#f5f2ee]">
        <StepHeader t={t} step={step} onBack={() => setStep('menu')} />
        <div className={`flex-1 ${CONTENT_WIDTH} w-full mx-auto px-5 py-5 flex flex-col gap-4`}>
          <h1 className="font-display text-[22px] text-ink">{t.summaryTitle}</h1>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <p className="text-[13px] text-black/40">{t.emptyCart}</p>
              <button onClick={() => setStep('menu')} className="px-5 py-2.5 rounded-xl bg-[#4a3520] text-white text-[13px] font-semibold">
                {t.backToMenu}
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-white border border-black/10 shadow-sm p-4 flex flex-col gap-4">
                {items.map((item) => (
                  <div key={item.id} className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-ink leading-snug truncate">{item.name}</p>
                        <p className="text-[12px] text-black/50 tabular-nums">฿{Math.round(parseFloat(item.price))} × {item.qty}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => removeItem(item.id)} className="w-7 h-7 rounded-full bg-black/[0.06] flex items-center justify-center text-ink font-semibold text-sm hover:bg-black/10">−</button>
                        <span className="text-[13px] font-semibold w-4 text-center">{item.qty}</span>
                        <button onClick={() => addItem(item)} className="w-7 h-7 rounded-full bg-black/[0.06] flex items-center justify-center text-ink font-semibold text-sm hover:bg-black/10">+</button>
                      </div>
                      <p className="text-[13px] font-semibold tabular-nums text-ink shrink-0 w-14 text-right">
                        ฿{Math.round(parseFloat(item.price) * item.qty)}
                      </p>
                    </div>
                    {/* Applies to the whole line (all `qty` of this item), not
                        per unit — see lib/cart.js updateNote. */}
                    <input
                      value={item.note || ''}
                      onChange={(e) => updateNote(item.id, e.target.value)}
                      placeholder={t.itemNotePlaceholder}
                      className="w-full rounded-lg border border-black/10 bg-[#faf8f5] px-3 py-1.5 text-[12px] text-ink placeholder-black/30 focus:border-[#4a3520] focus:outline-none focus:ring-1 focus:ring-[#4a3520]/30 transition-colors"
                    />
                  </div>
                ))}

                <div className="border-t border-black/10 pt-3 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[13px] text-black/60">
                    <span>{t.itemsSubtotalLabel}</span>
                    <span className="tabular-nums">฿{itemsSubtotal}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-black/60">{t.deliveryFeeLabel}</span>
                    {deliveryMethod === 'delivery' ? (
                      belowMinOrder ? (
                        // Not yet real — the continue button below is
                        // disabled until the order clears the minimum, so no
                        // fee number is shown to avoid implying ฿0 (free).
                        <span className="tabular-nums text-black/35">—</span>
                      ) : (
                        <span className="tabular-nums text-black/60">฿{deliveryFee}</span>
                      )
                    ) : (
                      <span className="text-amber-700 font-medium">{t.selfArranged}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[13px] font-semibold text-ink">{t.total}</span>
                    <span className="font-display text-[20px] text-ink tabular-nums">฿{amount}</span>
                  </div>
                </div>
              </div>

              {belowMinOrder && (
                <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-[13px] text-amber-800 leading-relaxed">
                  <p>{t.minOrderNotice(minDeliveryOrder - itemsSubtotal, minDeliveryOrder)}</p>
                  <button type="button" onClick={() => setDeliveryMethod('pickup')} className="mt-1.5 font-medium underline underline-offset-2">
                    {t.switchToPickup}
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <label className="block">
                  <span className="text-[11px] tracking-[0.1em] uppercase text-black/45">{t.phone}</span>
                  <input className={`mt-1 ${inputCls}`} inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  {phoneLookup === 'found' && (
                    <p className="mt-1.5 text-[12px] text-[#4a3520] flex items-center gap-1">✓ {t.phoneFound}</p>
                  )}
                </label>
                <label className="block">
                  <span className="text-[11px] tracking-[0.1em] uppercase text-black/45">{t.name}</span>
                  <input className={`mt-1 ${inputCls}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-[11px] tracking-[0.1em] uppercase text-black/45">
                    {t.address}{deliveryMethod !== 'delivery' && <span className="normal-case tracking-normal text-black/35"> {t.addressOptionalNote}</span>}
                  </span>
                  <textarea rows={2} className={`mt-1 resize-none ${inputCls}`} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-[11px] tracking-[0.1em] uppercase text-black/45">{t.note}</span>
                  <input className={`mt-1 ${inputCls}`} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                </label>
                {summaryError && <p className="text-[12px] text-red-600">{summaryError}</p>}
              </div>
            </>
          )}
        </div>
        {items.length > 0 && (
          <StickyActionBar>
            <button
              onClick={goToPayment}
              disabled={belowMinOrder}
              className="w-full py-3.5 rounded-xl bg-[#4a3520] text-white font-semibold text-[14px] tracking-wide hover:bg-[#3a2818] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between px-5"
            >
              <span>{t.next}</span>
              <span className="tabular-nums">฿{amount}</span>
            </button>
          </StickyActionBar>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════
  // Step 6 — Confirm & pay
  // ═══════════════════════════════════════════════════════════════════
  if (step === 'payment') {
    const canSubmit = confirmPay && !submitting && (!PROMPTPAY_ID || amount <= 0 || Boolean(qrDataUrl))
    return (
      <div className="min-h-[100dvh] flex flex-col bg-[#f5f2ee]">
        <StepHeader t={t} step={step} onBack={() => setStep('summary')} />
        <div className={`flex-1 ${CONTENT_WIDTH} w-full mx-auto px-5 py-5 flex flex-col gap-4`}>
          <h1 className="font-display text-[22px] text-ink">{t.paymentTitle}</h1>

          {/* The customer is about to pay real money — before this step, all
              they've seen since typing their info is a price. This recap is
              the actual "confirm your order" the checkbox below refers to. */}
          <div className="rounded-xl bg-white border border-black/10 p-4 flex flex-col gap-2.5">
            <p className="text-[11px] tracking-[0.1em] uppercase text-black/45">{t.orderRecapTitle}</p>
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <div key={item.id} className="text-[13px]">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-ink">{item.name} × {item.qty}</span>
                    <span className="tabular-nums text-black/60 shrink-0">฿{Math.round(parseFloat(item.price) * item.qty)}</span>
                  </div>
                  {item.note && <p className="text-[12px] text-black/45 mt-0.5">— {item.note}</p>}
                </div>
              ))}
            </div>
            <div className="border-t border-black/10 pt-2.5 flex flex-col gap-0.5 text-[13px] text-ink/85">
              <p>{form.name} · {form.phone}</p>
              <p className="text-black/60">{deliveryMethod === 'delivery' ? t.methodDeliveryLabel : t.methodPickupLabel}</p>
              {deliveryMethod === 'delivery' && form.address && <p className="text-black/60">{form.address}</p>}
              {form.note && <p className="text-black/60">{t.noteLabel}: {form.note}</p>}
            </div>
          </div>

          <div>
            <span className="text-[11px] tracking-[0.1em] uppercase text-black/45">{t.paymentMethod}</span>
            <div className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-[#4a3520] bg-[#4a3520]/[0.04] px-4 py-3">
              <span className="w-4 h-4 rounded-full border-2 border-[#4a3520] flex items-center justify-center shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#4a3520]" />
              </span>
              <span className="text-[14px] font-medium text-ink">{t.promptpayLabel}</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 text-center py-2">
            {PROMPTPAY_ID ? (
              <>
                <p className="text-[12px] text-black/50">{t.payHint}</p>
                <div className="rounded-2xl border border-black/10 bg-white p-3 shadow-sm">
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrDataUrl} alt={t.promptpayLabel} className="w-56 h-56" />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center text-black/30 text-sm">...</div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-[13px] text-black/60 py-6">{t.noPromptpay}</p>
            )}

            <div className="w-full rounded-xl bg-white border border-black/10 p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between text-[13px] text-black/60">
                <span>{t.itemsSubtotalLabel}</span><span className="tabular-nums">฿{itemsSubtotal}</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-black/60">{t.deliveryFeeLabel}</span>
                {deliveryMethod === 'delivery' ? (
                  <span className="tabular-nums text-black/60">฿{deliveryFee}</span>
                ) : (
                  <span className="text-amber-700 font-medium">{t.selfArranged}</span>
                )}
              </div>
              <div className="flex items-baseline justify-between pt-1.5 mt-1 border-t border-black/10">
                <span className="text-[11px] tracking-[0.12em] uppercase text-black/50">{t.amount}</span>
                <span className="font-display text-[26px] text-ink tabular-nums leading-none">฿{amount}</span>
              </div>
            </div>
          </div>
        </div>
        <StickyActionBar>
          <label className="flex items-start gap-2 px-1 mb-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmPay}
              onChange={(e) => setConfirmPay(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#4a3520] shrink-0"
            />
            <span className="text-[13px] text-[#4a3520] leading-snug">{t.confirmCheckbox}</span>
          </label>

          {submitError && <p className="mb-2 text-[12px] text-red-600">{submitError}</p>}

          <button
            onClick={submitOrder}
            disabled={!canSubmit}
            className="w-full py-3.5 rounded-xl bg-[#3a2818] text-white font-semibold text-[14px] tracking-wide hover:bg-[#4a3520] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? t.submitting : t.submit}
          </button>
        </StickyActionBar>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════
  // Step 7 — Success
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-[100dvh] bg-[#f5f2ee] flex items-start justify-center px-5 py-10">
      <div className={`w-full ${CONTENT_WIDTH} flex flex-col items-center text-center gap-4`}>
        <h1 className="font-display text-[24px] text-ink">{t.successTitle}</h1>
        <div>
          <span className="text-[11px] tracking-[0.12em] uppercase text-black/45">{t.orderNo}</span>
          <p className="font-display text-[24px] text-ink tracking-wide">{orderNo}</p>
          {completed && (
            <p className="text-[15px] font-semibold text-ink tabular-nums mt-0.5">{t.total} ฿{completed.total}</p>
          )}
        </div>

        {sentToLine && (
          <div className="rounded-xl bg-[#efe9e1] border border-[#4a3520]/15 px-4 py-3 text-[13px] leading-[1.75] text-[#4a3520]">
            {t.sentToShop}
          </div>
        )}

        <p className={`w-full text-[13px] leading-[1.9] text-left rounded-xl px-4 py-3.5 ${completed?.deliveryMethod === 'pickup' ? 'bg-[#faf3e4] border border-[#c9a96e]/45 text-[#6b5326]' : 'bg-black/[0.03] text-black/60'}`}>
          {completed?.deliveryMethod === 'pickup' ? t.pickupInstruction : t.waitingDelivery}
        </p>

        {slipStatus === 'ok' ? (
          <div className="w-full text-center rounded-xl bg-[#3a2818] text-white px-4 py-3 text-[14px] font-semibold leading-[1.6]">
            {t.slipVerified}
          </div>
        ) : slipStatus === 'stored' ? (
          <div className="w-full text-center rounded-xl bg-[#3a2818] text-white px-4 py-3 text-[14px] font-semibold leading-[1.6]">
            {t.slipUploaded}
          </div>
        ) : (
          <div className="w-full">
            <label className={`w-full py-3.5 rounded-xl bg-[#4a3520] text-white font-semibold text-[14px] flex items-center justify-center gap-2 cursor-pointer hover:bg-[#3a2818] transition ${slipStatus === 'verifying' ? 'opacity-60 pointer-events-none' : ''}`}>
              {slipStatus === 'verifying' ? t.verifyingSlip : slipStatus === 'fail' ? t.slipRetry : t.attachSlip}
              <input type="file" accept="image/*" className="hidden" onChange={handleSlipFile} disabled={slipStatus === 'verifying'} />
            </label>
            <p className="text-[11px] text-black/40 text-center mt-1.5">{slipVerify ? t.verifyHint : ''}</p>
            {slipStatus === 'fail' && slipError && <p className="text-[12px] leading-[1.7] text-red-600 text-center mt-1">{slipError}</p>}
            <button onClick={sendSlipViaLine} className="w-full mt-2 py-2 text-[12px] text-[#06C755] font-medium hover:underline">{t.sendSlip}</button>
          </div>
        )}

        <button onClick={resetFlow} className="w-full py-3 rounded-xl bg-black/[0.06] text-ink font-semibold text-[13px] hover:bg-black/10 transition">
          {t.done}
        </button>
      </div>
    </div>
  )
}
