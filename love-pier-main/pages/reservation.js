import Head from 'next/head'
import { useEffect, useState } from 'react'
import Footer from '../components/Footer'
import FormFeedbackModal from '../components/FormFeedbackModal'
import { FOOTER_TAGLINES } from '../lib/footerTagline'
import { useLanguage } from '../lib/language'
import { buildReservationEmail } from '../lib/emailContent'
import { submitToApi } from '../lib/submitToApi'

const RESERVATION_COPY = {
  th: {
    title: 'Reservation — Love Pier Beach Cafe',
    addressLine1: '800 108 แสนสุข',
    addressLine2: 'อำเภอเมือง จังหวัดชลบุรี 20130',
    hoursLabel: 'เปิดทุกวัน (ยกเว้นวันพุธ)',
    hoursValue: '09:00 – 18:00',
    phoneLabel: 'โทร',
    emailLabel: 'อีเมล',
    badge: 'ยืนยันภายใน 2 ชม.',
    mapTitle: 'แผนที่ Love Pier Beach Cafe',
    openMaps: 'เปิดใน Google Maps',
    heroTag: 'จองโต๊ะ',
    heroTitle: 'จองที่นั่ง\nริมทะเล',
    step: '— สำรองที่นั่ง',
    formTitle: 'บอกวันเวลา\nที่คุณจะมา',
    intro: 'เราจะยืนยันการจองภายใน 2 ชั่วโมงทางอีเมลหรือ LINE',
    fullName: 'ชื่อ-นามสกุล', phone: 'เบอร์โทร', email: 'อีเมล', date: 'วันที่', time: 'เวลา', guests: 'จำนวนแขก',
    seating: 'โซนที่นั่ง', occasion: 'โอกาสพิเศษ', notes: 'ความต้องการเพิ่มเติม',
    request: 'ส่งคำขอจองโต๊ะ', policy: 'การส่งแบบฟอร์มถือว่ายอมรับนโยบายความเป็นส่วนตัวและการยกเลิก',
    selectTime: 'เลือกเวลา',
    namePlaceholder: 'ชื่อของคุณ',
    emailPlaceholder: 'you@example.com',
    sentMessage: 'ส่งคำขอจองโต๊ะแล้ว เราจะยืนยันทางอีเมลหรือ LINE ภายใน 2 ชั่วโมง',
    modalSuccessTitle: 'ส่งคำขอแล้ว',
    modalErrorTitle: 'ส่งไม่สำเร็จ',
    modalClose: 'ปิด',
    sending: 'กำลังส่ง…',
    sendError: 'ส่งไม่สำเร็จ กรุณาลองอีกครั้งหรือโทร 064-252-3293',
    sendConfigError: 'ระบบอีเมลยังไม่พร้อม กรุณาโทร 064-252-3293 หรืออีเมล cafe.lovepier@gmail.com',
    imageAlt: 'บรรยากาศภายในร้าน',
    guestOptions: ['1 คน', '2 คน', '3 คน', '4 คน', '5–6 คน', '7+ คน (กลุ่ม)'],
    seatingOptions: ['ไม่ระบุ', 'ริมหน้าต่าง', 'โซนเทอเรซ', 'เคาน์เตอร์บาร์', 'มุมส่วนตัว'],
    occasions: ['มาทานทั่วไป', 'วันเกิด', 'วันครบรอบ', 'เดต', 'ธุรกิจ', 'อื่นๆ'],
    notesPlaceholder: 'แพ้อาหาร ข้อจำกัดด้านอาหาร หรือคำขอพิเศษ…',
    fine: 'เงื่อนไขการจอง',
    finePrint: [
      { n: '01', title: 'การยืนยัน', text: 'เราจะยืนยันทางอีเมลหรือ LINE ภายใน 2 ชั่วโมง หากติดต่อไม่ได้เราจะโทรกลับ' },
      { n: '02', title: 'จองกลุ่มใหญ่', text: 'สำหรับกลุ่ม 7 คนขึ้นไป กรุณาโทรจองโดยตรง มีมุมส่วนตัวรองรับ' },
      { n: '03', title: 'มาสาย', text: 'เราถือที่นั่งไว้ให้ 20 นาทีหลังเวลาจอง หลังจากนั้นอาจให้ลูกค้า walk-in' },
      { n: '04', title: 'การยกเลิก', text: 'รบกวนยกเลิกกับทางร้าน ก่อนเวลาจริง 4 ชั่วโมง' },
    ],
  },
  zh: {
    title: 'Reservation — Love Pier Beach Cafe',
    addressLine1: '800 108 Saensuk',
    addressLine2: 'Mueang Chonburi, Chonburi 20130',
    hoursLabel: '每日营业（周三除外）',
    hoursValue: '09:00 – 18:00',
    phoneLabel: '电话',
    emailLabel: '邮箱',
    badge: '2 小时内确认',
    mapTitle: 'Love Pier Beach Cafe 地图',
    openMaps: '在 Google Maps 打开',
    heroTag: '预订座位',
    heroTitle: '预留海边\n座位',
    step: '— 预订座位',
    formTitle: '告诉我们\n您的到店时间',
    intro: '我们会在 2 小时内通过邮件或 LINE 确认预订。',
    fullName: '姓名', phone: '电话', email: '邮箱', date: '日期', time: '时间', guests: '人数',
    seating: '座位偏好', occasion: '到店目的', notes: '特别需求',
    request: '提交预订', policy: '提交即表示您同意取消与隐私政策。',
    selectTime: '选择时间',
    namePlaceholder: '您的姓名',
    emailPlaceholder: 'you@example.com',
    sentMessage: '预订请求已发送，我们将在 2 小时内通过邮件或 LINE 确认。',
    modalSuccessTitle: '已提交',
    modalErrorTitle: '发送失败',
    modalClose: '关闭',
    sending: '发送中…',
    sendError: '发送失败，请重试或直接致电 064-252-3293',
    sendConfigError: '邮件服务尚未配置，请致电 064-252-3293 或发送邮件至 cafe.lovepier@gmail.com',
    imageAlt: '店内环境',
    guestOptions: ['1 位', '2 位', '3 位', '4 位', '5–6 位', '7 位以上（团体）'],
    seatingOptions: ['无偏好', '靠窗', '露台', '吧台', '安静角落'],
    occasions: ['日常到访', '生日', '纪念日', '约会', '商务', '其他'],
    notesPlaceholder: '过敏、饮食限制或其他安排…',
    fine: '预订说明',
    finePrint: [
      { n: '01', title: '预订确认', text: '我们将在 2 小时内通过邮件或 LINE 确认。若联系不上，我们会致电您。' },
      { n: '02', title: '大型团体', text: '7 人以上请致电直接预订。设有私人角落。' },
      { n: '03', title: '迟到', text: '预订时间后我们为您保留座位 20 分钟，之后可能提供给现场客人。' },
      { n: '04', title: '取消', text: '请于实际预订时间前 4 小时联系本店取消。' },
    ],
  },
  en: {
    title: 'Reservation — Love Pier Beach Cafe',
    addressLine1: '800 108 Saensuk',
    addressLine2: 'Mueang Chonburi, Chonburi 20130',
    hoursLabel: 'Open daily (except Wednesday)',
    hoursValue: '09:00 – 18:00',
    phoneLabel: 'Phone',
    emailLabel: 'Email',
    badge: 'Confirmed within 2 hours',
    mapTitle: 'Love Pier Beach Cafe location',
    openMaps: 'Open in Google Maps',
    heroTag: 'Reserve a table',
    heroTitle: 'Save a seat\nby the sea',
    step: '— Reserve a table',
    formTitle: "Tell us when\nyou're coming",
    intro: 'Reservations are confirmed within 2 hours by email or LINE.',
    fullName: 'Full name', phone: 'Phone', email: 'Email', date: 'Date', time: 'Time', guests: 'Guests',
    seating: 'Seating preference', occasion: 'Occasion', notes: 'Special requests',
    request: 'Request Table', policy: 'By submitting you agree to our cancellation & privacy policy.',
    selectTime: 'Select time',
    namePlaceholder: 'Your name',
    emailPlaceholder: 'you@example.com',
    sentMessage: 'Your reservation request has been sent. We will confirm by email or LINE within 2 hours.',
    modalSuccessTitle: 'Request sent',
    modalErrorTitle: 'Could not send',
    modalClose: 'Close',
    sending: 'Sending…',
    sendError: 'Could not send. Please try again or call 064-252-3293',
    sendConfigError: 'Email is not set up yet. Please call 064-252-3293 or email cafe.lovepier@gmail.com',
    imageAlt: 'Cafe interior',
    guestOptions: ['1 person', '2 people', '3 people', '4 people', '5–6 people', '7+ people (group)'],
    seatingOptions: ['No preference', 'Window seat', 'Outdoor terrace', 'Counter / bar', 'Private corner'],
    occasions: ['Just visiting', 'Birthday', 'Anniversary', 'Date', 'Business', 'Other'],
    notesPlaceholder: 'Allergies, dietary needs, special arrangements…',
    fine: 'The fine print',
    finePrint: [
      { n: '01', title: 'Confirmation', text: 'We will confirm by email or LINE within 2 hours. If we cannot reach you, we will call.' },
      { n: '02', title: 'Large groups', text: 'For groups of 7 or more, please call to book directly. A private corner is available.' },
      { n: '03', title: 'Late arrival', text: 'We hold your table for 20 minutes after the reserved time. After that, we may seat walk-in guests.' },
      { n: '04', title: 'Cancellation', text: 'Please cancel with us at least 4 hours before your reservation time.' },
    ],
  },
}

export default function Reservation() {
  const { lang } = useLanguage()
  const t = RESERVATION_COPY[lang] || RESERVATION_COPY.en
  const [occasion, setOccasion] = useState(t.occasions[0])
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    setErrorMessage('')
    const form = e.currentTarget
    const payload = {
      name: form.name.value,
      phone: form.phone.value,
      email: form.email.value,
      date: form.date.value,
      time: form.time.value,
      guests: form.guests.value,
      seating: form.seating.value,
      occasion,
      notes: form.notes.value,
    }
    try {
      await submitToApi('/api/reservation', payload, buildReservationEmail(payload))
      setStatus('success')
      form.reset()
      setOccasion(t.occasions[0])
    } catch (err) {
      setStatus('error')
      setErrorMessage(
        err.status === 503 && err.message && err.message !== 'FORM_SUBMIT_FAILED'
          ? err.message
          : err.status === 503
            ? t.sendConfigError
            : t.sendError
      )
    }
  }

  useEffect(() => {
    setOccasion(RESERVATION_COPY[lang]?.occasions[0] || RESERVATION_COPY.en.occasions[0])
  }, [lang])

  const showModal = status === 'success' || status === 'error'
  const closeModal = () => {
    setStatus('idle')
    setErrorMessage('')
  }

  return (
    <>
      <Head>
        <title>{t.title}</title>
      </Head>

      <FormFeedbackModal
        open={showModal}
        variant={status === 'error' ? 'error' : 'success'}
        title={status === 'error' ? t.modalErrorTitle : t.modalSuccessTitle}
        message={status === 'error' ? errorMessage : t.sentMessage}
        closeLabel={t.modalClose}
        onClose={closeModal}
      />

      <section className="grid grid-cols-1 lg:grid-cols-[11fr_9fr] lg:items-stretch border-b border-black/10 bg-white">
        {/* Left — poster image */}
        <div className="relative overflow-hidden border-b border-black/10 lg:border-b-0 lg:border-r min-h-[58vh] sm:min-h-[66vh] lg:min-h-[calc(100svh-4.25rem)] lg:h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="absolute inset-0 w-full h-full object-cover object-[50%_42%] scale-[1.1] origin-center [filter:saturate(0.82)]"
            src="/uploads/reservation-interior.png"
            alt={t.imageAlt}
          />
        </div>

        {/* Middle — info + form */}
        <div className="px-5 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-14 border-b border-black/10 lg:border-b-0 flex flex-col justify-center reveal">
          <div className="mb-8 lg:mb-10">
            <h1 className="text-[13px] sm:text-sm font-medium tracking-[0.14em] uppercase text-ink leading-snug">
              {t.addressLine1}
            </h1>
            <p className="mt-1 text-[11px] sm:text-xs tracking-[0.12em] uppercase text-muted">{t.addressLine2}</p>
            <a
              href="https://maps.app.goo.gl/CYDRrd6hoxRv7z4j8"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-[10px] tracking-[0.14em] uppercase text-muted hover:text-ink transition-colors"
            >
              <span aria-hidden>◎</span>
              {t.openMaps}
            </a>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] sm:text-[11px] tracking-[0.14em] uppercase text-ink mb-6">
            <a href="tel:0642523293" className="hover:text-gold transition-colors">
              {t.phoneLabel} 064-252-3293
            </a>
            <a href="mailto:cafe.lovepier@gmail.com" className="hover:text-gold transition-colors break-all">
              {t.emailLabel} cafe.lovepier@gmail.com
            </a>
          </div>

          <p className="text-[10px] sm:text-[11px] tracking-[0.16em] uppercase text-ink mb-5">
            {t.hoursLabel} : {t.hoursValue}
          </p>

          <span className="inline-flex w-fit items-center rounded-full bg-[#1e3d2f] text-white text-[9px] sm:text-[10px] tracking-[0.2em] uppercase px-4 py-2 mb-8 lg:mb-10">
            {t.badge}
          </span>

          <div className="mb-6">
            <p className="text-[10px] tracking-[0.4em] uppercase text-gold mb-3">{t.step}</p>
            <h2 className="font-display font-light leading-[1.05] text-[clamp(28px,3.2vw,38px)] text-ink">
              {t.formTitle.split('\n').map((line, i) => (
                <span key={i}>{line}{i === 0 ? <br /> : null}</span>
              ))}
            </h2>
            <p className="mt-3 text-[12px] text-[#777] font-light leading-[1.7] max-w-[420px]">{t.intro}</p>
          </div>

          <form className="flex flex-col gap-3 max-w-[520px]" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                className="flore-input"
                type="text"
                id="name"
                name="name"
                placeholder={t.fullName}
                required
                disabled={status === 'sending'}
              />
              <input
                className="flore-input"
                type="tel"
                id="phone"
                name="phone"
                placeholder={t.phone}
                required
                disabled={status === 'sending'}
              />
            </div>
            <input
              className="flore-input"
              type="email"
              id="email"
              name="email"
              placeholder={t.email}
              required
              disabled={status === 'sending'}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                className="flore-input normal-case tracking-[0.06em]"
                type="date"
                id="date"
                name="date"
                required
                disabled={status === 'sending'}
              />
              <select
                key={`time-${lang}`}
                className="flore-input"
                id="time"
                name="time"
                required
                disabled={status === 'sending'}
                defaultValue=""
              >
                <option value="" disabled>{t.time}</option>
                {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'].map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                key={`guests-${lang}`}
                className="flore-input"
                id="guests"
                name="guests"
                required
                disabled={status === 'sending'}
              >
                {t.guestOptions.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <select
                key={`seating-${lang}`}
                className="flore-input"
                id="seating"
                name="seating"
                disabled={status === 'sending'}
              >
                {t.seatingOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <select
              key={`occasion-${lang}`}
              className="flore-input"
              id="occasion"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              disabled={status === 'sending'}
            >
              {t.occasions.map((occ) => (
                <option key={occ} value={occ}>{occ}</option>
              ))}
            </select>
            <textarea
              className="flore-input"
              id="notes"
              name="notes"
              placeholder={t.notes}
              disabled={status === 'sending'}
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="mt-4 w-full sm:w-auto self-start bg-ink text-bg text-[10px] tracking-[0.22em] uppercase px-8 py-3.5 hover:bg-gold hover:text-ink transition-colors duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'sending' ? t.sending : t.request}
            </button>
          </form>
        </div>
      </section>

      <Footer tagline={FOOTER_TAGLINES.reservation} />
    </>
  )
}
