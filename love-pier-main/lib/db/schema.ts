import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  index,
  serial,
  date,
  jsonb,
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

export const promotions = pgTable('promotions', {
  id: serial('id').primaryKey(),
  titleTh: text('title_th').notNull(),
  titleEn: text('title_en').notNull(),
  titleZh: text('title_zh').notNull().default(''),
  descriptionTh: text('description_th').notNull().default(''),
  descriptionEn: text('description_en').notNull().default(''),
  descriptionZh: text('description_zh').notNull().default(''),
  category: text('category').notNull().default(''),
  imageUrl: text('image_url'),
  priceCurrent: integer('price_current').notNull(),
  priceOriginal: integer('price_original'),
  discountLabel: text('discount_label'),
  tags: text('tags').array().notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  validFrom: date('valid_from'),
  validUntil: date('valid_until'),
  createdAt: timestamp('created_at').defaultNow(),
})

export type Promotion = typeof promotions.$inferSelect
export type NewPromotion = typeof promotions.$inferInsert

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  titleTh: text('title_th').notNull(),
  titleEn: text('title_en').notNull(),
  titleZh: text('title_zh').notNull().default(''),
  titleEm: text('title_em').notNull().default(''),
  eventDate: date('event_date'),
  timeRange: text('time_range').notNull().default(''),
  timeSub: text('time_sub').notNull().default(''),
  location: text('location').notNull().default(''),
  price: integer('price'),
  entrySubTh: text('entry_sub_th').notNull().default(''),
  entrySubEn: text('entry_sub_en').notNull().default(''),
  entrySubZh: text('entry_sub_zh').notNull().default(''),
  descriptionTh: text('description_th').notNull().default(''),
  descriptionEn: text('description_en').notNull().default(''),
  descriptionZh: text('description_zh').notNull().default(''),
  categoryTh: text('category_th').notNull().default(''),
  categoryEn: text('category_en').notNull().default(''),
  categoryZh: text('category_zh').notNull().default(''),
  imageUrl: text('image_url'),
  albumImages: text('album_images').array().notNull().default([]),
  isFeatured: boolean('is_featured').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
})

export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert

// ── Delivery ordering ─────────────────────────────────────────────────────────

// Repeat customers, keyed by LINE userId so we can auto-fill name/phone/address.
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  lineUserId: text('line_user_id').unique(),
  lineDisplayName: text('line_display_name'),
  name: text('name').notNull().default(''),
  phone: text('phone').notNull().default(''),
  address: text('address').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderNo: text('order_no').notNull().unique(),
    lineUserId: text('line_user_id'),
    customerName: text('customer_name').notNull(),
    phone: text('phone').notNull(),
    address: text('address').notNull().default(''),
    note: text('note').notNull().default(''),
    // [{ id, name, price, qty }]
    items: jsonb('items').notNull().default([]),
    totalAmount: integer('total_amount').notNull(),
    // pending → paid → preparing → done → cancelled
    status: text('status').notNull().default('pending'),
    paymentMethod: text('payment_method').notNull().default('promptpay'),
    paymentRef: text('payment_ref'),
    slipUrl: text('slip_url'),
    // bank transaction ref from the verified transfer slip (unique = anti-reuse)
    slipRef: text('slip_ref'),
    // driving distance from the shop (km), null when unknown
    distanceKm: numeric('distance_km', { precision: 5, scale: 1 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    createdIdx: index('orders_created_at_idx').on(t.createdAt),
    statusIdx: index('orders_status_idx').on(t.status),
  })
)

export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert

// Simple key/value store for shop settings editable from /admin/settings.
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Setting = typeof settings.$inferSelect
export type NewSetting = typeof settings.$inferInsert
