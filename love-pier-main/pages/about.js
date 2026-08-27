import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import Footer from '../components/Footer'
import PageHero from '../components/PageHero'
import { FOOTER_TAGLINES } from '../lib/footerTagline'
import { useLanguage } from '../lib/language'

export default function About() {
  const { lang } = useLanguage()
  const t = lang === 'th'
    ? {
        title:'About — Love Pier Beach Cafe',
        story:'เรื่องราวของเรา',
        hero:'',
        storyAside:'บางครั้งความรักก็เริ่มจากเรื่องง่าย ๆ — <em class="italic text-gold whitespace-nowrap">Love Pier</em> เกิดขึ้นจากความตั้งใจนั้น',
        storyLead:'จากมื้ออาหารอร่อยหนึ่งมื้อ · บทสนทนายาว ๆ ริมทะเล · หรือการนั่งมองพระอาทิตย์ตกกับใครสักคน',
        storyBody: [
          'Love Pier Beach Cafe จึงถือกำเนิดขึ้นจากความตั้งใจที่จะสร้างสถานที่เล็ก ๆ ที่รวมทุกสิ่งเหล่านั้นไว้ด้วยกัน',
          'หลายคนอาจแปลกใจว่าทำไมคาเฟ่ริมทะเลถึงเลือกเสิร์ฟ <strong>"ข้าวมันไก่"</strong><br/>คำตอบง่ายกว่าที่คิด — เพราะเราเชื่อว่าอาหารที่ดีไม่จำเป็นต้องซับซ้อน',
          'ข้าวมันไก่คือเมนูธรรมดาที่หลายคนคุ้นเคย แต่เราตั้งใจทำทุกขั้นตอนอย่างจริงจัง ตั้งแต่การคัดสรรวัตถุดิบ การหุงข้าว ไปจนถึงสูตรน้ำจิ้ม เพื่อให้ทุกคำมีความหมาย',
          'เราไม่ได้เริ่มจากการอยากเปิดคาเฟ่วิวสวย — เราเริ่มจากการอยากเสิร์ฟอาหารที่เราเชื่อว่าดีพอจะทำให้คนกลับมาอีกครั้ง',
          'แล้วทะเลบางแสนก็กลายเป็นสถานที่ที่สมบูรณ์แบบสำหรับเรื่องราวนี้',
          'ในวันที่ลมทะเลพัดเบา ๆ · ในวันที่แสงเย็นสะท้อนผิวน้ำ · ในวันที่คุณอยากพักจากความวุ่นวาย<br/>Love Pier อยากเป็นเหมือนท่าเรือเล็ก ๆ ที่ให้ทุกคนได้แวะพัก',
          'จิบเครื่องดื่มซิกเนเจอร์จากแรงบันดาลใจของ <strong>ข้าวหลามหนองมน</strong> นั่งชมพระอาทิตย์ตกจากมุมท่าเรือ และใช้เวลากับคนสำคัญในบรรยากาศที่เรียบง่าย',
          'เพราะสำหรับเรา อาหารต้องจริงจัง บรรยากาศต้องผ่อนคลาย และทุกความทรงจำที่ดี ควรมีพื้นที่ให้เกิดขึ้นเสมอ',
        ],
        storyTagline:'Love Pier — A Hidden Seaside Escape in Bangsaen.',
        quotePrefix:'Love Pier',
        quoteMiddle:'ไม่ใช่แค่คาเฟ่ แต่คือ',
        quoteHighlight:'คาเฟ่ติดทะเลที่สวยที่สุดในบางแสน',
        values:'สิ่งที่เราให้ความสำคัญ',
        standardsEyebrow:'LOVE PIER PROMISE',
        standardsTitle:'สดใหม่ทุกวัน\nใส่ใจทุกคำ',
        standardsIntro:'เพราะอาหารที่ดีเริ่มต้นจากวัตถุดิบที่ดีและความใส่ใจ เราจึงดูแลทุกเมนูด้วยมาตรฐานเดียวกันในทุกวัน',
        standardsItems:[
          { title:'ไก่ต้มใหม่ทุกวัน', text:'ไก่ทุกตัวปรุงสดใหม่ในแต่ละวัน และไม่เก็บไก่ปรุงสุกข้ามคืน เพื่อให้ทุกจานสด อร่อย และได้คุณภาพตามมาตรฐานของเรา' },
          { title:'คัดสรรไก่จากสุพรรณบุรี', text:'เราเลือกใช้ไก่จากแหล่งที่ไว้วางใจในจังหวัดสุพรรณบุรี และจัดเก็บแบบแช่แข็งไม่เกิน 3 วันก่อนนำมาปรุง' },
          { title:'ไม่เติมผงชูรส', text:'ทุกเมนูปรุงอย่างพิถีพิถันโดยไม่เติมผงชูรส ให้รสชาติความอร่อยมาจากวัตถุดิบและสูตรเฉพาะของเรา' },
          { title:'เค้กสดใหม่ภายใน 3 วัน', text:'เค้กทุกชิ้นจำหน่ายไม่เกิน 3 วันนับจากวันที่ทำ เพื่อรักษารสชาติ เนื้อสัมผัส และคุณภาพที่เราตั้งใจส่งมอบ' },
          { title:'เบเกอรี่อบใหม่ทุกวัน', text:'ขนมปังและเบเกอรี่อบสดใหม่ในแต่ละวัน ไม่นำสินค้าจากวันก่อนกลับมาวางจำหน่าย' },
        ],
        standardsClosing:'ทุกคำที่เสิร์ฟ คือความใส่ใจจาก Love Pier Café',
        standardsSignature:'Made Fresh. Served with Love.',
        contactTitle:'ติดต่อเรา',
        addressLabel:'ที่อยู่',
        addressValue:'800 108 แสนสุข อำเภอเมือง จังหวัดชลบุรี 20130',
        hoursLabel:'เวลาเปิดทำการ',
        hoursValue:'เปิดทุกวัน (ยกเว้นวันพุธ) · 09:00–18:00',
        phoneLabel:'โทรศัพท์',
        emailLabel:'อีเมล',
        followLabel:'ติดตามเรา',
        reserveLabel:'จองโต๊ะ',
        mapsLabel:'เปิดใน Google Maps →',
      }
    : lang === 'zh'
      ? {
          title:'About — Love Pier Beach Cafe',
          story:'我们的故事',
          hero:'',
          storyAside:'有时，爱从一件小事开始 — <em class="italic text-gold whitespace-nowrap">Love Pier</em> 也因此诞生',
          storyLead:'一顿好餐 · 海边长谈 · 或与重要的人一起看日落',
          storyBody: [
            'Love Pier Beach Cafe 源于一个简单愿望：创造一个把这一切汇聚在一起的小地方。',
            '许多人好奇，为什么海边咖啡馆会选择供应 <strong>“鸡饭”</strong><br/>答案很简单 — 我们相信好食物不必复杂。',
            '鸡饭是熟悉的日常味道，但我们认真对待每一步：选料、煮饭、调配蘸酱，让每一口都有意义。',
            '我们并非从“想要一家景观咖啡馆”开始，而是从“想端出值得回访的食物”开始。',
            '而邦盛的海边，正是这个故事最合适的舞台。',
            '当海风轻拂、夕照映海、你想暂时远离喧嚣时<br/>Love Pier 希望成为一座小小的码头，让你停下来。',
            '品尝受 <strong>农蒙竹筒糯米饭</strong> 启发的招牌饮品，在码头看日落，与重要的人共享安静时光。',
            '对我们来说，食物要真诚，氛围要放松，美好的记忆也应该总有发生的空间。',
          ],
          storyTagline:'Love Pier — A Hidden Seaside Escape in Bangsaen.',
          quotePrefix:'Love Pier',
          quoteMiddle:'不只是咖啡馆，更是',
          quoteHighlight:'邦盛最美的海边咖啡馆',
          values:'我们的坚持',
          standardsEyebrow:'LOVE PIER PROMISE',
          standardsTitle:'每日新鲜\n每一口都用心',
          standardsIntro:'好食物始于优质食材与细致用心。我们每天都以同一标准认真对待每一道餐点。',
          standardsItems:[
            { title:'每日新鲜煮鸡', text:'鸡肉每天新鲜烹制，熟鸡绝不过夜，确保每一份都鲜美并符合我们的品质标准。' },
            { title:'严选素攀武里鸡肉', text:'我们选用来自素攀武里府可信赖供应源的鸡肉，烹调前冷冻储存不超过 3 天。' },
            { title:'不添加味精', text:'每道餐点都用心制作，不额外添加味精，让美味来自食材本身与我们的独家配方。' },
            { title:'蛋糕三日内新鲜供应', text:'所有蛋糕自制作日起不超过 3 天，以保持我们希望呈现的风味、口感与品质。' },
            { title:'每日新鲜烘焙', text:'面包与烘焙食品每日新鲜出炉，不会将前一天的产品重新上架销售。' },
          ],
          standardsClosing:'每一口，都是 Love Pier Café 的用心。',
          standardsSignature:'Made Fresh. Served with Love.',
          contactTitle:'联系我们',
          addressLabel:'地址',
          addressValue:'800 108 Saensuk, Mueang Chonburi, Chonburi 20130',
          hoursLabel:'营业时间',
          hoursValue:'每日营业（周三除外） · 09:00–18:00',
          phoneLabel:'电话',
          emailLabel:'邮箱',
          followLabel:'关注我们',
          reserveLabel:'预订座位',
          mapsLabel:'在 Google 地图中打开 →',
        }
      : {
          title:'About — Love Pier Beach Cafe',
          story:'Our Story',
          hero:'',
          storyAside:'Sometimes love begins with something simple — and <em class="italic text-gold whitespace-nowrap">Love Pier</em> was born from that intention',
          storyLead:'A good meal · a long talk by the sea · or watching the sunset with someone special',
          storyBody: [
            'Love Pier Beach Cafe began as a small place meant to bring all of that together.',
            'Many people ask why a seaside cafe serves <strong>"chicken rice"</strong><br/>The answer is simple — we believe good food does not need to be complicated.',
            'Chicken rice is familiar, yet we treat every step with care: ingredients, rice, and dipping sauce — so every bite matters.',
            'We did not start with a beautiful view. We started with food we believed was good enough to bring people back.',
            'Bangsaen became the perfect setting for this story.',
            'On days when the sea breeze is gentle, the light turns soft, and you need a pause from the rush<br/>Love Pier wants to be a small pier where everyone can stop for a while.',
            'Sip signature drinks inspired by <strong>Nong Mon khao lam</strong>, watch the sunset from the pier, and share quiet time with someone important.',
            'For us, food should be sincere, the atmosphere relaxed, and good memories should always have room to happen.',
          ],
          storyTagline:'Love Pier — A Hidden Seaside Escape in Bangsaen.',
          quotePrefix:'Love Pier',
          quoteMiddle:'is not just a cafe, but',
          quoteHighlight:'the most beautiful seaside cafe in Bangsaen',
          values:'What we care about',
          standardsEyebrow:'LOVE PIER PROMISE',
          standardsTitle:'Fresh every day.\nCare in every bite.',
          standardsIntro:'Good food begins with good ingredients and genuine care. Every dish is prepared to the same standard, every day.',
          standardsItems:[
            { title:'Chicken cooked fresh daily', text:'Every chicken is freshly prepared each day, and cooked chicken is never kept overnight, so every plate is fresh, delicious, and up to our standards.' },
            { title:'Chicken sourced from Suphan Buri', text:'We select chicken from a trusted source in Suphan Buri and keep it frozen for no more than three days before cooking.' },
            { title:'No added MSG', text:'Every dish is prepared with care and no added MSG, letting its flavour come from quality ingredients and our own recipes.' },
            { title:'Cakes served within three days', text:'Every cake is sold within three days of being made to preserve the flavour, texture, and quality we intend to serve.' },
            { title:'Baked fresh every day', text:'Our breads and baked goods are made fresh daily. Products from the previous day are never returned to the display.' },
          ],
          standardsClosing:'Every bite we serve carries the care of Love Pier Café.',
          standardsSignature:'Made Fresh. Served with Love.',
          contactTitle:'Contact Us',
          addressLabel:'Address',
          addressValue:'800 108 Saensuk, Mueang Chonburi, Chonburi 20130',
          hoursLabel:'Hours',
          hoursValue:'Open daily (except Wednesday) · 09:00–18:00',
          phoneLabel:'Phone',
          emailLabel:'Email',
          followLabel:'Follow Us',
          reserveLabel:'Reserve a Table',
          mapsLabel:'Open in Google Maps →',
        }
  return (
    <>
      <Head>
        <title>{t.title}</title>
      </Head>

      <PageHero title={t.story} />

      {/* Story intro */}
      <section className="bg-white px-4 py-16 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-24 items-start border-b border-black/10 reveal sm:px-6 sm:py-16 sm:gap-8 lg:px-10 lg:py-24">
        <div
          className="font-display font-light leading-[1.35] text-ink tracking-[-0.01em] text-[clamp(26px,3vw,36px)] max-w-[16ch] sm:max-w-none"
          dangerouslySetInnerHTML={{ __html: t.storyAside }}
        />
        <div className="max-w-[34rem] lg:max-w-[36rem]">
          <p className="text-[15px] sm:text-base leading-[1.75] text-[#666] font-light mb-8">{t.storyLead}</p>
          <div className="space-y-5 text-[14px] sm:text-[15px] leading-[1.85] text-[#555] font-light">
            {t.storyBody.map((paragraph, index) => (
              <p key={index} dangerouslySetInnerHTML={{ __html: paragraph }} />
            ))}
          </div>
          <p className="mt-10 pt-8 border-t border-black/10 font-display text-[17px] sm:text-lg font-light italic text-ink/75 tracking-[0.01em]">
            {t.storyTagline}
          </p>
        </div>
      </section>

      {/* Love Pier Promise — the shop's own daily operating commitments. */}
      <section className="overflow-hidden border-b border-black/10 bg-[#f5f3ef] px-4 py-16 reveal sm:px-6 sm:py-20 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-end gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div>
              <p className="mb-3 text-[10px] font-semibold tracking-[0.32em] text-gold-deep">{t.standardsEyebrow}</p>
              <h2 className="max-w-[13ch] whitespace-pre-line font-display text-[clamp(38px,4.4vw,64px)] font-light leading-[1.08] tracking-[-0.025em] text-ink">{t.standardsTitle}</h2>
            </div>
            <p className="max-w-xl border-l border-[#b18a54]/35 pl-5 text-[14px] font-light leading-[1.9] text-[#666] sm:pl-7 sm:text-[15px]">{t.standardsIntro}</p>
          </div>

          <figure className="group relative mt-10 aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-[#ddd6ce] shadow-[0_24px_70px_rgba(74,53,32,0.12)] sm:aspect-[16/9] lg:mt-14 lg:aspect-[2/1]">
            <Image src="/uploads/love-pier-promise-hero.png" alt={t.standardsTitle.replace('\n', ' ')} fill priority sizes="(min-width: 1280px) 1152px, 100vw" className="object-cover transition-transform duration-1000 group-hover:scale-[1.015]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2d1f13]/60 via-transparent to-transparent" />
            <figcaption className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-5 p-5 text-white sm:p-8 lg:p-10">
              <div>
                <span className="text-[9px] font-semibold tracking-[0.3em] text-white/65">LOVE PIER KITCHEN</span>
                <p className="mt-1.5 max-w-xl font-display text-[clamp(24px,3vw,40px)] font-light italic leading-tight text-white">{t.standardsSignature}</p>
              </div>
              <span aria-hidden="true" className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/35 font-display text-xl text-white/80 sm:flex">LP</span>
            </figcaption>
          </figure>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-2 lg:grid-cols-6 lg:gap-4">
            {t.standardsItems.map((item, index) => (
              <article key={item.title} className={`group relative overflow-hidden rounded-2xl border border-black/10 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#b18a54]/35 hover:shadow-[0_14px_34px_rgba(74,53,32,0.07)] sm:min-h-[230px] sm:p-7 lg:col-span-2 ${index === 3 ? 'lg:col-start-2' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#b18a54]/35 text-[10px] font-semibold tracking-[0.12em] text-gold-deep">0{index + 1}</span>
                  <span aria-hidden="true" className="h-px w-10 bg-[#b18a54]/30 transition-all duration-300 group-hover:w-16" />
                </div>
                <h3 className="mt-7 font-display text-[23px] font-normal leading-tight text-ink sm:text-[25px]">{item.title}</h3>
                <p className="mt-3 text-[13px] font-light leading-[1.8] text-[#666] sm:text-[14px]">{item.text}</p>
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-12 -right-12 h-28 w-28 rounded-full border border-[#b18a54]/[0.08]" />
              </article>
            ))}
          </div>

          <div className="relative mt-5 overflow-hidden rounded-[1.75rem] bg-[#4a3520] px-6 py-9 text-center text-white sm:mt-6 sm:px-10 sm:py-12">
            <span aria-hidden="true" className="absolute -left-10 -top-16 h-40 w-40 rounded-full border border-white/10" />
            <span aria-hidden="true" className="absolute -bottom-20 -right-8 h-48 w-48 rounded-full border border-white/10" />
            <p className="text-[10px] font-semibold tracking-[0.3em] text-[#e4c89d]">OUR DAILY COMMITMENT</p>
            <p className="mx-auto mt-3 max-w-xl font-display text-[clamp(22px,3vw,34px)] font-light leading-relaxed text-white/85">{t.standardsClosing}</p>
          </div>
        </div>
      </section>

      {/* Pull quote */}
      <section className="bg-white px-4 py-16 text-center reveal sm:px-6 sm:py-16 lg:px-16 lg:py-24">
        <blockquote className="font-display font-light leading-[1.55] text-ink tracking-[-0.01em] max-w-[820px] mx-auto text-[clamp(18px,2.6vw,38px)]">
          <span className="text-gold">{t.quotePrefix}</span>{' '}{t.quoteMiddle}
          <br />
          <span className="text-gold whitespace-nowrap">&ldquo;{t.quoteHighlight}&rdquo;</span>
        </blockquote>
      </section>

      {/* Contact section */}
      <section className="bg-[#f5f3ef] px-4 py-16 sm:px-6 sm:py-20 lg:px-10 lg:py-24 reveal border-t border-black/10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
          <div>
            <h2 className="font-display font-light text-[clamp(32px,4vw,52px)] tracking-[-0.02em] text-ink leading-none mb-8">
              {t.contactTitle}
            </h2>
            <dl className="space-y-6 text-[14px] sm:text-[15px] text-[#555] font-light leading-[1.75]">
              <div>
                <dt className="text-[12px] tracking-[0.03em] text-[#999] mb-1">{t.addressLabel}</dt>
                <dd className="text-ink">{t.addressValue}</dd>
              </div>
              <div>
                <dt className="text-[12px] tracking-[0.03em] text-[#999] mb-1">{t.hoursLabel}</dt>
                <dd className="text-ink">{t.hoursValue}</dd>
              </div>
              <div>
                <dt className="text-[12px] tracking-[0.03em] text-[#999] mb-1">{t.phoneLabel}</dt>
                <dd><a href="tel:0642523293" className="text-[#2a1f14] hover:text-gold transition-colors">064-252-3293</a></dd>
              </div>
              <div>
                <dt className="text-[12px] tracking-[0.03em] text-[#999] mb-1">{t.emailLabel}</dt>
                <dd><a href="mailto:lovepier.cafe@gmail.com" className="text-[#2a1f14] hover:text-gold transition-colors break-all">lovepier.cafe@gmail.com</a></dd>
              </div>
            </dl>
          </div>
          <div>
            <div className="mb-8">
              <div className="text-[13px] tracking-[0.08em] text-[#555] mb-4">{t.followLabel}</div>
              <div className="flex flex-col gap-3">
                {[
                  { href:'https://www.instagram.com/lovepiercafe/', label:'Instagram', handle:'lovepiercafe', icon:<><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></> },
                  { href:'https://www.facebook.com/?locale=th_TH', label:'Facebook', handle:'lovepier.cafe', icon:<><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></> },
                  { href:'https://www.tiktok.com/@lovepier.cafe2?_r=1&_t=ZS-97V9HaUa8jE', label:'TikTok', handle:'lovepier.cafe', icon:<><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></> },
                  { href:'https://lin.ee/5A0tfSQ', label:'LINE', handle:'@lovepier.cafe', icon:<><path d="M12 3C6.5 3 2 6.6 2 11c0 4 3.6 7.3 8.5 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6 1.5-1.7 2.6-3.4 2.6-4.9 0-4.4-4.5-8-10-8z"/></> },
                ].map(({ href, label, handle, icon }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                    className="flex flex-row items-center gap-3 group">
                    <span className="w-10 h-10 bg-black/5 rounded-full flex items-center justify-center text-[#666] group-hover:bg-gold group-hover:text-white transition-all duration-300 shrink-0">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">{icon}</svg>
                    </span>
                    <span className="text-[13px] tracking-[0.04em] text-[#555] group-hover:text-gold transition-colors">{handle}</span>
                  </a>
                ))}
              </div>
            </div>
            <Link
              href="/reservation"
              className="inline-flex items-center gap-3 text-[13px] tracking-[0.05em] bg-[#4a3520] text-white px-8 py-4 hover:bg-[#3a2818] transition-colors font-light"
            >
              {t.reserveLabel} →
            </Link>
          </div>
        </div>
        <div className="mt-10 overflow-hidden rounded-xl border border-black/10" style={{ height: '220px' }}>
          <iframe
            title="Love Pier Beach Cafe"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3879.4!2d100.9261639!3d13.2537115!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3102b54b8ceda3d5%3A0x6dad4e501d5d1adf!2sLOVE%20PIER%20BEACH%20CAFE!5e0!3m2!1sth!2sth!4v1700000000000!5m2!1sth!2sth"
            width="100%" height="100%" style={{ border: 0 }}
            allowFullScreen="" loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <a
          href="https://www.google.com/maps/place/LOVE+PIER+BEACH+CAFE/@13.2537115,100.9287388,17z"
          target="_blank" rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-[11px] tracking-[0.1em] uppercase text-gold hover:text-ink transition-colors font-light"
        >
          {t.mapsLabel}
        </a>
      </section>

      <Footer tagline={FOOTER_TAGLINES.about} />
    </>
  )
}
