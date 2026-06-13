import Head from 'next/head'
import Link from 'next/link'
import Footer from '../components/Footer'
import { ScrollStack, ScrollStackPanel } from '../components/ScrollStack'
import { useLanguage } from '../lib/language'

export default function Home() {
  const { lang } = useLanguage()
  const t = lang === 'th'
    ? {
        title: 'Love Pier Beach Cafe — หน้าหลัก',
        city: 'chonburi . thailand',
        hoursLabel: 'เวลาเปิดทำการ',
        hoursValue: 'เปิดทุกวัน (ยกเว้นวันพุธ) 09:00-18:00',
        est: 'ก่อตั้ง',
        location: 'ที่ตั้ง',
        locationValue: '800 108 แสนสุข\nอำเภอเมือง จังหวัดชลบุรี 20130',
        exploreMenu: 'ดูเมนู',
        since: 'ตั้งแต่ปี 2026',
        about1: '<strong>LOVE PIER BEACH CAFE</strong> คาเฟ่ริมชายหาดบางแสน ที่ให้ทุกมื้อพิเศษกว่าที่เคย',
        about2: 'สัมผัสรสชาติของ <em class="italic text-gold">"ข้าวมันไก่สิงคโปร์และข้าวมันไก่ไหหลำ สูตรต้นตำรับ"</em> พร้อมจิบเครื่องดื่มซิกเนเจอร์ ที่ได้แรงบันดาลใจจาก <em class="italic text-gold">"ข้าวหลามหนองมน"</em> เอกลักษณ์แห่งบางแสนที่ถูกถ่ายทอดออกมาในรูปแบบใหม่ อย่างละมุน ทุกเมนูถูกออกแบบให้กินชิล ๆ ไม่เร่ง ไม่รีบ แค่ได้นั่งลงมาพักใจกับรสที่คุ้นเคย',
        about3: 'นั่งรับลมทะเล ฟังเสียงคลื่นเบา ๆ ท่ามกลางบรรยากาศอบอุ่นริมชายหาด และเก็บภาพความทรงจำที่มุมท่าเรือสุดโรแมนติก',
        about4: 'เพราะบางช่วงเวลาที่สวยงาม ไม่ได้ต้องการอะไรมากไปกว่าอาหารดี ๆ เครื่องดื่มแก้วโปรด และคนพิเศษที่นั่งมองพระอาทิตย์ตกไปด้วยกัน<br />ที่ <strong class="italic text-gold font-normal tracking-[0.12em]">LOVE PIER BEACH CAFE</strong>',
        address: 'ที่อยู่',
        addressValue: '800 108 แสนสุข\nอำเภอเมือง จังหวัดชลบุรี 20130',
        hoursCompact: 'เปิดทุกวัน (ยกเว้นวันพุธ) · 09:00-18:00',
        contact: 'ติดต่อ',
        follow: 'ติดตาม',
      }
    : lang === 'zh'
      ? {
          title: 'Love Pier Beach Cafe — 首页',
          city: 'chonburi . thailand',
          hoursLabel: '营业时间',
        hoursValue: '每日营业（周三除外） 09:00-18:00',
          est: '创立',
          location: '地址',
          locationValue: '800 108 Saensuk\nMueang Chonburi, Chonburi 20130',
          exploreMenu: '查看菜单',
          since: '自 2026 年起',
          about1: 'Love Pier Cafe 是邦盛海边的一家咖啡馆，让每一餐都比以往更特别。',
          about2: '品尝<em class="italic text-gold">“新加坡鸡饭与海南鸡饭（传统原味）”</em>，再搭配受<em class="italic text-gold">“农蒙竹筒糯米饭”</em>启发的招牌饮品，把邦盛在地风味以更细腻的方式重新呈现。我们希望您放慢脚步，多坐一会儿，安心品尝熟悉的味道。',
          about3: '在温暖的海边氛围里吹着海风、听着轻柔浪声，也在通往海面的浪漫码头留下属于你的回忆。',
          about4: '有些美好时刻，其实只需要好食物、喜欢的那杯饮品，以及一起看夕阳的人。<br />就在 <strong class="italic text-gold font-normal tracking-[0.12em]">LOVE PIER BEACH CAFE</strong>。',
          address: '地址',
          addressValue: '800 108 Saensuk\nMueang Chonburi, Chonburi 20130',
          hoursCompact: '每日营业（周三除外） · 09:00-18:00',
          contact: '联系',
          follow: '关注我们',
        }
      : {
        title: 'Love Pier Beach Cafe — Home',
        city: 'chonburi . thailand',
        hoursLabel: 'Hours',
      hoursValue: 'Open daily (except Wednesday) 09:00-18:00',
        est: 'Est.',
        location: 'Location',
        locationValue: '800 108 Saensuk\nMueang Chonburi, Chonburi 20130',
        exploreMenu: 'Explore Menu',
        since: 'Since 2026',
        about1: 'Love Pier Cafe is a beachside cafe in Bangsaen where every meal feels more special.',
        about2: 'Enjoy <em class="italic text-gold">Singaporean and Hainanese chicken rice (original recipes)</em>, paired with signature drinks inspired by <em class="italic text-gold">Nong Mon khao lam</em>, reimagined with a softer, modern touch. We cook with care so you can linger longer and taste something familiar in peace.',
        about3: 'Sit by the sea breeze, listen to the gentle waves, and capture memories at our romantic pier stretching out toward the water.',
        about4: 'Some beautiful moments only need great food, a favorite drink, and someone special to watch the sunset with<br />at <strong class="italic text-gold font-normal tracking-[0.12em]">LOVE PIER BEACH CAFE</strong>.',
        address: 'Address',
        addressValue: '800 108 Saensuk\nMueang Chonburi, Chonburi 20130',
      hoursCompact: 'Open daily (except Wednesday) · 09:00-18:00',
        contact: 'Contact',
        follow: 'Follow',
      }
  const renderLines = (text) => text.split('\n').map((line, idx, arr) => (
    <span key={`${line}-${idx}`}>
      {line}
      {idx < arr.length - 1 ? <br /> : null}
    </span>
  ))

  return (
    <>
      <Head>
        <title>{t.title}</title>
      </Head>

      <ScrollStack>
      <ScrollStackPanel>
      {/* HERO HEADER */}
      <header className="px-4 pt-10 pb-7 text-center reveal sm:px-6 lg:px-10 lg:pt-12 lg:pb-8">
        <div className="text-[10px] tracking-[0.4em] uppercase text-muted mb-3">{t.city}</div>
        <h1 className="font-display font-light leading-[0.95] text-ink tracking-[-0.02em] text-[clamp(40px,7vw,88px)]">Love Pier<br/>Beach Cafe</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 mt-8 pt-5 border-t border-black/10 items-start gap-4 lg:gap-0">
          <div className="text-left">
            <span className="block text-[9px] tracking-[0.35em] uppercase text-[#aaa] mb-1.5">{t.hoursLabel}</span>
            <div className="text-xs text-[#444] leading-relaxed font-light">{t.hoursValue}</div>
          </div>
          <div className="text-right lg:justify-self-end">
            <span className="block text-[9px] tracking-[0.35em] uppercase text-[#aaa] mb-1.5">{t.location}</span>
            <div className="text-xs text-[#444] leading-relaxed font-light">{renderLines(t.locationValue)}</div>
          </div>
        </div>
      </header>

      <div className="w-full bg-[#e8e4de] reveal-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="block w-full h-auto max-h-[85vh] object-contain [filter:saturate(0.75)] lg:max-h-none lg:aspect-[3/2] lg:object-cover lg:object-[50%_40%]"
          src="/uploads/home-hero.png"
          alt="Love Pier Beach Cafe"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 reveal">
        <div className="bg-[#e8e4de] sm:relative sm:overflow-hidden sm:aspect-[5/4] lg:aspect-[4/3] xl:aspect-[3/2]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="block w-full h-auto object-contain sm:absolute sm:inset-0 sm:h-full sm:object-cover sm:object-[50%_42%] [filter:saturate(0.7)] hover:[filter:saturate(1)] transition-[filter] duration-500"
            src="/uploads/home-cafe-interior.png"
            alt="Love Pier Beach Cafe interior"
          />
        </div>
        <div className="bg-[#e8e4de] sm:relative sm:overflow-hidden sm:aspect-[5/4] lg:aspect-[4/3] xl:aspect-[3/2]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="block w-full h-auto object-contain sm:absolute sm:inset-0 sm:h-full sm:object-cover sm:object-[50%_48%] [filter:saturate(0.7)] hover:[filter:saturate(1)] transition-[filter] duration-500"
            src="/uploads/drink-can-set.png"
            alt="Love Pier canned drinks"
          />
        </div>
      </div>
      </ScrollStackPanel>

      <ScrollStackPanel>
      <section className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] px-4 py-14 items-start lg:items-center reveal sm:px-6 sm:py-16 lg:px-10 lg:py-20 gap-12 lg:gap-14 xl:gap-20">
        <div className="inline-block max-w-full lg:pr-6 xl:pr-10">
          <h2 className="font-display font-light leading-[0.92] text-ink tracking-[-0.02em] text-[clamp(40px,6vw,72px)]">
            Beach Vibes,<br/>
            Cafe by The Sea,<br/>
            <em className="italic text-gold">Singapore Chicken Rice</em>
          </h2>
          <Link href="/menu" className="mt-8 flex w-full items-center justify-between text-[11px] tracking-[0.25em] uppercase text-[#5f5a51] bg-[#ece7dc] border border-[#d8cdbb] px-5 py-2.5 hover:bg-[#e4dccd] hover:text-ink transition-colors duration-200 after:content-['→'] after:text-base after:transition-transform after:duration-200 hover:after:translate-x-1">{t.exploreMenu}</Link>
        </div>
        <div className="lg:pl-2 xl:pl-4">
          <div className="text-[9px] tracking-[0.4em] uppercase text-[#bbb] mb-5 flex items-center gap-3 before:content-[''] before:block before:w-6 before:h-px before:bg-[#bbb]">{t.since}</div>
          <div className="text-sm leading-[1.9] text-[#555] font-light max-w-none">
            <p className="mb-4" dangerouslySetInnerHTML={{ __html: t.about1 }} />
            <p className="mb-4" dangerouslySetInnerHTML={{ __html: t.about2 }} />
            <p dangerouslySetInnerHTML={{ __html: `${t.about3}${'about4' in t ? ` ${t.about4}` : ''}` }} />
          </div>
        </div>
      </section>
      </ScrollStackPanel>

      <ScrollStackPanel tone="white">
      {/* Mosaic grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 reveal">
        <div className="bg-[#e8e4de] sm:relative sm:overflow-hidden sm:aspect-[5/4] lg:aspect-[4/3] xl:aspect-[3/2]">
          <img className="home-mosaic-img block w-full h-auto object-contain sm:absolute sm:inset-0 sm:h-full sm:object-cover sm:object-[50%_55%]" src="/uploads/home-love-pier-exterior.png" alt="Love Pier Beach Cafe exterior" />
        </div>
        <div className="bg-[#e8e4de] sm:relative sm:overflow-hidden sm:aspect-[5/4] lg:aspect-[4/3] xl:aspect-[3/2]">
          <img className="home-mosaic-img block w-full h-auto object-contain sm:absolute sm:inset-0 sm:h-full sm:object-cover sm:object-[50%_72%]" src="/uploads/home-espresso.png" alt="coffee" />
        </div>
      </div>
      </ScrollStackPanel>

      <ScrollStackPanel>
      {/* Map section */}
      <div className="reveal">
        <div className="w-full h-72 sm:h-80 bg-[#d9d7d1] relative overflow-hidden">
          <div className="absolute inset-0 opacity-55" style={{ backgroundImage:'linear-gradient(rgba(255,255,255,0.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.3) 1px,transparent 1px)', backgroundSize:'44px 44px' }}></div>
          <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.96 }} viewBox="0 0 1200 320" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="1200" height="320" fill="#d9d7d1" />
            <path d="M0 0 H430 C470 35, 472 82, 448 116 C430 143, 430 172, 448 201 C471 239, 468 287, 430 320 H0 Z" fill="#9fc4ce" />
            <path d="M430 0 C470 35, 472 82, 448 116 C430 143, 430 172, 448 201 C471 239, 468 287, 430 320" fill="none" stroke="#c9a96e" strokeWidth="10" opacity="0.36" />

            <path d="M160 -20 V360" stroke="#b8b1a8" strokeWidth="8" />
            <path d="M640 -20 V360" stroke="#b4ada4" strokeWidth="9" />
            <path d="M960 -20 V360" stroke="#b4ada4" strokeWidth="9" />
            <path d="M-20 86 H1220" stroke="#b9b2a9" strokeWidth="7" />
            <path d="M-20 214 H1220" stroke="#b9b2a9" strokeWidth="6" />

            <g stroke="#b2aca2" strokeWidth="4" fill="none" opacity="0.95">
              <path d="M520 62 L580 62 L580 122 L700 122 L700 84 L760 84" />
              <path d="M548 154 L618 154 L618 198 L710 198" />
              <path d="M520 246 L606 246 L606 286 L742 286" />
              <path d="M792 52 L842 52 L842 132 L932 132 L932 92 L1010 92" />
              <path d="M794 176 L860 176 L860 236 L938 236 L938 270 L1032 270" />
              <path d="M690 236 L732 236 L732 270 L780 270" />
            </g>

            <g stroke="#94bcc7" strokeWidth="4" fill="none" opacity="0.82">
              <path d="M474 134 C512 150, 538 166, 560 188 C584 212, 604 238, 626 264" />
              <path d="M516 106 C546 116, 572 132, 598 158" />
            </g>

            <g fontFamily="Jost, sans-serif" fontSize="11" letterSpacing="1" fill="#736e66" opacity="0.78">
              <text x="72" y="52">GULF OF THAILAND</text>
              <text x="742" y="58">SAENSUK ROAD</text>
              <text x="986" y="166" transform="rotate(-90 986,166)">SUKHUMVIT ROAD</text>
              <text x="700" y="304">MUEANG CHONBURI</text>
            </g>
          </svg>
          <a
            href="https://maps.app.goo.gl/CYDRrd6hoxRv7z4j8"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open Love Pier Beach Cafe in Google Maps"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 group max-w-[90vw]"
          >
            <div className="w-5 h-5 rounded-full bg-ink group-hover:scale-110 transition-transform" style={{ boxShadow:'0 0 0 6px rgba(26,26,26,0.12),0 0 0 12px rgba(26,26,26,0.06)' }}></div>
            <div className="text-[10px] sm:text-[11px] tracking-[0.16em] sm:tracking-[0.2em] uppercase text-[#444] bg-[rgba(245,243,239,0.9)] px-3 py-1 group-hover:bg-[rgba(245,243,239,1)] transition-colors text-center">Love Pier Beach Cafe</div>
          </a>
        </div>
        <div className="bg-bg border-t border-black/10 px-4 py-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] gap-8 lg:gap-10 items-start sm:px-6">
          <div>
            <span className="block text-[9px] tracking-[0.35em] uppercase text-[#bbb] mb-2">{t.address}</span>
            <div className="text-[13px] text-[#444] leading-[1.7] font-light">{renderLines(t.addressValue)}</div>
          </div>
          <div>
            <span className="block text-[9px] tracking-[0.35em] uppercase text-[#bbb] mb-2">{t.hoursLabel}</span>
            <div className="text-[13px] text-[#444] leading-[1.7] font-light">{t.hoursCompact}</div>
          </div>
          <div>
            <span className="block text-[9px] tracking-[0.35em] uppercase text-[#bbb] mb-2">{t.contact}</span>
            <div className="text-[13px] text-[#444] leading-[1.7] font-light"><a href="tel:0642523293" className="text-muted hover:text-ink transition-colors">064-252-3293</a><br/><a href="mailto:cafe.lovepier@gmail.com" className="text-muted hover:text-ink transition-colors break-all">cafe.lovepier@gmail.com</a></div>
          </div>
          <div>
            <span className="block text-[9px] tracking-[0.35em] uppercase text-[#bbb] mb-2">{t.follow}</span>
            <div className="flex gap-3 items-center flex-wrap">
              <a href="#" className="text-muted border border-black/[0.12] p-2 hover:border-ink hover:text-ink hover:bg-ink hover:[&_svg]:text-bg transition-all flex items-center justify-center w-8 h-8" aria-label="Instagram"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor"/></svg></a>
              <a href="https://www.facebook.com/profile.php?id=61590549024692" target="_blank" rel="noopener noreferrer" className="text-muted border border-black/[0.12] p-2 hover:border-ink hover:text-ink hover:bg-ink transition-all flex items-center justify-center w-8 h-8" aria-label="Facebook"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.5h2.5l.5-3h-3V8.5c0-.9.3-1.5 1.6-1.5H17V4.3c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V10.5H8v3h2.5V21h3z"/></svg></a>
              <a href="https://lin.ee/uZWxbGjx" target="_blank" rel="noopener noreferrer" className="text-muted border border-black/[0.12] p-2 hover:border-ink hover:text-ink hover:bg-ink transition-all flex items-center justify-center w-8 h-8" aria-label="LINE"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.5 3 2 6.6 2 11c0 4 3.6 7.3 8.5 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6 1.5-1.7 2.6-3.4 2.6-4.9 0-4.4-4.5-8-10-8z"/></svg></a>
              <a href="#" className="text-muted border border-black/[0.12] p-2 hover:border-ink hover:text-ink hover:bg-ink transition-all flex items-center justify-center w-8 h-8" aria-label="TikTok"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.8a4.3 4.3 0 0 1-2.6-1.6 4.3 4.3 0 0 1-.8-2.2h-3v12c0 1-.8 1.9-1.9 1.9a1.9 1.9 0 0 1-1.9-1.9c0-1 .8-1.9 1.9-1.9.2 0 .4 0 .6.1V9.1a5 5 0 0 0-.6 0 5 5 0 1 0 5 5V8.4a7.4 7.4 0 0 0 4.3 1.4V6.7a4.4 4.4 0 0 1-1-.9z"/></svg></a>
            </div>
          </div>
        </div>
      </div>

      <Footer />
      </ScrollStackPanel>
      </ScrollStack>
    </>
  )
}
