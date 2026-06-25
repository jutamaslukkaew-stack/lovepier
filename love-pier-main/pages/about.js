import Head from 'next/head'
import Footer from '../components/Footer'
import { FOOTER_TAGLINES } from '../lib/footerTagline'
import { useLanguage } from '../lib/language'

export default function About() {
  const { lang } = useLanguage()
  const t = lang === 'th'
    ? {
        title:'About — Love Pier Beach Cafe',
        story:'เรื่องราวของเรา · ตั้งแต่ปี 2026',
        hero:'',
        storyAside:'บางครั้งความรักก็เริ่มจากเรื่องง่าย ๆ — <em class="italic text-gold">Love Pier</em> เกิดขึ้นจากความตั้งใจนั้น',
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
      }
    : lang === 'zh'
      ? {
          title:'About — Love Pier Beach Cafe',
          story:'我们的故事 · 自 2026 年',
          hero:'',
          storyAside:'有时，爱从一件小事开始 — <em class="italic text-gold">Love Pier</em> 也因此诞生',
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
        }
      : {
          title:'About — Love Pier Beach Cafe',
          story:'Our Story · Since 2026',
          hero:'',
          storyAside:'Sometimes love begins with something simple — and <em class="italic text-gold">Love Pier</em> was born from that intention',
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
        }
  return (
    <>
      <Head>
        <title>{t.title}</title>
      </Head>

      {/* Story hero */}
      <section className="relative h-[62vh] lg:h-[70vh] min-h-[420px] lg:min-h-[480px] overflow-hidden border-b border-black/10 reveal-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="w-full h-full object-cover object-[50%_45%] [filter:saturate(0.65)_brightness(0.88)]" src="/uploads/about-hero.png" alt="Love Pier Beach Cafe interior" />
        <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 lg:p-16 text-bg">
          <div className="text-[10px] tracking-[0.4em] uppercase text-[rgba(245,243,239,0.6)] mb-4">{t.story}</div>
          {t.hero ? (
            <h1 className="font-display font-light leading-[0.9] tracking-[-0.03em] max-w-[1000px] text-[clamp(56px,8vw,110px)]">{t.hero.split('\n').map((l,i)=><span key={i}>{l}{i===0?<br/>:null}</span>)}</h1>
          ) : null}
        </div>
      </section>

      {/* Story intro */}
      <section className="px-4 py-16 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-24 items-start border-b border-black/10 reveal sm:px-6 sm:py-16 sm:gap-8 lg:px-10 lg:py-24">
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

      {/* Pull quote */}
      <section className="bg-white px-4 py-16 text-center reveal sm:px-6 sm:py-16 lg:px-16 lg:py-24">
        <blockquote className="font-display font-light leading-[1.3] text-ink tracking-[-0.01em] max-w-[900px] mx-auto text-[clamp(28px,3.5vw,44px)]">
          <span className="text-gold italic">{t.quotePrefix}</span> {t.quoteMiddle} <span className="text-gold italic">&ldquo;{t.quoteHighlight}&rdquo;</span>
        </blockquote>
      </section>

      <Footer tagline={FOOTER_TAGLINES.about} />
    </>
  )
}
