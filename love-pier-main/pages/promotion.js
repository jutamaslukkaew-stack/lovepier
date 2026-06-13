import Head from 'next/head'
import Link from 'next/link'
import Footer from '../components/Footer'
import { FOOTER_TAGLINES } from '../lib/footerTagline'
import { useLanguage } from '../lib/language'

const FACEBOOK_MESSENGER_URL = 'https://m.me/61590549024692'

const PROMOTION_COPY = {
  th: {
    title: 'Promotion — Love Pier Beach Cafe',
    may: 'โปรจากเมนูจริง',
    hero: 'สั่งเซต\nรับเครื่องดื่ม',
    desc: 'ดีลผูกกับราคาในเมนู — ข้าวมันไก่ กาแฟ มัทฉะ และบรันช์ ทานที่ร้านเท่านั้น',
    reserve: 'จองที่นั่ง',
    view: 'ดูเมนู',
    month: 'คอมโบแนะนำ',
    dealsHeading: 'โปรจาก\nเมนู Love Pier',
    dealsNote: 'ราคาอ้างอิงจากเมนูปัจจุบัน · ใช้ทานที่ร้าน · ไม่รวมกับโปรอื่น',
    loyalty: 'The Pier Loyalty',
    loyaltyDesc: 'สะสมทุกครั้งที่สั่ง — รวมข้าวมันไก่ กาแฟ และมัทฉะจากเมนู ถึงระดับใหม่แล้วปลดล็อกสิทธิพิเศษ',
    join: 'สมัครฟรี',
    heroImageAlt: 'โปรโมชัน',
    finePrint: 'โปรทั้งหมดอ้างอิงราคาในเมนู ใช้ได้เฉพาะทานที่ร้าน และขึ้นกับสต็อก ไม่สามารถใช้ร่วมกันในออเดอร์เดียวกัน Love Pier ขอสงวนสิทธิ์ปรับเงื่อนไขให้สอดคล้องกับเมนู — สอบถามพนักงานก่อนสั่ง',
    tiers: [
      { tier: 'Sand', visits: '5 ครั้ง', perks: 'ฟรีเครื่องดื่มมูลค่าไม่เกิน 100 บาท 1 รายการ\nหรือ ส่วนลด 10% สำหรับบิลถัดไป' },
      { tier: 'Tide', visits: '15 ครั้ง', perks: 'ฟรีเครื่องดื่ม Signature 1 รายการ\nจองโต๊ะล่วงหน้าได้ก่อนลูกค้าทั่วไป\nรับคูปองวันเกิด 15%' },
      { tier: 'Horizon', visits: '30 ครั้ง', perks: 'ฟรีอาหารหรือเครื่องดื่มมูลค่าไม่เกิน 250 บาท 1 รายการ\nส่วนลด 15% ทุกวันจันทร์–พฤหัส\nสิทธิ์เข้าร่วมกิจกรรมพิเศษของร้านก่อนใคร' },
    ],
    dealList: [
      {
        badge: 'ข้าวมันไก่',
        title: 'เซตใหญ่ + เครื่องดื่มฟรี',
        price: '฿550', orig: '฿670', disc: 'ฟรี 1 แก้ว',
        desc: 'เซตข้าวมันไก่ขนาดใหญ่ (เมนู ฿550) รับเครื่องดื่มเย็น 1 แก้วฟรี — เลือก Americano / Latte / ชาไทยพรีเมียม (สูงสุด ฿120)',
        validity: 'ทานที่ร้าน · ทุกวัน',
        cta: 'ดูเมนู', href: '/menu',
        img: '/uploads/promotion-large-chicken-rice-set.png',
      },
      {
        badge: 'ข้าวมันไก่',
        title: 'เซตกลาง + ลาเต้เย็น ฿50',
        price: '฿330', orig: '฿400', disc: '−18%',
        desc: 'เซตขนาดกลาง (฿280) + ลาเต้เย็นเพิ่มเพียง ฿50 (ปกติในเมนู ฿120)',
        validity: 'ทานที่ร้าน · ทุกวัน',
        cta: 'ดูเมนู', href: '/menu',
        img: '/uploads/promotion-medium-set-iced-latte.png',
      },
      {
        badge: 'ซิกเนเจอร์',
        title: 'ถาดซิกเนเจอร์ + ชาไทย 2 แก้ว',
        price: '฿670', orig: '฿870', disc: '−23%',
        desc: 'ข้าวมันไก่ซิกเนเจอร์เสิร์ฟเป็นถาด (฿670) พร้อมชาไทยพรีเมียม 2 แก้วฟรี (฿100/แก้ว)',
        validity: 'ทานที่ร้าน · แชร์ได้',
        cta: 'ดูเมนู', href: '/menu',
        img: '/uploads/promotion-signature-tray.png',
      },
      {
        badge: 'บรันช์',
        title: 'Pier Breakfast + กาแฟร้อนฟรี',
        price: '฿280', orig: '฿370', disc: 'ฟรีกาแฟ',
        desc: 'จาน Pier Breakfast (฿280) รับอเมริกาโน่ร้อนฟรี 1 แก้ว (เมนู ฿90)',
        validity: 'ทานที่ร้าน · 09:00–18:00',
        cta: 'ดูเมนู', href: '/menu',
        img: '/uploads/promotion-pier-breakfast.png',
      },
      {
        badge: 'มัทฉะ',
        title: 'มัทฉะลาเต้ + ทาร์ตไข่',
        price: '฿185', orig: '฿205', disc: '−10%',
        desc: 'มัทฉะลาเต้ (฿150) + ทาร์ตไข่ (฿55) ในราคาชุดเดียว',
        validity: 'ทานที่ร้าน · ทุกวัน',
        cta: 'ดูเมนู', href: '/menu',
        img: '/uploads/promotion-matcha-tart.png',
      },
      {
        badge: 'คอมโบ',
        title: 'เซตเล็ก + ชาไทยพรีเมียม',
        price: '฿220', orig: '฿250', disc: '−12%',
        desc: 'เซตข้าวมันไก่เล็ก (฿150) + ชาไทยพรีเมียม (฿100) จ่ายรวม ฿220',
        validity: 'ทานที่ร้าน · มื้อเบา',
        cta: 'ดูเมนู', href: '/menu',
        img: '/uploads/promotion-small-set-thai-tea.png',
      },
    ],
  },
  zh: {
    title: 'Promotion — Love Pier Beach Cafe',
    may: '真实菜单优惠',
    hero: '点套餐\n饮品优惠',
    desc: '优惠价格对应菜单标价——海南鸡饭、咖啡、抹茶与早午餐，仅限堂食。',
    reserve: '预订座位',
    view: '查看菜单',
    month: '推荐组合',
    dealsHeading: 'Love Pier\n菜单优惠',
    dealsNote: '价格以当前菜单为准 · 仅限堂食 · 不可与其他优惠同享',
    loyalty: 'The Pier Loyalty',
    loyaltyDesc: '每次消费均可累计——含鸡饭、咖啡与抹茶。升级解锁专属礼遇。',
    join: '免费加入',
    heroImageAlt: '优惠活动',
    finePrint: '所有优惠以菜单标价为依据，仅限堂食，视供应情况而定。同一订单不可叠加多项优惠。Love Pier 保留根据菜单调整优惠的权利——下单前请咨询店员。',
    tiers: [
      { tier: 'Sand', visits: '5 次', perks: '免费饮品 1 份（最高 100 泰铢）\n或下次账单 9 折' },
      { tier: 'Tide', visits: '15 次', perks: '免费 Signature 饮品 1 份\n优先预订座位\n生日优惠券 15%' },
      { tier: 'Horizon', visits: '30 次', perks: '免费餐饮或饮品 1 份（最高 ฿250）\n每周一至周四 85 折\n优先参与店内特别活动' },
    ],
    dealList: [
      {
        badge: '鸡饭',
        title: '大份套餐 + 免费饮品',
        price: '฿550', orig: '฿670', disc: '赠 1 杯',
        desc: '大份混合鸡饭套餐（菜单 ฿550）赠冰饮 1 杯——可选美式 / 拿铁 / 泰式奶茶（最高价值 ฿120）',
        validity: '堂食 · 每日',
        cta: '查看菜单', href: '/menu',
        img: '/uploads/promotion-large-chicken-rice-set.png',
      },
      {
        badge: '鸡饭',
        title: '中份套餐 + 冰拿铁 ฿50',
        price: '฿330', orig: '฿400', disc: '−18%',
        desc: '中份套餐（฿280）+ 冰拿铁仅需加 ฿50（菜单价 ฿120）',
        validity: '堂食 · 每日',
        cta: '查看菜单', href: '/menu',
        img: '/uploads/promotion-medium-set-iced-latte.png',
      },
      {
        badge: '招牌',
        title: '招牌鸡饭盘 + 泰茶 2 杯',
        price: '฿670', orig: '฿870', disc: '−23%',
        desc: '招牌鸡饭大盘（฿670）附赠泰式奶茶 2 杯（每杯 ฿100）',
        validity: '堂食 · 适合分享',
        cta: '查看菜单', href: '/menu',
        img: '/uploads/promotion-signature-tray.png',
      },
      {
        badge: '早午餐',
        title: 'Pier Breakfast + 免费热美式',
        price: '฿280', orig: '฿370', disc: '赠咖啡',
        desc: 'Pier Breakfast 招牌盘（฿280）赠热美式 1 杯（菜单 ฿90）',
        validity: '堂食 · 09:00–18:00',
        cta: '查看菜单', href: '/menu',
        img: '/uploads/promotion-pier-breakfast.png',
      },
      {
        badge: '抹茶',
        title: '抹茶拿铁 + 蛋挞',
        price: '฿185', orig: '฿205', disc: '−10%',
        desc: '抹茶拿铁（฿150）+ 蛋挞（฿55）组合价',
        validity: '堂食 · 每日',
        cta: '查看菜单', href: '/menu',
        img: '/uploads/promotion-matcha-tart.png',
      },
      {
        badge: '组合',
        title: '小份套餐 + 泰式奶茶',
        price: '฿220', orig: '฿250', disc: '−12%',
        desc: '小份鸡饭套餐（฿150）+ 泰式奶茶（฿100）合计 ฿220',
        validity: '堂食 · 轻食',
        cta: '查看菜单', href: '/menu',
        img: '/uploads/promotion-small-set-thai-tea.png',
      },
    ],
  },
  en: {
    title: 'Promotion — Love Pier Beach Cafe',
    may: 'From our menu',
    hero: 'Order a set,\nget a drink deal',
    desc: 'Bundles priced from the real menu — chicken rice, coffee, matcha & breakfast. Dine-in only.',
    reserve: 'Reserve a Spot',
    view: 'View Menu',
    month: 'Combo picks',
    dealsHeading: 'Promos from\nour menu',
    dealsNote: 'Prices match the menu · Dine-in only · One promo per order',
    loyalty: 'The Pier Loyalty',
    loyaltyDesc: 'Every order counts — chicken rice, coffee, and matcha from the menu. Unlock perks as you move up tiers.',
    join: 'Join free',
    heroImageAlt: 'promotion hero',
    finePrint: 'All promos reference menu prices, are dine-in only, and subject to availability. One promo per order. Love Pier may adjust offers to match the menu — ask staff before ordering.',
    tiers: [
      { tier: 'Sand', visits: '5 visits', perks: 'One free drink up to 100 THB\nor 10% off your next bill' },
      { tier: 'Tide', visits: '15 visits', perks: 'One free Signature drink\nPriority reservations\n15% birthday coupon' },
      { tier: 'Horizon', visits: '30 visits', perks: 'One free item up to ฿250\n15% off Mon–Thu\nEarly access to special events' },
    ],
    dealList: [
      {
        badge: 'Chicken rice',
        title: 'Large set + free drink',
        price: '฿550', orig: '฿670', disc: '1 free drink',
        desc: 'Large mixed chicken rice set (menu ฿550) includes one free iced drink — Americano, Latte, or Premium Thai Tea (up to ฿120).',
        validity: 'Dine-in · Daily',
        cta: 'See menu', href: '/menu',
        img: '/uploads/promotion-large-chicken-rice-set.png',
      },
      {
        badge: 'Chicken rice',
        title: 'Medium set + iced latte ฿50',
        price: '฿330', orig: '฿400', disc: '−18%',
        desc: 'Medium set (฿280) + iced latte for only ฿50 more (menu price ฿120).',
        validity: 'Dine-in · Daily',
        cta: 'See menu', href: '/menu',
        img: '/uploads/promotion-medium-set-iced-latte.png',
      },
      {
        badge: 'Signature',
        title: 'Signature tray + 2 Thai teas',
        price: '฿670', orig: '฿870', disc: '−23%',
        desc: 'Signature chicken rice tray (฿670) with two Premium Thai Teas on the house (฿100 each).',
        validity: 'Dine-in · To share',
        cta: 'See menu', href: '/menu',
        img: '/uploads/promotion-signature-tray.png',
      },
      {
        badge: 'Breakfast',
        title: 'Pier Breakfast + free hot Americano',
        price: '฿280', orig: '฿370', disc: 'Free coffee',
        desc: 'Pier Breakfast Plate (฿280) with a complimentary hot Americano (menu ฿90).',
        validity: 'Dine-in · 09:00–18:00',
        cta: 'See menu', href: '/menu',
        img: '/uploads/promotion-pier-breakfast.png',
      },
      {
        badge: 'Matcha',
        title: 'Matcha latte + egg tart',
        price: '฿185', orig: '฿205', disc: '−10%',
        desc: 'Matcha Latte (฿150) + Egg Tart (฿55) as one bundle.',
        validity: 'Dine-in · Daily',
        cta: 'See menu', href: '/menu',
        img: '/uploads/promotion-matcha-tart.png',
      },
      {
        badge: 'Combo',
        title: 'Small set + Premium Thai Tea',
        price: '฿220', orig: '฿250', disc: '−12%',
        desc: 'Small chicken rice set (฿150) + Premium Thai Tea (฿100) for ฿220 total.',
        validity: 'Dine-in · Light meal',
        cta: 'See menu', href: '/menu',
        img: '/uploads/promotion-small-set-thai-tea.png',
      },
    ],
  },
}

export default function Promotion() {
  const { lang } = useLanguage()
  const t = PROMOTION_COPY[lang] || PROMOTION_COPY.en
  const deals = t.dealList
  const dealsHeading = t.dealsHeading

  return (
    <>
      <Head>
        <title>{t.title}</title>
      </Head>

      <section className="relative w-full h-[420px] lg:h-[480px] overflow-hidden border-b border-black/10 reveal-img sm:h-[380px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="w-full h-full object-cover [filter:brightness(0.6)_saturate(0.6)]" src="/uploads/promotion-hero.png" alt={t.heroImageAlt} />
        <div className="absolute inset-0 flex flex-col justify-center px-4 sm:px-6 lg:px-16 text-bg max-w-[720px]">
          <span className="inline-flex text-[10px] tracking-[0.4em] uppercase text-gold px-3.5 py-1.5 border border-gold/50 mb-6 w-fit">{t.may}</span>
          <h1 className="font-display font-light leading-[0.95] tracking-[-0.02em] text-[clamp(48px,7vw,92px)]">{t.hero.split('\n').map((l, i) => <span key={i}>{l}{i === 0 ? <br /> : null}</span>)}</h1>
          <p className="mt-5 text-sm leading-[1.8] text-[rgba(245,243,239,0.75)] font-light max-w-[480px]">{t.desc}</p>
          <div className="mt-8 flex gap-3 flex-wrap">
            <Link href="/reservation" className="inline-block bg-gold text-ink text-[11px] tracking-[0.25em] uppercase px-7 py-3.5 hover:bg-bg transition-colors duration-300">{t.reserve}</Link>
            <Link href="/menu" className="inline-block bg-[rgba(236,231,220,0.2)] text-bg text-[12px] tracking-[0.22em] uppercase px-7 py-3.5 border border-[rgba(236,231,220,0.55)] hover:bg-[rgba(236,231,220,0.32)] hover:text-white transition-colors duration-300">{t.view}</Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 border-b border-black/10 reveal sm:px-6 sm:py-14 lg:px-10 lg:py-20">
        <div className="flex justify-between items-end mb-12 gap-8 flex-wrap">
          <div>
            <span className="block text-[10px] tracking-[0.4em] uppercase text-gold mb-3">{t.month}</span>
            <h2 className="font-display font-light leading-[1.05] text-[clamp(36px,4.5vw,56px)]">{dealsHeading.split('\n').map((l, i) => <span key={i}>{l}{i === 0 ? <br /> : null}</span>)}</h2>
          </div>
          <p className="text-xs text-[#999] tracking-[0.05em] max-w-[280px] leading-relaxed">{t.dealsNote}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {deals.map(({ badge, title, price, orig, disc, desc, validity, cta, href, img }) => (
            <div key={title} className="flex flex-col bg-white overflow-hidden border border-black/10 hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(0,0,0,0.06)] transition-all duration-300">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="w-full aspect-[4/3] object-cover [filter:saturate(0.7)]" src={img} alt={title} />
              <div className="p-6 sm:p-7 flex flex-col gap-3 flex-1">
                <span className="text-[9px] tracking-[0.3em] uppercase text-gold border border-gold/40 px-2.5 py-1 self-start">{badge}</span>
                <h3 className="font-display text-[26px] font-light text-ink leading-[1.1]">{title}</h3>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="font-display text-[32px] text-gold font-light">{price}</span>
                  <span className="text-sm text-[#aaa] line-through">{orig}</span>
                  <span className="text-[10px] tracking-[0.2em] uppercase text-gold bg-gold/10 px-2.5 py-1">{disc}</span>
                </div>
                <p className="text-[13px] text-[#777] leading-[1.7] font-light flex-1">{desc}</p>
                <div className="flex justify-between items-center pt-4 mt-2 border-t border-black/10">
                  <span className="text-[10px] tracking-[0.2em] uppercase text-[#aaa]">{validity}</span>
                  <Link href={href} className="inline-flex items-center gap-2.5 text-[10px] tracking-[0.3em] uppercase text-[#666] hover:text-ink transition-colors after:content-['→'] after:text-sm after:transition-transform hover:after:translate-x-1">{cta}</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ink text-bg px-4 py-14 grid grid-cols-1 lg:grid-cols-2 gap-9 lg:gap-16 items-center reveal sm:px-6 sm:py-14 lg:px-10 lg:py-20">
        <div>
          <h2 className="font-display font-light leading-none tracking-[-0.02em] mb-5 text-[clamp(40px,5vw,60px)]">{t.loyalty}</h2>
          <p className="text-sm text-[rgba(245,243,239,0.65)] leading-[1.9] font-light mb-7 max-w-[460px]">{t.loyaltyDesc}</p>
          <a href={FACEBOOK_MESSENGER_URL} target="_blank" rel="noopener noreferrer" className="inline-block bg-gold text-ink text-[11px] tracking-[0.25em] uppercase px-7 py-3.5 hover:bg-bg transition-colors duration-300">{t.join}</a>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-1 bg-white/[0.06] p-1">
          {t.tiers.map(({ tier, visits, perks }) => (
            <div key={tier} className="bg-white/[0.04] px-5 py-7 text-center">
              <h4 className="font-display text-[22px] font-light text-gold mb-2">{tier}</h4>
              <div className="text-[10px] tracking-[0.25em] uppercase text-[rgba(245,243,239,0.4)] mb-3.5">{visits}</div>
              <div className="text-xs text-[rgba(245,243,239,0.7)] leading-relaxed whitespace-pre-line">{perks}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-bg px-4 py-10 text-center sm:px-6 sm:py-8 lg:px-10 lg:py-12">
        <p className="text-[11px] text-[#aaa] leading-[1.8] tracking-[0.05em] max-w-[760px] mx-auto">{t.finePrint}</p>
      </section>

      <Footer tagline={FOOTER_TAGLINES.promotion} />
    </>
  )
}
