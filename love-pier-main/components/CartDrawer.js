import { useEffect, useMemo, useState } from 'react'
import { useCart } from '../lib/cart'
import { useLanguage } from '../lib/language'
import { buildPaymentPayload } from '../lib/promptpay'
import {
  isLiffConfigured,
  loginAndGetProfile,
  getProfileIfLoggedIn,
  sendMessagesToChat,
} from '../lib/liff'

const PROMPTPAY_ID = process.env.NEXT_PUBLIC_PROMPTPAY_ID || ''
const PROMPTPAY_TYPE = process.env.NEXT_PUBLIC_PROMPTPAY_TYPE || '' // 'biller' | ''
// Optional fixed reference for the bill-payment QR. Bill-payment billers validate
// Ref1 against their own rules, so a random ref is rejected ("reference invalid").
// Leave blank to omit Ref1 from the QR; set it only if your biller expects a
// specific fixed reference.
const PROMPTPAY_REF = process.env.NEXT_PUBLIC_PROMPTPAY_REF || ''
const LINE_OA_ID = process.env.NEXT_PUBLIC_LINE_OA_ID || '@loverpier.cafe'

// Internal reference saved with the order so the shop can track it in /admin.
// (Not embedded in the payment QR — see PROMPTPAY_REF above.)
function makePaymentRef() {
  return 'LP' + Date.now().toString(36).toUpperCase()
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
    useLocation: '📍 เช็คระยะจัดส่ง',
    locating: 'กำลังหาตำแหน่ง...',
    distanceLabel: 'ระยะจัดส่ง',
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
    successTitle: 'รับออเดอร์แล้ว! 🎉',
    orderNo: 'เลขที่ออเดอร์',
    successMsg: 'กรุณาส่งสลิปการโอนให้ร้านทาง LINE เพื่อยืนยันการชำระเงิน',
    sendSlip: 'ส่งสลิปทาง LINE',
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
    useLocation: '📍 Check delivery distance',
    locating: 'Locating...',
    distanceLabel: 'Distance',
    outOfArea: (r) => `Outside delivery area (over ${r} km) — you can still order, extra fee may apply`,
    locationDenied: 'Location unavailable — you can still order; we\'ll check distance',
    toPayment: 'Go to payment',
    payTitle: 'Pay with PromptPay',
    payHint: 'Scan the QR with your banking app, then confirm below',
    amount: 'Amount',
    noPromptpay: 'Shop PromptPay not configured — please contact us on LINE',
    confirm: 'Confirm order',
    submitting: 'Sending...',
    successTitle: 'Order received! 🎉',
    orderNo: 'Order no.',
    successMsg: 'Please send your payment slip to us on LINE to confirm.',
    sendSlip: 'Send slip via LINE',
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
    useLocation: '📍 检查配送距离',
    locating: '定位中...',
    distanceLabel: '配送距离',
    outOfArea: (r) => `超出配送范围（超过 ${r} 公里）— 仍可下单，可能加收运费`,
    locationDenied: '无法定位 — 仍可下单，我们会为您确认距离',
    toPayment: '前往付款',
    payTitle: '使用 PromptPay 付款',
    payHint: '用银行 App 扫描二维码，然后在下方确认',
    amount: '金额',
    noPromptpay: '商店 PromptPay 未设置 — 请通过 LINE 联系我们',
    confirm: '确认订单',
    submitting: '发送中...',
    successTitle: '订单已收到！🎉',
    orderNo: '订单号',
    successMsg: '请通过 LINE 将付款凭证发给我们以确认。',
    sendSlip: '通过 LINE 发送凭证',
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
  // delivery distance
  const [distanceKm, setDistanceKm] = useState(null)
  const [distanceMsg, setDistanceMsg] = useState('')
  const [locating, setLocating] = useState(false)

  const amount = Math.round(totalPrice)

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Reset to cart view each time the drawer is reopened (unless mid-success).
  useEffect(() => {
    if (isOpen && step !== 'success') setStep('cart')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

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
          // Only embed a Ref the biller actually expects; otherwise omit it so
          // the bank doesn't reject the QR with "reference invalid".
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

      // Post the order summary into the LINE chat (only works inside LINE).
      const orderLines = items.map((i) => `${i.name} x${i.qty}`).join('\n')
      const distanceLine = distanceKm != null ? `\n📍 ${t.distanceLabel} ${distanceKm} กม.` : ''
      await sendMessagesToChat([
        {
          type: 'text',
          text: `🛒 ${t.orderNo} ${data.orderNo}\n${orderLines}\n\n${t.total} ฿${amount}${distanceLine}`,
        },
      ])

      setOrderNo(data.orderNo)
      setStep('success')
      clearCart()
    } catch (err) {
      setError(err.message || (lang === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong'))
    } finally {
      setSubmitting(false)
    }
  }

  function sendSlipViaLine() {
    const lines = summaryLines
    const refLine = paymentRef ? `\nRef: ${paymentRef}` : ''
    const msg = encodeURIComponent(
      `📦 ${t.orderNo} ${orderNo}${refLine}\n${lines}\n\n${t.total} ฿${amount}\n\n(แนบสลิปการโอนในแชทนี้ได้เลยครับ)`
    )
    window.open(`https://line.me/R/oaMessage/${LINE_OA_ID}/?${msg}`, '_blank')
  }

  const summaryLines = useMemo(
    () => items.map((i) => `• ${i.name} x${i.qty}`).join('\n'),
    [items]
  )

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
                  <div className="flex items-center gap-2 rounded-xl bg-[#f0f7ef] border border-[#2d6a1f]/20 px-3.5 py-2.5 text-[13px] text-[#2d6a1f]">
                    <span>✅</span><span>{t.lineHi} {profile.displayName}</span>
                  </div>
                ) : (
                  <button onClick={handleLineLogin} className="w-full py-3 rounded-xl bg-[#06C755] text-white font-semibold text-[14px] flex items-center justify-center gap-2 hover:brightness-95 transition">
                    <span className="text-[16px]">💬</span> {t.lineLogin}
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
                  <div className="mt-2 flex items-center justify-center gap-1.5 text-[13px] text-[#2d6a1f]">
                    <span>📍</span>
                    <span>{t.distanceLabel} {distanceKm} กม.</span>
                  </div>
                )}
                {distanceMsg && (
                  <p className="mt-1.5 text-[12px] text-amber-700 text-center leading-snug">⚠️ {distanceMsg}</p>
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
              <button onClick={submitOrder} disabled={submitting} className="w-full py-3.5 rounded-xl bg-[#2d6a1f] text-white font-semibold text-[14px] tracking-wide hover:bg-[#245517] transition-colors disabled:opacity-60">
                {submitting ? t.submitting : t.confirm}
              </button>
            </div>
          </>
        )}

        {/* ── SUCCESS STEP ──────────────────────────────────────── */}
        {step === 'success' && (
          <div className="px-6 py-8 flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-[#f0f7ef] flex items-center justify-center text-3xl">🎉</div>
            <div>
              <span className="text-[11px] tracking-[0.12em] uppercase text-black/45">{t.orderNo}</span>
              <p className="font-display text-[24px] text-ink tracking-wide">{orderNo}</p>
            </div>
            <p className="text-[13px] text-black/55 leading-relaxed max-w-xs">{t.successMsg}</p>
            <button onClick={sendSlipViaLine} className="mt-2 w-full py-3.5 rounded-xl bg-[#06C755] text-white font-semibold text-[14px] flex items-center justify-center gap-2 hover:brightness-95 transition">
              <span className="text-[16px]">💬</span> {t.sendSlip}
            </button>
            <button onClick={close} className="w-full py-3 rounded-xl bg-black/[0.06] text-ink font-semibold text-[13px] hover:bg-black/10 transition">
              {t.done}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
