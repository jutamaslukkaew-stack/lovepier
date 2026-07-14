// Gate that sits in front of the /delivery menu: check LINE login (LIFF),
// then scan GPS + compute delivery distance (with the radar/pulse/pin
// animation + radius map), and only then render `children` (the menu).
//
// Out-of-radius customers are warned, not blocked (shop decision) — they can
// still continue into the menu. GPS failures also degrade to "skip and
// continue" rather than trapping the customer with no way to order.
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useLanguage } from '../../lib/language'
import { isLiffConfigured, loginAndGetProfile } from '../../lib/liff'
import { setDeliverySessionProfile, setDeliverySessionDistance } from '../../lib/deliverySession'
import LocatingAnimation from './LocatingAnimation'

// Leaflet touches `window` at import time — must never be pulled into the
// server bundle, hence ssr:false.
const DeliveryRadiusMap = dynamic(() => import('./DeliveryRadiusMap'), { ssr: false })

const COPY = {
  th: {
    loggingIn: 'กำลังเข้าสู่ระบบ LINE...',
    loginFailed: 'เข้าสู่ระบบ LINE ไม่สำเร็จ กรุณาลองใหม่',
    retry: 'ลองอีกครั้ง',
    locating: 'กำลังค้นหาตำแหน่งของคุณ...',
    calculating: 'กำลังคำนวณระยะทาง...',
    withinRadius: (km) => `พบตำแหน่งแล้ว — ห่างจากร้าน ${km} กม. ✅`,
    outOfRadius: (km, r) => `ห่างจากร้าน ${km} กม. — นอกระยะจัดส่ง ${r} กม. แต่ยังสั่งได้`,
    unknown: 'ไม่ทราบตำแหน่งของคุณ — ยังสั่งอาหารได้ตามปกติ',
    gpsDenied: 'คุณไม่ได้อนุญาตให้เข้าถึงตำแหน่ง',
    gpsTimeout: 'ค้นหาตำแหน่งไม่สำเร็จ (หมดเวลา)',
    gpsUnsupported: 'เบราว์เซอร์นี้ไม่รองรับการหาตำแหน่ง',
    skip: 'ข้าม — เข้าเมนูเลย',
    continue: 'เข้าสู่เมนู',
  },
  en: {
    loggingIn: 'Logging in with LINE...',
    loginFailed: 'LINE login failed. Please try again.',
    retry: 'Retry',
    locating: 'Finding your location...',
    calculating: 'Calculating distance...',
    withinRadius: (km) => `Location found — ${km} km from the shop ✅`,
    outOfRadius: (km, r) => `${km} km from the shop — outside the ${r} km delivery area, but you can still order`,
    unknown: "Couldn't determine your location — you can still order",
    gpsDenied: 'Location permission was denied',
    gpsTimeout: 'Locating timed out',
    gpsUnsupported: "This browser doesn't support location",
    skip: 'Skip — go to menu',
    continue: 'Go to menu',
  },
  zh: {
    loggingIn: '正在使用 LINE 登录...',
    loginFailed: 'LINE 登录失败，请重试',
    retry: '重试',
    locating: '正在定位您的位置...',
    calculating: '正在计算距离...',
    withinRadius: (km) => `已定位 — 距离门店 ${km} 公里 ✅`,
    outOfRadius: (km, r) => `距离门店 ${km} 公里 — 超出 ${r} 公里配送范围，仍可下单`,
    unknown: '无法确定您的位置 — 仍可下单',
    gpsDenied: '您未允许访问位置信息',
    gpsTimeout: '定位超时',
    gpsUnsupported: '此浏览器不支持定位',
    skip: '跳过 — 直接进入菜单',
    continue: '进入菜单',
  },
}

export default function DeliveryGate({ children }) {
  const { lang } = useLanguage()
  const t = COPY[lang] || COPY.en

  // phase: login | locating | calculating | found | gps-error | ready
  const [phase, setPhase] = useState(isLiffConfigured() ? 'login' : 'locating')
  // Store error *codes*, not pre-translated strings — the text is derived
  // from the current `t` at render time, so it stays correct if the
  // customer switches language while an error is showing.
  const [loginFailed, setLoginFailed] = useState(false)
  const [gpsErrorCode, setGpsErrorCode] = useState(null) // 'denied' | 'timeout' | 'unsupported' | null
  const [result, setResult] = useState(null) // { distanceKm, deliveryFee, withinRadius, radiusKm, shopLat, shopLng }
  const [coords, setCoords] = useState(null) // { lat, lng }

  // ── Step 1: LINE login (only when LIFF is actually configured) ──────────
  useEffect(() => {
    if (phase !== 'login') return
    let cancelled = false
    ;(async () => {
      try {
        const profile = await loginAndGetProfile()
        if (cancelled) return
        if (profile) {
          setDeliverySessionProfile(profile)
          setPhase('locating')
        }
        // else: liff.login() redirected the page away — nothing else to do.
      } catch {
        if (!cancelled) setLoginFailed(true)
      }
    })()
    return () => { cancelled = true }
  }, [phase])

  // ── Step 2: GPS + distance ────────────────────────────────────────────
  // Called only from the phase==='locating' effect below, so it never runs
  // twice for one attempt — retry/skip just flip phase and let the effect
  // re-trigger it.
  function startLocating() {
    if (!('geolocation' in navigator)) {
      // Defer so this isn't a synchronous setState-in-effect (React flags
      // that as a cascading-render smell) — same outcome, next microtask.
      Promise.resolve().then(() => {
        setGpsErrorCode('unsupported')
        setPhase('gps-error')
      })
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCoords({ lat, lng })
        setPhase('calculating')
        try {
          const res = await fetch('/api/delivery-distance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lng }),
          })
          const data = await res.json()
          setResult(data)
          if (data.distanceKm != null) {
            setDeliverySessionDistance({
              distanceKm: data.distanceKm,
              deliveryFee: data.deliveryFee || 0,
              withinRadius: data.withinRadius,
              radiusKm: data.radiusKm,
            })
          }
          setPhase('found')
        } catch {
          setPhase('found')
          setResult(null)
        }
      },
      (err) => {
        setGpsErrorCode(
          err.code === err.PERMISSION_DENIED ? 'denied' : err.code === err.TIMEOUT ? 'timeout' : 'unsupported'
        )
        setPhase('gps-error')
      },
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }

  useEffect(() => {
    if (phase === 'locating') startLocating()
  }, [phase])

  // Auto-advance into the menu a couple seconds after the result lands —
  // tapping the card (onClick below) skips the wait.
  useEffect(() => {
    if (phase !== 'found') return
    const timer = setTimeout(() => setPhase('ready'), 1800)
    return () => clearTimeout(timer)
  }, [phase])

  if (phase === 'ready') return children

  const gpsErrorText =
    gpsErrorCode === 'denied' ? t.gpsDenied :
    gpsErrorCode === 'timeout' ? t.gpsTimeout :
    gpsErrorCode === 'unsupported' ? t.gpsUnsupported : ''

  const statusText =
    phase === 'login' ? (loginFailed ? t.loginFailed : t.loggingIn) :
    phase === 'locating' ? t.locating :
    phase === 'calculating' ? t.calculating :
    phase === 'found' ? (
      result?.distanceKm == null ? t.unknown
      : result.withinRadius ? t.withinRadius(result.distanceKm)
      : t.outOfRadius(result.distanceKm, result.radiusKm)
    ) : ''

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center bg-[#f5f2ee] px-6">
      <div className="w-full max-w-sm">
        <LocatingAnimation phase={phase === 'found' ? 'found' : phase === 'calculating' ? 'calculating' : 'locating'} statusText={statusText} />

        {phase === 'login' && loginFailed && (
          <button
            onClick={() => { setLoginFailed(false); setPhase('login') }}
            className="w-full py-3 rounded-xl border border-[#4a3520]/25 text-[#4a3520] font-semibold text-[13px] hover:bg-[#4a3520]/[0.04] transition"
          >
            {t.retry}
          </button>
        )}

        {phase === 'gps-error' && (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] text-red-600 text-center -mt-3 mb-1">⚠️ {gpsErrorText}</p>
            <button
              onClick={() => { setGpsErrorCode(null); setPhase('locating') }}
              className="w-full py-3 rounded-xl border border-[#4a3520]/25 text-[#4a3520] font-semibold text-[13px] hover:bg-[#4a3520]/[0.04] transition"
            >
              {t.retry}
            </button>
            <button
              onClick={() => setPhase('ready')}
              className="w-full py-3 rounded-xl bg-[#4a3520] text-white font-semibold text-[13px] hover:bg-[#3a2818] transition"
            >
              {t.skip}
            </button>
          </div>
        )}

        {phase === 'found' && (
          <button
            onClick={() => setPhase('ready')}
            className="w-full mt-2 rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow text-left"
          >
            {result?.shopLat != null && (
              <div className="h-40 w-full">
                <DeliveryRadiusMap
                  shopLat={result.shopLat}
                  shopLng={result.shopLng}
                  userLat={coords?.lat}
                  userLng={coords?.lng}
                  radiusKm={result.radiusKm}
                  withinRadius={result.withinRadius}
                />
              </div>
            )}
            <div className="px-4 py-3 text-center text-[13px] font-semibold text-[#4a3520]">
              {t.continue} →
            </div>
          </button>
        )}
      </div>
    </div>
  )
}
