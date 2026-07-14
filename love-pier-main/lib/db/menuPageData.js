import { and, asc, eq } from 'drizzle-orm'
import { db } from './index'
import { categories, menuItems, promotions } from './schema'

// Single source of truth for the data behind /menu and /delivery. Both pages
// call this in getServerSideProps so they always render the same categories,
// items, and promotions from the database.
export async function getMenuPageData() {
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

  const dbMenuData = cats.map((cat) => ({
    id: cat.id,
    slug: cat.slug,
    nameTh: cat.nameTh,
    nameEn: cat.nameEn,
    nameZh: cat.nameZh,
    sortOrder: cat.sortOrder,
    items: items
      .filter((i) => i.categoryId === cat.id)
      .map((i) => ({
        id: i.id,
        nameTh: i.nameTh,
        nameEn: i.nameEn,
        nameZh: i.nameZh,
        descriptionTh: i.descriptionTh,
        descriptionEn: i.descriptionEn,
        descriptionZh: i.descriptionZh,
        price: i.price != null ? String(i.price) : null,
        priceMax: i.priceMax != null ? String(i.priceMax) : null,
        badge: i.badge,
        imageUrl: i.imageUrl,
        isFeatured: i.isFeatured,
        sortOrder: i.sortOrder,
      })),
  }))

  const dbPromotions = await db
    .select()
    .from(promotions)
    .where(eq(promotions.isActive, true))
    .orderBy(asc(promotions.sortOrder))

  return {
    dbMenuData,
    dbPromotions: dbPromotions.map((p) => ({
      id: p.id,
      category: p.category,
      titleTh: p.titleTh,
      titleEn: p.titleEn,
      titleZh: p.titleZh,
      descriptionTh: p.descriptionTh,
      descriptionEn: p.descriptionEn,
      descriptionZh: p.descriptionZh,
      priceCurrent: p.priceCurrent,
      priceOriginal: p.priceOriginal,
      discountLabel: p.discountLabel,
      tags: p.tags,
      imageUrl: p.imageUrl,
    })),
  }
}
