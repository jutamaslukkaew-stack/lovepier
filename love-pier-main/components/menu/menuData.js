// Copy, category mapping, and DB → view-model transforms shared by /menu and
// /delivery. Edit this file (not the pages) to change section titles,
// subtitles, or how DB rows map to menu sections — both pages pick it up.

const SRCSET_WIDTHS = [480, 960, 1440]

// Two storage layouts produce responsive sources:
//   legacy uploads → <base>-960w.webp   (siblings -480w / -1440w)
//   bulk import    → menu/<code>/960.webp (siblings 480 / 1440, see
//                    lib/menuImport/imageProcess.ts)
// A ?v= cache-buster may be attached by withImageVersion; it is re-applied to
// every candidate so the whole set busts together.
export function getSrcSet(url) {
  if (!url) return undefined
  const [path, query] = url.split('?')
  const suffix = query ? `?${query}` : ''
  const widths = (make) => SRCSET_WIDTHS.map((w) => `${make(w)}${suffix} ${w}w`).join(', ')

  if (path.includes('-960w.webp')) {
    const base = path.replace('-960w.webp', '')
    return widths((w) => `${base}-${w}w.webp`)
  }
  if (path.endsWith('/960.webp')) {
    const base = path.slice(0, -'960.webp'.length)
    return widths((w) => `${base}${w}.webp`)
  }
  return undefined
}

// Imported images keep the same storage path when re-uploaded, so the only
// thing that changes is image_version — append it or browsers serve the old file.
export function withImageVersion(url, version) {
  if (!url || !version) return url ?? null
  return `${url}${url.includes('?') ? '&' : '?'}v=${version}`
}

export function formatMenuPrice(price) {
  if (!price) return '–'
  if (price === 'Free') return 'Free'
  return `฿${price}`
}

export const COFFEE_PRICE_KEYS = ['hot', 'iced', 'blended']

export const COFFEE_PRICE_LABELS = {
  th: { hot: 'ร้อน', iced: 'เย็น', blended: 'ปั่น' },
  en: { hot: 'Hot', iced: 'Iced', blended: 'Frappe' },
  zh: { hot: '热', iced: '冰', blended: '冰沙' },
}

export function drinkPriceLabels(lang) {
  return COFFEE_PRICE_LABELS[lang] || COFFEE_PRICE_LABELS.en
}

const COFFEE_ADDONS_COPY = {
  en: [
    { name: 'Add an Extra Shot', price: '35' },
    { name: 'Milk Oat', price: '20' },
  ],
  th: [
    { name: 'เพิ่มเอสเพรสโซ่ช็อต', price: '35' },
    { name: 'เปลี่ยนนมข้าวโอ๊ต', price: '20' },
  ],
  zh: [
    { name: '加一份浓缩', price: '35' },
    { name: '换燕麦奶', price: '20' },
  ],
}

export function menuAddOnsForCategory(cat, lang) {
  if (cat === 'coffee' || cat === 'coffee-drinks') return COFFEE_ADDONS_COPY[lang] || COFFEE_ADDONS_COPY.en
  return undefined
}

export const MATCHA_TASTE_NOTES = {
  en: [
    {
      swatch: 'bg-[#b5d39a]',
      title: 'Premium Matcha from Japan — Yame City',
      desc: 'Creamy and mellow with rich, kusa mochi and buttery flavours evocative of walnuts and almonds.',
    },
    {
      swatch: 'bg-[#3a5630]',
      title: 'Premium Matcha from Japan',
      desc: 'Seaweed, roasted nut, umami salty, rich and creamy.',
    },
  ],
  th: [
    {
      swatch: 'bg-[#b5d39a]',
      title: 'มัทฉะพรีเมี่ยมจากประเทศญี่ปุ่น เมืองยาเมะ',
      desc: 'นุ่มครีมมี่ ละมุน เข้มข้น หอมหญ้าหนูหน้าและเนย โน้ตถั่ววอลนัทและอัลมอนด์',
    },
    {
      swatch: 'bg-[#3a5630]',
      title: 'มัทฉะพรีเมี่ยมจากประเทศญี่ปุ่น',
      desc: 'สาหร่าย ถั่วคั่ว อูมามิเค็ม เข้มข้นและครีมมี่',
    },
  ],
  zh: [
    {
      swatch: 'bg-[#b5d39a]',
      title: '日本精品抹茶 — 八女市',
      desc: '口感绵密柔和，带有糯米与黄油香气，并浮现核桃与杏仁的坚果韵。',
    },
    {
      swatch: 'bg-[#3a5630]',
      title: '日本精品抹茶',
      desc: '海苔、焙炒坚果、鲜咸旨味，浓郁而顺滑。',
    },
  ],
}

export function matchaTasteNotes(lang) {
  return MATCHA_TASTE_NOTES[lang] || MATCHA_TASTE_NOTES.en
}

export const SECTION_COPY = {
  th: {
    coffee: { title: 'กาแฟ', titleEm: '', subtitle: 'ร้อน · เย็น · ปั่น — ราคาตามเมนู' },
    matcha: { title: 'มัทฉะ', titleEm: '', subtitle: 'มัทฉะเกรดพรีเมี่ยม ตีฟองทีละแก้ว หอมนุ่มละมุน' },
    nonCoffee: { title: 'เครื่องดื่ม', titleEm: '', subtitle: 'ชาไทย ช็อกโกแลต และเครื่องดื่มปั่น — ไม่มีกาแฟ' },
    italianSoda: { title: 'อิตาเลี่ยนโซดา', titleEm: '', subtitle: 'โซดาผสมผลไม้และน้ำผึ้ง สดชื่นเหมาะกับอากาศริมทะเล' },
    other: { title: 'อื่นๆ', titleEm: '', subtitle: 'น้ำดื่ม น้ำแร่ และเครื่องดื่มอัดลม' },
    chickenRice: { title: 'อาหาร', titleEm: '', subtitle: 'ไก่ต้มนุ่ม ข้าวมันหอม น้ำจิ้มสูตรเด็ด 3 แบบ และซุปไก่ร้อนๆ' },
    breakfast: { title: 'อาหารเช้า', titleEm: '', subtitle: 'จานเบาและแซนด์วิช เสิร์ฟได้ทุกเวลา สบายๆ ริมทะเล' },
    sweets: { title: 'ของหวาน', titleEm: '', subtitle: 'เค้กและพายโฮมเมด หวานกำลังดีปิดมื้ออย่างลงตัว' },
  },
  zh: {
    coffee: { title: '咖啡', titleEm: '', subtitle: '热饮 · 冰饮 · 冰沙 — 价格见菜单。' },
    matcha: { title: '抹茶', titleEm: '', subtitle: '石磨抹茶现点现打，香气清甜，口感细腻。' },
    nonCoffee: { title: '饮品', titleEm: '', subtitle: '泰茶、巧克力与冰沙饮品，不含咖啡。' },
    italianSoda: { title: '气泡苏打', titleEm: '', subtitle: '气泡苏打配水果与蜂蜜，清爽顺口。' },
    other: { title: '其他', titleEm: '', subtitle: '饮用水、矿泉水与汽水。' },
    chickenRice: { title: '海南鸡饭', titleEm: '新加坡 / 海南', subtitle: '嫩滑白切鸡、香浓鸡油饭、三款招牌蘸料与热鸡汤。' },
    breakfast: { title: '早餐', titleEm: '', subtitle: '轻食与三明治，从早到晚都能点，海边吃更舒服。' },
    sweets: { title: '甜品', titleEm: '', subtitle: '自制蛋糕与派点，甜度适中，收尾刚好。' },
  },
  en: {
    coffee: { title: 'Coffee', titleEm: '', subtitle: 'Hot, iced, and frappe — prices per menu.' },
    matcha: { title: 'Matcha', titleEm: '', subtitle: 'Stone-ground matcha whisked to order — pure, creamy, and gently sweet.' },
    nonCoffee: { title: 'Non Coffee', titleEm: '', subtitle: 'Thai tea, chocolate, and creamy frappes — no espresso.' },
    italianSoda: { title: 'Italian Soda', titleEm: '', subtitle: 'Sparkling sodas with fruit, honey, and coastal brightness.' },
    other: { title: 'Other', titleEm: '', subtitle: 'Still and sparkling water, soft drinks, and everyday essentials.' },
    chickenRice: { title: 'Singapore', titleEm: 'Chicken Rice', subtitle: 'Tender poached chicken with fragrant chicken rice, three signature sauces, and warm chicken soup.' },
    breakfast: { title: 'Breakfast', titleEm: 'all day', subtitle: 'Light plates and sandwiches — served from open to close.' },
    sweets: { title: 'Sweet', titleEm: 'Desserts', subtitle: 'House-made cakes, pies, and classics to close the meal.' },
  },
}

export const BADGE_COPY = {
  th: { Signature: 'เมนูแนะนำ' },
  zh: { Signature: '招牌' },
  en: {},
}

export const SLUG_TO_CAT = {
  'chicken-rice': 'chickenRice',
  breakfast: 'breakfast',
  coffee: 'coffee',
  matcha: 'matcha',
  'non-coffee': 'nonCoffee',
  'italian-soda': 'italianSoda',
  other: 'other',
  sweets: 'sweets',
  'ice-cream': 'ice-cream',
  alcohol: 'alcohol',
}

// Tab id → the category keys rendered under it, in render order. Categories
// that are not in SLUG_TO_CAT keep their slug as the key, which is how the ten
// bulk-import categories land here. Each tab lists the imported category first
// and the legacy hand-built equivalent after it, so the two generations of the
// menu share one tab instead of appearing as duplicate tabs. A tab whose
// categories are all inactive renders nothing and is hidden from the tab bar.
export const TAB_SECTION_CATS = {
  'chicken-rice': ['chicken-rice-1', 'chickenRice'],
  'pasta-western': ['pasta-western'],
  'sushi-roll': ['sushi-roll'],
  'bbq-seafood': ['bbq-seafood'],
  'oyster-bar': ['oyster-bar'],
  breakfast: ['breakfast-7', 'breakfast'],
  bakery: ['cake-bakery', 'sweets'],
  drinks: ['coffee-drinks', 'coffee', 'matcha', 'nonCoffee', 'italianSoda', 'other'],
  icecream: ['icecream', 'ice-cream'],
  bar: ['bar-wine', 'alcohol'],
}

// Anchor ids in page order. 'promotion' and 'signature' are built from every
// category rather than from one, so they are not in TAB_SECTION_CATS.
export const SECTION_IDS = ['promotion', 'signature', ...Object.keys(TAB_SECTION_CATS)]

// Build the section/item view-model both pages render from raw DB rows.
export function buildMenuData(dbData, lang) {
  const nameField = lang === 'th' ? 'nameTh' : lang === 'zh' ? 'nameZh' : 'nameEn'
  const descField = lang === 'th' ? 'descriptionTh' : lang === 'zh' ? 'descriptionZh' : 'descriptionEn'
  return dbData.map((cat, catIdx) => {
    const catKey = SLUG_TO_CAT[cat.slug] || cat.slug
    const sectionCopy = SECTION_COPY[lang]?.[catKey] || {}
    return {
      num: String(catIdx + 1).padStart(2, '0'),
      cat: catKey,
      title: sectionCopy.title ?? cat[nameField] ?? cat.nameEn,
      titleEm: sectionCopy.titleEm ?? '',
      subtitle: sectionCopy.subtitle ?? '',
      items: cat.items.map((item, idx) => ({
        num: String(idx + 1).padStart(2, '0'),
        name: item[nameField] || item.nameEn,
        desc: item[descField] || item.descriptionEn || '',
        price: item.price === '0' ? 'Free' : (item.price ?? ''),
        priceMax: item.priceMax ?? null,
        badge: item.badge ? (BADGE_COPY[lang]?.[item.badge] ?? item.badge) : null,
        image: withImageVersion(item.imageUrl, item.imageVersion),
        featured: item.isFeatured ?? false,
      })),
    }
  })
}

// Tab bar labels, keyed by the anchor ids in SECTION_IDS. Keep every id here —
// a tab with no entry falls back to its raw id, which would show a slug.
export const TAB_LABELS = {
  promotion: { th: 'โปรโมชัน', en: 'Promotion', zh: '优惠' },
  signature: { th: 'แนะนำ', en: 'Signature', zh: '招牌' },
  'chicken-rice': { th: 'ข้าวมันไก่', en: 'Chicken Rice', zh: '鸡饭' },
  'pasta-western': { th: 'พาสต้า & ตะวันตก', en: 'Pasta & Western', zh: '意面 & 西餐' },
  'sushi-roll': { th: 'ซูชิ & โรล', en: 'Sushi & Roll', zh: '寿司 & 卷物' },
  'bbq-seafood': { th: 'บาร์บีคิว & ซีฟู้ด', en: 'BBQ & Seafood', zh: '烧烤 & 海鲜' },
  'oyster-bar': { th: 'หอยนางรม', en: 'Oyster Bar', zh: '生蚝吧' },
  breakfast: { th: 'อาหารเช้า', en: 'Breakfast', zh: '早餐' },
  bakery: { th: 'เค้ก & เบเกอรี่', en: 'Cake & Bakery', zh: '蛋糕 & 烘焙' },
  drinks: { th: 'เครื่องดื่ม', en: 'Drinks', zh: '饮品' },
  icecream: { th: 'ไอศกรีม', en: 'Ice Cream', zh: '冰淇淋' },
  bar: { th: 'บาร์ & ไวน์', en: 'Bar & Wine', zh: '酒吧 & 葡萄酒' },
}

export function primaryTabsForLang(lang) {
  return SECTION_IDS.map((id) => ({ id, label: TAB_LABELS[id]?.[lang] ?? TAB_LABELS[id]?.en ?? id }))
}

// ── Promotions (DB-backed — same rows on /menu and /delivery) ────────────────
export const PROMO_CATEGORY_BADGE = {
  'chicken-rice': { th: 'ข้าวมันไก่', en: 'Chicken rice', zh: '鸡饭' },
  signature: { th: 'ซิกเนเจอร์', en: 'Signature', zh: '招牌' },
  brunch: { th: 'บรันช์', en: 'Brunch', zh: '早午餐' },
  breakfast: { th: 'บรันช์', en: 'Brunch', zh: '早午餐' },
  matcha: { th: 'มัทฉะ', en: 'Matcha', zh: '抹茶' },
  combo: { th: 'คอมโบ', en: 'Combo', zh: '组合' },
  drinks: { th: 'เครื่องดื่ม', en: 'Drinks', zh: '饮品' },
}

export const PROMO_TAB_LABEL = { th: 'โปรโมชั่น', en: 'Promotion', zh: '优惠' }

export const PROMO_PANEL_COPY = {
  th: { note: 'ราคาอ้างอิงจากเมนูปัจจุบัน · ใช้ทานที่ร้าน · ไม่รวมกับโปรอื่น', viewAll: 'ดูโปรทั้งหมด' },
  en: { note: 'Prices match the menu · Dine-in only · One promo per order', viewAll: 'View all promotions' },
  zh: { note: '价格以当前菜单为准 · 仅限堂食 · 不可与其他优惠同享', viewAll: '查看全部优惠' },
}

export function promoDealsFromDB(rows, lang) {
  return rows.map((p) => ({
    id: p.id,
    badge: PROMO_CATEGORY_BADGE[p.category]?.[lang] ?? p.category,
    title: (lang === 'th' ? p.titleTh : lang === 'zh' ? p.titleZh : p.titleEn) || p.titleEn,
    price: `฿${p.priceCurrent}`,
    rawPrice: String(p.priceCurrent),
    orig: p.priceOriginal ? `฿${p.priceOriginal}` : null,
    disc: p.discountLabel,
    desc: (lang === 'th' ? p.descriptionTh : lang === 'zh' ? p.descriptionZh : p.descriptionEn) || p.descriptionEn,
    img: p.imageUrl || null,
  }))
}

export const MENU_PAGE_COPY = {
  en: { title: 'Menu — Love Pier Beach Cafe', hero: 'Menu <em class="italic text-gold">Love Pier Beach Cafe</em>' },
  th: { title: 'Menu — Love Pier Beach Cafe', hero: 'Menu <em class="italic text-gold">Love Pier Beach Cafe</em>' },
  zh: { title: 'Menu — Love Pier Beach Cafe', hero: 'Menu <em class="italic text-gold">Love Pier Beach Cafe</em>' },
}

export const HERO_IMAGES = [
  '/uploads/gallery-beach-terrace.webp',
  '/uploads/home-beach-panorama.webp',
  '/uploads/home-cafe-exterior.webp',
  '/uploads/gallery-sunset-sea.webp',
  '/uploads/gallery-beach-lawn.webp',
  '/uploads/home-love-pier-exterior.webp',
  '/uploads/gallery-interior-dining.webp',
  '/uploads/gallery-sunset-boat.webp',
]
