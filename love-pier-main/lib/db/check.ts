import { db } from './index'
import { categories, menuItems } from './schema'
import { sql } from 'drizzle-orm'

async function main() {
  const [c] = await db.select({ count: sql<number>`count(*)` }).from(categories)
  const [m] = await db.select({ count: sql<number>`count(*)` }).from(menuItems)
  console.log('categories:', c.count, 'menuItems:', m.count)
  const cats = await db.select({ slug: categories.slug, name: categories.nameEn }).from(categories)
  console.log('existing categories:', cats)
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
