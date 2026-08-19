// Guided order flow for /delivery: welcome → contact/address → distance
// check → method → menu → order summary → confirm & pay → success. Replaces
// the old DeliveryGate (auto-gate + separate CartDrawer sheet) with a single
// linear wizard so the out-of-radius warning and the payment confirmation
// both require an explicit, un-skippable acknowledgement instead of a
// bottom-sheet a customer could dismiss without reading.
//
// The `contact` step resolves who's ordering and where to before the GPS
// prompt: a recognized returning customer (LINE ID lookup, see the useEffect
// below) is asked once whether to reuse their last address — which also
// reuses their last order's distance, skipping the GPS request entirely —
// or start fresh with a new one. Everyone else fills in phone/name/address
// directly. By the time the flow reaches Summary this is already resolved,
// so Summary only recaps it (with an edit link back to `contact`).
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
import { calcOrderDiscountAndPoints } from '../../lib/points'
import { buildOrderFlex, buildPaymentConfirmedFlex } from '../../lib/orderFlex'
import { SWEETNESS_OPTIONS, COFFEE_BEAN_OPTIONS } from '../../lib/menuOptions'
import LocatingAnimation from './LocatingAnimation'
import OrderJourney from './OrderJourney'
import MenuExperience from '../menu/MenuExperience'
import { Check, CheckCircle2, Receipt, User, StickyNote } from 'lucide-react'

// Leaflet touches `window` at import time — must never be pulled into the
// server bundle, hence ssr:false.
const DeliveryRadiusMap = dynamic(() => import('./DeliveryRadiusMap'), { ssr: false })

const PROMPTPAY_ID = process.env.NEXT_PUBLIC_PROMPTPAY_ID || ''
const PROMPTPAY_TYPE = process.env.NEXT_PUBLIC_PROMPTPAY_TYPE || ''
const PROMPTPAY_REF = process.env.NEXT_PUBLIC_PROMPTPAY_REF || ''
const PROMPTPAY_REF2 = process.env.NEXT_PUBLIC_PROMPTPAY_REF2 || ''
const PROMPTPAY_TERMINAL_LABEL = process.env.NEXT_PUBLIC_PROMPTPAY_TERMINAL_LABEL || ''

// Our own per-order reference, for display/reconciliation only (shown in the
// LINE message, stored on the order) — NOT embedded in the QR. The QR's own
// Ref.1 must be the biller's fixed PROMPTPAY_REF; this biller's SCB Mae Manee
// setup rejects any other value ("เลขที่อ้างอิงไม่ถูกต้อง").
function makePaymentRef() {
  return Date.now().toString().slice(-10)
}

const STEP_ORDER = ['welcome', 'contact', 'distance', 'method', 'menu', 'summary', 'payment', 'success']

const COPY = {
  th: {
    back: 'ย้อนกลับ',
    close: 'ปิด',
    next: 'ถัดไป',
    // step 1 — welcome
    welcomeSubtitle: 'อาหารและเครื่องดื่มริมทะเล',
    welcomeHeading: 'สั่งอาหารกลับบ้านได้เลย',
    welcomeLead: 'ชำระเงินด้วยการสแกน QR ของร้าน',
    welcomeSpecialNote: (r) => `จัดส่งถึงมือ ในรัศมี ${r} กม. จากร้านนะคะ`,
    welcomeStep1: 'เลือกเมนูที่ต้องการ แล้วยืนยันออเดอร์',
    welcomeStep2: (r) => `ทางร้านสามารถจัดส่งให้เองได้ในรัศมี ${r} กม.`,
    welcomeStep3: 'อยู่ไกลกว่านั้นก็ยังสั่งได้ เพียงเรียก Grab, LINE MAN หรือแมสเซนเจอร์เจ้าอื่นมารับอาหารที่ร้านเอง',
    lineConnected: (name) => `เชื่อมต่อกับ LINE ของคุณ${name}แล้ว`,
    startOrder: 'เข้าสู่ระบบ LINE เพื่อเริ่มสั่งอาหาร',
    continueOrder: 'เริ่มสั่งอาหาร',
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
    sweetnessLabel: 'ความหวาน',
    coffeeBeanLabel: 'สายพันธุ์กาแฟ',
    itemsSubtotalLabel: 'ค่าอาหาร',
    discountLabel: 'ส่วนลดสมาชิก',
    deliveryFeeLabel: 'ค่าจัดส่ง',
    selfArranged: 'ลูกค้าจัดการเอง',
    total: 'รวมทั้งหมด',
    pointsPreview: (n) => `จะได้รับ ${n} แต้มสะสม`,
    pointsEarnedBanner: (n) => `+${n} แต้มสะสม`,
    pointsRule: 'ทุก ฿100 รับ 5 คะแนน • 1 คะแนน = ส่วนลด ฿1',
    pointsBalance: (n) => `มี ${n} คะแนน`,
    usePoints: (n) => `ใช้ ${n} คะแนน ลดเพิ่ม ฿${n}`,
    pointsDiscountLabel: 'ส่วนลดจากคะแนน',
    name: 'ชื่อผู้รับ',
    phone: 'เบอร์โทร',
    address: 'ที่อยู่จัดส่ง',
    addressOptionalNote: '(ไม่บังคับ — คุณเรียก Grab/LINE MAN มารับเองที่ร้าน)',
    note: 'หมายเหตุ (ไม่บังคับ)',
    phoneFound: 'พบข้อมูลลูกค้าเดิม กรอกชื่อและที่อยู่ให้อัตโนมัติ',
    confirmInfoTitle: 'ข้อมูลของคุณ',
    editInfo: 'แก้ไขข้อมูล',
    // step 1b — contact / address
    contactGreeting: (name) => `สวัสดีค่ะ คุณ${name}`,
    contactGreetingSub: 'เลือกใช้ที่อยู่ล่าสุด หรือเปลี่ยนที่อยู่สำหรับออเดอร์นี้ได้เลยค่ะ',
    savedAddressLabel: 'ที่อยู่จากออเดอร์ล่าสุด',
    savedAddressNote: 'ประวัติที่อยู่ในออเดอร์ก่อนหน้าจะยังคงถูกเก็บไว้',
    useSavedAddress: 'ใช้ที่อยู่เดิม',
    useNewAddress: 'ใช้ที่อยู่ใหม่',
    newAddressDesc: 'กรอกที่อยู่จัดส่งใหม่ในขั้นตอนถัดไป',
    addressSaveNote: 'เมื่อยืนยันออเดอร์ ที่อยู่นี้จะถูกบันทึกเป็นที่อยู่ล่าสุดของคุณ',
    contactFormTitle: 'ข้อมูลติดต่อและที่อยู่จัดส่ง',
    contactChecking: 'กำลังตรวจสอบข้อมูล...',
    orderRecapTitle: 'ตรวจสอบรายการก่อนชำระเงิน',
    noteLabel: 'หมายเหตุ',
    fillRequired: 'กรุณากรอกชื่อและเบอร์โทร',
    fillAddress: 'กรุณากรอกที่อยู่จัดส่ง',
    minOrderNotice: (remaining, min) => `สั่งอาหารเพิ่มอีก ฿${remaining} ให้ครบ ฿${min} จึงจะสั่งซื้อได้`,
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
    processingTitle: 'ร้านกำลังรับออเดอร์ของคุณ',
    processingMessage: 'กรุณารอสักครู่',
    waitingDelivery: 'ร้านกำลังเตรียมอาหารและจะจัดส่งให้ภายในรัศมีบริการ',
    pickupInstruction: 'กรุณามารับอาหารด้วยตนเอง หรือเรียก Grab, LINE MAN หรือแมสเซนเจอร์เจ้าอื่น มารับที่ร้าน Love Pier Beach Cafe เมื่อร้านแจ้งว่าอาหารพร้อม',
    nextStepLabel: 'ขั้นตอนต่อไป',
    payNow: 'กรุณาแนบสลิปการโอนเพื่อยืนยันการชำระเงิน',
    attachSlip: 'ยืนยันชำระเงิน · แนบสลิป',
    verifyingSlip: 'กำลังตรวจสอบสลิป...',
    slipVerified: 'ยืนยันการชำระเงินแล้ว',
    shopReceivedTitle: 'ร้านได้รับออเดอร์แล้ว',
    shopReceivedWait: 'กรุณารอสักครู่',
    slipUploaded: 'แนบสลิปแล้ว รอร้านตรวจสอบ',
    slipRetry: 'แนบสลิปใหม่อีกครั้ง',
    verifyHint: 'ระบบตรวจสลิปอัตโนมัติ (จับสลิปปลอมได้)',
    done: 'เสร็จสิ้น — สั่งใหม่',
    journeyPaid: 'ชำระเงิน',
    journeyPrep: 'ร้านกำลังเตรียม',
    journeyDeliver: 'กำลังจัดส่ง',
    journeyPickup: 'พร้อมให้รับ',
  },
  en: {
    back: 'Back',
    close: 'Close',
    next: 'Next',
    welcomeSubtitle: 'Beachside food and drinks.',
    welcomeHeading: 'You can order takeaway',
    welcomeLead: "Pay by scanning the shop's QR code.",
    welcomeSpecialNote: (r) => `We'll bring it straight to you, anywhere within ${r} km of the cafe.`,
    welcomeStep1: 'Choose what you want and confirm the order',
    welcomeStep2: (r) => `We can deliver to you ourselves within ${r} km`,
    welcomeStep3: 'Further away? You can still order — just send Grab, LINE MAN, or another courier to collect it from the shop',
    lineConnected: (name) => `Connected to ${name}'s LINE account`,
    startOrder: 'Log in with LINE to start ordering',
    continueOrder: 'Start ordering',
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
    sweetnessLabel: 'Sweetness',
    coffeeBeanLabel: 'Coffee bean',
    itemsSubtotalLabel: 'Food total',
    discountLabel: 'Member discount',
    deliveryFeeLabel: 'Delivery fee',
    selfArranged: 'Arranged by customer',
    total: 'Total',
    pointsPreview: (n) => `You'll earn ${n} points`,
    pointsEarnedBanner: (n) => `+${n} points earned`,
    pointsRule: 'Earn 5 points per ฿100 • 1 point = ฿1 off',
    pointsBalance: (n) => `${n} points available`,
    usePoints: (n) => `Use ${n} points for ฿${n} off`,
    pointsDiscountLabel: 'Points discount',
    name: 'Recipient name',
    phone: 'Phone',
    address: 'Delivery address',
    addressOptionalNote: "(optional — you'll arrange your own Grab/LINE MAN pickup)",
    note: 'Note (optional)',
    phoneFound: "Found your details from a past order — name and address filled in",
    confirmInfoTitle: 'Your details',
    editInfo: 'Edit',
    contactGreeting: (name) => `Hi, ${name}`,
    contactGreetingSub: 'Use your latest address, or change it for this order.',
    savedAddressLabel: 'Latest order address',
    savedAddressNote: 'Addresses on previous orders remain in your order history.',
    useSavedAddress: 'Use latest address',
    useNewAddress: 'Enter a new address',
    newAddressDesc: 'Enter a different delivery address on the next step.',
    addressSaveNote: 'After you confirm the order, this becomes your latest saved address.',
    contactFormTitle: 'Contact & delivery address',
    contactChecking: 'Checking your details...',
    orderRecapTitle: 'Review before you pay',
    noteLabel: 'Note',
    fillRequired: 'Please enter name and phone',
    fillAddress: 'Please enter a delivery address',
    minOrderNotice: (remaining, min) => `Add ฿${remaining} more to reach the ฿${min} minimum order`,
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
    processingTitle: 'Processing your order',
    processingMessage: "We're sending your order to the shop. Please keep this page open and don't submit again.",
    waitingDelivery: "We're preparing your order and will deliver within our service radius.",
    pickupInstruction: 'Please come collect it yourself, or send Grab, LINE MAN, or another rider/courier to pick up the food from Love Pier Beach Cafe once the shop confirms it is ready.',
    nextStepLabel: 'Next step',
    payNow: 'Please attach your payment slip to confirm.',
    attachSlip: 'Attach slip to confirm payment',
    verifyingSlip: 'Verifying slip...',
    slipVerified: 'Payment verified',
    shopReceivedTitle: 'The shop has received your order',
    shopReceivedWait: 'Please wait a moment',
    slipUploaded: 'Slip attached — pending review',
    slipRetry: 'Attach a different slip',
    verifyHint: 'Automatic slip check (detects fakes)',
    done: 'Done — order again',
    journeyPaid: 'Paid',
    journeyPrep: 'Shop is preparing',
    journeyDeliver: 'Out for delivery',
    journeyPickup: 'Ready for pickup',
  },
  zh: {
    back: '返回',
    close: '关闭',
    next: '下一步',
    welcomeSubtitle: '海边美食与饮品。',
    welcomeHeading: '现可点餐外带',
    welcomeLead: '扫描本店二维码付款。',
    welcomeSpecialNote: (r) => `本店 ${r} 公里内均可为您配送到家。`,
    welcomeStep1: '选好菜品并确认订单',
    welcomeStep2: (r) => `${r} 公里内可由本店为您配送`,
    welcomeStep3: '超出范围仍可下单，只需自行安排 Grab、LINE MAN 或其他快递员到店取餐',
    lineConnected: (name) => `已连接 ${name} 的 LINE 帐号`,
    startOrder: '使用 LINE 登录并开始点餐',
    continueOrder: '开始点餐',
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
    sweetnessLabel: '甜度',
    coffeeBeanLabel: '咖啡豆种',
    itemsSubtotalLabel: '餐点小计',
    discountLabel: '会员折扣',
    deliveryFeeLabel: '配送费',
    selfArranged: '顾客自行安排',
    total: '总计',
    pointsPreview: (n) => `将获得 ${n} 积分`,
    pointsEarnedBanner: (n) => `+${n} 积分`,
    pointsRule: '每 ฿100 获得 5 积分 • 1 积分抵 ฿1',
    pointsBalance: (n) => `可用 ${n} 积分`,
    usePoints: (n) => `使用 ${n} 积分抵扣 ฿${n}`,
    pointsDiscountLabel: '积分抵扣',
    name: '收件人姓名',
    phone: '电话',
    address: '配送地址',
    addressOptionalNote: '（选填 — 您将自行安排 Grab/LINE MAN 到店取餐）',
    note: '备注（选填）',
    phoneFound: '已找到您上次的资料，姓名和地址已自动填写',
    confirmInfoTitle: '您的信息',
    editInfo: '编辑',
    contactGreeting: (name) => `您好，${name}`,
    contactGreetingSub: '使用最近地址，或为本次订单更改地址。',
    savedAddressLabel: '最近订单地址',
    savedAddressNote: '以前订单中的地址仍会保留。',
    useSavedAddress: '使用最近地址',
    useNewAddress: '输入新地址',
    newAddressDesc: '在下一步输入新的配送地址。',
    addressSaveNote: '确认订单后，此地址将保存为您的最近地址。',
    contactFormTitle: '联系方式和配送地址',
    contactChecking: '正在核对您的资料...',
    orderRecapTitle: '付款前请核对订单',
    noteLabel: '备注',
    fillRequired: '请填写姓名和电话',
    fillAddress: '请填写配送地址',
    minOrderNotice: (remaining, min) => `还差 ฿${remaining} 才能达到最低消费 ฿${min}`,
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
    processingTitle: '正在处理，请稍候',
    processingMessage: '系统正在将订单发送给店家，请勿关闭页面或重复提交。',
    waitingDelivery: '我们正在备餐，将在配送范围内为您送达。',
    pickupInstruction: '请在店家通知餐点备好后，亲自到店取餐，或自行安排 Grab、LINE MAN 或其他骑手/快递员到 Love Pier Beach Cafe 取餐。',
    nextStepLabel: '下一步',
    payNow: '请附上付款凭证以确认。',
    attachSlip: '上传凭证以确认付款',
    verifyingSlip: '正在核验凭证...',
    slipVerified: '付款已确认',
    shopReceivedTitle: '店家已收到您的订单',
    shopReceivedWait: '请稍候',
    slipUploaded: '凭证已上传 — 等待店家核对',
    slipRetry: '重新上传凭证',
    verifyHint: '自动核验凭证（可识别伪造）',
    done: '完成 — 再次下单',
    journeyPaid: '已付款',
    journeyPrep: '店家备餐中',
    journeyDeliver: '配送中',
    journeyPickup: '可以取餐',
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

// The recognize-a-returning-customer moment — the one place in this flow
// that gets to feel personal rather than procedural. A small animated
// smiling-face sticker makes the returning-customer greeting feel friendly.
// sits above the name to read as warm/friendly at a glance, alongside the
// light display serif. Shown from two different places depending on
// timing: returning customers can see it as soon as their LINE lookup and
// saved address resolve; new customers see the same personalized greeting
// above the contact form after LINE login.
function GreetingChoiceCard({ t, name, address, onUseSaved, onUseNew }) {
  const [choice, setChoice] = useState(null)

  function confirmChoice() {
    if (choice === 'saved') onUseSaved()
    if (choice === 'new') onUseNew()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="relative overflow-hidden rounded-2xl border border-[#4a3520]/15 bg-white/55 px-5 py-6 text-center shadow-[0_8px_28px_rgba(74,53,32,0.06)]">
        <img
          src="/uploads/icons8-savouring-delicious-food-face.gif"
          alt=""
          aria-hidden="true"
          className="mx-auto mb-3 block h-12 w-12 object-contain"
        />
        <p className="font-display font-light text-[clamp(28px,7.5vw,34px)] text-ink leading-[1.3]">{t.contactGreeting(name)}</p>
        <p className="mx-auto mt-2 max-w-[30rem] text-[13px] text-black/55 font-light leading-relaxed">{t.contactGreetingSub}</p>
        <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full border border-[#b89567]/10" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-12 -left-10 h-28 w-28 rounded-full border border-[#b89567]/10" />
      </div>
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => setChoice('saved')}
          className={`w-full rounded-xl border px-4 py-4 text-left transition-colors ${choice === 'saved' ? 'border-[#4a3520] bg-[#4a3520]/[0.05]' : 'border-black/10 bg-white'}`}
        >
          <span className="flex items-start gap-3">
            <span aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center ${choice === 'saved' ? 'border-[#4a3520]' : 'border-black/20'}`}>
              {choice === 'saved' && <span className="h-2.5 w-2.5 rounded-full bg-[#4a3520]" />}
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold text-ink">{t.useSavedAddress}</span>
              <span className="mt-1 block text-[11px] tracking-[0.08em] uppercase text-black/40">{t.savedAddressLabel}</span>
              <span className="mt-1 block text-[13px] leading-relaxed text-ink whitespace-pre-line">{address}</span>
              <span className="mt-2 block text-[11px] leading-relaxed text-black/40">{t.savedAddressNote}</span>
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setChoice('new')}
          className={`w-full rounded-xl border px-4 py-4 text-left transition-colors ${choice === 'new' ? 'border-[#4a3520] bg-[#4a3520]/[0.05]' : 'border-black/10 bg-white'}`}
        >
          <span className="flex items-start gap-3">
            <span aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center ${choice === 'new' ? 'border-[#4a3520]' : 'border-black/20'}`}>
              {choice === 'new' && <span className="h-2.5 w-2.5 rounded-full bg-[#4a3520]" />}
            </span>
            <span>
              <span className="block text-[15px] font-semibold text-ink">{t.useNewAddress}</span>
              <span className="mt-1 block text-[12px] leading-relaxed text-black/45">{t.newAddressDesc}</span>
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={confirmChoice}
          disabled={!choice}
          className="mt-2 w-full py-3.5 rounded-xl bg-[#4a3520] text-white font-semibold text-[14px] tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-35"
        >
          {t.next}
        </button>
      </div>
    </div>
  )
}

export default function OrderFlow({ dbMenuData, dbPromotions, heroTitle, radiusKm = 5, minDeliveryOrder = 300, pointsPerBaht = 20, menuOptionsEnabled = false }) {
  const { lang } = useLanguage()
  const t = COPY[lang] || COPY.en
  const { items, addItem, removeItem, updateNote, updateSweetness, updateCoffeeBean, clearCart, totalQty, totalPrice } = useCart()
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

  // step 1b — contact / address (resolved up front now; summary just recaps it)
  const [form, setForm] = useState({ name: '', phone: '', address: '', note: '' })
  const [summaryError, setSummaryError] = useState('')
  // 'idle' | 'checking' | 'found' | 'notfound' — drives the small note under
  // the phone field once it looks complete. See the lookup effect below.
  const [phoneLookup, setPhoneLookup] = useState('idle')
  // Flips true the moment either lookup below (LINE ID or phone) finds a
  // matching customer row — swaps the contact step's form for either the
  // "reuse last address?" popup (LINE ID, with a cached distance) or a
  // silently-prefilled pass-through. `editingInfo` is the customer's own
  // escape hatch back to the plain form, e.g. their address changed.
  const [customerRecognized, setCustomerRecognized] = useState(false)
  const [pointsBalance, setPointsBalance] = useState(0)
  const [usePoints, setUsePoints] = useState(false)
  const [editingInfo, setEditingInfo] = useState(false)
  // Distance (km) from the customer's most recent order, from the LINE ID
  // lookup below — lets "ใช้ที่อยู่เดิม" skip the GPS prompt entirely by
  // replaying this through /api/delivery-distance's bypass mode instead of
  // asking the browser for a fresh position. Null until the lookup resolves
  // (or if they have no past order with a recorded distance).
  const [cachedDistanceKm, setCachedDistanceKm] = useState(null)
  // 'idle' | 'checking' | 'done' — whether the LINE-ID recognition lookup has
  // resolved yet, so the contact step can show a brief non-blocking loading
  // state instead of flashing the wrong branch. See the timeout fallback in
  // the lookup effect: a slow/failed lookup must never hang the step.
  const [lineLookupStatus, setLineLookupStatus] = useState('idle')
  // null while recognition is still being decided (contact step shows a
  // brief loading state) | 'popup' (recognized + a cached distance to reuse)
  // | 'form' (new customer, or recognized with nothing to bypass, or the
  // customer's own "ที่อยู่ใหม่"/"แก้ไข" choice). Set once by the effect
  // below rather than derived live in render, so it doesn't get yanked out
  // from under the customer mid-typing.
  const [contactMode, setContactMode] = useState(null)

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
  // Applies to the WHOLE order, not just delivery — pickup is blocked below
  // it too. Tried scoping this to deliveryMethod==='delivery' only (so
  // pickup stayed exempt, matching the very first version of this feature
  // back in de74fcf), but the shop explicitly corrected that: 'รับเองที่ร้าน
  // ก็ต้องอยู่ในเงื่อนไขของสั่งซื้อครบ 300 บาทเช่นเดียวกัน' — pickup must
  // clear the same ฿300 minimum, not be exempt. Enforced at the summary
  // step's continue button (see below), the same place regardless of which
  // method is selected. minDeliveryOrder<=0 disables the requirement
  // entirely.
  const belowMinOrder = minDeliveryOrder > 0 && itemsSubtotal < minDeliveryOrder
  // 'pickup' is always free, the shop never delivers outside its radius
  // regardless of what the fee settings say, and while belowMinOrder nothing
  // can be ordered yet (checkout itself is blocked below), so no delivery
  // fee should show until it's real. No free-delivery threshold above the
  // minimum — delivery always charges the tiered fee once it's chosen.
  const deliveryFee = deliveryMethod === 'delivery' && withinRadius && !belowMinOrder ? (distanceResult?.deliveryFee || 0) : 0
  // Member discount + points preview — only for a LINE-attached session, only
  // on itemsSubtotal (never the delivery fee). Purely a client-side preview;
  // /api/orders recomputes both from the same lib/points.js function as the
  // source of truth, so a stale/tampered preview can never affect what's
  // actually charged.
  const hasLineId = Boolean(profile?.userId)
  const maxPointsUsable = Math.min(pointsBalance, Math.max(0, itemsSubtotal - 1))
  const requestedPoints = usePoints ? maxPointsUsable : 0
  const { discountAmount, pointsRedeemed, pointsEarned: pointsPreview } = calcOrderDiscountAndPoints(itemsSubtotal, {
    hasLineId,
    pointsPerBaht,
    pointsRedeemed: requestedPoints,
  })
  const amount = itemsSubtotal - discountAmount - pointsRedeemed + deliveryFee

  // Silently pick up an already-logged-in LINE session (e.g. after a login
  // redirect back to this page) so returning customers aren't asked twice.
  useEffect(() => {
    if (!isLiffConfigured() || triedSilentLoginRef.current) return
    triedSilentLoginRef.current = true
    getProfileIfLoggedIn().then((p) => {
      if (p) { setProfile(p); setDeliverySessionProfile(p) }
    })
  }, [])

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
    setLineLookupStatus('checking')
    // Non-blocking per the original spec: if the lookup hasn't answered
    // within a few seconds, stop waiting and let the contact step fall back
    // to the plain form — a slow/erroring API must never hang the flow.
    const timeout = setTimeout(() => setLineLookupStatus((s) => (s === 'checking' ? 'done' : s)), 3000)
    fetch('/api/customer', {
      headers: { Authorization: `Bearer ${profile.accessToken || ''}` },
    })
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
        setCustomerRecognized(true)
        setPointsBalance(Math.max(0, Number(data.customer.pointsBalance) || 0))
        if (Number.isFinite(data.customer.lastOrderDistanceKm)) {
          setCachedDistanceKm(data.customer.lastOrderDistanceKm)
        }
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timeout)
        setLineLookupStatus('done')
      })
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
          setCustomerRecognized(true)
        } else {
          setPhoneLookup('notfound')
        }
      } catch {
        setPhoneLookup('notfound')
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [form.phone])

  // ── Step 1b: contact / address — decide what to show, once, when
  // recognition resolves (not derived live in render, so typing into the
  // plain form afterward can't yank it back to the popup). Runs from BOTH
  // `welcome` and `contact`: the common case is the greeting resolving
  // fast enough to show right on Welcome, skipping the "เริ่มสั่งอาหาร" tap
  // entirely for a customer we already know where to deliver to — that tap
  // exists to explain what's about to happen to someone we don't recognize,
  // not to gate a returning customer we could greet immediately. ──────────
  useEffect(() => {
    if (editingInfo || contactMode) return
    if (step !== 'welcome' && step !== 'contact') return

    // The one resolution allowed from Welcome itself: recognized, with an
    // address to offer. Everything else below needs the customer to have
    // actually tapped in first (see the `step !== 'contact'` guard) — most
    // importantly, "no profile yet" must NOT resolve to the plain form while
    // still on Welcome, or a silent LINE login still in flight would get
    // permanently locked out by the time it actually resolves.
    if (customerRecognized && form.address.trim()) {
      setContactMode('popup')
      return
    }
    if (step !== 'contact') return

    if (!profile) {
      // No LINE session to check (LIFF unconfigured, or login skipped) —
      // nothing to look up, straight to the plain form.
      setContactMode('form')
      return
    }
    if (lineLookupStatus !== 'done') return // still checking (or hasn't started)
    if (customerRecognized) {
      // We know the LINE identity but have no usable saved address. Still
      // greet the customer and ask for a new address; skipping straight to
      // GPS made the app look as if it had forgotten their LINE account.
      setContactMode('form')
    } else {
      setContactMode('form')
    }
  }, [step, profile, lineLookupStatus, customerRecognized, cachedDistanceKm, editingInfo, contactMode, form.address])

  // "ใช้ที่อยู่เดิม" — reuse the address + distance already on file. Called
  // from either Welcome or `contact` (see the effect above); either way it
  // jumps straight past both of those into Method/Menu.
  async function useSavedAddress() {
    if (cachedDistanceKm == null) {
      setStep('distance')
      return
    }
    await fetchDistanceFromCache(cachedDistanceKm)
    goToMethodOrMenu()
  }

  // "ใช้ที่อยู่ใหม่" — same identity (name/phone kept), fresh address to be
  // typed and, next step, a fresh GPS reading. Explicit setStep so this
  // works whether it was called from Welcome (still needs to move into the
  // `contact` step to show the form) or from `contact` already (a no-op).
  function useNewAddress() {
    setForm((f) => ({ ...f, address: '' }))
    setContactMode('form')
    setStep('contact')
  }

  function goToDistanceFromContact() {
    setSummaryError('')
    if (!form.name.trim() || !form.phone.trim()) {
      setSummaryError(t.fillRequired)
      return
    }
    setStep('distance')
  }

  // ── Step 1: welcome + LINE login ─────────────────────────────────────
  async function handleStart() {
    if (!profile) {
      if (!isLiffConfigured()) {
        setLoginPhase('failed')
        return
      }
      setLoginPhase('logging-in')
      try {
        const p = await loginAndGetProfile()
        if (p) {
          setProfile(p)
          setDeliverySessionProfile(p)
          setLoginPhase('idle')
          setStep('contact')
        }
        // else: liff.login() redirected the page away — nothing else to do.
      } catch {
        setLoginPhase('failed')
      }
      return
    }
    setStep('contact')
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

  // "ใช้ที่อยู่เดิม" at the contact step — replays the customer's last-order
  // distance through the same endpoint's bypass mode instead of asking the
  // browser for a fresh GPS position, so the radius/fee logic stays in one
  // place (server-side, same as the live-GPS path) without re-prompting.
  async function fetchDistanceFromCache(distanceKm) {
    setLocatePhase('calculating')
    try {
      const res = await fetch('/api/delivery-distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distanceKm }),
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
          lineAccessToken: profile?.accessToken || '',
          pointsToRedeem: requestedPoints,
          items: items.map((i) => ({
            id: i.id,
            name: i.name,
            price: parseFloat(i.price) || 0,
            qty: i.qty,
            note: i.note || '',
            sweetness: i.sweetness || SWEETNESS_OPTIONS[0],
            coffeeBean: i.coffeeBean || COFFEE_BEAN_OPTIONS[0],
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'error')

      const finalDeliveryFee = data.deliveryFee || 0
      const finalDiscount = data.discountAmount || 0
      const finalTotal = data.totalAmount ?? amount

      // Post from the customer into the OA conversation. This is deliberately
      // inbound: LINE OA Manager only alerts staff for a new incoming message;
      // a Messaging API push from the OA to the customer is outbound and does
      // not create a shop notification.
      const orderFlex = buildOrderFlex({
        orderNo: data.orderNo,
        name: form.name,
        phone: form.phone,
        address: form.address,
        items: items.map((i) => ({
          name: i.name,
          price: parseFloat(i.price) || 0,
          qty: i.qty,
          note: i.note || '',
          sweetness: i.sweetness || SWEETNESS_OPTIONS[0],
          coffeeBean: i.coffeeBean || COFFEE_BEAN_OPTIONS[0],
        })),
        total: finalTotal,
        deliveryFee: finalDeliveryFee,
        discountAmount: finalDiscount,
        pointsRedeemed: data.pointsRedeemed || 0,
        distanceKm: distanceResult?.distanceKm ?? null,
        deliveryMethod,
      })
      const customerSentOrder = await sendMessagesToChat([orderFlex])
      setSentToLine(customerSentOrder || Boolean(data.sentToLine))

      setCompleted({
        total: finalTotal,
        deliveryFee: finalDeliveryFee,
        discountAmount: finalDiscount,
        pointsEarned: data.pointsEarned || 0,
        distanceKm: distanceResult?.distanceKm ?? null,
        withinRadius,
        deliveryMethod,
        status: 'pending',
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
          setCompleted((current) => current ? { ...current, status: 'paid' } : current)
          // Same inbound path for payment confirmation, so the shop receives
          // a real OA notification instead of only seeing its own outgoing
          // message in the customer's history.
          await sendMessagesToChat([
            buildPaymentConfirmedFlex({
              orderNo,
              total: completed?.total || data.amount || 0,
              pointsEarned: data.pointsEarned || completed?.pointsEarned || 0,
            }),
          ])
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

  // Keep the success screen in sync with the order status changed by staff.
  // The LINE token proves this browser owns the order; no customer details are
  // exposed to someone who merely guesses an order number.
  useEffect(() => {
    if (step !== 'success' || !orderNo || !profile?.accessToken) return undefined

    let stopped = false
    const refreshStatus = async () => {
      try {
        const res = await fetch(`/api/order-status?orderNo=${encodeURIComponent(orderNo)}`, {
          headers: { Authorization: `Bearer ${profile.accessToken}` },
          cache: 'no-store',
        })
        if (!res.ok) return
        const data = await res.json()
        if (stopped || !data?.status) return
        setCompleted((current) => current ? { ...current, status: data.status } : current)
        if (['paid', 'preparing', 'done'].includes(data.status)) setSlipStatus('ok')
      } catch {
        // A temporary network failure must not disturb the success screen.
      }
    }

    refreshStatus()
    const timer = window.setInterval(refreshStatus, 5000)
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [step, orderNo, profile?.accessToken])

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
    setCustomerRecognized(false)
    setPointsBalance(0)
    setUsePoints(false)
    setEditingInfo(false)
    setCachedDistanceKm(null)
    setLineLookupStatus('idle')
    setContactMode(null)
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
    // A customer we already recognize (LINE ID + a distance on file from a
    // past order) skips the tap-to-start CTA below entirely — the "start
    // ordering" ritual exists to explain what's about to happen (LINE
    // login, then GPS) to someone we don't know yet, not to gate a
    // returning customer we could already greet by name. See the
    // useEffect above for exactly when this resolves.
    if (contactMode === 'popup') {
      return (
        <div className="flex flex-col min-h-[calc(100dvh-var(--nav-h,64px))] sm:min-h-0">
          <div className="shrink-0">
            <PageHero title={heroTitle} subtitle={t.welcomeSubtitle} compact />
          </div>
          <section
            className="flex-1 bg-[#f5f2ee] px-6 pt-8 pb-8 flex flex-col justify-center"
            style={{ paddingBottom: 'max(1.75rem, env(safe-area-inset-bottom))' }}
          >
            <div className={`${CONTENT_WIDTH} mx-auto w-full`}>
              <GreetingChoiceCard t={t} name={profile?.displayName || form.name} address={form.address} onUseSaved={useSavedAddress} onUseNew={useNewAddress} />
            </div>
          </section>
        </div>
      )
    }

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
                {loginPhase === 'logging-in' ? t.loggingIn : profile ? t.continueOrder : t.startOrder}
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
  // Step 1b — Contact / address
  // ═══════════════════════════════════════════════════════════════════
  if (step === 'contact') {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-[#f5f2ee]">
        <StepHeader t={t} step={step} onBack={() => setStep('welcome')} />
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          <div className={`w-full ${CONTENT_WIDTH}`}>
            {contactMode === 'popup' ? (
              // Returning customer: greet by LINE name and offer the saved
              // address. New customers receive a personalized greeting above
              // the form below instead.
              <GreetingChoiceCard t={t} name={form.name} address={form.address} onUseSaved={useSavedAddress} onUseNew={useNewAddress} />
            ) : contactMode === 'form' ? (
              <div className="flex flex-col gap-4">
                <div className="relative mb-1 overflow-hidden rounded-2xl border border-[#4a3520]/15 bg-white/60 px-5 py-5 text-center shadow-[0_8px_28px_rgba(74,53,32,0.06)]">
                  <img
                    src="/uploads/icons8-savouring-delicious-food-face.gif"
                    alt=""
                    aria-hidden="true"
                    className="mx-auto mb-2.5 h-12 w-12 object-contain"
                  />
                  <p className="font-display text-[clamp(25px,7vw,31px)] font-light leading-[1.3] text-ink">
                    {t.contactGreeting(profile?.displayName || form.name)}
                  </p>
                  <p className="mt-1.5 text-[12px] text-[#06a847]">✓ {t.lineConnected(profile?.displayName || form.name)}</p>
                  <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full border border-[#b89567]/10" />
                </div>
                <h1 className="font-display text-[22px] text-ink text-center">{t.contactFormTitle}</h1>
                <p className="-mt-2 text-center text-[12px] leading-relaxed text-black/45">{t.addressSaveNote}</p>
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
                  <span className="text-[11px] tracking-[0.1em] uppercase text-black/45">{t.address}</span>
                  <textarea rows={2} className={`mt-1 resize-none ${inputCls}`} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </label>
                {summaryError && <p className="text-[12px] text-red-600">{summaryError}</p>}
                <button
                  onClick={goToDistanceFromContact}
                  className="w-full py-3.5 rounded-xl bg-[#4a3520] text-white font-semibold text-[14px] tracking-wide hover:bg-[#3a2818] transition-colors"
                >
                  {t.next}
                </button>
              </div>
            ) : (
              // Recognition lookup still in flight (brief, non-blocking —
              // see the timeout fallback in the useEffect above).
              <p className="text-center text-[13px] text-black/45">{t.contactChecking}</p>
            )}
          </div>
        </div>
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
        <StepHeader t={t} step={step} onBack={() => setStep('contact')} />
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
            <div className="mb-8 text-center">
              <img
                src="/uploads/icons8-truck-96.gif"
                alt=""
                aria-hidden="true"
                className="mx-auto mb-3 h-16 w-16 object-contain sm:h-[72px] sm:w-[72px]"
              />
              <h1 className="font-display text-[28px] text-ink leading-tight">{t.methodTitle}</h1>
            </div>
            <div className="flex flex-col gap-4">
              {/* Both options stay selectable here regardless of the ฿300
                  minimum — the cart is often still empty at this point (this
                  step comes before menu) and the customer needs a way to
                  reach the menu no matter which method they'll end up
                  needing. The minimum is enforced once at the summary step's
                  continue button instead, uniformly for whichever method was
                  picked — see the belowMinOrder note above. */}
              <button
                type="button"
                onClick={() => setDeliveryMethod('delivery')}
                className={`text-left rounded-2xl border px-5 py-5 transition-colors ${
                  deliveryMethod === 'delivery'
                    ? 'border-[#4a3520] bg-[#4a3520]/[0.04]'
                    : 'border-black/10 bg-white hover:border-black/20'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span
                    aria-hidden="true"
                    className={`w-6 h-6 rounded-full border-[3px] flex items-center justify-center shrink-0 ${deliveryMethod === 'delivery' ? 'border-[#4a3520]' : 'border-black/20'}`}
                  >
                    {deliveryMethod === 'delivery' && <span className="w-3 h-3 rounded-full bg-[#4a3520]" />}
                  </span>
                  <span className="flex-1">
                    <span className="block text-[18px] font-medium text-ink leading-snug">{t.methodDeliveryLabel}</span>
                    <span className="block text-[15px] leading-relaxed text-black/50 mt-1">{t.methodDeliveryDesc(previewFee)}</span>
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryMethod('pickup')}
                className={`text-left rounded-2xl border px-5 py-5 transition-colors ${
                  deliveryMethod === 'pickup'
                    ? 'border-[#4a3520] bg-[#4a3520]/[0.04]'
                    : 'border-black/10 bg-white hover:border-black/20'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span
                    aria-hidden="true"
                    className={`w-6 h-6 rounded-full border-[3px] flex items-center justify-center shrink-0 ${deliveryMethod === 'pickup' ? 'border-[#4a3520]' : 'border-black/20'}`}
                  >
                    {deliveryMethod === 'pickup' && <span className="w-3 h-3 rounded-full bg-[#4a3520]" />}
                  </span>
                  <span className="flex-1">
                    <span className="block text-[18px] font-medium text-ink leading-snug">{t.methodPickupLabel}</span>
                    <span className="block text-[15px] leading-relaxed text-black/50 mt-1">{t.methodPickupDesc}</span>
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
          <h1 className="font-display text-[22px] text-ink flex items-center gap-2">
            <Receipt size={20} strokeWidth={1.75} className="text-[#8c682c] shrink-0" />
            {t.summaryTitle}
          </h1>

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
                    {/* Structured options — same global set on every line
                        (lib/menuOptions.js), applies to the whole qty, same
                        as the note below. First option shown selected until
                        the customer actually picks something (item.sweetness
                        / item.coffeeBean stay undefined until then). Gated
                        behind /admin/settings — off by default (2026-08-17,
                        shop wants it hidden for now; the toggle is there to
                        turn it back on later with no code change). */}
                    {menuOptionsEnabled && (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] tracking-[0.08em] uppercase text-black/40 w-full">{t.sweetnessLabel}</span>
                          {SWEETNESS_OPTIONS.map((opt) => {
                            const selected = (item.sweetness || SWEETNESS_OPTIONS[0]) === opt
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => updateSweetness(item.id, opt)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${selected ? 'bg-[#4a3520] text-white' : 'bg-black/[0.06] text-ink hover:bg-black/10'}`}
                              >
                                {opt}
                              </button>
                            )
                          })}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] tracking-[0.08em] uppercase text-black/40 w-full">{t.coffeeBeanLabel}</span>
                          {COFFEE_BEAN_OPTIONS.map((opt) => {
                            const selected = (item.coffeeBean || COFFEE_BEAN_OPTIONS[0]) === opt
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => updateCoffeeBean(item.id, opt)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${selected ? 'bg-[#4a3520] text-white' : 'bg-black/[0.06] text-ink hover:bg-black/10'}`}
                              >
                                {opt}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
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
                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between text-[13px] text-emerald-700">
                      <span>{t.discountLabel}</span>
                      <span className="tabular-nums">-฿{discountAmount}</span>
                    </div>
                  )}
                  {hasLineId && pointsBalance > 0 && (
                    <div className="my-2 rounded-xl border border-[#b06d2b]/20 bg-[#fff8ef] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-medium text-[#8b5423]">{t.pointsBalance(pointsBalance)}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-[#8b5423]/70">{t.pointsRule}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUsePoints((v) => !v)}
                          className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${usePoints ? 'bg-[#b06d2b] text-white' : 'border border-[#b06d2b]/30 text-[#8b5423]'}`}
                        >
                          {usePoints ? '✓' : '+'} {t.usePoints(maxPointsUsable)}
                        </button>
                      </div>
                    </div>
                  )}
                  {pointsRedeemed > 0 && (
                    <div className="flex items-center justify-between text-[13px] text-emerald-700">
                      <span>{t.pointsDiscountLabel}</span>
                      <span className="tabular-nums">-฿{pointsRedeemed}</span>
                    </div>
                  )}
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
                    <span className="font-display text-[20px] text-ink tabular-nums"><span className="baht">฿</span>{amount}</span>
                  </div>
                  {hasLineId && pointsPreview > 0 && !belowMinOrder && (
                    <div className="text-right">
                      <p className="text-[12px] text-[#b06d2b]">{t.pointsPreview(pointsPreview)}</p>
                      <p className="text-[10px] text-[#b06d2b]/65">{t.pointsRule}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Blocks checkout below the minimum regardless of method —
                  pickup is not exempt, per the shop's explicit correction.
                  No method-switch action here (unlike an earlier version of
                  this notice): switching wouldn't unblock anything, since
                  neither method is checkout-eligible below the minimum. */}
              {belowMinOrder && (
                <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-[13px] text-amber-800 leading-relaxed">
                  <p>{t.minOrderNotice(minDeliveryOrder - itemsSubtotal, minDeliveryOrder)}</p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {/* Contact/address is already resolved by the earlier
                    `contact` step (right after login) — this is a read-only
                    recap, not another form. "แก้ไข" jumps back there with
                    the plain form open, e.g. their address changed. */}
                <div className="rounded-2xl bg-white border border-black/10 shadow-sm p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] tracking-[0.1em] uppercase text-black/45">
                      <User size={13} strokeWidth={2} className="text-[#8c682c]" />
                      {t.confirmInfoTitle}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingInfo(true)
                        setContactMode('form')
                        setStep('contact')
                      }}
                      className="text-[12px] font-medium text-[#4a3520] underline underline-offset-2"
                    >
                      {t.editInfo}
                    </button>
                  </div>
                  <div className="flex flex-col gap-1 text-[13px] text-ink">
                    <p className="font-medium">{form.name}</p>
                    <p className="text-black/60 tabular-nums">{form.phone}</p>
                    {form.address.trim() && <p className="text-black/60 whitespace-pre-line">{form.address}</p>}
                  </div>
                </div>
                <label className="block">
                  <span className="flex items-center gap-1.5 text-[11px] tracking-[0.1em] uppercase text-black/45">
                    <StickyNote size={13} strokeWidth={2} className="text-[#8c682c]" />
                    {t.note}
                  </span>
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
        {submitting && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center bg-[#f5f2ee]/95 px-6 backdrop-blur-sm" role="status" aria-live="assertive" aria-busy="true">
            <div className="w-full max-w-[340px] rounded-[28px] border border-[#c9a96e]/30 bg-[#fffdf8] px-7 py-9 text-center shadow-[0_24px_80px_rgba(74,53,32,0.16)]">
              {/* Animated processing artwork supplied by the shop. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/uploads/icons8-delivery-time-96.gif" alt="" className="mx-auto h-24 w-24 object-contain" />
              <h2 className="mt-5 font-display text-[25px] font-normal leading-tight text-[#3a2818]">{t.processingTitle}</h2>
              <p className="mt-3 text-[13px] font-light leading-[1.8] text-[#6d655d]">{t.processingMessage}</p>
              <div className="mt-6 flex justify-center gap-2" aria-hidden="true">
                {[0, 1, 2].map((dot) => (
                  <span key={dot} className="h-2 w-2 rounded-full bg-[#b18a54]" style={{ animation: `orderSparkle 1.4s ease-in-out ${dot * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}
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
                <span className="font-display text-[26px] text-ink tabular-nums leading-none"><span className="baht">฿</span>{amount}</span>
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
  // The screen answers three questions in order — did it go through, what is
  // my reference, and what do I do now — so it is grouped that way rather than
  // as one undifferentiated stack of same-width boxes. Status blocks are
  // deliberately left-aligned with a badge instead of filled full-width bars:
  // a bar that looks exactly like the primary button gets tapped, and nothing
  // happens.
  const paid = slipStatus === 'ok'
  const fulfilment = completed?.deliveryMethod === 'pickup' ? t.pickupInstruction : t.waitingDelivery

  return (
    <div className="min-h-[100dvh] bg-[#f5f2ee] flex items-start justify-center px-5 py-8">
      <div className={`w-full ${CONTENT_WIDTH} flex flex-col gap-3`}>
        <div className="w-full rounded-2xl bg-[#3a2818] px-5 py-6 text-center text-white">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white"
            style={{ animation: 'orderBadgePop 0.6s cubic-bezier(.34,1.56,.64,1) both' }}
          >
            <CheckCircle2 size={38} strokeWidth={2.2} className="text-[#3a2818]" />
          </div>
          <h1 className="mt-4 font-display text-[26px] leading-tight">{t.shopReceivedTitle}</h1>
          <p className="mt-1.5 text-[15px] font-light text-white/70">{t.shopReceivedWait}</p>
        </div>

        {/* Order number and total belong together — they are the two things a
            customer reads back to staff. Splitting the label off its value also
            stops the ฿ sign colliding with the digits. */}
        <div className="w-full rounded-2xl border border-black/[0.07] bg-white/60 px-5 py-4">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <span className="block text-[10.5px] tracking-[0.12em] uppercase text-black/45">{t.orderNo}</span>
              <p className="mt-0.5 font-display text-[22px] leading-none text-ink">{orderNo}</p>
            </div>
            {completed && (
              <div className="shrink-0 text-right">
                <span className="block text-[10.5px] tracking-[0.12em] uppercase text-black/45">{t.total}</span>
                <p className="mt-0.5 font-display text-[22px] leading-none text-ink tabular-nums"><span className="baht">฿</span>{completed.total}</p>
              </div>
            )}
          </div>
          {sentToLine && (
            <p className="mt-3.5 flex items-center gap-1.5 border-t border-black/[0.06] pt-3 text-[12px] text-[#4a3520]/80">
              <Check size={13} strokeWidth={3} className="shrink-0" />
              {t.sentToShop}
            </p>
          )}
        </div>

        {paid ? (
          <>
            <div className="flex items-center gap-2.5 rounded-xl border border-[#3a2818]/15 bg-[#3a2818]/[0.06] px-4 py-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3a2818] text-white">
                <Check size={14} strokeWidth={3} />
              </span>
              <span className="text-[13.5px] font-semibold text-[#3a2818]">{t.slipVerified}</span>
              {/* Same number shown as the Summary preview — fixed once at order
                  creation (pages/api/orders.js), just "banked" now that payment
                  is actually confirmed. Only shown here, not before, so
                  "earned" means the payment really went through. */}
              {completed?.pointsEarned > 0 && (
                <span className="ml-auto shrink-0 text-[12.5px] font-semibold text-[#8f5520] tabular-nums">
                  {t.pointsEarnedBanner(completed.pointsEarned)}
                </span>
              )}
            </div>
            <div className="w-full rounded-2xl border border-black/[0.06] bg-white/60 px-3 pb-3 pt-4">
              <OrderJourney method={completed?.deliveryMethod} status={completed?.status} t={t} />
              <p className="mt-3 border-t border-black/[0.06] pt-3 text-[12.5px] leading-[1.8] text-black/55">
                {fulfilment}
              </p>
            </div>
          </>
        ) : slipStatus === 'stored' ? (
          <>
            <div className="flex items-center gap-2.5 rounded-xl border border-[#3a2818]/15 bg-[#3a2818]/[0.06] px-4 py-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3a2818] text-white">
                <Check size={14} strokeWidth={3} />
              </span>
              <span className="text-[13.5px] font-semibold text-[#3a2818]">{t.slipUploaded}</span>
            </div>
            <p className="w-full rounded-xl bg-black/[0.03] px-4 py-3.5 text-[13px] leading-[1.85] text-black/60">
              {fulfilment}
            </p>
          </>
        ) : (
          <>
            {/* Payment is the one thing still owed, so it leads — the
                fulfilment note is context underneath it, not competition. */}
            <div className="w-full rounded-2xl border border-[#4a3520]/15 bg-[#faf3e4] px-4 py-4">
              <span className="block text-[10.5px] tracking-[0.12em] uppercase text-[#8a6a3a]">{t.nextStepLabel}</span>
              <p className="mt-1 text-[13.5px] leading-[1.8] text-[#6b5326]">{t.payNow}</p>
              <label className={`mt-3.5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#4a3520] py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#3a2818] ${slipStatus === 'verifying' ? 'pointer-events-none opacity-60' : ''}`}>
                {slipStatus === 'verifying' ? t.verifyingSlip : slipStatus === 'fail' ? t.slipRetry : t.attachSlip}
                <input type="file" accept="image/*" className="hidden" onChange={handleSlipFile} disabled={slipStatus === 'verifying'} />
              </label>
              {slipVerify && <p className="mt-1.5 text-center text-[11px] text-[#8a6a3a]">{t.verifyHint}</p>}
              {/* whitespace-pre-line so the \n in a slip error (added for LINE's
                  Flex auto-wrap, which breaks Thai mid-word without them) also
                  reads as real line breaks here instead of collapsing. */}
              {slipStatus === 'fail' && slipError && (
                <p className="mt-2 whitespace-pre-line text-center text-[12px] leading-[1.7] text-red-600">{slipError}</p>
              )}
            </div>
            <p className="w-full rounded-xl bg-black/[0.03] px-4 py-3.5 text-[13px] leading-[1.85] text-black/60">
              {fulfilment}
            </p>
          </>
        )}

        <button onClick={resetFlow} className="mt-1 w-full rounded-xl py-3 text-[13px] font-semibold text-black/60 transition-colors hover:bg-black/[0.04] hover:text-ink">
          {t.done}
        </button>
      </div>
    </div>
  )
}
