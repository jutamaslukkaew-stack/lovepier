/**
 * Seed the menu with a starter set mirroring the real Love Pier menu.
 * Run AFTER migrating:  npm run db:seed
 * Idempotent-ish: skips if categories already exist.
 */
import { db } from './index'
import { categories, menuItems } from './schema'
import { sql } from 'drizzle-orm'

type SeedItem = {
  nameTh: string
  nameEn: string
  nameZh: string
  price: string
  priceMax?: string
  badge?: string
  image?: string
  featured?: boolean
}

const data: { slug: string; nameTh: string; nameEn: string; nameZh: string; items: SeedItem[] }[] = [
  {
    slug: 'chicken-rice',
    nameTh: 'ข้าวมันไก่',
    nameEn: 'Chicken Rice',
    nameZh: '海南鸡饭',
    items: [
      { nameTh: 'เซต — ข้าวมันไก่ ขนาดเล็ก', nameEn: 'Set — Mixed Chicken · Small', nameZh: '套餐 — 小份', price: '150', image: '/menu/chicken-rice-set-2.png' },
      { nameTh: 'เซต — ข้าวมันไก่ ขนาดกลาง', nameEn: 'Set — Mixed Chicken · Medium', nameZh: '套餐 — 中份', price: '280', image: '/menu/singaporean-chicken-rice.png' },
      { nameTh: 'เซต — ข้าวมันไก่ ขนาดใหญ่', nameEn: 'Set — Mixed Chicken · Large', nameZh: '套餐 — 大份', price: '550', image: '/menu/chicken-rice-full-set.png' },
      { nameTh: 'ข้าวมันไก่ซิกเนเจอร์ เสิร์ฟเป็นถาด', nameEn: 'Signature Chicken Rice Tray', nameZh: '招牌鸡饭拼盘', price: '670', badge: 'Signature', image: '/menu/singaporean-chicken-rice.png', featured: true },
    ],
  },
  {
    slug: 'coffee',
    nameTh: 'กาแฟ',
    nameEn: 'Coffee',
    nameZh: '咖啡',
    items: [
      { nameTh: 'อเมริกาโน่', nameEn: 'Americano', nameZh: '美式', price: '90', image: '/menu/real-americano.jpg' },
      { nameTh: 'เอสเพรสโซ่', nameEn: 'Espresso', nameZh: '浓缩', price: '80', image: '/menu/real-espresso.jpg' },
      { nameTh: 'คาปูชิโน่', nameEn: 'Cappuccino', nameZh: '卡布奇诺', price: '90', image: '/menu/real-cappuccino.jpg' },
      { nameTh: 'ลาเต้', nameEn: 'Latte', nameZh: '拿铁', price: '90', image: '/menu/real-latte.jpg' },
      { nameTh: 'เดอร์ตี้', nameEn: 'Dirty', nameZh: 'Dirty', price: '179', badge: 'Signature', image: '/menu/real-dirty-coffee.jpg' },
    ],
  },
  {
    slug: 'matcha',
    nameTh: 'มัทฉะ',
    nameEn: 'Matcha',
    nameZh: '抹茶',
    items: [
      { nameTh: 'แพง', nameEn: 'PANG', nameZh: 'PANG 特调', price: '179', badge: 'Signature', image: '/menu/real-pang-signature.jpg', featured: true },
      { nameTh: 'เพียวมัทฉะ', nameEn: 'Pure Matcha', nameZh: '纯抹茶', price: '140', image: '/menu/real-pure-matcha.jpg' },
      { nameTh: 'มัทฉะลาเต้', nameEn: 'Matcha Latte', nameZh: '抹茶拿铁', price: '150', image: '/menu/real-matcha-latte.jpg' },
      { nameTh: 'เดอตี้มัทฉะ', nameEn: 'Dirty Matcha', nameZh: 'Dirty 抹茶', price: '150', image: '/menu/real-dirty-matcha-v2.jpg' },
    ],
  },
  {
    slug: 'non-coffee',
    nameTh: 'เครื่องดื่มไม่มีกาแฟ',
    nameEn: 'Non Coffee',
    nameZh: '无咖啡',
    items: [
      { nameTh: 'ชาไทยพรีเมียม', nameEn: 'Premium Thai Tea', nameZh: '泰式奶茶', price: '100', image: '/menu/real-thai-tea.jpg' },
      { nameTh: 'ชาไทยปั่น', nameEn: 'Thai Tea Frappe', nameZh: '泰茶冰沙', price: '120', image: '/menu/real-thai-tea-frappe.jpg' },
      { nameTh: 'ช็อกโกแลต', nameEn: 'Chocolate', nameZh: '巧克力', price: '100', image: '/menu/real-chocolate.jpg' },
    ],
  },
]

async function main() {
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(categories)
  if (Number(count) > 0) {
    console.log('ℹ️  categories already exist — skipping seed.')
    return
  }

  let catOrder = 0
  for (const cat of data) {
    const [inserted] = await db
      .insert(categories)
      .values({
        slug: cat.slug,
        nameTh: cat.nameTh,
        nameEn: cat.nameEn,
        nameZh: cat.nameZh,
        sortOrder: ++catOrder,
      })
      .returning({ id: categories.id })

    let itemOrder = 0
    for (const it of cat.items) {
      await db.insert(menuItems).values({
        categoryId: inserted.id,
        nameTh: it.nameTh,
        nameEn: it.nameEn,
        nameZh: it.nameZh,
        price: it.price,
        priceMax: it.priceMax ?? null,
        badge: it.badge ?? null,
        imageUrl: it.image ?? null,
        isFeatured: it.featured ?? false,
        sortOrder: ++itemOrder,
      })
    }
  }
  console.log('✅ Seed complete.')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
