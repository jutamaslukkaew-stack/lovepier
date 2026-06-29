import Head from 'next/head'
import Link from 'next/link'
import Footer from '../components/Footer'
import PageHero from '../components/PageHero'
import { FOOTER_TAGLINES } from '../lib/footerTagline'
import { useLanguage } from '../lib/language'

const EVENTS_COPY = {
  th: {
    title: 'Events — Love Pier Beach Cafe',
    heroBrand: 'Love Pier',
    heroSuffix: 'เสิร์ฟความสนุก',
    desc: 'กิจกรรมพิเศษ ภายในร้านของเรา',
    featured: 'THE SYMPHONY CLUB',
    reserve: 'จองโต๊ะ',
    add: 'เพิ่มลงปฏิทิน',
    next: 'กิจกรรมถัดไป',
    weekly: 'กิจกรรมประจำวัน',
    weeklyDesc: 'กิจกรรมที่คุณมาได้ทุกวัน',
    weeklyGallery: [
      { src: '/uploads/events-surf-pool.png', alt: 'Surf Pool' },
      { src: '/uploads/events-jet-ski.png', alt: 'เจ็ตสกี' },
      { src: '/uploads/events-skimboard.png', alt: 'Sup Board & Skim Board' },
      { src: '/uploads/events-kayak.png', alt: 'พายเรือคายัค' },
    ],
    freeLabel: 'ฟรี',
    featuredImageAlt: 'Flow Sunset — The Symphony Club',
    featuredEvent: {
      title: 'Flow',
      titleEm: 'Sunset',
      date: 'เสาร์ 27 มิ.ย.',
      year: '2026',
      time: '16:00 – 20:00',
      timeSub: 'DJ SUPACHAI 18:00 – 20:00',
      entry: '฿500 ต่อท่าน',
      entrySub: 'เล่นกิจกรรมในคลับไม่จำกัด',
      desc: 'Surf Pool · Skimboard · Kayak · Sup Board อาหาร เครื่องดื่ม และสินค้าพาร์ทเนอร์ตลอดงาน รับริสแบนด์และเครื่องดื่มกระป๋องฟรี 1 แก้ว',
    },
    eventList: [
      { day: '27', month: 'มิ.ย. 2026', title: 'Flow Sunset', sub: '16:00 – 20:00 · The Symphony Club', cat: 'ปาร์ตี้', price: '฿500', free: false },
    ],
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
    next: '接下来',
    weekly: '每日固定活动',
    weeklyDesc: '每天都有，直接到店即可。',
    weeklyGallery: [
      { src: '/uploads/events-surf-pool.png', alt: 'Surf Pool' },
      { src: '/uploads/events-jet-ski.png', alt: '水上摩托' },
      { src: '/uploads/events-skimboard.png', alt: 'Sup Board & Skim Board' },
      { src: '/uploads/events-kayak.png', alt: '皮划艇' },
    ],
    freeLabel: '免费',
    featuredImageAlt: 'Flow Sunset — The Symphony Club',
    featuredEvent: {
      title: 'Flow',
      titleEm: 'Sunset',
      date: '6月27日 周六',
      year: '2026',
      time: '16:00 – 20:00',
      timeSub: 'DJ SUPACHAI 18:00 – 20:00',
      entry: '每人 ฿500',
      entrySub: '俱乐部内活动不限次数',
      desc: 'Surf Pool · Skimboard · Kayak · Sup Board，餐饮与合作伙伴产品供应至活动结束，赠送手环及一罐免费饮料。',
    },
    eventList: [
      { day: '27', month: '2026年6月', title: 'Flow Sunset', sub: '16:00 – 20:00 · The Symphony Club', cat: '派对', price: '฿500', free: false },
    ],
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
    next: "What's next",
    weekly: 'Daily activities',
    weeklyDesc: 'Something to enjoy every day — just show up.',
    weeklyGallery: [
      { src: '/uploads/events-surf-pool.png', alt: 'Surf Pool' },
      { src: '/uploads/events-jet-ski.png', alt: 'Jet Ski' },
      { src: '/uploads/events-skimboard.png', alt: 'Sup Board & Skim Board' },
      { src: '/uploads/events-kayak.png', alt: 'Kayaking' },
    ],
    freeLabel: 'Free',
    featuredImageAlt: 'Flow Sunset — The Symphony Club',
    featuredEvent: {
      title: 'Flow',
      titleEm: 'Sunset',
      date: 'Sat 27 Jun',
      year: '2026',
      time: '16:00 – 20:00',
      timeSub: 'DJ SUPACHAI 18:00 – 20:00',
      entry: '฿500 per person',
      entrySub: 'Unlimited club activities included',
      desc: 'Surf Pool · Skimboard · Kayak · Sup Board. Food, drinks and partner products all evening. Free wristband and one canned drink.',
    },
    eventList: [
      { day: '27', month: 'Jun 2026', title: 'Flow Sunset', sub: '16:00 – 20:00 · The Symphony Club', cat: 'Party', price: '฿500', free: false },
    ],
    recurring: [
      { day: 'Every day (except Wednesday)', title: 'Surf Pool', text: 'Ride the waves in a standard surf pool — great for beginners and seasoned surfers alike.', time: '10:00 – 20:00' },
      { day: 'Every day (except Wednesday)', title: 'Jet Ski', text: 'Pick up speed on the water with jet skis and feel the full-throttle thrill.', time: '10:00 – 20:00' },
      { day: 'Every day (except Wednesday)', title: 'Sup Board & Skim Board', text: 'Two board styles — easy paddling or high-energy slides along the beach.', time: '10:00 – 20:00' },
      { day: 'Every day (except Wednesday)', title: 'Kayaking', text: 'Explore the Bang Saen coastline by kayak — fun solo or as a pair.', time: '10:00 – 20:00' },
    ],
  },
}

export default function Events() {
  const { lang } = useLanguage()
  const t = EVENTS_COPY[lang] || EVENTS_COPY.en
  const fe = t.featuredEvent

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

      <section className="grid grid-cols-1 lg:grid-cols-2 lg:items-stretch border-b border-black/10 reveal-img">
        <div className="relative overflow-hidden aspect-[4/3] lg:aspect-auto lg:min-h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="absolute inset-0 w-full h-full object-cover object-[50%_42%] scale-[1.14] origin-center [filter:saturate(0.58)_brightness(0.9)_contrast(1.04)]"
            src="/uploads/events-flow-sunset.png"
            alt={t.featuredImageAlt}
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
      </section>

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
