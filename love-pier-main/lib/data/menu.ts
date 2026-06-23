import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categories, menuItems, type Category, type MenuItem } from '@/lib/db/schema'

export type Lang = 'th' | 'en' | 'zh'

export type PublicMenuItem = {
  id: string
  name: { th: string; en: string; zh: string }
  description: { th: string; en: string; zh: string }
  imageUrl: string | null
  imageAlt: string | null
  price: string
  priceMax: string | null
  badge: string | null
  isFeatured: boolean
}

export type PublicCategory = {
  id: string
  slug: string
  name: { th: string; en: string; zh: string }
  items: PublicMenuItem[]
}

function toPublicItem(row: MenuItem): PublicMenuItem {
  return {
    id: row.id,
    name: { th: row.nameTh, en: row.nameEn, zh: row.nameZh },
    description: {
      th: row.descriptionTh ?? '',
      en: row.descriptionEn ?? '',
      zh: row.descriptionZh ?? '',
    },
    imageUrl: row.imageUrl,
    imageAlt: row.imageAlt,
    price: row.price,
    priceMax: row.priceMax,
    badge: row.badge,
    isFeatured: row.isFeatured,
  }
}

/** Full menu for the public site: active categories with available items, ordered. */
export async function getPublicMenu(): Promise<PublicCategory[]> {
  const cats = await db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder))

  const items = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.isAvailable, true), eq(menuItems.isDeleted, false)))
    .orderBy(asc(menuItems.sortOrder))

  return cats.map((c: Category) => ({
    id: c.id,
    slug: c.slug,
    name: { th: c.nameTh, en: c.nameEn, zh: c.nameZh },
    items: items.filter((i: MenuItem) => i.categoryId === c.id).map(toPublicItem),
  }))
}

/** Featured items across all categories (for "Recommended Specials"). */
export async function getFeaturedItems(): Promise<PublicMenuItem[]> {
  const rows = await db
    .select()
    .from(menuItems)
    .where(
      and(
        eq(menuItems.isFeatured, true),
        eq(menuItems.isAvailable, true),
        eq(menuItems.isDeleted, false)
      )
    )
    .orderBy(asc(menuItems.sortOrder))
  return rows.map(toPublicItem)
}
