import Head from 'next/head'
import Footer from '../components/Footer'
import { FOOTER_TAGLINES } from '../lib/footerTagline'
import { useLanguage } from '../lib/language'

export default function Location() {
  const { lang } = useLanguage()
  const t = lang === 'th'
    ? {
        title: 'Location — Love Pier Beach Cafe',
        find: 'การเดินทาง',
        hero: 'ห่างทะเลเพียง\nสองร้อยเมตร',
        sub: 'เราอยู่ในโซนที่เงียบสงบ เดินทางสะดวกและนั่งสบาย',
        address: 'ที่อยู่',
        addressVal: '800 108 แสนสุข\nอำเภอเมือง จังหวัดชลบุรี 20130',
        hours: 'เวลาเปิดทำการ',
        hoursVal: 'เปิดทุกวัน (ยกเว้นวันพุธ) · 09:00-18:00',
        phone: 'โทรศัพท์',
        coords: 'พิกัด',
        openGoogle: 'เปิดใน Google Maps',
        how: 'วิธีการ\nเดินทางมา',
        howSub: 'จากกรุงเทพฯ ใช้เวลาประมาณ 2 ชั่วโมงกว่า',
        apple: 'เปิดใน Apple Maps',
        directions: [
          { mode: 'โดยรถยนต์', title: 'ประมาณ 2 ชั่วโมง จากกรุงเทพฯ', text: 'สามารถปักหมุดตาม Google Maps ได้เลย ที่ตั้งร้านจะอยู่ภายใน เดอะ ซิมโพนี่ คอนโด บางแสน-ศรีราชา' },
          { mode: 'โดยรถบัส', title: 'ประมาณ 2 ชั่วโมง 30 นาที จากสถานีขนส่ง หมอชิต', text: 'มีรถตู้ออกทุกชั่วโมง ลงที่จุดจอดหนองมน หรือใกล้เคียง ต่อรถอีกเล็กน้อย' },
        ],
        countryLabel: 'ประเทศไทย',
        kitchenNote: 'ครัวปิดก่อนเวลาปิด 30 นาที',
        mapTitle: 'แผนที่ Love Pier Beach Cafe',
      }
    : lang === 'zh'
      ? {
          title: 'Location — Love Pier Beach Cafe',
          find: '如何找到我们',
          hero: '距离海边\n仅两百米',
          sub: '我们位于安静路段，容易抵达，也适合久坐。',
          address: '地址',
          addressVal: '800 108 Saensuk\nMueang Chonburi, Chonburi 20130',
          hours: '营业时间',
          hoursVal: '每日营业（周三除外） · 09:00-18:00',
          phone: '电话',
          coords: '坐标',
          openGoogle: '在 Google Maps 打开',
          how: '如何\n到达',
          howSub: '从曼谷沿海岸南下，约 2 小时 20 分钟车程。',
          apple: '在 Apple Maps 打开',
          directions: [
            { mode: '驾车', title: '从曼谷出发约 2 小时', text: '可直接在 Google Maps 导航，门店位于 The Symphony Condo Bangsaen-Sriracha 内。' },
            { mode: '巴士', title: '从曼谷 Mochit 汽车站约 2 小时 30 分钟', text: '每小时有小巴发车。可在 Nong Mon 或附近站点下车，再短程转车前往。' },
          ],
          countryLabel: '泰国',
          kitchenNote: '厨房在关店前 30 分钟停止接单',
          mapTitle: 'Love Pier Beach Cafe 地图',
        }
      : {
          title: 'Location — Love Pier Beach Cafe',
          find: 'Find us',
          hero: 'Two hundred\nmeters from the sea',
          sub: 'We sit at the quiet end of the road. Easy to find, easier to stay.',
          address: 'Address',
          addressVal: '800 108 Saensuk\nMueang Chonburi, Chonburi 20130',
          hours: 'Hours',
          hoursVal: 'Open daily (except Wed) · 09:00-18:00',
          phone: 'Phone',
          coords: 'Coordinates',
          openGoogle: 'Open in Google Maps',
          how: 'How to get\nhere',
          howSub: 'From Bangkok, head south along the coast. About 2 hours and 20 minutes.',
          apple: 'Open in Apple Maps',
          directions: [
            { mode: 'By car', title: 'About 2 hours from Bangkok', text: 'You can pin us directly on Google Maps. The cafe is inside The Symphony Condo Bangsaen-Sriracha.' },
            { mode: 'By bus', title: 'About 2 hours 30 minutes from Mochit Bus Terminal', text: 'Minivans leave every hour. Get off at Nong Mon or a nearby stop, then take a short local ride.' },
          ],
          countryLabel: 'Thailand',
          kitchenNote: 'Kitchen closes 30 min before',
          mapTitle: 'Love Pier Beach Cafe location',
        }
  const renderLines = (s) => s.split('\n').map((line, idx, arr) => <span key={`${line}-${idx}`}>{line}{idx < arr.length - 1 ? <br/> : null}</span>)
  return (
    <>
      <Head>
        <title>{t.title}</title>
      </Head>

      {/* Page header */}
      <header className="px-4 pt-12 pb-8 text-center border-b border-black/10 reveal sm:px-6 lg:px-10 lg:pt-16 lg:pb-10">
        <div className="text-[10px] tracking-[0.4em] uppercase text-muted mb-3">{t.find}</div>
        <h1 className="font-display font-light leading-[0.95] text-ink tracking-[-0.02em] text-[clamp(48px,7vw,88px)]">{renderLines(t.hero)}</h1>
        <p className="mt-4 text-sm text-[#666] font-light max-w-[580px] mx-auto leading-[1.8]">{t.sub}</p>
      </header>

      {/* Big map (iframe) */}
      <div className="w-full h-[420px] lg:h-[540px] bg-[#dedad3] relative overflow-hidden border-b border-black/10 reveal sm:h-[360px]">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2189!2d100.9272293!3d13.2520411!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3102b54b8ceda3d5%3A0x6dad4e501d5d1adf!2sLOVE%20PIER%20BEACH%20CAFE!5e1!3m2!1sth!2sth!4v1716000000000"
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', border:0, filter:'saturate(0.7) contrast(1.05)' }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={t.mapTitle}
        />
      </div>

      {/* Info bar */}
      <div className="bg-bg px-4 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 border-b border-black/10 reveal sm:px-6 sm:py-7 sm:gap-6">
        <div>
          <h4 className="text-[10px] tracking-[0.4em] uppercase text-gold mb-3">{t.address}</h4>
          <p className="text-sm text-ink leading-[1.7] font-light">{renderLines(t.addressVal)}<br/><span className="text-muted text-xs">{t.countryLabel}</span></p>
        </div>
        <div>
          <h4 className="text-[10px] tracking-[0.4em] uppercase text-gold mb-3">{t.hours}</h4>
          <p className="text-sm text-ink leading-[1.7] font-light">{t.hoursVal}<br/><span className="text-muted text-xs">{t.kitchenNote}</span></p>
        </div>
        <div>
          <h4 className="text-[10px] tracking-[0.4em] uppercase text-gold mb-3">{t.phone}</h4>
          <p className="text-sm text-ink leading-[1.7] font-light">
            <a href="tel:0642523293" className="hover:text-gold transition-colors">064-252-3293</a><br/>
            <a href="mailto:cafe.lovepier@gmail.com" className="hover:text-gold transition-colors">cafe.lovepier@gmail.com</a><br/>
            <span className="text-muted text-xs">LINE: @lovepier.cafe</span>
          </p>
        </div>
        <div>
          <h4 className="text-[10px] tracking-[0.4em] uppercase text-gold mb-3">{t.coords}</h4>
          <p className="text-sm text-ink leading-[1.7] font-light">
            13.2537° N<br/>100.9287° E<br/>
            <span className="text-muted text-xs"><a href="https://www.google.com/maps/search/?api=1&query=Love+Pier+Beach+Cafe+Chonburi" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">{t.openGoogle}</a></span>
          </p>
        </div>
      </div>

      {/* Directions */}
      <section className="px-4 py-14 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 border-b border-black/10 reveal sm:px-6 sm:py-14 sm:gap-12 lg:px-10 lg:py-20">
        <div>
          <h2 className="font-display font-light mb-6 leading-[1.05] text-[clamp(36px,4.5vw,56px)]">{renderLines(t.how)}</h2>
          <p className="text-sm text-[#555] leading-[1.9] font-light mb-8 max-w-[480px]">{t.howSub}</p>
          <div className="flex gap-3 flex-wrap">
            <a href="https://www.google.com/maps/search/?api=1&query=Love+Pier+Beach+Cafe+Chonburi" target="_blank" rel="noopener noreferrer" className="inline-block bg-ink text-bg text-[11px] tracking-[0.25em] uppercase px-7 py-3.5 hover:bg-gold hover:text-ink transition-colors duration-300">{t.openGoogle}</a>
            <a href="https://maps.apple.com/?q=1%2F1%20Soi%20Sukhumvit%2020%2C%20Saen%20Suk%2C%20Mueang%20Chonburi%20District%2C%20Chon%20Buri%2020130%2C%20Thailand" target="_blank" rel="noopener noreferrer" className="inline-block bg-transparent text-ink text-[11px] tracking-[0.25em] uppercase px-7 py-3.5 border border-black/20 hover:border-gold hover:text-gold transition-colors duration-300">{t.apple}</a>
          </div>
        </div>
        <div className="flex flex-col">
          {t.directions.map(({ mode, title, text }) => (
            <div key={mode} className="grid grid-cols-[80px_1fr] gap-6 py-6 border-t border-black/10 sm:grid-cols-[60px_1fr] sm:gap-4">
              <div className="text-[10px] tracking-[0.3em] uppercase text-[#aaa] pt-1">{mode}</div>
              <div>
                <strong className="font-display text-lg font-normal text-ink block mb-1">{title}</strong>
                <span className="text-[13px] text-[#777] font-light leading-[1.7]">{text}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer tagline={FOOTER_TAGLINES.location} />
    </>
  )
}
