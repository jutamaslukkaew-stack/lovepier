import Head from 'next/head'
import { useState } from 'react'
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
    heroTitle: 'จองที่นั่ง',
    step: '— สำรองที่นั่ง',
    formTitle: 'จองโต๊ะง่าย ๆ ในหน้าเดียว',
    intro: 'เลือกที่นั่ง กรอกข้อมูล แล้วส่งคำขอได้เลย ใช้เวลาไม่ถึง 1 นาที',
    fullName: 'ชื่อ-นามสกุล', phone: 'เบอร์โทร', email: 'อีเมล', date: 'วันที่', time: 'เวลา', guests: 'จำนวนแขก',
    seating: 'โซนที่นั่ง', occasion: 'โอกาสพิเศษ', notes: 'ความต้องการเพิ่มเติม',
    request: 'ยืนยันการจองโต๊ะ', policy: 'ทางร้านจะโทรยืนยันการจองภายใน 2 ชั่วโมง',
    chooseSeat: '1 · เลือกที่นั่ง', detailsStep: '2 · วัน เวลา และจำนวนคน', contactStep: '3 · ชื่อและเบอร์โทร', optional: 'ไม่บังคับ',
    selectTime: 'เลือกเวลา',
    namePlaceholder: 'ชื่อของคุณ',
    emailPlaceholder: 'you@example.com',
    sentMessage: 'ส่งคำขอจองโต๊ะแล้ว เราจะยืนยันทางอีเมลหรือ LINE ภายใน 2 ชั่วโมง',
    modalSuccessTitle: 'ส่งคำขอแล้ว',
    modalErrorTitle: 'ส่งไม่สำเร็จ',
    modalClose: 'ปิด',
    sending: 'กำลังส่ง…',
    sendError: 'ส่งไม่สำเร็จ กรุณาลองอีกครั้งหรือโทร 064-252-3293',
    sendConfigError: 'ระบบอีเมลยังไม่พร้อม กรุณาโทร 064-252-3293 หรืออีเมล lovepier.cafe@gmail.com',
    imageAlt: 'บรรยากาศภายในร้าน',
    guestOptions: ['1 คน', '2 คน', '3 คน', '4 คน', '5–6 คน', '7+ คน (กลุ่ม)'],
    seatingOptions: ['ริมหน้าต่าง', 'โซนเทอเรซ', 'เคาน์เตอร์บาร์', 'มุมส่วนตัว'],
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
    formTitle: '一分钟轻松订座',
    intro: '选择座位、填写信息并提交，即可完成。',
    fullName: '姓名', phone: '电话', email: '邮箱', date: '日期', time: '时间', guests: '人数',
    seating: '座位偏好', occasion: '到店目的', notes: '特别需求',
    request: '确认预订', policy: '本店将在 2 小时内致电确认。',
    chooseSeat: '1 · 选择座位', detailsStep: '2 · 日期、时间与人数', contactStep: '3 · 姓名与电话', optional: '选填',
    selectTime: '选择时间',
    namePlaceholder: '您的姓名',
    emailPlaceholder: 'you@example.com',
    sentMessage: '预订请求已发送，我们将在 2 小时内通过邮件或 LINE 确认。',
    modalSuccessTitle: '已提交',
    modalErrorTitle: '发送失败',
    modalClose: '关闭',
    sending: '发送中…',
    sendError: '发送失败，请重试或直接致电 064-252-3293',
    sendConfigError: '邮件服务尚未配置，请致电 064-252-3293 或发送邮件至 lovepier.cafe@gmail.com',
    imageAlt: '店内环境',
    guestOptions: ['1 位', '2 位', '3 位', '4 位', '5–6 位', '7 位以上（团体）'],
    seatingOptions: ['靠窗', '露台', '吧台', '安静角落'],
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
    formTitle: 'Book a table in one simple step',
    intro: 'Choose your seat, add your details, and send. It takes less than a minute.',
    fullName: 'Full name', phone: 'Phone', email: 'Email', date: 'Date', time: 'Time', guests: 'Guests',
    seating: 'Seating preference', occasion: 'Occasion', notes: 'Special requests',
    request: 'Confirm reservation', policy: 'We will call to confirm within 2 hours.',
    chooseSeat: '1 · Choose a seat', detailsStep: '2 · Date, time & guests', contactStep: '3 · Name & phone', optional: 'Optional',
    selectTime: 'Select time',
    namePlaceholder: 'Your name',
    emailPlaceholder: 'you@example.com',
    sentMessage: 'Your reservation request has been sent. We will confirm by email or LINE within 2 hours.',
    modalSuccessTitle: 'Request sent',
    modalErrorTitle: 'Could not send',
    modalClose: 'Close',
    sending: 'Sending…',
    sendError: 'Could not send. Please try again or call 064-252-3293',
    sendConfigError: 'Email is not set up yet. Please call 064-252-3293 or email lovepier.cafe@gmail.com',
    imageAlt: 'Cafe interior',
    guestOptions: ['1 person', '2 people', '3 people', '4 people', '5–6 people', '7+ people (group)'],
    seatingOptions: ['Window seat', 'Outdoor terrace', 'Counter / bar', 'Private corner'],
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
  const [seatingIndex, setSeatingIndex] = useState(0)
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
      email: '',
      date: form.date.value,
      time: form.time.value,
      guests: form.guests.value,
      seating: t.seatingOptions[seatingIndex],
      occasion: '',
      notes: form.notes.value,
    }
    try {
      await submitToApi('/api/reservation', payload, buildReservationEmail(payload))
      setStatus('success')
      form.reset()
      setSeatingIndex(0)
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

      <section id="reservation-form" className="grid grid-cols-1 lg:grid-cols-[4fr_6fr] border-b border-black/10 bg-[#f5f2ee]">
        {/* Left — poster image */}
        <div className="relative overflow-hidden border-b border-black/10 lg:border-b-0 lg:border-r min-h-[240px] sm:min-h-[320px] lg:min-h-[calc(100svh-var(--nav-h,120px))] lg:h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="absolute inset-0 w-full h-full object-cover object-[50%_42%] [filter:saturate(0.78)]"
            src="/uploads/reservation-interior.webp"
            alt={t.imageAlt}
          />
        </div>

        {/* Form — visible immediately, no extra click or duplicate intro */}
        <div className="px-5 py-9 sm:px-10 sm:py-12 lg:px-14 lg:py-14 flex flex-col justify-center reveal">
          <div className="mb-8 max-w-2xl">
            <p className="mb-2 text-[10px] font-semibold tracking-[0.28em] text-gold-deep">{t.heroTag}</p>
            <h1 className="font-display text-[clamp(34px,4.5vw,58px)] font-light leading-[1.05] text-ink">{t.formTitle}</h1>
            <p className="mt-3 text-[13px] font-light leading-relaxed text-[#666]">{t.intro}</p>
          </div>

          <form className="flex max-w-2xl flex-col gap-7" onSubmit={handleSubmit}>
            <fieldset disabled={status === 'sending'}>
              <legend className="mb-3 text-[11px] font-semibold tracking-[0.12em] text-ink">{t.chooseSeat}</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {t.seatingOptions.map((seat, index) => (
                  <button
                    key={seat}
                    type="button"
                    onClick={() => setSeatingIndex(index)}
                    aria-pressed={seatingIndex === index}
                    className={`min-h-14 rounded-xl border px-3 py-3 text-[12px] leading-snug transition-all ${seatingIndex === index ? 'border-[#4a3520] bg-[#4a3520] text-white shadow-sm' : 'border-black/10 bg-white text-[#555] hover:border-[#4a3520]/40'}`}
                  >
                    <span aria-hidden="true" className="mr-1">{['▣', '☼', '▤', '◒'][index]}</span> {seat}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <p className="mb-3 text-[11px] font-semibold tracking-[0.12em] text-ink">{t.detailsStep}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <input
                  className="res-input col-span-2 rounded-xl border border-black/10 bg-white px-4 py-3.5 normal-case tracking-[0.06em] sm:col-span-1"
                  type="date"
                  id="date"
                  name="date"
                  min={new Date().toLocaleDateString('en-CA')}
                  required
                  disabled={status === 'sending'}
                />
                <select key={`time-${lang}`} className="res-input rounded-xl border border-black/10 bg-white px-4 py-3.5" id="time" name="time" required disabled={status === 'sending'} defaultValue="">
                  <option value="" disabled>{t.time}</option>
                  {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                </select>
                <select key={`guests-${lang}`} className="res-input rounded-xl border border-black/10 bg-white px-4 py-3.5" id="guests" name="guests" required disabled={status === 'sending'}>
                  {t.guestOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div>
              <p className="mb-3 text-[11px] font-semibold tracking-[0.12em] text-ink">{t.contactStep}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                className="res-input rounded-xl border border-black/10 bg-white px-4 py-3.5"
                type="text"
                id="name"
                name="name"
                placeholder={t.fullName}
                required
                disabled={status === 'sending'}
              />
              <input
                className="res-input rounded-xl border border-black/10 bg-white px-4 py-3.5"
                type="tel"
                id="phone"
                name="phone"
                placeholder={t.phone}
                required
                disabled={status === 'sending'}
              />
              </div>
            </div>

            <details className="group rounded-xl border border-black/10 bg-white px-4 py-3">
              <summary className="cursor-pointer list-none text-[12px] text-muted-strong">＋ {t.notes} <span className="text-[10px]">({t.optional})</span></summary>
              <textarea className="res-input mt-2" id="notes" name="notes" placeholder={t.notesPlaceholder} disabled={status === 'sending'} />
            </details>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="submit" disabled={status === 'sending'} className="min-h-14 w-full rounded-full bg-[#4a3520] px-8 text-[12px] font-semibold tracking-[0.12em] text-white transition-all hover:-translate-y-0.5 hover:bg-[#3a2818] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                {status === 'sending' ? t.sending : t.request} →
              </button>
              <p className="text-[10px] leading-relaxed text-muted-strong">{t.policy}</p>
            </div>
          </form>
        </div>
      </section>

      <Footer tagline={FOOTER_TAGLINES.reservation} />
    </>
  )
}
