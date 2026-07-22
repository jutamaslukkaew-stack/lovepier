import { useEffect, useRef, useState } from 'react'
import { useCart } from '../lib/cart'
import { useLanguage } from '../lib/language'
import { buildPaymentPayload } from '../lib/promptpay'
import { buildOrderFlex } from '../lib/orderFlex'
import {
  isLiffConfigured,
  loginAndGetProfile,
  getProfileIfLoggedIn,
  sendMessagesToChat,
} from '../lib/liff'
import { getDeliverySession } from '../lib/deliverySession'

const PROMPTPAY_ID = process.env.NEXT_PUBLIC_PROMPTPAY_ID || ''
const PROMPTPAY_TYPE = process.env.NEXT_PUBLIC_PROMPTPAY_TYPE || '' // 'biller' | ''
// Fixed Ref1/Ref2/Terminal Label for the bill-payment QR. This biller's SCB
// Mae Manee setup rejects any Ref1 that isn't the exact registered value
// ("เลขที่อ้างอิงไม่ถูกต้อง") — confirmed against the biller's own printed
// static QR sticker. Don't feed a per-order/dynamic value in here.
const PROMPTPAY_REF = process.env.NEXT_PUBLIC_PROMPTPAY_REF || ''
const PROMPTPAY_REF2 = process.env.NEXT_PUBLIC_PROMPTPAY_REF2 || ''
const PROMPTPAY_TERMINAL_LABEL = process.env.NEXT_PUBLIC_PROMPTPAY_TERMINAL_LABEL || ''
const LINE_OA_ID = process.env.NEXT_PUBLIC_LINE_OA_ID || '@lovepier.cafe'

// Internal reference saved with the order so the shop can track it in /admin.
// (Not embedded in the payment QR — see PROMPTPAY_REF above.)
function makePaymentRef() {
  return Date.now().toString().slice(-10)
}

const COPY = {
  th: {
    title: 'รายการสั่ง',
    empty: 'ยังไม่มีรายการ',
    total: 'รวม',
    clear: 'ล้างรายการ',
    checkout: 'ดำเนินการต่อ',
    currency: '฿',
    back: 'ย้อนกลับ',
    // info step
    infoTitle: 'ข้อมูลจัดส่ง',
    lineLogin: 'เข้าสู่ระบบด้วย LINE',
    lineHi: 'สวัสดี',
    name: 'ชื่อผู้รับ',
    phone: 'เบอร์โทร',
    address: 'ที่อยู่จัดส่ง',
    note: 'หมายเหตุ (ไม่บังคับ)',
    useLocation: 'เช็คระยะจัดส่ง',
    locating: 'กำลังหาตำแหน่ง...',
    distanceLabel: 'ระยะจัดส่ง',
    deliveryFeeLabel: 'ค่าจัดส่ง',
    itemsSubtotalLabel: 'ค่าอาหาร',
    outOfArea: (r) => `นอกพื้นที่จัดส่ง (เกิน ${r} กม.) — สั่งได้ แต่ร้านอาจคิดค่าส่งเพิ่ม`,
    locationDenied: 'ไม่ได้ตำแหน่ง — สั่งต่อได้ ร้านจะเช็คระยะให้เอง',
    toPayment: 'ไปชำระเงิน',
    // payment step
    payTitle: 'สแกนจ่ายด้วย PromptPay',
    payHint: 'สแกน QR ด้วยแอปธนาคาร แล้วกดยืนยันด้านล่าง',
    amount: 'ยอดชำระ',
    noPromptpay: 'ยังไม่ได้ตั้งค่าพร้อมเพย์ร้าน กรุณาแจ้งร้านทาง LINE',
    confirm: 'ยืนยันสั่งซื้อ',
    submitting: 'กำลังส่ง...',
    // success step
    successTitle: 'รับออเดอร์แล้ว!',
    orderNo: 'เลขที่ออเดอร์',
    successMsg: 'กรุณาส่งสลิปการโอนให้ร้านทาง LINE เพื่อยืนยันการชำระเงิน',
    sendSlip: 'ส่งสลิปทาง LINE',
    sentToShop: 'ส่งออเดอร์ให้ร้านทาง LINE แล้ว',
    attachSlip: 'แนบสลิปเพื่อยืนยันการชำระเงิน',
    verifyingSlip: 'กำลังตรวจสอบสลิป...',
    slipVerified: 'ยืนยันการชำระเงินแล้ว',
    slipUploaded: 'แนบสลิปแล้ว รอร้านตรวจสอบ',
    slipRetry: 'แนบสลิปใหม่อีกครั้ง',
    verifyHint: 'ระบบตรวจสลิปอัตโนมัติ (จับสลิปปลอมได้)',
    done: 'เสร็จสิ้น',
  },
  en: {
    title: 'Your Order',
    empty: 'No items yet',
    total: 'Total',
    clear: 'Clear',
    checkout: 'Continue',
    currency: '฿',
    back: 'Back',
    infoTitle: 'Delivery details',
    lineLogin: 'Log in with LINE',
    lineHi: 'Hi',
    name: 'Recipient name',
    phone: 'Phone',
    address: 'Delivery address',
    note: 'Note (optional)',
    useLocation: 'Check delivery distance',
    locating: 'Locating...',
    distanceLabel: 'Distance',
    deliveryFeeLabel: 'Delivery fee',
    itemsSubtotalLabel: 'Food total',
    outOfArea: (r) => `Outside delivery area (over ${r} km) — you can still order, extra fee may apply`,
    locationDenied: 'Location unavailable — you can still order; we\'ll check distance',
    toPayment: 'Go to payment',
    payTitle: 'Pay with PromptPay',
    payHint: 'Scan the QR with your banking app, then confirm below',
    amount: 'Amount',
    noPromptpay: 'Shop PromptPay not configured — please contact us on LINE',
    confirm: 'Confirm order',
    submitting: 'Sending...',
    successTitle: 'Order received!',
    orderNo: 'Order no.',
    successMsg: 'Please send your payment slip to us on LINE to confirm.',
    sendSlip: 'Send slip via LINE',
    sentToShop: 'Order sent to the shop on LINE',
    attachSlip: 'Attach slip to confirm payment',
    verifyingSlip: 'Verifying slip...',
    slipVerified: 'Payment verified',
    slipUploaded: 'Slip attached — pending review',
    slipRetry: 'Attach a different slip',
    verifyHint: 'Automatic slip check (detects fakes)',
    done: 'Done',
  },
  zh: {
    title: '我的订单',
    empty: '暂无商品',
    total: '合计',
    clear: '清空',
    checkout: '继续',
    currency: '฿',
    back: '返回',
    infoTitle: '配送信息',
    lineLogin: '使用 LINE 登录',
    lineHi: '你好',
    name: '收件人姓名',
    phone: '电话',
    address: '配送地址',
    note: '备注（选填）',
    useLocation: '检查配送距离',
    locating: '定位中...',
    distanceLabel: '配送距离',
    deliveryFeeLabel: '配送费',
    itemsSubtotalLabel: '餐点小计',
    outOfArea: (r) => `超出配送范围（超过 ${r} 公里）— 仍可下单，可能加收运费`,
    locationDenied: '无法定位 — 仍可下单，我们会为您确认距离',
    toPayment: '前往付款',
    payTitle: '使用 PromptPay 付款',
    payHint: '用银行 App 扫描二维码，然后在下方确认',
    amount: '金额',
    noPromptpay: '商店 PromptPay 未设置 — 请通过 LINE 联系我们',
    confirm: '确认订单',
    submitting: '发送中...',
    successTitle: '订单已收到！',
    orderNo: '订单号',
    successMsg: '请通过 LINE 将付款凭证发给我们以确认。',
    sendSlip: '通过 LINE 发送凭证',
    sentToShop: '订单已通过 LINE 发送给店家',
    attachSlip: '上传凭证以确认付款',
    verifyingSlip: '正在核验凭证...',
    slipVerified: '付款已确认',
    slipUploaded: '凭证已上传 — 等待店家核对',
    slipRetry: '重新上传凭证',
    verifyHint: '自动核验凭证（可识别伪造）',
    done: '完成',
  },
}

const inputCls =
  'w-full rounded-xl border border-black/15 bg-[#faf8f5] px-3.5 py-2.5 text-[14px] text-ink placeholder-black/30 focus:border-[#4a3520] focus:outline-none focus:ring-1 focus:ring-[#4a3520]/30 transition-colors'

export default function CartDrawer() {
  const { items, addItem, removeItem, clearCart, totalQty, totalPrice, isOpen, closeCart } = useCart()
  const { lang } = useLanguage()
  const t = COPY[lang] || COPY.en

  const [step, setStep] = useState('cart') // cart | info | payment | success
  const [form, setForm] = useState({ name: '', phone: '', address: '', note: '' })
  const [profile, setProfile] = useState(null) // { userId, displayName }
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [paymentRef, setPaymentRef] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [orderNo, setOrderNo] = useState('')
  // snapshot of the placed order, captured before the cart is cleared
  const [completed, setCompleted] = useState(null) // { lines, total, distanceKm, deliveryFee }
  const [sentToLine, setSentToLine] = useState(false) // auto-posted the order card into the LINE chat
  // automatic slip verification (SlipOK)
  const [slipVerify, setSlipVerify] = useState(false) // shop has SlipOK configured
  const [slipStatus, setSlipStatus] = useState('idle') // idle | verifying | ok | fail
  const [slipError, setSlipError] = useState('')
  // delivery distance + fee (fee is always computed server-side, from the
  // same /api/delivery-distance call — never duplicated as a client formula)
  const [distanceKm, setDistanceKm] = useState(null)
  const [distanceMsg, setDistanceMsg] = useState('')
  const [locating, setLocating] = useState(false)
  const [deliveryFee, setDeliveryFee] = useState(0)
  const triedSilentLoginRef = useRef(false)

  const itemsSubtotal = Math.round(totalPrice)
  const amount = itemsSubtotal + deliveryFee

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Reset to cart view each time the drawer is reopened (unless mid-success).
  useEffect(() => {
    if (!isOpen || step === 'success') return
    const id = setTimeout(() => setStep('cart'), 0)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Every time the drawer opens: reuse whatever /delivery's OrderFlow already
  // learned (LINE profile, distance, fee) so checkout never re-asks for
  // something we already know. Re-checked on each open (not just on app
  // mount) since a customer may open the cart here (e.g. from /promotion)
  // after already completing that flow in another tab/visit.
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    // Deferred one tick so this doesn't setState synchronously in the effect
    // body (still runs before paint — no visible flash).
    Promise.resolve().then(() => {
      if (cancelled) return
      const { profile: knownProfile, distance: knownDistance } = getDeliverySession()
      if (knownProfile) setProfile(knownProfile)
      if (knownDistance?.distanceKm != null) {
        setDistanceKm(knownDistance.distanceKm)
        setDeliveryFee(knownDistance.deliveryFee || 0)
        setDistanceMsg(knownDistance.withinRadius === false ? t.outOfArea(knownDistance.radiusKm) : '')
      }
      if (knownProfile || triedSilentLoginRef.current) return
      triedSilentLoginRef.current = true

      // Inside LINE without a cached profile yet (e.g. cart opened from
      // /promotion): silently grab the profile if a session already exists.
      // This also logs the customer to Google Sheets. Only attempted once.
      ;(async () => {
        const p = await getProfileIfLoggedIn()
        if (p && !cancelled) setProfile(p)
      })()
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  async function applyProfile(p, cancelled) {
    // Fill name from LINE, then look up saved phone/address by userId.
    setForm((f) => ({ ...f, name: f.name || p.displayName }))
    try {
      const res = await fetch(`/api/customer?lineUserId=${encodeURIComponent(p.userId)}`)
      const data = await res.json()
      if (!cancelled && data?.customer) {
        setForm((f) => ({
          name: f.name || data.customer.name || p.displayName,
          phone: f.phone || data.customer.phone || '',
          address: f.address || data.customer.address || '',
          note: f.note,
        }))
      }
    } catch {}
  }

  // Silently pick up an existing LINE session (e.g. after login redirect) and
  // pre-fill the form for returning customers.
  useEffect(() => {
    if (step !== 'info') return
    let cancelled = false
    ;(async () => {
      const p = await getProfileIfLoggedIn()
      if (!p || cancelled) return
      setProfile(p)
      await applyProfile(p, cancelled)
    })()
    return () => { cancelled = true }
  }, [step])

  async function handleLineLogin() {
    setError('')
    try {
      const p = await loginAndGetProfile()
      if (p) {
        setProfile(p)
        await applyProfile(p, false)
      }
    } catch {
      setError('เข้าสู่ระบบ LINE ไม่สำเร็จ')
    }
  }

  function checkDistance() {
    setDistanceMsg('')
    if (!('geolocation' in navigator)) {
      setDistanceMsg(t.locationDenied)
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch('/api/delivery-distance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          })
          const data = await res.json()
          if (data.distanceKm != null) {
            setDistanceKm(data.distanceKm)
            setDeliveryFee(data.deliveryFee || 0)
            setDistanceMsg(data.withinRadius ? '' : t.outOfArea(data.radiusKm))
          } else {
            setDistanceMsg(t.locationDenied)
          }
        } catch {
          setDistanceMsg(t.locationDenied)
        } finally {
          setLocating(false)
        }
      },
      () => {
        setLocating(false)
        setDistanceMsg(t.locationDenied)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function goToPayment() {
    setError('')
    if (!form.name.trim() || !form.phone.trim()) {
      setError(lang === 'th' ? 'กรุณากรอกชื่อและเบอร์โทร' : 'Please enter name and phone')
      return
    }
    setStep('payment')
    // Build the PromptPay QR for the current total.
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

  async function submitOrder() {
    setError('')
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
          distanceKm,
          lineUserId: profile?.userId || '',
          lineDisplayName: profile?.displayName || '',
          items: items.map((i) => ({ id: i.id, name: i.name, price: parseFloat(i.price) || 0, qty: i.qty })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'error')

      // Use the server-computed total (authoritative) for everything downstream.
      const finalDeliveryFee = data.deliveryFee || 0
      const finalTotal = data.totalAmount ?? amount

      // Auto-post the order card (Flex message) into the LINE chat — no button
      // press needed. Only works inside LINE; returns false in a plain browser.
      const flex = buildOrderFlex({
        orderNo: data.orderNo,
        name: form.name,
        phone: form.phone,
        address: form.address,
        items: items.map((i) => ({ name: i.name, price: parseFloat(i.price) || 0, qty: i.qty })),
        total: finalTotal,
        deliveryFee: finalDeliveryFee,
        distanceKm,
      })
      const sent = await sendMessagesToChat([flex])
      setSentToLine(sent)

      // Snapshot for the success screen / slip message before the cart clears.
      setCompleted({
        lines: items.map((i) => `• ${i.name} x${i.qty}`).join('\n'),
        total: finalTotal,
        deliveryFee: finalDeliveryFee,
        distanceKm,
      })
      setSlipVerify(Boolean(data.slipVerify))
      setOrderNo(data.orderNo)
      setStep('success')
      clearCart()
    } catch (err) {
      setError(err.message || (lang === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong'))
    } finally {
      setSubmitting(false)
    }
  }

  function handleSlipFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
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
          setSlipStatus('ok') // auto-verified as paid (SlipOK)
        } else if (data.ok && data.stored && !data.error) {
          setSlipStatus('stored') // saved for the shop to review manually
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
    const distanceLine =
      completed?.distanceKm != null ? `\n${t.distanceLabel} ${completed.distanceKm} กม.` : ''
    const feeLine = completed?.deliveryFee ? `\n${t.deliveryFeeLabel} ฿${completed.deliveryFee}` : ''
    const msg = encodeURIComponent(
      `${t.orderNo} ${orderNo}${refLine}\n${lines}${feeLine}\n\n${t.total} ฿${total}${distanceLine}\n\n(แนบสลิปการโอนในแชทนี้ได้เลยครับ)`
    )
    window.open(`https://line.me/R/oaMessage/${LINE_OA_ID}/?${msg}`, '_blank')
  }

  function close() {
    closeCart()
    // reset after the drawer has animated away
    setTimeout(() => {
      if (step === 'success') {
        setStep('cart')
        setOrderNo('')
        setForm({ name: '', phone: '', address: '', note: '' })
        setDistanceKm(null)
        setDistanceMsg('')
        setDeliveryFee(0)
        setCompleted(null)
        setSentToLine(false)
        setSlipVerify(false)
        setSlipStatus('idle')
        setSlipError('')
      }
    }, 350)
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[180] bg-black/40 backdrop-blur-sm" onClick={close} />
      )}

      <div
        className={`fixed bottom-0 left-0 right-0 z-[190] bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '88dvh' }}
      >
        {/* handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-black/15" />
        </div>

        {/* header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-black/10">
          <div className="flex items-center gap-2">
            {step !== 'cart' && step !== 'success' && (
              <button
                onClick={() => setStep(step === 'payment' ? 'info' : 'cart')}
                className="text-black/40 hover:text-black text-lg leading-none -ml-1 pr-1"
                aria-label={t.back}
              >‹</button>
            )}
            <h2 className="font-semibold text-[15px] text-ink tracking-wide">
              {step === 'cart' && t.title}
              {step === 'info' && t.infoTitle}
              {step === 'payment' && t.payTitle}
              {step === 'success' && t.successTitle}
              {step === 'cart' && totalQty > 0 && (
                <span className="ml-2 bg-[#4a3520] text-white text-[11px] px-2 py-0.5 rounded-full font-normal">
                  {totalQty}
                </span>
              )}
            </h2>
          </div>
          <button onClick={close} className="text-black/40 hover:text-black text-xl leading-none p-1">✕</button>
        </div>

        {/* ── CART STEP ─────────────────────────────────────────── */}
        {step === 'cart' && (
          <>
            <div className="overflow-y-auto overscroll-contain px-5 py-4 flex flex-col gap-3" style={{ maxHeight: 'calc(88dvh - 200px)' }}>
              {items.length === 0 ? (
                <p className="text-center text-sm text-black/40 py-10">{t.empty}</p>
              ) : items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  {item.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover shrink-0 bg-[#f2ede6]" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink leading-snug truncate">{item.name}</p>
                    <p className="text-[12px] text-black/50 tabular-nums">฿{Math.round(parseFloat(item.price))} × {item.qty}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => removeItem(item.id)} className="w-7 h-7 rounded-full bg-black/[0.06] flex items-center justify-center text-ink font-semibold text-sm hover:bg-black/10">−</button>
                    <span className="text-[13px] font-semibold w-4 text-center">{item.qty}</span>
                    <button onClick={() => addItem(item)} className="w-7 h-7 rounded-full bg-black/[0.06] flex items-center justify-center text-ink font-semibold text-sm hover:bg-black/10">+</button>
                  </div>
                  <p className="text-[13px] font-semibold tabular-nums text-ink shrink-0 w-12 text-right">
                    ฿{Math.round(parseFloat(item.price) * item.qty)}
                  </p>
                </div>
              ))}
            </div>

            {items.length > 0 && (
              <div className="border-t border-black/10 px-5 py-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <button onClick={clearCart} className="text-[11px] text-black/40 hover:text-black/70 tracking-wide uppercase">{t.clear}</button>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] tracking-[0.12em] uppercase text-black/50">{t.total}</span>
                    <span className="font-semibold text-[17px] text-ink tabular-nums">฿{amount}</span>
                  </div>
                </div>
                <button onClick={() => setStep('info')} className="w-full py-3.5 rounded-xl bg-[#4a3520] text-white font-semibold text-[14px] tracking-wide hover:bg-[#3a2818] transition-colors">
                  {t.checkout}
                </button>
              </div>
            )}
          </>
        )}

        {/* ── INFO STEP ─────────────────────────────────────────── */}
        {step === 'info' && (
          <>
            <div className="overflow-y-auto overscroll-contain px-5 py-4 flex flex-col gap-3" style={{ maxHeight: 'calc(88dvh - 160px)' }}>
              {isLiffConfigured() && (
                profile ? (
                  <div className="flex items-center gap-2 rounded-xl bg-[#efe9e1] border border-[#4a3520]/15 px-4 py-3 text-[13px] leading-[1.75] text-[#4a3520]">
                    <span>{t.lineHi} {profile.displayName}</span>
                  </div>
                ) : (
                  <button onClick={handleLineLogin} className="w-full py-3 rounded-xl bg-[#06C755] text-white font-semibold text-[14px] flex items-center justify-center gap-2 hover:brightness-95 transition">
                    {t.lineLogin}
                  </button>
                )
              )}

              <label className="block">
                <span className="text-[11px] tracking-[0.1em] uppercase text-black/45">{t.name}</span>
                <input className={`mt-1 ${inputCls}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-[11px] tracking-[0.1em] uppercase text-black/45">{t.phone}</span>
                <input className={`mt-1 ${inputCls}`} inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-[11px] tracking-[0.1em] uppercase text-black/45">{t.address}</span>
                <textarea rows={2} className={`mt-1 resize-none ${inputCls}`} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-[11px] tracking-[0.1em] uppercase text-black/45">{t.note}</span>
                <input className={`mt-1 ${inputCls}`} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </label>

              {/* delivery distance check */}
              <div>
                <button
                  type="button"
                  onClick={checkDistance}
                  disabled={locating}
                  className="w-full py-2.5 rounded-xl border border-[#4a3520]/25 text-[#4a3520] font-medium text-[13px] hover:bg-[#4a3520]/[0.04] transition disabled:opacity-60"
                >
                  {locating ? t.locating : t.useLocation}
                </button>
                {distanceKm != null && (
                  <div className="mt-2 flex flex-col items-center gap-0.5 text-[13px] text-[#4a3520]">
                    <span>{t.distanceLabel} {distanceKm} กม.</span>
                    {deliveryFee > 0 && (
                      <span className="text-[12px] text-black/50">{t.deliveryFeeLabel} +฿{deliveryFee}</span>
                    )}
                  </div>
                )}
                {distanceMsg && (
                  <p className="mt-1.5 text-[12px] text-amber-700 text-center leading-snug">{distanceMsg}</p>
                )}
              </div>

              {error && <p className="text-[12px] text-red-600">{error}</p>}
            </div>

            <div className="border-t border-black/10 px-5 py-4">
              <button onClick={goToPayment} className="w-full py-3.5 rounded-xl bg-[#4a3520] text-white font-semibold text-[14px] tracking-wide hover:bg-[#3a2818] transition-colors flex items-center justify-between px-5">
                <span>{t.toPayment}</span>
                <span className="tabular-nums">฿{amount}</span>
              </button>
            </div>
          </>
        )}

        {/* ── PAYMENT STEP ──────────────────────────────────────── */}
        {step === 'payment' && (
          <>
            <div className="overflow-y-auto overscroll-contain px-5 py-5 flex flex-col items-center gap-3 text-center" style={{ maxHeight: 'calc(88dvh - 160px)' }}>
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
                  {deliveryFee > 0 && (
                    <div className="text-[12px] text-black/50 flex flex-col items-center gap-0.5">
                      <span>{t.itemsSubtotalLabel} ฿{itemsSubtotal}</span>
                      <span>{t.deliveryFeeLabel} +฿{deliveryFee}</span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] tracking-[0.12em] uppercase text-black/50">{t.amount}</span>
                    <span className="font-display text-[28px] text-ink tabular-nums leading-none">฿{amount}</span>
                  </div>
                </>
              ) : (
                <p className="text-[13px] text-black/60 py-8">{t.noPromptpay}</p>
              )}
              {error && <p className="text-[12px] text-red-600">{error}</p>}
            </div>

            <div className="border-t border-black/10 px-5 py-4">
              <button onClick={submitOrder} disabled={submitting} className="w-full py-3.5 rounded-xl bg-[#3a2818] text-white font-semibold text-[14px] tracking-wide hover:bg-[#4a3520] transition-colors disabled:opacity-60">
                {submitting ? t.submitting : t.confirm}
              </button>
            </div>
          </>
        )}

        {/* ── SUCCESS STEP ──────────────────────────────────────── */}
        {step === 'success' && (
          <div className="px-6 py-8 flex flex-col items-center text-center gap-4">
            <div>
              <span className="text-[11px] tracking-[0.12em] uppercase text-black/45">{t.orderNo}</span>
              <p className="font-display text-[24px] text-ink tracking-wide">{orderNo}</p>
              {completed && (
                <>
                  {completed.deliveryFee > 0 && (
                    <p className="text-[12px] text-black/45 mt-1">
                      {t.itemsSubtotalLabel} ฿{completed.total - completed.deliveryFee} + {t.deliveryFeeLabel} ฿{completed.deliveryFee}
                    </p>
                  )}
                  <p className="text-[15px] font-semibold text-ink tabular-nums mt-0.5">
                    {t.total} ฿{completed.total}
                  </p>
                </>
              )}
            </div>
            {sentToLine && (
              <div className="mt-1 flex items-center gap-2 rounded-xl bg-[#efe9e1] border border-[#4a3520]/15 px-4 py-3 text-[13px] leading-[1.75] text-[#4a3520]">
                <span>{t.sentToShop}</span>
              </div>
            )}

            {/* Payment confirmation — always offer to attach the slip */}
            {slipStatus === 'ok' ? (
              <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#3a2818] text-white px-3.5 py-3 text-[14px] font-semibold">
                <span>{t.slipVerified}</span>
              </div>
            ) : slipStatus === 'stored' ? (
              <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#3a2818] text-white px-3.5 py-3 text-[14px] font-semibold">
                <span>{t.slipUploaded}</span>
              </div>
            ) : (
              <div className="w-full">
                <label className={`w-full py-3.5 rounded-xl bg-[#4a3520] text-white font-semibold text-[14px] flex items-center justify-center gap-2 cursor-pointer hover:bg-[#3a2818] transition ${slipStatus === 'verifying' ? 'opacity-60 pointer-events-none' : ''}`}>
                  {slipStatus === 'verifying'
                    ? t.verifyingSlip
                    : slipStatus === 'fail'
                      ? t.slipRetry
                      : t.attachSlip}
                  <input type="file" accept="image/*" className="hidden" onChange={handleSlipFile} disabled={slipStatus === 'verifying'} />
                </label>
                <p className="text-[11px] text-black/40 text-center mt-1.5">
                  {slipVerify ? t.verifyHint : t.successMsg}
                </p>
                {slipStatus === 'fail' && slipError && (
                  <p className="text-[12px] text-red-600 text-center mt-1">{slipError}</p>
                )}
                {/* secondary: send in the LINE chat instead */}
                <button onClick={sendSlipViaLine} className="w-full mt-2 py-2 text-[12px] text-[#06C755] font-medium hover:underline">
                  {t.sendSlip}
                </button>
              </div>
            )}

            <button onClick={close} className="w-full py-3 rounded-xl bg-black/[0.06] text-ink font-semibold text-[13px] hover:bg-black/10 transition">
              {t.done}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
