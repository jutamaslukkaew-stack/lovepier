import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nameTh: text('name_th').notNull(),
    nameEn: text('name_en').notNull(),
    nameZh: text('name_zh').notNull(),
    slug: text('slug').notNull().unique(),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    sortIdx: index('categories_sort_order_idx').on(t.sortOrder),
  })
)

export const menuItems = pgTable(
  'menu_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    nameTh: text('name_th').notNull(),
    nameEn: text('name_en').notNull(),
    nameZh: text('name_zh').notNull(),
    descriptionTh: text('description_th'),
    descriptionEn: text('description_en'),
    descriptionZh: text('description_zh'),
    imageUrl: text('image_url'),
    imageAlt: text('image_alt'),
    // numeric maps to string in drizzle to preserve precision
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    priceMax: numeric('price_max', { precision: 10, scale: 2 }),
    badge: text('badge'),
    isFeatured: boolean('is_featured').notNull().default(false),
    isAvailable: boolean('is_available').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    categoryIdx: index('menu_items_category_id_idx').on(t.categoryId),
    sortIdx: index('menu_items_sort_order_idx').on(t.sortOrder),
  })
)

export const categoriesRelations = relations(categories, ({ many }) => ({
  items: many(menuItems),
}))

export const menuItemsRelations = relations(menuItems, ({ one }) => ({
  category: one(categories, {
    fields: [menuItems.categoryId],
    references: [categories.id],
  }),
}))

export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type MenuItem = typeof menuItems.$inferSelect
export type NewMenuItem = typeof menuItems.$inferInsert
