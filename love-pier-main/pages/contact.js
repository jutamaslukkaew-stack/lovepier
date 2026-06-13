import Head from 'next/head'
import Link from 'next/link'
import Footer from '../components/Footer'
import FormFeedbackModal from '../components/FormFeedbackModal'
import { FOOTER_TAGLINES } from '../lib/footerTagline'
import { useLanguage } from '../lib/language'
import { buildContactEmail } from '../lib/emailContent'
import { submitToApi } from '../lib/submitToApi'
import { useState } from 'react'

export default function Contact() {
  const { lang } = useLanguage()
  const t = lang === 'th'
    ? {
        title: 'Contact — Love Pier Beach Cafe',
        getInTouch: 'ติดต่อเรา',
        hero: 'ทักทายเรา\nหรือแวะมาได้เลย',
        intro: 'เราตอบกลับส่วนใหญ่ภายในไม่กี่ชั่วโมงในเวลาทำการ',
        phone: 'โทรศัพท์', email: 'อีเมล', line: 'ไลน์', reservation: 'จองโต๊ะ',
        bookArrow: 'จองโต๊ะ →',
        sendTitle: 'ส่งข้อความ\nหาเรา',
        sendDesc: 'ไม่ว่าจะเป็นอีเวนต์ส่วนตัว สื่อ หรือพาร์ตเนอร์ เราพร้อมตอบกลับ',
        subject: 'หัวข้อ', fullName: 'ชื่อ-นามสกุล', phoneLabel: 'เบอร์โทร (ไม่บังคับ)', company: 'บริษัท (ไม่บังคับ)',
        message: 'ข้อความ', send: 'ส่งข้อความ', privacy: 'การส่งแบบฟอร์มถือว่ายอมรับนโยบายความเป็นส่วนตัว',
        subjects: ['ทั่วไป', 'อีเวนต์ส่วนตัว', 'สื่อ', 'จัดเลี้ยง', 'ร่วมงาน'],
        messagePlaceholder: 'บอกรายละเอียดที่ต้องการได้เลย…',
        namePlaceholder: 'ชื่อของคุณ',
        emailPlaceholder: 'you@example.com',
        companyPlaceholder: 'หากมี',
        sentMessage: 'ส่งข้อความเรียบร้อย เราจะตอบกลับทางอีเมลของคุณ',
        modalSuccessTitle: 'ส่งข้อความแล้ว',
        modalErrorTitle: 'ส่งไม่สำเร็จ',
        modalClose: 'ปิด',
        sending: 'กำลังส่ง…',
        sendError: 'ส่งไม่สำเร็จ กรุณาลองอีกครั้งหรืออีเมล cafe.lovepier@gmail.com',
        sendConfigError: 'ระบบอีเมลยังไม่พร้อม กรุณาติดต่อ 064-252-3293 หรือ cafe.lovepier@gmail.com',
        followTitle: 'ติดตามเรา',
        followDesc: 'แท็ก #lovepiercafe เพื่อให้เรารีแชร์',
        quick: 'คำถามที่พบบ่อย',
        phoneNote: 'ติดต่อสะดวกในเวลาทำการ',
        emailNote: 'ตอบกลับภายใน 24 ชั่วโมง',
        lineNote: 'ช่องทางเร็วสุดสำหรับการจองด่วน',
        reservationNote: 'ยืนยันการจองภายใน 2 ชั่วโมง',
        highlights: [
          ['งานส่วนตัว', 'สามารถปิดพื้นที่ร้านสำหรับงานเลี้ยง วันเกิด และโอกาสพิเศษ รองรับทั้งแบบนั่งและค็อกเทล'],
          ['จัดเลี้ยง', 'บริการอาหาร เครื่องดื่ม และเบเกอรี่สำหรับงานประชุม งานเลี้ยง และอีเวนต์นอกสถานที่'],
          ['ร่วมงานกับเรา', 'เปิดรับคนรักงานบริการและกาแฟ ติดตามตำแหน่งงานว่างผ่าน Facebook fanpage : Lovepier.cafe'],
        ],
        faq: [
          { q: 'จำเป็นต้องจองโต๊ะล่วงหน้าไหม?', a: 'Walk-in ยินดีต้อนรับเสมอ แต่แนะนำให้จองล่วงหน้าสำหรับช่วงสุดสัปดาห์ เวลาพระอาทิตย์ตก และกลุ่มมากกว่า 4 ท่าน' },
          { q: 'พาสัตว์เลี้ยงเข้าร้านได้ไหม?', a: 'สามารถพาสัตว์เลี้ยงเข้าร้านได้ เรามีโซนพิเศษเฉพาะสำหรับลูกค้าที่มาพร้อมสัตว์เลี้ยง' },
          { q: 'มีที่จอดรถหรือไม่?', a: 'มีที่จอดรถฟรีในพื้นที่ร้าน 18 คัน พร้อมโซนจอดมอเตอร์ไซค์และจักรยาน' },
          { q: 'ร้านรองรับผู้ใช้วีลแชร์ไหม?', a: 'โซนหลักและเทอเรซเป็นทางเรียบไร้ขั้น พร้อมห้องน้ำที่รองรับวีลแชร์ แนะนำให้โทรแจ้งล่วงหน้าหากมาเป็นกลุ่ม' },
          { q: 'สามารถจัดงานส่วนตัวได้หรือเปล่า?', a: 'ได้ เรารับจองปิดพื้นที่ร้านสำหรับงานเลี้ยง วันเกิด และโอกาสพิเศษ รองรับทั้งแบบนั่งและค็อกเทล' },
            { q: 'มีเมนูมังสวิรัติหรือวีแกนไหม?', a: 'ประมาณครึ่งหนึ่งของเมนูเป็นมังสวิรัติ และมีการระบุเมนูวีแกน/กลูเตนฟรีอย่างชัดเจน หลายเมนูสามารถปรับตามความต้องการได้' },
        ],
      }
    : lang === 'zh'
      ? {
          title: 'Contact — Love Pier Beach Cafe',
          getInTouch: '联系我们',
          hero: '欢迎联系\n或直接来访',
          intro: '营业时段内通常几小时内回复。',
          phone: '电话', email: '邮箱', line: 'LINE', reservation: '预订',
          bookArrow: '预订座位 →',
          sendTitle: '给我们\n留言',
          sendDesc: '无论是包场、媒体还是合作，我们都会尽快回复。',
          subject: '主题', fullName: '姓名', phoneLabel: '电话（可选）', company: '公司（可选）',
          message: '留言内容', send: '发送消息', privacy: '提交即表示同意隐私政策。',
          subjects: ['一般咨询', '私人活动', '媒体', '餐饮服务', '招聘'],
          messagePlaceholder: '请告诉我们您的需求…',
          namePlaceholder: '您的姓名',
          emailPlaceholder: 'you@example.com',
          companyPlaceholder: '如适用',
          sentMessage: '消息已发送，我们会通过邮件回复您。',
          modalSuccessTitle: '已发送',
          modalErrorTitle: '发送失败',
          modalClose: '关闭',
          sending: '发送中…',
          sendError: '发送失败，请重试或直接发邮件至 cafe.lovepier@gmail.com',
          sendConfigError: '邮件服务尚未配置，请致电 064-252-3293 或发送邮件至 cafe.lovepier@gmail.com',
          followTitle: '关注我们',
          followDesc: '使用 #lovepiercafe 标记，我们会定期精选分享。',
          quick: '常见问题',
          phoneNote: '营业时段来电最方便',
          emailNote: '通常 24 小时内回复',
          lineNote: '临时需求建议走 LINE',
          reservationNote: '预订约 2 小时内确认',
          highlights: [
            ['私人活动', '可包场举办宴席、生日与特别场合，支持座席或鸡尾酒式布置。'],
            ['餐饮服务', '为会议、宴席与外场活动提供餐饮、饮品与烘焙。'],
            ['招聘信息', '欢迎热爱服务与咖啡的伙伴加入，职位空缺请关注 Facebook fanpage：Lovepier.cafe'],
          ],
          faq: [
            { q: '需要提前预订吗？', a: '欢迎直接到店，但周末、日落时段和 4 人以上团体，建议提前预订以确保座位。' },
            { q: '可以带宠物吗？', a: '可以。我们设有专属宠物友好区域，方便与毛孩一起安心用餐。' },
            { q: '有停车位吗？', a: '店内提供 18 个免费停车位，并设有摩托车与自行车专区。' },
            { q: '咖啡馆无障碍吗？', a: '主楼层与露台为无台阶设计，并配有无障碍卫生间。若为团体来店，建议提前来电。' },
            { q: '可以包场举办活动吗？', a: '可以。我们接受全店包场，适合宴席、生日与特别场合，支持座席或鸡尾酒式布置。' },
            { q: '有素食选择吗？', a: '约一半菜单为素食，并清楚标注纯素与无麸质选项；多数菜品也可依需求调整。' },
          ],
        }
      : {
          title: 'Contact — Love Pier Beach Cafe',
          getInTouch: 'Get in touch',
          hero: 'Say hello,\nor just visit',
          intro: 'We answer most messages within a few hours during open hours.',
          phone: 'Phone', email: 'Email', line: 'LINE', reservation: 'Reservation',
          bookArrow: 'Book a table →',
          sendTitle: 'Send us a\nquick note',
          sendDesc: "Whether it's a private event, press inquiry, partnership, or question — we'll get back to you.",
          subject: 'Subject', fullName: 'Full name', phoneLabel: 'Phone (optional)', company: 'Company (optional)',
          message: 'Your message', send: 'Send Message', privacy: 'By submitting you agree to our privacy policy.',
          subjects: ['General', 'Private Event', 'Press', 'Catering', 'Careers'],
          messagePlaceholder: 'Tell us what you have in mind…',
          namePlaceholder: 'Your name',
          emailPlaceholder: 'you@example.com',
          companyPlaceholder: 'If applicable',
          sentMessage: 'Message sent. We will reply to your email.',
          modalSuccessTitle: 'Message sent',
          modalErrorTitle: 'Could not send',
          modalClose: 'Close',
          sending: 'Sending…',
          sendError: 'Could not send. Please try again or email cafe.lovepier@gmail.com',
          sendConfigError: 'Email is not set up yet. Please call 064-252-3293 or email cafe.lovepier@gmail.com',
          followTitle: 'Follow us, say hello',
          followDesc: 'Tag #lovepiercafe to be featured.',
          quick: 'Quick answers',
          phoneNote: 'Open hours only',
          emailNote: 'Reply within 24h',
          lineNote: 'Fastest for last-minute',
          reservationNote: 'Confirmed in 2 hours',
          highlights: [
            ['Private events', 'We can close the cafe for parties, birthdays, and special occasions — seated or cocktail-style.'],
            ['Catering', 'Food, drinks, and bakery for meetings, parties, and off-site events.'],
            ['Careers', 'We welcome hospitality and coffee lovers. Follow job openings on Facebook fanpage: Lovepier.cafe'],
          ],
          faq: [
            { q: 'Do I need a reservation?', a: 'Walk-ins are always welcome, though we recommend booking ahead for weekends, sunset hours, and groups of more than four.' },
            { q: 'Are pets welcome?', a: 'Absolutely. We provide a dedicated pet-friendly zone for guests visiting with their furry companions.' },
            { q: 'Do you have parking?', a: 'Yes — we offer 18 complimentary on-site parking spaces, plus dedicated areas for motorbikes and bicycles.' },
            { q: 'Is the cafe accessible?', a: 'The main floor and terrace are step-free, with a wheelchair-accessible restroom. For group visits, a quick call in advance is appreciated.' },
            { q: 'Can I host a private event?', a: 'Yes. We welcome full-venue bookings for parties, birthdays, and special occasions — seated or cocktail-style.' },
            { q: 'Do you have vegetarian options?', a: 'Roughly half of our menu is vegetarian, with vegan and gluten-free choices clearly marked. Many dishes can also be tailored on request.' },
          ],
        }
  const [subject, setSubject] = useState(t.subjects[0])
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    setErrorMessage('')
    const form = e.currentTarget
    const payload = {
      subject,
      name: form.name.value,
      email: form.email.value,
      phone: form.phone.value,
      company: form.company.value,
      message: form.message.value,
    }
    try {
      await submitToApi('/api/contact', payload, buildContactEmail(payload))
      setStatus('success')
      form.reset()
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

      {/* Contact hero */}
      <section className="px-4 pt-12 pb-10 grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-9 lg:gap-20 items-start border-b border-black/10 reveal sm:px-6 lg:pt-20 lg:pb-16">
        <div>
          <span className="block text-[10px] tracking-[0.4em] uppercase text-muted mb-5">{t.getInTouch}</span>
          <h1 className="font-display font-light leading-[0.95] text-ink tracking-[-0.02em] text-[clamp(48px,6vw,80px)]">{t.hero.split('\n').map((l,i)=><span key={i}>{l}{i===0?<br/>:null}</span>)}</h1>
          <p className="mt-6 text-sm text-[#666] leading-[1.9] font-light max-w-[420px]">{t.intro}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          <a href="tel:0642523293" className="flex flex-col gap-2 p-6 sm:p-7 lg:p-8 bg-white border border-black/10 hover:bg-[#fffdf6] hover:border-gold transition-all duration-200">
            <span className="text-[10px] tracking-[0.3em] uppercase text-gold">{t.phone}</span>
            <div className="font-display text-[22px] font-normal text-ink leading-[1.2]">064-252-3293</div>
            <div className="text-xs text-muted font-light mt-1">{t.phoneNote}</div>
          </a>
          <a href="mailto:cafe.lovepier@gmail.com" className="flex flex-col gap-2 p-6 sm:p-7 lg:p-8 bg-white border border-black/10 hover:bg-[#fffdf6] hover:border-gold transition-all duration-200">
            <span className="text-[10px] tracking-[0.3em] uppercase text-gold">{t.email}</span>
            <div className="font-display text-[20px] sm:text-[22px] font-normal text-ink leading-[1.2] break-all">cafe.lovepier@gmail.com</div>
            <div className="text-xs text-muted font-light mt-1">{t.emailNote}</div>
          </a>
          <a href="https://lin.ee/uZWxbGjx" target="_blank" rel="noopener noreferrer" className="flex flex-col gap-2 p-6 sm:p-7 lg:p-8 bg-white border border-black/10 hover:bg-[#fffdf6] hover:border-gold transition-all duration-200">
            <span className="text-[10px] tracking-[0.3em] uppercase text-gold">{t.line}</span>
            <div className="font-display text-[22px] font-normal text-ink leading-[1.2]">@lovepier.cafe</div>
            <div className="text-xs text-muted font-light mt-1">{t.lineNote}</div>
          </a>
          <Link href="/reservation" className="flex flex-col gap-2 p-6 sm:p-7 lg:p-8 bg-white border border-black/10 hover:bg-[#fffdf6] hover:border-gold transition-all duration-200">
            <span className="text-[10px] tracking-[0.3em] uppercase text-gold">{t.reservation}</span>
            <div className="font-display text-[22px] font-normal text-ink leading-[1.2]">{t.bookArrow}</div>
            <div className="text-xs text-muted font-light mt-1">{t.reservationNote}</div>
          </Link>
        </div>
      </section>

      {/* Form section */}
      <section className="px-4 py-16 grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-9 lg:gap-20 items-start border-b border-black/10 bg-white reveal sm:px-6 sm:py-16">
        <div>
          <h2 className="font-display font-light leading-[1.05] mb-5 text-[clamp(36px,4.5vw,56px)]">{t.sendTitle.split('\n').map((l,i)=><span key={i}>{l}{i===0?<br/>:null}</span>)}</h2>
          <p className="text-sm text-[#666] leading-[1.9] mb-8 font-light">{t.sendDesc}</p>
          <ul className="list-none">
            {t.highlights.map(([label, text]) => (
              <li key={label} className="flex items-baseline gap-4 py-3.5 border-b border-black/10 text-[13px] text-[#555] font-light before:content-['·'] before:text-gold before:text-2xl">
                <strong className="text-ink font-medium min-w-[100px] inline-block">{label}</strong>{text}
              </li>
            ))}
          </ul>
        </div>
        <form
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 gap-x-5"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col lg:col-span-2">
            <label className="text-[10px] tracking-[0.3em] uppercase text-[#aaa] mb-2">{t.subject}</label>
            <div className="flex gap-2 flex-wrap">
              {t.subjects.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSubject(s)}
                  className={`text-[11px] tracking-[0.15em] uppercase px-[14px] py-[7px] border cursor-pointer transition-all duration-200 ${subject === s ? 'bg-ink text-bg border-ink' : 'border-black/[0.12] text-[#888] hover:border-ink hover:text-ink'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] tracking-[0.3em] uppercase text-[#aaa] mb-2" htmlFor="cname">{t.fullName}</label>
            <input className="c-input" type="text" id="cname" name="name" placeholder={t.namePlaceholder} required disabled={status === 'sending'} />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] tracking-[0.3em] uppercase text-[#aaa] mb-2" htmlFor="cemail">{t.email}</label>
            <input className="c-input" type="email" id="cemail" name="email" placeholder={t.emailPlaceholder} required disabled={status === 'sending'} />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] tracking-[0.3em] uppercase text-[#aaa] mb-2" htmlFor="cphone">{t.phoneLabel}</label>
            <input className="c-input" type="tel" id="cphone" name="phone" placeholder="+66" disabled={status === 'sending'} />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] tracking-[0.3em] uppercase text-[#aaa] mb-2" htmlFor="ccompany">{t.company}</label>
            <input className="c-input" type="text" id="ccompany" name="company" placeholder={t.companyPlaceholder} disabled={status === 'sending'} />
          </div>
          <div className="flex flex-col lg:col-span-2">
            <label className="text-[10px] tracking-[0.3em] uppercase text-[#aaa] mb-2" htmlFor="cmessage">{t.message}</label>
            <textarea className="c-input" id="cmessage" name="message" placeholder={t.messagePlaceholder} required disabled={status === 'sending'}></textarea>
          </div>
          <div className="lg:col-span-2 flex flex-wrap sm:flex-col justify-between items-center sm:items-start gap-6 mt-4 sm:gap-3.5">
            <span className="text-[11px] text-[#aaa] tracking-[0.1em]">{t.privacy}</span>
            <button
              type="submit"
              disabled={status === 'sending'}
              className="inline-block bg-ink text-bg text-[11px] tracking-[0.25em] uppercase px-7 py-3.5 hover:bg-gold hover:text-ink transition-colors duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'sending' ? t.sending : t.send}
            </button>
          </div>
        </form>
      </section>

      {/* Socials block */}
      <section className="px-4 py-14 border-b border-black/10 text-center reveal sm:px-6 sm:py-14 lg:px-10 lg:py-20">
        <h3 className="font-display font-light mb-4 text-[clamp(32px,4vw,48px)]">{t.followTitle}</h3>
        <p className="text-sm text-[#777] mb-9 font-light">{t.followDesc}</p>
        <div className="flex justify-center gap-4 flex-wrap">
          <a href="#" className="flex items-center gap-3 px-6 py-3.5 border border-black/[0.12] text-[11px] tracking-[0.25em] uppercase text-[#555] hover:bg-ink hover:text-bg hover:border-ink transition-all duration-200"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor"/></svg>Instagram</a>
          <a href="https://www.facebook.com/profile.php?id=61590549024692" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-6 py-3.5 border border-black/[0.12] text-[11px] tracking-[0.25em] uppercase text-[#555] hover:bg-ink hover:text-bg hover:border-ink transition-all duration-200"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.5h2.5l.5-3h-3V8.5c0-.9.3-1.5 1.6-1.5H17V4.3c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V10.5H8v3h2.5V21h3z"/></svg>Facebook</a>
          <a href="https://lin.ee/uZWxbGjx" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-6 py-3.5 border border-black/[0.12] text-[11px] tracking-[0.25em] uppercase text-[#555] hover:bg-ink hover:text-bg hover:border-ink transition-all duration-200"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.5 3 2 6.6 2 11c0 4 3.6 7.3 8.5 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6 1.5-1.7 2.6-3.4 2.6-4.9 0-4.4-4.5-8-10-8z"/></svg>LINE Official</a>
          <a href="#" className="flex items-center gap-3 px-6 py-3.5 border border-black/[0.12] text-[11px] tracking-[0.25em] uppercase text-[#555] hover:bg-ink hover:text-bg hover:border-ink transition-all duration-200"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.8a4.3 4.3 0 0 1-2.6-1.6 4.3 4.3 0 0 1-.8-2.2h-3v12c0 1-.8 1.9-1.9 1.9a1.9 1.9 0 0 1-1.9-1.9c0-1 .8-1.9 1.9-1.9.2 0 .4 0 .6.1V9.1a5 5 0 0 0-.6 0 5 5 0 1 0 5 5V8.4a7.4 7.4 0 0 0 4.3 1.4V6.7a4.4 4.4 0 0 1-1-.9z"/></svg>TikTok</a>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-14 border-b border-black/10 reveal sm:px-6 sm:py-14 lg:px-10 lg:py-20">
        <div className="mb-12">
          <h3 className="font-display font-light leading-[1.05] text-[clamp(32px,4vw,48px)]">{t.quick}</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16">
          {t.faq.map(({ q, a }) => (
            <div key={q} className="py-6 border-b border-black/10">
              <h4 className="font-display text-[20px] font-normal text-ink mb-2">{q}</h4>
              <p className="text-[13px] text-[#666] leading-[1.8] font-light">{a}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer tagline={FOOTER_TAGLINES.contact} />
    </>
  )
}
