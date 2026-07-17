function getSrcSet(url) {
  if (!url || !url.includes('-960w.webp')) return undefined
  const base = url.replace('-960w.webp', '')
  return `${base}-480w.webp 480w, ${base}-960w.webp 960w, ${base}-1440w.webp 1440w`
}

import Head from 'next/head'
import Link from 'next/link'
import Footer from '../../components/Footer'
import EventGallery from '../../components/events/EventGallery'
import { FOOTER_TAGLINES } from '../../lib/footerTagline'
import { useLanguage } from '../../lib/language'

// Fixed-English labels — matches the convention already established on
// /events (e.g. its "THE SYMPHONY CLUB" eyebrow is identical across all
// three language dicts).
const LABELS = {
  dateTime: 'DATE & TIME',
  venue: 'VENUE',
  organizer: 'ORGANIZER',
  registration: 'REGISTRATION & TICKETS',
  from: 'From',
  to: 'To',
  descHeading: 'รายละเอียดกิจกรรม (Description)',
  back: { th: '← กิจกรรมทั้งหมด', en: '← All events', zh: '← 所有活动' },
  note: {
    th: 'วันเวลาอาจเปลี่ยนแปลง กรุณาตรวจสอบกับผู้จัดอีกครั้ง',
    en: 'Date and time are subject to change — please confirm with the organizer.',
    zh: '日期和时间如有变动，请与主办方再次确认。',
  },
  registrationFallback: {
    th: 'กรุณาติดต่อร้านสำหรับข้อมูลเพิ่มเติม',
    en: 'Please contact the shop for more details.',
    zh: '如需更多信息，请联系店家。',
  },
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  )
}
function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
      <path d="M12 2C7.6 2 4 5.6 4 10c0 5.4 6.6 11.1 7.5 11.9.3.3.7.3 1 0C13.4 21.1 20 15.4 20 10c0-4.4-3.6-8-8-8zm0 10.75A2.75 2.75 0 1 1 12 7.25a2.75 2.75 0 0 1 0 5.5z" />
    </svg>
  )
}
function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </svg>
  )
}
function TicketIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0">
      <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a1.5 1.5 0 0 0 0 3V15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a1.5 1.5 0 0 0 0-3V9Z" />
      <path d="M10 7v10" strokeDasharray="2 2" />
    </svg>
  )
}

function formatFull(dateStr, lang) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDate()
  const year = d.getFullYear()
  if (lang === 'th') {
    const weekdays = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์']
    const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
    return `วัน${weekdays[d.getDay()]}ที่ ${day} ${months[d.getMonth()]} ${year}`
  }
  if (lang === 'zh') {
    const weekdays = ['周日','周一','周二','周三','周四','周五','周六']
    return `${year}年${d.getMonth() + 1}月${day}日 ${weekdays[d.getDay()]}`
  }
  const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${weekdays[d.getDay()]}, ${months[d.getMonth()]} ${day}, ${year}`
}

export default function EventDetail({ event }) {
  const { lang } = useLanguage()

  const titleKey = lang === 'th' ? 'titleTh' : lang === 'zh' ? 'titleZh' : 'titleEn'
  const descKey = lang === 'th' ? 'descriptionTh' : lang === 'zh' ? 'descriptionZh' : 'descriptionEn'
  const catKey = lang === 'th' ? 'categoryTh' : lang === 'zh' ? 'categoryZh' : 'categoryEn'
  const regKey = lang === 'th' ? 'registrationInfoTh' : lang === 'zh' ? 'registrationInfoZh' : 'registrationInfoEn'

  const title = event[titleKey] || event.titleEn
  const description = event[descKey]
  const category = event[catKey]
  const registrationInfo = event[regKey] || LABELS.registrationFallback[lang] || LABELS.registrationFallback.en
  const priceLabel = event.price != null ? `฿${event.price.toLocaleString()}` : (lang === 'th' ? 'ฟรี' : lang === 'zh' ? '免费' : 'Free')

  const fromLabel = formatFull(event.eventDate, lang)
  const toLabel = event.endDate && event.endDate !== event.eventDate ? formatFull(event.endDate, lang) : ''

  return (
    <>
      <Head>
        <title>{title} — Love Pier Beach Cafe</title>
      </Head>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <Link href="/events" className="text-[11px] tracking-[0.15em] uppercase text-muted hover:text-gold transition-colors">
          {LABELS.back[lang] || LABELS.back.en}
        </Link>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 lg:gap-10 items-start">
          {/* Hero image */}
          <div className="relative overflow-hidden rounded-2xl bg-[#f2ede6]" style={{ aspectRatio: '4 / 3' }}>
            {event.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.imageUrl}
                srcSet={getSrcSet(event.imageUrl)}
                sizes="(min-width: 1024px) 60vw, 100vw"
                alt={title}
                loading="eager"
                fetchPriority="high"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-20">🎉</div>
            )}
          </div>

          {/* Info sidebar */}
          <div className="lg:sticky lg:top-6 rounded-2xl border border-black/10 bg-[#faf8f5] p-6 sm:p-7 flex flex-col gap-5">
            <h1 className="font-display font-light text-ink text-[clamp(24px,3vw,32px)] leading-tight">{title}</h1>

            <div className="flex items-start gap-3">
              <span className="text-gold mt-0.5"><CalendarIcon /></span>
              <div className="text-[13px] leading-relaxed">
                <p className="text-[10px] tracking-[0.15em] uppercase text-muted mb-1">{LABELS.dateTime}</p>
                {fromLabel ? (
                  <>
                    <p className="text-ink">{LABELS.from}: {fromLabel}{event.timeRange ? `, ${event.timeRange}` : ''}</p>
                    {toLabel && <p className="text-ink mt-0.5">{LABELS.to}: {toLabel}</p>}
                  </>
                ) : (
                  <p className="text-ink">—</p>
                )}
              </div>
            </div>

            {event.location && (
              <div className="flex items-start gap-3">
                <span className="text-gold mt-0.5"><PinIcon /></span>
                <div className="text-[13px] leading-relaxed">
                  <p className="text-[10px] tracking-[0.15em] uppercase text-muted mb-1">{LABELS.venue}</p>
                  <p className="text-ink">{event.location}</p>
                </div>
              </div>
            )}

            {event.organizer && (
              <div className="flex items-start gap-3">
                <span className="text-gold mt-0.5"><PersonIcon /></span>
                <div className="text-[13px] leading-relaxed">
                  <p className="text-[10px] tracking-[0.15em] uppercase text-muted mb-1">{LABELS.organizer}</p>
                  <p className="text-ink">{event.organizer}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <span className="text-gold mt-0.5"><TicketIcon /></span>
              <div className="text-[13px] leading-relaxed">
                <p className="text-[10px] tracking-[0.15em] uppercase text-muted mb-1">{LABELS.registration}</p>
                <p className="text-ink">{registrationInfo}</p>
              </div>
            </div>

            <div className="text-[12px] text-muted leading-relaxed bg-black/[0.03] rounded-xl px-4 py-3">
              {LABELS.note[lang] || LABELS.note.en}
            </div>
          </div>
        </div>

        {/* Category + price badges */}
        <div className="flex items-center gap-3 flex-wrap mt-8">
          {category && (
            <span className="inline-flex text-[10px] tracking-[0.3em] uppercase text-gold border border-gold/50 px-3 py-1.5">
              {category}
            </span>
          )}
          <span className="inline-flex text-[10px] tracking-[0.3em] uppercase text-ink border border-black/15 px-3 py-1.5">
            {priceLabel}
          </span>
        </div>

        {/* Description */}
        {description && (
          <section className="mt-8 max-w-[720px]">
            <h2 className="font-display font-light text-ink mb-3 text-[clamp(20px,2.5vw,26px)]">{LABELS.descHeading}</h2>
            <p className="text-sm text-[#555] leading-[1.9] font-light whitespace-pre-line">{description}</p>
          </section>
        )}
      </div>

      <EventGallery images={event.albumImages || []} lang={lang} />

      <Footer tagline={FOOTER_TAGLINES.events} />
    </>
  )
}

export async function getServerSideProps({ params }) {
  const id = Number(params.id)
  if (!Number.isFinite(id)) return { notFound: true }

  try {
    const { db } = await import('../../lib/db')
    const { events } = await import('../../lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const rows = await db.select().from(events).where(eq(events.id, id)).limit(1)
    const row = rows[0]
    if (!row || !row.isActive) return { notFound: true }

    const event = {
      ...row,
      eventDate: row.eventDate ?? null,
      endDate: row.endDate ?? null,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    }
    return { props: { event } }
  } catch {
    return { notFound: true }
  }
}
