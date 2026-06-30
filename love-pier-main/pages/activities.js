import Head from 'next/head'
import { useEffect, useRef, useState } from 'react'
import Footer from '../components/Footer'
import PageHero from '../components/PageHero'
import { FOOTER_TAGLINES } from '../lib/footerTagline'
import { useLanguage } from '../lib/language'

const COPY = {
  th: {
    title: 'กิจกรรมทางน้ำ — Love Pier Beach Cafe',
    hero: 'กิจกรรม<em class="not-italic text-gold">ทางน้ำ</em>',
    subtitle: 'The Symphony Club · บางเสร่ ศรีราชา',
    memberNote: '* ราคาสมาชิก/ลูกบ้าน ลด 10% จากราคาปกติ · ราคารวม VAT 7%',
    regular: 'ราคาปกติ',
    member: 'สมาชิก/ลูกบ้าน',
    duration: 'ระยะเวลา',
    note: 'หมายเหตุ',
    categories: [
      {
        id: 'surf-pool',
        title: 'สระคลื่น',
        items: [
          { name: 'สระคลื่น', sub: 'บุคคล', duration: '1 ชม.', regular: 1200, member: 1080, note: 'มีอุปกรณ์และครูฝึก' },
          { name: 'สระคลื่น กลุ่ม', sub: 'เลน เดียว (สูงสุด 10 คน)', duration: '1 ชม.', regular: 4500, member: 4050, note: 'มีอุปกรณ์และครูฝึก' },
          { name: 'สระคลื่น กลุ่ม', sub: 'สองเลน (สูงสุด 20 คน)', duration: '1 ชม.', regular: 9000, member: 8100, note: 'มีอุปกรณ์และครูฝึก' },
        ],
      },
      {
        id: 'surf-ski',
        title: 'เซิร์ฟสกี',
        items: [
          { name: 'เซิร์ฟสกี', sub: 'ระดับกลาง', duration: '1 ครั้ง', regular: 1100, member: 990, note: 'ใช้เรือของคลับ' },
          { name: 'เซิร์ฟสกี', sub: 'ระดับเริ่มต้น', duration: '1 ครั้ง', regular: 2200, member: 1980, note: 'รวมอุปกรณ์ครบ เรือคลับ + ครูฝึก' },
          { name: 'เซิร์ฟสกี', sub: '4 ระดับ (มีใบรับรอง)', duration: '4 ครั้ง', regular: 5500, member: 4950, note: 'รวมอุปกรณ์ครบ เรือคลับ + ครูฝึก' },
          { name: 'เซิร์ฟสกี', sub: 'ระดับกลาง (ใช้เรือตัวเอง)', duration: '1 ครั้ง', regular: 200, member: 180, note: 'ลูกค้าใช้เรือตัวเอง' },
        ],
      },
      {
        id: 'sup',
        title: 'ซัพบอร์ด',
        items: [
          { name: 'ซัพบอร์ด', sub: '', duration: '1 ชม.', regular: 400, member: 360, note: 'อุปกรณ์ของคลับ' },
          { name: 'ซัพบอร์ด + ครูฝึก', sub: '', duration: '1 ครั้ง / 1.30 ชม.', regular: 800, member: 720, note: 'รวมอุปกรณ์ + ครูฝึก' },
        ],
      },
      {
        id: 'kayak',
        title: 'คายัค',
        items: [
          { name: 'คายัคธรรมดา', sub: '', duration: '1 ชม.', regular: 400, member: 360, note: 'รวมอุปกรณ์ครบ ใช้เรือคลับ' },
          { name: 'คายัคใส', sub: '(ใสมองเห็นก้นทะเล)', duration: '1 ชม.', regular: 600, member: 540, note: 'รวมอุปกรณ์ครบ ใช้เรือคลับ' },
          { name: 'คายัค', sub: 'ใช้เรือตัวเอง', duration: '1 ครั้ง/วัน', regular: 200, member: 180, note: 'ลูกค้าใช้เรือตัวเอง' },
        ],
      },
      {
        id: 'skimboard',
        title: 'สกิมบอร์ด',
        items: [
          { name: 'สกิมบอร์ด', sub: 'เช่ารายชั่วโมง', duration: '1 ชม.', regularText: '฿250/180', memberText: '฿225/162', note: 'รวมบอร์ดและรองเท้า (ชม.แรก/ถัดไป)' },
          { name: 'สกิมบอร์ด', sub: 'เช่ารายวัน (รวมรองเท้า)', duration: '1 วัน', regular: 800, member: 720, note: 'รวมบอร์ดและรองเท้า' },
          { name: 'สกิมบอร์ด', sub: 'เช่ารายวัน (ใช้อุปกรณ์ตัวเอง)', duration: '1 วัน', regular: 500, member: 450, note: 'ใช้บอร์ดและอุปกรณ์ตัวเอง' },
        ],
      },
      {
        id: 'jetski',
        title: 'เจ็ตสกี',
        items: [
          { name: 'เจ็ตสกี', sub: '', duration: '1 ชม.', regular: 3700, member: 3300, note: 'รวมอุปกรณ์ครบ ชูชีพ + ครูฝึก' },
        ],
      },
      {
        id: 'speedboat',
        title: 'สปีดโบ๊ต',
        items: [
          { name: 'ทริปตกปลา / ชมปลาวาฬ', sub: 'เรือ Casalunar (ขนาดใหญ่)', duration: '1 วัน', regularText: '16,000/ลำ', memberText: '–', note: 'สูงสุด 18 ท่าน · ออกเรือเมื่อผู้โดยสาร 8 ท่านขึ้นไป' },
          { name: 'ทริปเที่ยวเกาะสีชัง', sub: 'เรือ Catamaran (ขนาดกลาง)', duration: '1 วัน', regularText: '6,000/ลำ', memberText: '–', note: 'สูงสุด 5 ท่าน · บริการแทนสำหรับราคาที่แตกต่าง' },
          { name: 'ทุกแพ็คเกจเรือ', sub: 'สิทธิพิเศษฟรี', duration: '–', regularText: '–', memberText: '–', note: 'ฟรี! สแน็คบ็อกซ์ น้ำดื่มและน้ำแข็ง' },
        ],
        notice: 'กรณีทริปตกปลา: ทริปไม่รับประกันการจับปลาแน่นอน แต่ทางเราจะพาไปยังจุดที่มีโอกาสจับปลาได้มากที่สุด · ทริปเที่ยวเกาะสีชัง: สำรองที่นั่งล่วงหน้า ทีมงานจะยืนยันวันเดินทางที่แน่นอนกับผู้โดยสารอีกครั้ง',
      },
    ],
  },
  en: {
    title: 'Water Activities — Love Pier Beach Cafe',
    hero: 'Water<em class="italic text-gold"> Activities</em>',
    subtitle: 'The Symphony Club · Bangsra, Sriracha',
    memberNote: '* Member/Resident price is 10% off regular · All prices include 7% VAT',
    regular: 'Regular',
    member: 'Member/Resident',
    duration: 'Duration',
    note: 'Notes',
    categories: [
      {
        id: 'surf-pool',
        title: 'Surf Pool',
        items: [
          { name: 'Surf Pool', sub: 'Individual', duration: '1 hr', regular: 1200, member: 1080, note: 'Equipment & Instructor included' },
          { name: 'Surf Pool Group', sub: 'Single Lane (max 10 pax)', duration: '1 hr', regular: 4500, member: 4050, note: 'Equipment & Instructor included' },
          { name: 'Surf Pool Group', sub: 'Double Lane (max 20 pax)', duration: '1 hr', regular: 9000, member: 8100, note: 'Equipment & Instructor included' },
        ],
      },
      {
        id: 'surf-ski',
        title: 'Surf Ski',
        items: [
          { name: 'Surf Ski', sub: 'Intermediate', duration: '1 session', regular: 1100, member: 990, note: 'Club boat' },
          { name: 'Surf Ski', sub: 'Beginner', duration: '1 session', regular: 2200, member: 1980, note: 'Full equipment, Club boat + Instructor' },
          { name: 'Surf Ski', sub: '4-Level Certified Course', duration: '4 sessions', regular: 5500, member: 4950, note: 'Full equipment, Club boat + Instructor' },
          { name: 'Surf Ski', sub: 'Intermediate (own boat)', duration: '1 session', regular: 200, member: 180, note: 'Customer uses own boat' },
        ],
      },
      {
        id: 'sup',
        title: 'SUP Board',
        items: [
          { name: 'SUP Board', sub: '', duration: '1 hr', regular: 400, member: 360, note: 'Club equipment' },
          { name: 'SUP Board + Trainer', sub: '', duration: '1 session / 1.5 hrs', regular: 800, member: 720, note: 'Club equipment + Trainer' },
        ],
      },
      {
        id: 'kayak',
        title: 'Kayak',
        items: [
          { name: 'Standard Kayak', sub: '', duration: '1 hr', regular: 400, member: 360, note: 'Full equipment, Club boat' },
          { name: 'Transparent Kayak', sub: '', duration: '1 hr', regular: 600, member: 540, note: 'Full equipment, Club boat' },
          { name: 'Kayak', sub: 'Own boat', duration: '1 session/day', regular: 200, member: 180, note: 'Customer uses own boat' },
        ],
      },
      {
        id: 'skimboard',
        title: 'Skim Board',
        items: [
          { name: 'Skim Board', sub: 'Hourly rental', duration: '1 hr', regularText: '฿250/180', memberText: '฿225/162', note: 'Board & shoes incl. (1st hr / next hrs)' },
          { name: 'Skim Board', sub: 'Full day (shoes included)', duration: '1 day', regular: 800, member: 720, note: 'Board & shoes included' },
          { name: 'Skim Board', sub: 'Full day (own equipment)', duration: '1 day', regular: 500, member: 450, note: 'Customer uses own board & equipment' },
        ],
      },
      {
        id: 'jetski',
        title: 'Jet Ski',
        items: [
          { name: 'Jet Ski', sub: '', duration: '1 hr', regular: 3700, member: 3300, note: 'Full equipment, life jacket + Trainer' },
        ],
      },
      {
        id: 'speedboat',
        title: 'Speed Boat',
        items: [
          { name: 'Fishing & Whale Watching Trip', sub: 'Casalunar (large)', duration: '1 day', regularText: '฿16,000/boat', memberText: '–', note: 'Max 18 pax · departs from 8 pax' },
          { name: 'Koh Si Chang Island Trip', sub: 'Catamaran (medium)', duration: '1 day', regularText: '฿6,000/boat', memberText: '–', note: 'Max 5 pax' },
          { name: 'All boat packages', sub: 'Complimentary', duration: '–', regularText: '–', memberText: '–', note: 'FREE Snack Box, drinking water & ice' },
        ],
        notice: 'Fishing trips do not guarantee a catch, but our team guides you to the best spots. Island trips require advance booking — our team will confirm your departure date.',
      },
    ],
  },
  zh: {
    title: '水上活动 — Love Pier Beach Cafe',
    hero: '水上<em class="italic text-gold">活动</em>',
    subtitle: 'The Symphony Club · 邦斯拉，西拉查',
    memberNote: '* 会员/居民价格八折（较普通价格优惠10%）· 所有价格含7% VAT',
    regular: '普通价格',
    member: '会员/居民',
    duration: '时长',
    note: '备注',
    categories: [
      {
        id: 'surf-pool',
        title: 'Surf Pool 冲浪池',
        items: [
          { name: 'Surf Pool', sub: '个人', duration: '1小时', regular: 1200, member: 1080, note: '含器材及教练' },
          { name: 'Surf Pool 团体', sub: '单道（最多10人）', duration: '1小时', regular: 4500, member: 4050, note: '含器材及教练' },
          { name: 'Surf Pool 团体', sub: '双道（最多20人）', duration: '1小时', regular: 9000, member: 8100, note: '含器材及教练' },
        ],
      },
      {
        id: 'surf-ski',
        title: 'Surf Ski 冲浪皮艇',
        items: [
          { name: 'Surf Ski', sub: '中级', duration: '1次', regular: 1100, member: 990, note: '使用俱乐部艇' },
          { name: 'Surf Ski', sub: '初级', duration: '1次', regular: 2200, member: 1980, note: '含全套器材，俱乐部艇 + 教练' },
          { name: 'Surf Ski', sub: '四阶认证课程', duration: '4次', regular: 5500, member: 4950, note: '含全套器材，俱乐部艇 + 教练' },
          { name: 'Surf Ski', sub: '中级（自带艇）', duration: '1次', regular: 200, member: 180, note: '客人使用自备艇' },
        ],
      },
      {
        id: 'sup',
        title: 'SUP Board 立桨冲浪',
        items: [
          { name: 'SUP Board', sub: '', duration: '1小时', regular: 400, member: 360, note: '俱乐部器材' },
          { name: 'SUP Board + 教练', sub: '', duration: '1次 / 1.5小时', regular: 800, member: 720, note: '含俱乐部器材 + 教练' },
        ],
      },
      {
        id: 'kayak',
        title: 'Kayak 皮划艇',
        items: [
          { name: '普通皮划艇', sub: '', duration: '1小时', regular: 400, member: 360, note: '含全套器材，俱乐部艇' },
          { name: '透明皮划艇', sub: '', duration: '1小时', regular: 600, member: 540, note: '含全套器材，俱乐部艇' },
          { name: '皮划艇', sub: '自带艇', duration: '1次/天', regular: 200, member: 180, note: '客人使用自备艇' },
        ],
      },
      {
        id: 'skimboard',
        title: 'Skim Board 滑板',
        items: [
          { name: 'Skim Board', sub: '按小时租借', duration: '1小时', regularText: '฿250/180', memberText: '฿225/162', note: '含板及鞋（首小时/之后每小时）' },
          { name: 'Skim Board', sub: '全天（含鞋）', duration: '1天', regular: 800, member: 720, note: '含板及鞋' },
          { name: 'Skim Board', sub: '全天（自带器材）', duration: '1天', regular: 500, member: 450, note: '客人使用自备板及器材' },
        ],
      },
      {
        id: 'jetski',
        title: 'Jet Ski 摩托艇',
        items: [
          { name: 'Jet Ski', sub: '', duration: '1小时', regular: 3700, member: 3300, note: '含全套器材、救生衣及教练' },
        ],
      },
      {
        id: 'speedboat',
        title: 'Speed Boat 快艇',
        items: [
          { name: '钓鱼 / 赏鲸之旅', sub: 'Casalunar（大型船）', duration: '全天', regularText: '16,000/艘', memberText: '–', note: '最多18人 · 满8人出发' },
          { name: '斯里昌岛游览', sub: 'Catamaran（中型船）', duration: '全天', regularText: '6,000/艘', memberText: '–', note: '最多5人' },
          { name: '所有快艇套餐', sub: '赠品', duration: '–', regularText: '–', memberText: '–', note: '免费 Snack Box、饮用水及冰块' },
        ],
        notice: '钓鱼行程不保证钓获，但我们会带您前往最佳钓点。斯里昌岛行程需提前预订，团队将与您确认出发日期。',
      },
    ],
  },
}

function fmt(n) {
  return '฿' + Number(n).toLocaleString()
}

function ActivityTable({ cat, t }) {
  return (
    <div id={`activity-${cat.id}`} className="mb-7 last:mb-0" style={{ scrollMarginTop: '130px' }}>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-display font-light text-[clamp(22px,3vw,32px)] text-ink tracking-[-0.01em]">
          {cat.title}
        </h2>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/20">
              <th className="text-left py-2.5 pr-4 text-[10px] tracking-[0.16em] uppercase text-muted font-semibold w-[35%]">กิจกรรม</th>
              <th className="text-left py-2.5 pr-4 text-[10px] tracking-[0.16em] uppercase text-muted font-semibold w-[12%]">{t.duration}</th>
              <th className="text-right py-2.5 pr-4 text-[10px] tracking-[0.16em] uppercase text-muted font-semibold w-[16%]">{t.regular}</th>
              <th className="text-right py-2.5 pr-4 text-[10px] tracking-[0.16em] uppercase text-muted font-semibold w-[16%]">{t.member}</th>
              <th className="text-left py-2.5 text-[10px] tracking-[0.16em] uppercase text-muted font-semibold">{t.note}</th>
            </tr>
          </thead>
          <tbody>
            {cat.items.map((item, i) => (
              <tr key={i} className="border-b border-dotted border-black/10 last:border-b-0">
                <td className="py-3.5 pr-4 align-top">
                  <span className="font-semibold text-ink text-[13px] tracking-wide">{item.name}</span>
                  {item.sub ? <span className="block text-[11px] text-muted mt-0.5">{item.sub}</span> : null}
                </td>
                <td className="py-3.5 pr-4 align-top text-[13px] text-muted whitespace-nowrap">{item.duration}</td>
                <td className="py-3.5 pr-4 align-top text-right font-display text-[15px] text-gold tabular-nums whitespace-nowrap">
                  {item.regularText ?? fmt(item.regular)}
                </td>
                <td className="py-3.5 pr-4 align-top text-right font-display text-[15px] text-ink/70 tabular-nums whitespace-nowrap">
                  {item.memberText ?? fmt(item.member)}
                </td>
                <td className="py-3.5 align-top text-[12px] text-muted italic">{item.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {cat.items.map((item, i) => (
          <div key={i} className="border border-black/10 p-5 bg-white rounded-sm">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <span className="font-semibold text-ink text-[15px] leading-snug">{item.name}</span>
                {item.sub ? <span className="block text-[12px] text-muted mt-0.5 leading-snug">{item.sub}</span> : null}
              </div>
              <span className="text-[11px] text-muted shrink-0 mt-0.5">{item.duration}</span>
            </div>
            <div className="flex gap-8 mt-3 mb-3 pt-3 border-t border-black/[0.07]">
              <div>
                <div className="text-[9px] tracking-[0.14em] uppercase text-muted mb-1">{t.regular}</div>
                <div className="font-display text-[20px] tabular-nums leading-none whitespace-nowrap text-gold">{item.regularText ?? fmt(item.regular)}</div>
              </div>
              <div>
                <div className="text-[9px] tracking-[0.14em] uppercase text-muted mb-1">{t.member}</div>
                <div className="font-display text-[20px] tabular-nums leading-none whitespace-nowrap text-ink/60">{item.memberText ?? fmt(item.member)}</div>
              </div>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">{item.note}</p>
          </div>
        ))}
      </div>

      {cat.notice ? (
        <p className="mt-4 text-[11px] sm:text-[12px] text-muted italic leading-relaxed border-l-2 border-gold/40 pl-3">
          {cat.notice}
        </p>
      ) : null}
    </div>
  )
}

export default function Activities() {
  const { lang } = useLanguage()
  const t = COPY[lang] || COPY.en
  const scrollRef = useRef(null)
  const [dotIndex, setDotIndex] = useState(0)
  const [activeCat, setActiveCat] = useState('surf-pool')
  const DOT_COUNT = t.categories.length

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const ratio = el.scrollLeft / (el.scrollWidth - el.clientWidth || 1)
      setDotIndex(Math.round(ratio * (DOT_COUNT - 1)))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <Head>
        <title>{t.title}</title>
        <meta property="og:title" content="Water Activities — Love Pier Beach Cafe" />
        <meta property="og:description" content="Surf Pool · Surf Ski · SUP · Kayak · Jet Ski · Speed Boat — The Symphony Club, Bangsra" />
        <meta property="og:url" content="https://www.lovepier.cafe/activities" />
        <meta property="og:type" content="website" />
      </Head>

      {/* Hero */}
      <PageHero titleHtml={t.hero} subtitle={t.subtitle} />

      {/* Shortcut anchor bar */}
      <div className="sticky top-[var(--nav-h,64px)] z-40 w-full bg-[#f5f3ef] border-b border-black/10">
        <div className="relative">
          <div ref={scrollRef} className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-2 min-w-max lg:min-w-0 lg:justify-center px-4 pt-3 pb-2 pr-10">
              {t.categories.map((cat) => (
                <a
                  key={cat.id}
                  href={`#activity-${cat.id}`}
                  onClick={() => setActiveCat(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-[10px] tracking-[0.12em] uppercase font-semibold whitespace-nowrap transition-all cursor-pointer no-underline ${activeCat === cat.id ? 'bg-[#4a3520] text-white' : 'bg-[#4a3520]/[0.07] text-[#4a3520]/70 hover:bg-[#4a3520]/15 hover:text-[#4a3520]'}`}
                >
                  {cat.title}
                </a>
              ))}
            </div>
          </div>
          {/* fade hint */}
          <div className="lg:hidden pointer-events-none absolute top-0 right-0 bottom-6 w-10 bg-gradient-to-l from-[#f5f3ef] to-transparent" />
        </div>
        {/* scroll dots */}
        <div className="lg:hidden flex justify-center gap-1.5 pb-2">
          {Array.from({ length: DOT_COUNT }).map((_, i) => (
            <span
              key={i}
              className={`block rounded-full transition-all duration-300 ${i === dotIndex ? 'w-4 h-1.5 bg-[#4a3520]' : 'w-1.5 h-1.5 bg-[#4a3520]/30'}`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
        {t.categories.map((cat) => (
          <ActivityTable key={cat.id} cat={cat} t={t} />
        ))}

        {/* Member note */}
        <div className="mt-8 pt-6 border-t border-black/10">
          <p className="text-[11px] sm:text-[12px] text-muted italic leading-relaxed">{t.memberNote}</p>
        </div>
      </div>

      <Footer tagline={FOOTER_TAGLINES.events} />
    </>
  )
}
