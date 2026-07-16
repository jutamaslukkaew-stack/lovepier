// Guided 6-step order flow for /delivery: welcome → distance check → menu →
// order summary → confirm & pay → success. Replaces the old DeliveryGate
// (auto-gate + separate CartDrawer sheet) with a single linear wizard so the
// out-of-radius warning and the payment confirmation both require an
// explicit, un-skippable acknowledgement instead of a bottom-sheet a
// customer could dismiss without reading.
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import PageHero from '../PageHero'
import { useLanguage } from '../../lib/language'
import { useCart } from '../../lib/cart'
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
const LINE_OA_ID = process.env.NEXT_PUBLIC_LINE_OA_ID || '@lovepier.cafe'

function makePaymentRef() {
  return 'LP' + Date.now().toString(36).toUpperCase()
}

const STEP_ORDER = ['welcome', 'distance', 'menu', 'summary', 'payment', 'success']

const COPY = {
  th: {
    steps: ['ต้อนรับ', 'ระยะทาง', 'เมนู', 'สรุป', 'ชำระเงิน', 'สำเร็จ'],
    back: 'ย้อนกลับ',
    next: 'ถัดไป',
    // step 1 — welcome
    welcomeSubtitle: 'อาหารและเครื่องดื่มริมทะเล สั่งง่าย ส่งตรงถึงคุณ',
    startOrder: 'เริ่มสั่งอาหาร',
    loggingIn: 'กำลังเข้าสู่ระบบ LINE...',
    loginFailed: 'เข้าสู่ระบบ LINE ไม่สำเร็จ กรุณาลองใหม่',
    retry: 'ลองอีกครั้ง',
    // step 2 — distance
    distanceTitle: 'ตรวจสอบระยะทางจัดส่ง',
    requestLocation: '📍 ขอตำแหน่งปัจจุบัน',
    locating: 'กำลังค้นหาตำแหน่งของคุณ...',
    calculating: 'กำลังคำนวณระยะทาง...',
    withinRadius: (km) => `พบตำแหน่งแล้ว — ห่างจากร้าน ${km} กม. ✅`,
    inServiceArea: 'อยู่ในพื้นที่บริการของร้าน ไปเลือกเมนูต่อได้เลย',
    outOfRadius: (km, r) => `⚠️ ห่างจากร้าน ${km} กม. — นอกระยะจัดส่ง ${r} กม.`,
    outOfRadiusNote: 'คุณยังสั่งอาหารได้ตามปกติ แต่ร้านจัดส่งได้เฉพาะในรัศมีที่กำหนด — กรุณาเรียกรถแมสเซนเจอร์ (เช่น Grab, Lalamove) มารับอาหารที่ร้านด้วยตนเอง และรับผิดชอบค่าส่งส่วนนี้เอง',
    ackCheckbox: 'ฉันอ่านและเข้าใจเงื่อนไขข้างต้นแล้ว',
    gpsDenied: 'คุณไม่ได้อนุญาตให้เข้าถึงตำแหน่ง',
    gpsTimeout: 'ค้นหาตำแหน่งไม่สำเร็จ (หมดเวลา)',
    gpsUnsupported: 'เบราว์เซอร์นี้ไม่รองรับการหาตำแหน่ง',
    testModeToggle: '🧪 โหมดทดสอบระยะทาง',
    simulateWithin: 'จำลอง: อยู่ในรัศมี',
    simulateOutside: 'จำลอง: นอกรัศมี',
    // step 3 — menu
    menuHint: 'เลือกเมนู แตะ + เพื่อเพิ่มจำนวน แล้วกดตะกร้าเพื่อไปต่อ',
    // step 4 — summary
    summaryTitle: 'สรุปออเดอร์',
    emptyCart: 'ยังไม่มีรายการในตะกร้า',
    backToMenu: 'กลับไปเลือกเมนู',
    itemsSubtotalLabel: 'ค่าอาหาร',
    deliveryFeeLabel: 'ค่าจัดส่ง',
    selfArranged: 'ลูกค้าจัดการเอง',
    total: 'รวมทั้งหมด',
    name: 'ชื่อผู้รับ',
    phone: 'เบอร์โทร',
    address: 'ที่อยู่จัดส่ง',
    addressOptionalNote: '(ไม่บังคับ — คุณเรียกแมสเซนเจอร์มารับเองที่ร้าน)',
    note: 'หมายเหตุ (ไม่บังคับ)',
    fillRequired: 'กรุณากรอกชื่อและเบอร์โทร',
    fillAddress: 'กรุณากรอกที่อยู่จัดส่ง',
    // step 5 — payment
    paymentTitle: 'ยืนยันและชำระเงิน',
    paymentMethod: 'ช่องทางชำระเงิน',
    promptpayLabel: 'PromptPay QR',
    payHint: 'สแกน QR ด้วยแอปธนาคาร แล้วติ๊กยืนยันด้านล่าง',
    amount: 'ยอดชำระ',
    noPromptpay: 'ยังไม่ได้ตั้งค่าพร้อมเพย์ร้าน กรุณาแจ้งร้านทาง LINE',
    confirmCheckbox: 'ฉันตรวจสอบรายการและยอดเงินถูกต้องแล้ว ยืนยันสั่งซื้อ',
    submit: 'สั่งซื้อและชำระเงิน',
    submitting: 'กำลังส่ง...',
    // step 6 — success
    successTitle: 'สั่งซื้อสำเร็จ! 🎉',
    orderNo: 'เลขที่ออเดอร์',
    sentToShop: 'ส่งออเดอร์ให้ร้านทาง LINE แล้ว',
    waitingDelivery: 'ร้านกำลังเตรียมอาหารและจะจัดส่งให้ภายในรัศมีบริการ กรุณาแนบสลิปการโอนเพื่อยืนยันการชำระเงิน',
    pickupInstruction: 'กรุณาเรียกรถแมสเซนเจอร์ (เช่น Grab, Lalamove) มารับอาหารที่ร้าน Love Pier Beach Cafe เมื่อร้านแจ้งว่าอาหารพร้อม และกรุณาแนบสลิปการโอนเพื่อยืนยันการชำระเงิน',
    attachSlip: '📎 แนบสลิปเพื่อยืนยันการชำระเงิน',
    verifyingSlip: 'กำลังตรวจสอบสลิป...',
    slipVerified: 'ยืนยันการชำระเงินแล้ว ✅',
    slipUploaded: 'แนบสลิปแล้ว รอร้านตรวจสอบ ✅',
    slipRetry: 'แนบสลิปใหม่อีกครั้ง',
    verifyHint: 'ระบบตรวจสลิปอัตโนมัติ (จับสลิปปลอมได้)',
    sendSlip: '💬 ส่งสลิปทาง LINE',
    done: 'เสร็จสิ้น — สั่งใหม่',
  },
  en: {
    steps: ['Welcome', 'Distance', 'Menu', 'Summary', 'Payment', 'Done'],
    back: 'Back',
    next: 'Next',
    welcomeSubtitle: 'Beachside food and drinks, delivered to you.',
    startOrder: 'Start ordering',
    loggingIn: 'Logging in with LINE...',
    loginFailed: 'LINE login failed. Please try again.',
    retry: 'Retry',
    distanceTitle: 'Delivery distance check',
    requestLocation: '📍 Request current location',
    locating: 'Finding your location...',
    calculating: 'Calculating distance...',
    withinRadius: (km) => `Location found — ${km} km from the shop ✅`,
    inServiceArea: "You're inside our delivery area — go ahead and pick a menu.",
    outOfRadius: (km, r) => `⚠️ ${km} km from the shop — outside the ${r} km delivery area`,
    outOfRadiusNote: "You can still place an order, but we only deliver within our radius — please arrange your own courier (e.g. Grab, Lalamove) to pick up the food from the shop, and cover that delivery cost yourself.",
    ackCheckbox: 'I have read and understood the above',
    gpsDenied: 'Location permission was denied',
    gpsTimeout: 'Locating timed out',
    gpsUnsupported: "This browser doesn't support location",
    testModeToggle: '🧪 Distance test mode',
    simulateWithin: 'Simulate: within radius',
    simulateOutside: 'Simulate: outside radius',
    menuHint: 'Pick items, tap + to add, then tap the cart to continue',
    summaryTitle: 'Order summary',
    emptyCart: 'Your cart is empty',
    backToMenu: 'Back to menu',
    itemsSubtotalLabel: 'Food total',
    deliveryFeeLabel: 'Delivery fee',
    selfArranged: 'Arranged by customer',
    total: 'Total',
    name: 'Recipient name',
    phone: 'Phone',
    address: 'Delivery address',
    addressOptionalNote: "(optional — you're arranging your own courier pickup)",
    note: 'Note (optional)',
    fillRequired: 'Please enter name and phone',
    fillAddress: 'Please enter a delivery address',
    paymentTitle: 'Confirm & pay',
    paymentMethod: 'Payment method',
    promptpayLabel: 'PromptPay QR',
    payHint: 'Scan the QR with your banking app, then tick confirm below',
    amount: 'Amount',
    noPromptpay: 'Shop PromptPay not configured — please contact us on LINE',
    confirmCheckbox: "I've checked the order and total — confirm purchase",
    submit: 'Place order & pay',
    submitting: 'Sending...',
    successTitle: 'Order placed! 🎉',
    orderNo: 'Order no.',
    sentToShop: 'Order sent to the shop on LINE',
    waitingDelivery: "We're preparing your order and will deliver within our service radius. Please attach your payment slip to confirm.",
    pickupInstruction: 'Please arrange your own courier (e.g. Grab, Lalamove) to pick up the food from Love Pier Beach Cafe once the shop confirms it is ready — and please attach your payment slip to confirm.',
    attachSlip: '📎 Attach slip to confirm payment',
    verifyingSlip: 'Verifying slip...',
    slipVerified: 'Payment verified ✅',
    slipUploaded: 'Slip attached — pending review ✅',
    slipRetry: 'Attach a different slip',
    verifyHint: 'Automatic slip check (detects fakes)',
    sendSlip: '💬 Send slip via LINE',
    done: 'Done — order again',
  },
  zh: {
    steps: ['欢迎', '距离', '菜单', '摘要', '付款', '完成'],
    back: '返回',
    next: '下一步',
    welcomeSubtitle: '海边美食与饮品，直接为您送达。',
    startOrder: '开始点餐',
    loggingIn: '正在使用 LINE 登录...',
    loginFailed: 'LINE 登录失败，请重试',
    retry: '重试',
    distanceTitle: '配送距离检查',
    requestLocation: '📍 获取当前位置',
    locating: '正在定位您的位置...',
    calculating: '正在计算距离...',
    withinRadius: (km) => `已定位 — 距离门店 ${km} 公里 ✅`,
    inServiceArea: '您在配送范围内，可以继续选择菜单。',
    outOfRadius: (km, r) => `⚠️ 距离门店 ${km} 公里 — 超出 ${r} 公里配送范围`,
    outOfRadiusNote: '您仍然可以下单，但本店仅在配送范围内配送 — 请自行安排快递员（如 Grab、Lalamove）到店取餐，配送费用由您自行承担。',
    ackCheckbox: '我已阅读并理解以上内容',
    gpsDenied: '您未允许访问位置信息',
    gpsTimeout: '定位超时',
    gpsUnsupported: '此浏览器不支持定位',
    testModeToggle: '🧪 距离测试模式',
    simulateWithin: '模拟：范围内',
    simulateOutside: '模拟：范围外',
    menuHint: '选择菜品，点击 + 添加，然后点击购物车继续',
    summaryTitle: '订单摘要',
    emptyCart: '购物车是空的',
    backToMenu: '返回菜单',
    itemsSubtotalLabel: '餐点小计',
    deliveryFeeLabel: '配送费',
    selfArranged: '顾客自行安排',
    total: '总计',
    name: '收件人姓名',
    phone: '电话',
    address: '配送地址',
    addressOptionalNote: '（选填 — 您将自行安排快递到店取餐）',
    note: '备注（选填）',
    fillRequired: '请填写姓名和电话',
    fillAddress: '请填写配送地址',
    paymentTitle: '确认并付款',
    paymentMethod: '付款方式',
    promptpayLabel: 'PromptPay 二维码',
    payHint: '用银行 App 扫描二维码，然后在下方勾选确认',
    amount: '金额',
    noPromptpay: '商店 PromptPay 未设置 — 请通过 LINE 联系我们',
    confirmCheckbox: '我已核对订单和金额，确认下单',
    submit: '下单并付款',
    submitting: '发送中...',
    successTitle: '下单成功！🎉',
    orderNo: '订单号',
    sentToShop: '订单已通过 LINE 发送给店家',
    waitingDelivery: '我们正在备餐，将在配送范围内为您送达。请附上付款凭证以确认。',
    pickupInstruction: '请在店家通知餐点备好后，自行安排快递员（如 Grab、Lalamove）到 Love Pier Beach Cafe 取餐 — 并请附上付款凭证以确认。',
    attachSlip: '📎 上传凭证以确认付款',
    verifyingSlip: '正在核验凭证...',
    slipVerified: '付款已确认 ✅',
    slipUploaded: '凭证已上传 — 等待店家核对 ✅',
    slipRetry: '重新上传凭证',
    verifyHint: '自动核验凭证（可识别伪造）',
    sendSlip: '💬 通过 LINE 发送凭证',
    done: '完成 — 再次下单',
  },
}

const inputCls =
  'w-full rounded-xl border border-black/15 bg-[#faf8f5] px-3.5 py-2.5 text-[14px] text-ink placeholder-black/30 focus:border-[#4a3520] focus:outline-none focus:ring-1 focus:ring-[#4a3520]/30 transition-colors'

function StepHeader({ t, step, onBack }) {
  const idx = STEP_ORDER.indexOf(step)
  return (
    <div className="sticky top-0 z-[60] bg-[#f5f2ee]/95 backdrop-blur-sm border-b border-black/10 px-4 py-3">
      <div className="max-w-lg mx-auto flex items-center gap-3">
        {onBack ? (
          <button onClick={onBack} className="text-black/40 hover:text-black text-lg leading-none shrink-0" aria-label={t.back}>‹</button>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <div className="flex-1 flex items-center gap-1.5">
          {STEP_ORDER.map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= idx ? 'bg-[#4a3520]' : 'bg-black/10'}`} />
          ))}
        </div>
        <span className="text-[11px] tracking-wide text-black/45 shrink-0">{t.steps[idx]}</span>
      </div>
    </div>
  )
}

export default function OrderFlow({ dbMenuData, dbPromotions, heroTitle }) {
  const { lang } = useLanguage()
  const t = COPY[lang] || COPY.en
  const { items, addItem, removeItem, clearCart, totalQty, totalPrice } = useCart()

  const [step, setStep] = useState('welcome')

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

  // step 4 — summary / contact
  const [form, setForm] = useState({ name: '', phone: '', address: '', note: '' })
  const [summaryError, setSummaryError] = useState('')

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

  const withinRadius = distanceResult?.withinRadius !== false // null/unknown treated as "shop delivers"
  const itemsSubtotal = Math.round(totalPrice)
  const deliveryFee = withinRadius ? (distanceResult?.deliveryFee || 0) : 0
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

  // ── Step 3: menu — hand the floating cart button to advance the wizard ──
  function goToSummaryFromMenu() {
    setStep('summary')
  }

  // ── Step 4 → 5: build the PromptPay QR for the current total ────────────
  async function goToPayment() {
    setSummaryError('')
    if (!form.name.trim() || !form.phone.trim()) {
      setSummaryError(t.fillRequired)
      return
    }
    if (withinRadius && !form.address.trim()) {
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
          lineUserId: profile?.userId || '',
          lineDisplayName: profile?.displayName || '',
          items: items.map((i) => ({ id: i.id, name: i.name, price: parseFloat(i.price) || 0, qty: i.qty })),
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
        items: items.map((i) => ({ name: i.name, price: parseFloat(i.price) || 0, qty: i.qty })),
        total: finalTotal,
        deliveryFee: finalDeliveryFee,
        distanceKm: distanceResult?.distanceKm ?? null,
      })
      const sent = await sendMessagesToChat([flex])
      setSentToLine(sent)

      setCompleted({
        lines: items.map((i) => `• ${i.name} x${i.qty}`).join('\n'),
        total: finalTotal,
        deliveryFee: finalDeliveryFee,
        distanceKm: distanceResult?.distanceKm ?? null,
        withinRadius,
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
    const distanceLine = completed?.distanceKm != null ? `\n📍 ${completed.distanceKm} กม.` : ''
    const feeLine = completed?.deliveryFee ? `\n${t.deliveryFeeLabel} ฿${completed.deliveryFee}` : ''
    const msg = encodeURIComponent(
      `📦 ${t.orderNo} ${orderNo}${refLine}\n${lines}${feeLine}\n\n${t.total} ฿${total}${distanceLine}\n\n(แนบสลิปการโอนในแชทนี้ได้เลยครับ)`
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
    setDistanceResult(null)
    setLocatePhase('idle')
    setAckOutOfRadius(false)
    setQrDataUrl('')
    setPaymentRef('')
    setConfirmPay(false)
  }

  // ═══════════════════════════════════════════════════════════════════
  // Step 1 — Welcome
  // ═══════════════════════════════════════════════════════════════════
  if (step === 'welcome') {
    return (
      <PageHero
        title={heroTitle}
        subtitle={t.welcomeSubtitle}
        cta={
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleStart}
              disabled={loginPhase === 'logging-in'}
              className="px-8 py-3.5 rounded-full bg-[#4a3520] text-white font-semibold text-[14px] tracking-wide hover:bg-[#3a2818] transition-colors disabled:opacity-60"
            >
              {loginPhase === 'logging-in' ? t.loggingIn : t.startOrder}
            </button>
            {loginPhase === 'failed' && (
              <p className="text-white/90 text-[12px] flex items-center gap-2">
                ⚠️ {t.loginFailed}
                <button onClick={handleStart} className="underline">{t.retry}</button>
              </p>
            )}
          </div>
        }
      />
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
      locatePhase === 'calculating' ? t.calculating :
      locatePhase === 'found' ? (
        distanceResult?.distanceKm == null
          ? (lang === 'th' ? 'ไม่ทราบตำแหน่งของคุณ — ยังสั่งอาหารได้ตามปกติ' : "Couldn't determine your location")
          : withinRadius ? t.withinRadius(distanceResult.distanceKm)
          : t.outOfRadius(distanceResult.distanceKm, distanceResult.radiusKm)
      ) : ''

    const tone = locatePhase === 'found' && distanceResult?.distanceKm != null ? (withinRadius ? 'success' : 'warning') : 'neutral'

    return (
      <div className="min-h-[70vh] flex flex-col">
        <StepHeader t={t} step={step} onBack={() => setStep('welcome')} />
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 bg-[#f5f2ee]">
          <div className="w-full max-w-sm">
            <h1 className="text-[13px] font-semibold tracking-wide text-[#4a3520]/50 text-center uppercase mb-1">
              {t.distanceTitle}
            </h1>

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

            {locatePhase !== 'idle' && locatePhase !== 'gps-error' && (
              <LocatingAnimation
                phase={locatePhase === 'found' ? 'found' : locatePhase === 'calculating' ? 'calculating' : 'locating'}
                statusText={statusText}
                tone={tone}
              />
            )}

            {locatePhase === 'gps-error' && (
              <div className="flex flex-col gap-2 py-8">
                <p className="text-[13px] text-red-600 text-center mb-1">⚠️ {gpsErrorText}</p>
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
              <p className="text-[13px] text-emerald-700 text-center -mt-4 mb-2">{t.inServiceArea}</p>
            )}

            {locatePhase === 'found' && !withinRadius && (
              <>
                <div className="mb-3 -mt-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-[13px] text-amber-800 leading-relaxed text-center">
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

            {locatePhase === 'found' && (
              <button
                onClick={() => setStep('menu')}
                disabled={!distanceContinueEnabled}
                className="w-full py-3.5 rounded-xl bg-[#4a3520] text-white font-semibold text-[14px] tracking-wide hover:bg-[#3a2818] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t.next}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════
  // Step 3 — Menu
  // ═══════════════════════════════════════════════════════════════════
  if (step === 'menu') {
    return (
      <div className="min-h-[70vh]">
        <StepHeader t={t} step={step} onBack={() => setStep('distance')} />
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
  // Step 4 — Order summary
  // ═══════════════════════════════════════════════════════════════════
  if (step === 'summary') {
    return (
      <div className="min-h-[70vh] flex flex-col bg-[#f5f2ee]">
        <StepHeader t={t} step={step} onBack={() => setStep('menu')} />
        <div className="flex-1 max-w-lg w-full mx-auto px-5 py-5 flex flex-col gap-4">
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
              <div className="rounded-2xl bg-white border border-black/10 shadow-sm p-4 flex flex-col gap-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
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
                ))}

                <div className="border-t border-black/10 pt-3 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[13px] text-black/60">
                    <span>{t.itemsSubtotalLabel}</span>
                    <span className="tabular-nums">฿{itemsSubtotal}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-black/60">{t.deliveryFeeLabel}</span>
                    {withinRadius ? (
                      <span className="tabular-nums text-black/60">฿{deliveryFee}</span>
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

              <div className="flex flex-col gap-3">
                <label className="block">
                  <span className="text-[11px] tracking-[0.1em] uppercase text-black/45">{t.name}</span>
                  <input className={`mt-1 ${inputCls}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-[11px] tracking-[0.1em] uppercase text-black/45">{t.phone}</span>
                  <input className={`mt-1 ${inputCls}`} inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-[11px] tracking-[0.1em] uppercase text-black/45">
                    {t.address}{!withinRadius && <span className="normal-case tracking-normal text-black/35"> {t.addressOptionalNote}</span>}
                  </span>
                  <textarea rows={2} className={`mt-1 resize-none ${inputCls}`} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-[11px] tracking-[0.1em] uppercase text-black/45">{t.note}</span>
                  <input className={`mt-1 ${inputCls}`} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                </label>
                {summaryError && <p className="text-[12px] text-red-600">{summaryError}</p>}
              </div>

              <button onClick={goToPayment} className="w-full py-3.5 rounded-xl bg-[#4a3520] text-white font-semibold text-[14px] tracking-wide hover:bg-[#3a2818] transition-colors flex items-center justify-between px-5">
                <span>{t.next}</span>
                <span className="tabular-nums">฿{amount}</span>
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════
  // Step 5 — Confirm & pay
  // ═══════════════════════════════════════════════════════════════════
  if (step === 'payment') {
    const canSubmit = confirmPay && !submitting && (!PROMPTPAY_ID || amount <= 0 || Boolean(qrDataUrl))
    return (
      <div className="min-h-[70vh] flex flex-col bg-[#f5f2ee]">
        <StepHeader t={t} step={step} onBack={() => setStep('summary')} />
        <div className="flex-1 max-w-lg w-full mx-auto px-5 py-5 flex flex-col gap-4">
          <h1 className="font-display text-[22px] text-ink">{t.paymentTitle}</h1>

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
                    <img src={qrDataUrl} alt="PromptPay QR" className="w-56 h-56" />
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
                {withinRadius ? <span className="tabular-nums text-black/60">฿{deliveryFee}</span> : <span className="text-amber-700 font-medium">{t.selfArranged}</span>}
              </div>
              <div className="flex items-baseline justify-between pt-1.5 mt-1 border-t border-black/10">
                <span className="text-[11px] tracking-[0.12em] uppercase text-black/50">{t.amount}</span>
                <span className="font-display text-[26px] text-ink tabular-nums leading-none">฿{amount}</span>
              </div>
            </div>
          </div>

          <label className="flex items-start gap-2 px-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmPay}
              onChange={(e) => setConfirmPay(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#4a3520] shrink-0"
            />
            <span className="text-[13px] text-[#4a3520] leading-snug">{t.confirmCheckbox}</span>
          </label>

          {submitError && <p className="text-[12px] text-red-600">{submitError}</p>}

          <button
            onClick={submitOrder}
            disabled={!canSubmit}
            className="w-full py-3.5 rounded-xl bg-[#2d6a1f] text-white font-semibold text-[14px] tracking-wide hover:bg-[#245517] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? t.submitting : t.submit}
          </button>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════
  // Step 6 — Success
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-[70vh] bg-[#f5f2ee] flex items-start justify-center px-5 py-10">
      <div className="w-full max-w-sm flex flex-col items-center text-center gap-3">
        <div className="w-16 h-16 rounded-full bg-[#f0f7ef] flex items-center justify-center text-3xl">🎉</div>
        <h1 className="font-display text-[22px] text-ink">{t.successTitle}</h1>
        <div>
          <span className="text-[11px] tracking-[0.12em] uppercase text-black/45">{t.orderNo}</span>
          <p className="font-display text-[24px] text-ink tracking-wide">{orderNo}</p>
          {completed && (
            <p className="text-[15px] font-semibold text-ink tabular-nums mt-0.5">{t.total} ฿{completed.total}</p>
          )}
        </div>

        {sentToLine && (
          <div className="flex items-center gap-2 rounded-xl bg-[#f0f7ef] border border-[#2d6a1f]/20 px-3.5 py-2.5 text-[13px] text-[#2d6a1f]">
            <span>✅</span><span>{t.sentToShop}</span>
          </div>
        )}

        <p className={`text-[13px] leading-relaxed rounded-xl px-3.5 py-2.5 ${completed?.withinRadius === false ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-black/[0.03] text-black/60'}`}>
          {completed?.withinRadius === false ? t.pickupInstruction : t.waitingDelivery}
        </p>

        {slipStatus === 'ok' ? (
          <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#2d6a1f] text-white px-3.5 py-3 text-[14px] font-semibold">
            <span>✅</span><span>{t.slipVerified}</span>
          </div>
        ) : slipStatus === 'stored' ? (
          <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#2d6a1f] text-white px-3.5 py-3 text-[14px] font-semibold">
            <span>✅</span><span>{t.slipUploaded}</span>
          </div>
        ) : (
          <div className="w-full">
            <label className={`w-full py-3.5 rounded-xl bg-[#4a3520] text-white font-semibold text-[14px] flex items-center justify-center gap-2 cursor-pointer hover:bg-[#3a2818] transition ${slipStatus === 'verifying' ? 'opacity-60 pointer-events-none' : ''}`}>
              {slipStatus === 'verifying' ? t.verifyingSlip : slipStatus === 'fail' ? t.slipRetry : t.attachSlip}
              <input type="file" accept="image/*" className="hidden" onChange={handleSlipFile} disabled={slipStatus === 'verifying'} />
            </label>
            <p className="text-[11px] text-black/40 text-center mt-1.5">{slipVerify ? t.verifyHint : ''}</p>
            {slipStatus === 'fail' && slipError && <p className="text-[12px] text-red-600 text-center mt-1">⚠️ {slipError}</p>}
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
