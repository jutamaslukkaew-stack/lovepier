import Head from 'next/head'
import { useCallback, useEffect, useState } from 'react'
import { useChrome } from '../lib/chrome'
import { useLanguage } from '../lib/language'
import { getProfileIfLoggedIn, isLiffConfigured, loginAndGetProfile } from '../lib/liff'

// Love Pier ID — the customer's membership card (Phase 1).
//
// Opened from the LINE OA Rich Menu inside LIFF, so it hides the site
// nav/footer and reads as a dedicated card screen. States:
//   loading → logged-out → form (first time) → card
// A returning member skips the form entirely: GET /api/member already
// returns their card.

const COPY = {
  th: {
    title: 'Love Pier ID — บัตรสมาชิก',
    heading: 'Love Pier ID',
    tagline: 'บัตรสมาชิกของคุณ ใช้แสดงที่หน้าร้าน',
    loading: 'กำลังโหลด…',
    loginLead: 'เข้าสู่ระบบด้วย LINE เพื่อรับบัตรสมาชิก Love Pier ID ของคุณ',
    login: 'เข้าสู่ระบบด้วย LINE',
    unavailable: 'เปิดหน้านี้จากแอป LINE ของร้าน เพื่อรับบัตรสมาชิก',
    formLead: 'กรอกข้อมูลเพื่อรับบัตรสมาชิก ใช้เวลาไม่ถึงนาที',
    name: 'ชื่อ',
    namePlaceholder: 'ชื่อที่ให้พนักงานเรียก',
    phone: 'เบอร์โทร',
    phonePlaceholder: '08x-xxx-xxxx',
    birthday: 'วันเกิด',
    birthdayHint: 'ไม่บังคับ · ใส่ไว้เพื่อรับสิทธิพิเศษวันเกิด',
    submit: 'รับบัตรสมาชิก',
    submitting: 'กำลังสมัคร…',
    memberNo: 'รหัสสมาชิก',
    points: 'คะแนนสะสม',
    pointsUnit: 'คะแนน',
    scanHint: 'ให้พนักงานสแกน QR นี้ก่อนชำระเงิน',
    error: 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่',
    retry: 'ลองใหม่',
  },
  en: {
    title: 'Love Pier ID — Membership card',
    heading: 'Love Pier ID',
    tagline: 'Your membership card — show it in store',
    loading: 'Loading…',
    loginLead: 'Log in with LINE to get your Love Pier ID card.',
    login: 'Log in with LINE',
    unavailable: 'Open this page from our LINE account to get your card.',
    formLead: 'Fill this in to get your card — it takes under a minute.',
    name: 'Name',
    namePlaceholder: 'What our staff should call you',
    phone: 'Phone',
    phonePlaceholder: '08x-xxx-xxxx',
    birthday: 'Birthday',
    birthdayHint: 'Optional · add it for a birthday treat',
    submit: 'Get my card',
    submitting: 'Signing up…',
    memberNo: 'Member ID',
    points: 'Points balance',
    pointsUnit: 'points',
    scanHint: 'Show this QR to our staff before you pay',
    error: 'Could not load your card. Please try again.',
    retry: 'Try again',
  },
  zh: {
    title: 'Love Pier ID — 会员卡',
    heading: 'Love Pier ID',
    tagline: '您的会员卡 — 到店出示即可',
    loading: '加载中…',
    loginLead: '使用 LINE 登录，即可领取您的 Love Pier ID 会员卡。',
    login: '使用 LINE 登录',
    unavailable: '请从本店 LINE 官方账号打开此页面以领取会员卡。',
    formLead: '填写以下信息即可领取会员卡，不到一分钟。',
    name: '姓名',
    namePlaceholder: '方便店员称呼您',
    phone: '电话',
    phonePlaceholder: '08x-xxx-xxxx',
    birthday: '生日',
    birthdayHint: '选填 · 填写可获得生日礼遇',
    submit: '领取会员卡',
    submitting: '注册中…',
    memberNo: '会员编号',
    points: '积分余额',
    pointsUnit: '积分',
    scanHint: '结账前请向店员出示此二维码',
    error: '无法加载会员卡，请重试。',
    retry: '重试',
  },
}

export default function MemberPage() {
  const { lang } = useLanguage()
  const t = COPY[lang] || COPY.en
  const { setHidden: setChromeHidden } = useChrome()

  const [status, setStatus] = useState(() => (isLiffConfigured() ? 'loading' : 'logged-out'))
  const [profile, setProfile] = useState(null)
  const [member, setMember] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', birthday: '' })
  const [formError, setFormError] = useState('')

  // This is a card screen reached from the Rich Menu, not a marketing page.
  useEffect(() => {
    setChromeHidden(true)
    return () => setChromeHidden(false)
  }, [setChromeHidden])

  const loadMember = useCallback(async (lineProfile) => {
    if (!lineProfile?.userId) {
      setStatus('logged-out')
      return
    }
    setProfile(lineProfile)
    setStatus('loading')
    try {
      const res = await fetch('/api/member', {
        headers: { Authorization: `Bearer ${lineProfile.accessToken || ''}` },
      })
      const data = await res.json()
      if (data.member) {
        setMember(data.member)
        setStatus('card')
        return
      }
      // Returning delivery customers already have a name/phone on file.
      setForm((prev) => ({
        ...prev,
        name: data.prefill?.name || lineProfile.displayName || '',
        phone: data.prefill?.phone || '',
      }))
      setStatus('form')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (!isLiffConfigured()) return
    getProfileIfLoggedIn()
      .then(loadMember)
      .catch(() => setStatus('logged-out'))
  }, [loadMember])

  // Only ever runs once a card exists — the qrcode bundle is never pulled in
  // on the login/form screens. Same dynamic-import + data-URL technique as
  // the PromptPay QR in components/delivery/OrderFlow.js.
  useEffect(() => {
    if (!member?.qrPayload) return
    let cancelled = false
    ;(async () => {
      try {
        const QRCode = (await import('qrcode')).default
        const url = await QRCode.toDataURL(member.qrPayload, { margin: 1, width: 320 })
        if (!cancelled) setQrDataUrl(url)
      } catch {
        // A missing QR still leaves the member number readable on the card.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [member?.qrPayload])

  async function handleLogin() {
    setStatus('loading')
    try {
      const lineProfile = await loginAndGetProfile()
      if (lineProfile) await loadMember(lineProfile)
    } catch {
      setStatus('error')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    if (!form.name.trim() || !form.phone.trim()) {
      setFormError(t.error)
      return
    }
    setStatus('submitting')
    try {
      const res = await fetch('/api/member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${profile?.accessToken || ''}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          birthday: form.birthday || '',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.member) {
        setFormError(data.error || t.error)
        setStatus('form')
        return
      }
      setMember(data.member)
      setStatus('card')
    } catch {
      setFormError(t.error)
      setStatus('form')
    }
  }

  return (
    <>
      <Head>
        <title>{t.title}</title>
        <meta property="og:title" content={t.title} />
        <meta property="og:description" content="บัตรสมาชิก Love Pier Beach Cafe" />
        <meta property="og:url" content="https://www.lovepier.cafe/member" />
        <meta property="og:type" content="website" />
      </Head>

      <main className="min-h-dvh bg-[#f5f1eb] px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto w-full max-w-md">
          <header className="mb-7 text-center">
            <p className="text-[10px] font-semibold tracking-[0.32em] text-gold-deep">LOVE PIER BEACH CAFE</p>
            <h1 className="mt-3 font-display text-[clamp(30px,8vw,42px)] font-light leading-none tracking-[-0.02em] text-ink">
              {t.heading}
            </h1>
            <p className="mt-3 text-[13px] font-light text-[#555]">{t.tagline}</p>
          </header>

          {status === 'loading' || status === 'submitting' ? (
            <div className="rounded-[28px] border border-black/10 bg-[#fffdf8] px-6 py-14 text-center shadow-[0_24px_70px_rgba(74,53,32,0.08)]">
              <p className="text-[13px] text-muted-strong">
                {status === 'submitting' ? t.submitting : t.loading}
              </p>
            </div>
          ) : null}

          {status === 'logged-out' ? (
            <div className="rounded-[28px] border border-black/10 bg-[#fffdf8] p-7 text-center shadow-[0_24px_70px_rgba(74,53,32,0.08)]">
              {isLiffConfigured() ? (
                <>
                  <p className="mb-6 text-[13px] font-light leading-[1.9] text-[#555]">{t.loginLead}</p>
                  <button
                    type="button"
                    onClick={handleLogin}
                    className="flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-[#06C755] px-5 py-3.5 text-[13px] font-semibold text-white transition hover:bg-[#05b94e]"
                  >
                    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3C6.5 3 2 6.6 2 11c0 4 3.6 7.3 8.5 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6 1.5-1.7 2.6-3.4 2.6-4.9 0-4.4-4.5-8-10-8z" />
                    </svg>
                    {t.login}
                  </button>
                </>
              ) : (
                <p className="text-[13px] font-light leading-[1.9] text-[#555]">{t.unavailable}</p>
              )}
            </div>
          ) : null}

          {status === 'error' ? (
            <div className="rounded-[28px] border border-black/10 bg-[#fffdf8] p-7 text-center shadow-[0_24px_70px_rgba(74,53,32,0.08)]">
              <p className="text-[13px] text-muted-strong">{t.error}</p>
              <button
                type="button"
                onClick={handleLogin}
                className="mt-4 text-[13px] font-semibold text-gold-deep underline underline-offset-4"
              >
                {t.retry}
              </button>
            </div>
          ) : null}

          {status === 'form' ? (
            <form
              onSubmit={handleSubmit}
              className="rounded-[28px] border border-black/10 bg-[#fffdf8] p-7 shadow-[0_24px_70px_rgba(74,53,32,0.08)]"
            >
              <p className="mb-6 text-[13px] font-light leading-[1.9] text-[#555]">{t.formLead}</p>

              <label className="block">
                <span className="text-[11px] font-semibold tracking-[0.14em] text-muted-strong">{t.name}</span>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder={t.namePlaceholder}
                  className="mt-2 min-h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-[15px] text-ink outline-none transition focus:border-gold-deep"
                />
              </label>

              <label className="mt-5 block">
                <span className="text-[11px] font-semibold tracking-[0.14em] text-muted-strong">{t.phone}</span>
                <input
                  type="tel"
                  required
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder={t.phonePlaceholder}
                  className="mt-2 min-h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-[15px] text-ink outline-none transition focus:border-gold-deep"
                />
              </label>

              <label className="mt-5 block">
                <span className="text-[11px] font-semibold tracking-[0.14em] text-muted-strong">{t.birthday}</span>
                <input
                  type="date"
                  value={form.birthday}
                  onChange={(e) => setForm((p) => ({ ...p, birthday: e.target.value }))}
                  className="mt-2 min-h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-[15px] text-ink outline-none transition focus:border-gold-deep"
                />
                <span className="mt-2 block text-[11px] text-muted-strong">{t.birthdayHint}</span>
              </label>

              {formError ? (
                <p className="mt-5 text-[12px] text-[#b3261e]" role="alert">
                  {formError}
                </p>
              ) : null}

              <button
                type="submit"
                className="mt-7 min-h-13 w-full rounded-full bg-gold-deep px-6 py-3.5 text-[14px] font-semibold tracking-[0.04em] text-white transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(177,138,84,0.28)]"
              >
                {t.submit}
              </button>
            </form>
          ) : null}

          {status === 'card' && member ? (
            <div className="overflow-hidden rounded-[28px] border border-black/10 bg-[#fffdf8] shadow-[0_24px_70px_rgba(74,53,32,0.08)]">
              <div className="bg-[#4a3520] px-7 py-6 text-center text-white">
                <p className="text-[10px] tracking-[0.28em] text-white/70">{t.memberNo}</p>
                <strong className="mt-2 block font-display text-[clamp(30px,8vw,40px)] font-normal leading-none tracking-[0.06em]">
                  {member.memberNo}
                </strong>
                {member.name ? <p className="mt-3 text-[13px] text-white/80">{member.name}</p> : null}
              </div>

              <div className="px-7 py-7 text-center">
                {qrDataUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrDataUrl}
                      alt=""
                      className="mx-auto h-56 w-56 rounded-2xl border border-black/10 bg-white p-2"
                    />
                    <p className="mt-4 text-[12px] text-muted-strong">{t.scanHint}</p>
                  </>
                ) : (
                  <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-2xl border border-dashed border-black/15">
                    <p className="text-[12px] text-muted-strong">{t.loading}</p>
                  </div>
                )}
              </div>

              <div className="flex items-end justify-between gap-4 border-t border-black/10 px-7 py-6">
                <span className="text-[11px] tracking-[0.14em] text-muted-strong">{t.points}</span>
                <span className="flex items-end gap-2">
                  <strong className="font-display text-[clamp(28px,7vw,38px)] font-normal leading-none text-gold-deep">
                    {Number(member.pointsBalance || 0).toLocaleString()}
                  </strong>
                  <span className="pb-1 text-[12px] text-muted-strong">{t.pointsUnit}</span>
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </>
  )
}
