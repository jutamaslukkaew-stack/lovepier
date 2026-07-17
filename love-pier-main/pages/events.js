function getSrcSet(url) {
  if (!url || !url.includes('-960w.webp')) return undefined
  const base = url.replace('-960w.webp', '')
  return `${base}-480w.webp 480w, ${base}-960w.webp 960w, ${base}-1440w.webp 1440w`
}

import Head from 'next/head'
import Link from 'next/link'
import Footer from '../components/Footer'
import PageHero from '../components/PageHero'
import EventCard from '../components/events/EventCard'
import { FOOTER_TAGLINES } from '../lib/footerTagline'
import { useLanguage } from '../lib/language'

// Fixed-English section labels — this page already treats some labels as
// intentionally untranslated (e.g. t.featured is the literal string
// 'THE SYMPHONY CLUB' in all three language dicts below), so these follow
// the same established convention rather than being duplicated per language.
const LABELS = {
  upcoming: 'Upcoming Events',
  past: 'Past Events',
  eventsCount: 'Events',
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-[18px] h-[18px]">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-[18px] h-[18px]">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  )
}

const EVENTS_COPY = {
  th: {
    title: 'Events — Love Pier Beach Cafe',
    heroBrand: 'Love Pier',
    heroSuffix: 'เสิร์ฟความสนุก',
    desc: 'กิจกรรมพิเศษ ภายในร้านของเรา',
    featured: 'THE SYMPHONY CLUB',
    reserve: 'จองโต๊ะ',
    add: 'เพิ่มลงปฏิทิน',
    weekly: 'กิจกรรมประจำวัน',
    weeklyDesc: 'กิจกรรมที่คุณมาได้ทุกวัน',
    weeklyGallery: [
      { src: '/uploads/events-surf-pool.webp', alt: 'Surf Pool' },
      { src: '/uploads/events-jet-ski.webp', alt: 'เจ็ตสกี' },
      { src: '/uploads/events-skimboard.webp', alt: 'Sup Board & Skim Board' },
      { src: '/uploads/events-kayak.webp', alt: 'พายเรือคายัค' },
    ],
    freeLabel: 'ฟรี',
    featuredImageAlt: 'Featured Event',
    perPerson: ' ต่อท่าน',
    recurring: [
      { day: 'ทุกวัน(ยกเว้นวันพุธ)', title: 'Surf Pool', text: 'สัมผัสความสนุกของการโต้คลื่นในสระคลื่นมาตรฐาน เหมาะทั้งมือใหม่และสายเซิร์ฟ', time: '10:00 – 20:00' },
      { day: 'ทุกวัน (ยกเว้นวันพุธ)', title: 'เจ็ตสกี', text: 'เร่งความเร็วบนผืนน้ำกับเจ็ตสกี สัมผัสความตื่นเต้นแบบเต็มสปีด', time: '10:00 – 20:00' },
      { day: 'ทุกวัน (ยกเว้นวันพุธ)', title: 'Sup Board & Skim Board', text: 'สองสไตล์ความสนุกบนบอร์ด ทั้งพายเล่นชิล ๆ และไถลสุดมันส์ริมชายหาด', time: '10:00 – 20:00' },
      { day: 'ทุกวัน (ยกเว้นวันพุธ)', title: 'พายเรือคายัค', text: 'พายเรือคายัคสำรวจชายฝั่งบางแสน สนุกได้ทั้งเดี่ยวและคู่', time: '10:00 – 20:00' },
    ],
  },
  zh: {
    title: 'Events — Love Pier Beach Cafe',
    heroBrand: 'Love Pier',
    heroSuffix: '带来欢乐',
    desc: '我们店里的特别活动。',
    featured: 'THE SYMPHONY CLUB',
    reserve: '预订座位',
    add: '加入日历',
    weekly: '每日固定活动',
    weeklyDesc: '每天都有，直接到店即可。',
    weeklyGallery: [
      { src: '/uploads/events-surf-pool.webp', alt: 'Surf Pool' },
      { src: '/uploads/events-jet-ski.webp', alt: '水上摩托' },
      { src: '/uploads/events-skimboard.webp', alt: 'Sup Board & Skim Board' },
      { src: '/uploads/events-kayak.webp', alt: '皮划艇' },
    ],
    freeLabel: '免费',
    featuredImageAlt: 'Featured Event',
    perPerson: ' 每人',
    recurring: [
      { day: '每天（周三除外）', title: 'Surf Pool', text: '在标准造浪池中体验冲浪乐趣，新手与冲浪爱好者都适合。', time: '10:00 – 20:00' },
      { day: '每天（周三除外）', title: '水上摩托', text: '驾驶水上摩托驰骋海面，感受全速刺激。', time: '10:00 – 20:00' },
      { day: '每天（周三除外）', title: 'Sup Board & Skim Board', text: '两种板上玩法——悠闲划水，或在海滩边畅快滑行。', time: '10:00 – 20:00' },
      { day: '每天（周三除外）', title: '皮划艇', text: '划着皮划艇探索邦盛海岸，单人或双人皆宜。', time: '10:00 – 20:00' },
    ],
  },
  en: {
    title: 'Events — Love Pier Beach Cafe',
    heroBrand: 'Love Pier',
    heroSuffix: 'Serves the Fun',
    desc: 'Special activities at our cafe.',
    featured: 'THE SYMPHONY CLUB',
    reserve: 'Reserve a Table',
    add: 'Add to calendar',
    weekly: 'Daily activities',
    weeklyDesc: 'Something to enjoy every day — just show up.',
    weeklyGallery: [
      { src: '/uploads/events-surf-pool.webp', alt: 'Surf Pool' },
      { src: '/uploads/events-jet-ski.webp', alt: 'Jet Ski' },
      { src: '/uploads/events-skimboard.webp', alt: 'Sup Board & Skim Board' },
      { src: '/uploads/events-kayak.webp', alt: 'Kayaking' },
    ],
    freeLabel: 'Free',
    featuredImageAlt: 'Featured Event',
    perPerson: ' per person',
    recurring: [
      { day: 'Every day (except Wednesday)', title: 'Surf Pool', text: 'Ride the waves in a standard surf pool — great for beginners and seasoned surfers alike.', time: '10:00 – 20:00' },
      { day: 'Every day (except Wednesday)', title: 'Jet Ski', text: 'Pick up speed on the water with jet skis and feel the full-throttle thrill.', time: '10:00 – 20:00' },
      { day: 'Every day (except Wednesday)', title: 'Sup Board & Skim Board', text: 'Two board styles — easy paddling or high-energy slides along the beach.', time: '10:00 – 20:00' },
      { day: 'Every day (except Wednesday)', title: 'Kayaking', text: 'Explore the Bang Saen coastline by kayak — fun solo or as a pair.', time: '10:00 – 20:00' },
    ],
  },
}

function formatEventDate(dateStr, lang) {
  if (!dateStr) return { day: '', month: '', dateFull: '', year: '', weekday: '' }
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDate()
  const year = d.getFullYear()
  const weekdayEn = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]
  const weekdayTh = ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'][d.getDay()]
  const weekdayZh = ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()]
  if (lang === 'th') {
    const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
    const m = months[d.getMonth()]
    return { day: String(day), month: `${m} ${year}`, dateFull: `${weekdayTh} ${day} ${m}`, year: String(year) }
  }
  if (lang === 'zh') {
    const m = d.getMonth() + 1
    return { day: String(day), month: `${year}年${m}月`, dateFull: `${m}月${day}日 ${weekdayZh}`, year: String(year) }
  }
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const m = months[d.getMonth()]
  return { day: String(day), month: `${m} ${year}`, dateFull: `${weekdayEn} ${day} ${m}`, year: String(year) }
}

export default function Events({ dbEvents = [] }) {
  const { lang } = useLanguage()
  const t = EVENTS_COPY[lang] || EVENTS_COPY.en

  const activeEvents = dbEvents.filter((e) => e.isActive)
  const dbFeatured = activeEvents.find((e) => e.isFeatured) || null

  const titleKey = lang === 'th' ? 'titleTh' : lang === 'zh' ? 'titleZh' : 'titleEn'
  const descKey = lang === 'th' ? 'descriptionTh' : lang === 'zh' ? 'descriptionZh' : 'descriptionEn'
  const entrySubKey = lang === 'th' ? 'entrySubTh' : lang === 'zh' ? 'entrySubZh' : 'entrySubEn'
  const catKey = lang === 'th' ? 'categoryTh' : lang === 'zh' ? 'categoryZh' : 'categoryEn'
  const freeLabel = t.freeLabel

  const fe = dbFeatured
    ? (() => {
        const d = formatEventDate(dbFeatured.eventDate, lang)
        const priceStr = dbFeatured.price != null ? `฿${dbFeatured.price.toLocaleString()}` : freeLabel
        return {
          title: dbFeatured[titleKey] || dbFeatured.titleEn,
          titleEm: dbFeatured.titleEm,
          date: d.dateFull,
          year: d.year,
          time: dbFeatured.timeRange,
          timeSub: dbFeatured.timeSub,
          entry: dbFeatured.price != null ? `${priceStr}${t.perPerson}` : freeLabel,
          entrySub: dbFeatured[entrySubKey],
          desc: dbFeatured[descKey],
          imageUrl: dbFeatured.imageUrl || null,
        }
      })()
    : null

  // Upcoming vs Past is always derived from the date (never a manual admin
  // toggle) — effective end = endDate if set, else the single eventDate.
  // The featured event is included here too so it also shows as a card,
  // in addition to its hero spotlight above.
  const todayStr = new Date().toISOString().slice(0, 10)
  const gridEvents = activeEvents.map((e) => {
    const d = formatEventDate(e.eventDate, lang)
    const effectiveEnd = e.endDate || e.eventDate
    return {
      id: e.id,
      title: e[titleKey] || e.titleEn,
      imageUrl: e.imageUrl,
      location: e.location,
      dateLabel: d.dateFull ? `${d.dateFull} ${d.year}` : '',
      isPast: effectiveEnd ? effectiveEnd < todayStr : false,
      sortKey: effectiveEnd || '',
    }
  })
  const upcomingEvents = gridEvents.filter((e) => !e.isPast).sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  const pastEvents = gridEvents.filter((e) => e.isPast).sort((a, b) => b.sortKey.localeCompare(a.sortKey))

  return (
    <>
      <Head>
        <title>{t.title}</title>
      </Head>

      <PageHero title={t.heroBrand + ' ' + t.heroSuffix} />

      <div className="bg-[#f5f2ee] px-6 py-8 text-center border-b border-black/10">
        <p className="text-[11px] tracking-[0.05em] text-gold mb-1">{t.featured}</p>
        <p className="font-display font-light text-ink text-[clamp(22px,4vw,32px)] leading-tight">{t.desc}</p>
      </div>

      {fe && <section className="grid grid-cols-1 lg:grid-cols-2 lg:items-stretch border-b border-black/10 reveal-img">
        <div className="relative overflow-hidden aspect-[4/3] lg:aspect-auto lg:min-h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="absolute inset-0 w-full h-full object-cover object-[50%_42%] scale-[1.14] origin-center [filter:saturate(0.58)_brightness(0.9)_contrast(1.04)]"
            src={fe.imageUrl || '/uploads/events-flow-sunset.webp'}
            alt={t.featuredImageAlt}
            loading="eager"
            fetchPriority="high"
            srcSet={getSrcSet(fe.imageUrl)}
            sizes="(min-width: 1024px) 50vw, 100vw"
          />
        </div>
        <div className="px-4 py-12 flex flex-col justify-center sm:px-6 sm:py-12 lg:px-16 lg:py-20">
          <span className="inline-flex text-[10px] tracking-[0.3em] uppercase text-gold border border-gold/50 px-3 py-1.5 mb-5 w-fit">{t.featured}</span>
          <h2 className="font-display font-light leading-none text-ink tracking-[-0.02em] mb-4 text-[clamp(40px,5vw,64px)]">{fe.title}<br /><em className="italic text-gold">{fe.titleEm}</em></h2>
          <div className="flex gap-8 mb-6 py-4 border-t border-b border-black/10 flex-wrap sm:gap-5">
            <div className="text-[11px] tracking-[0.2em] text-muted uppercase"><strong className="text-ink font-medium">{fe.date}</strong><br />{fe.year}</div>
            <div className="text-[11px] tracking-[0.2em] text-muted uppercase"><strong className="text-ink font-medium">{fe.time}</strong><br />{fe.timeSub}</div>
            <div className="text-[11px] tracking-[0.2em] text-muted uppercase"><strong className="text-ink font-medium">{fe.entry}</strong><br />{fe.entrySub}</div>
          </div>
          <p className="text-sm text-[#555] leading-[1.9] font-light mb-8 max-w-[480px]">{fe.desc}</p>
          <div className="flex gap-3 flex-wrap">
            <Link href="/reservation" className="inline-block bg-[#4a3520] text-white text-[11px] tracking-[0.25em] uppercase px-7 py-3.5 hover:bg-[#3a2818] transition-colors duration-300">{t.reserve}</Link>
          </div>
        </div>
      </section>}

      {upcomingEvents.length > 0 && (
        <section className="px-4 py-12 sm:px-6 lg:px-10 lg:py-16 border-b border-black/10 reveal">
          <div className="flex items-center gap-2.5 mb-8">
            <CalendarIcon />
            <h3 className="font-display font-light text-ink text-[clamp(26px,3.5vw,40px)]">{LABELS.upcoming}</h3>
            <span className="text-[11px] tracking-[0.1em] uppercase text-muted border border-black/15 rounded-full px-2.5 py-1">
              {upcomingEvents.length} {LABELS.eventsCount}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            {upcomingEvents.map((ev) => (
              <EventCard key={ev.id} href={`/events/${ev.id}`} imageUrl={ev.imageUrl} title={ev.title} dateLabel={ev.dateLabel} location={ev.location} />
            ))}
          </div>
        </section>
      )}

      {pastEvents.length > 0 && (
        <section className="px-4 py-12 sm:px-6 lg:px-10 lg:py-16 border-b border-black/10 reveal">
          <div className="flex items-center gap-2.5 mb-8">
            <ClockIcon />
            <h3 className="font-display font-light text-ink text-[clamp(26px,3.5vw,40px)]">{LABELS.past}</h3>
            <span className="text-[11px] tracking-[0.1em] uppercase text-muted border border-black/15 rounded-full px-2.5 py-1">
              {pastEvents.length} {LABELS.eventsCount}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            {pastEvents.map((ev) => (
              <EventCard key={ev.id} href={`/events/${ev.id}`} imageUrl={ev.imageUrl} title={ev.title} dateLabel={ev.dateLabel} location={ev.location} desaturate />
            ))}
          </div>
        </section>
      )}

      <section className="bg-ink text-bg px-4 py-14 reveal sm:px-6 sm:py-14 lg:px-10 lg:py-20">
        <h3 className="font-display font-light mb-3.5 leading-[1.05] text-[clamp(32px,4vw,48px)]">{t.weekly}</h3>
        <p className="text-sm text-[rgba(245,243,239,0.5)] mb-8 max-w-[480px] leading-[1.8]">{t.weeklyDesc}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 lg:gap-6 mb-12">
          {t.weeklyGallery.map(({ src, alt }) => (
            <div key={alt} className="overflow-hidden border border-white/10 bg-[rgba(255,255,255,0.02)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="w-full aspect-[3/2] object-cover [filter:saturate(0.72)_brightness(0.95)]"
                src={src}
                alt={alt}
                loading="lazy"
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {t.recurring.map(({ day, title, text, time }) => (
            <div key={title} className="border border-white/10 px-6 py-7 sm:px-8 sm:py-8 hover:border-gold hover:bg-[rgba(201,169,110,0.05)] transition-all duration-300">
              <div className="text-[11px] tracking-[0.3em] uppercase text-gold mb-4">{day}</div>
              <h4 className="font-display text-[26px] font-light mb-3">{title}</h4>
              <p className="text-[13px] text-[rgba(245,243,239,0.6)] leading-[1.8] font-light">{text}</p>
              <div className="mt-5 pt-4 border-t border-white/[0.08] text-[11px] tracking-[0.2em] uppercase text-[rgba(245,243,239,0.45)]">{time}</div>
            </div>
          ))}
        </div>
      </section>

      <Footer tagline={FOOTER_TAGLINES.events} />
    </>
  )
}

export async function getServerSideProps() {
  try {
    const { db } = await import('../lib/db')
    const { events } = await import('../lib/db/schema')
    const { asc } = await import('drizzle-orm')
    const rows = await db.select().from(events).orderBy(asc(events.sortOrder))
    const serialized = rows.map((r) => ({
      ...r,
      eventDate: r.eventDate ?? null,
      createdAt: r.createdAt ? r.createdAt.toISOString() : null,
    }))
    return { props: { dbEvents: serialized } }
  } catch {
    return { props: { dbEvents: [] } }
  }
}
