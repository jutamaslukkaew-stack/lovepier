import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  index,
  uniqueIndex,
  serial,
  date,
  jsonb,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nameTh: text('name_th').notNull(),
    nameEn: text('name_en').notNull(),
    nameZh: text('name_zh').notNull(),
    slug: text('slug').notNull().unique(),
    // Stable key linking to the Excel `category_no` (e.g. "1", "9.5", "10").
    // Text on purpose — "9.5" is a real category. Nullable: the original 10
    // categories predate the importer.
    categoryNo: text('category_no').unique(),
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
    // ── Bulk-import fields (Excel menu import) ──────────────────────────────
    // Upsert key from the Excel `image_code` (e.g. "1_01", "9.5_03"). Nullable
    // because the original 60 rows predate the importer and have no code.
    importCode: text('import_code').unique(),
    subCategory: text('sub_category'),
    // Excel `image_file` — overrides which photo filename belongs to this item
    // (blank = match by import_code). Stored so the image matcher can use it.
    imageFile: text('image_file'),
    // 'published' | 'planned' | 'retired'. Incomplete import rows land as
    // 'planned' (+ is_available=false) rather than being rejected.
    status: text('status').notNull().default('published'),
    // full/before-discount price for a struck-through display; numeric → string
    priceOriginal: numeric('price_original', { precision: 10, scale: 2 }),
    noteInternal: text('note_internal'),
    // Bumped every time the item's images are (re)processed; appended to image
    // URLs as ?v= so a re-uploaded photo isn't masked by CDN/browser cache.
    imageVersion: integer('image_version').notNull().default(0),
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
  endDate: date('end_date'),
  timeRange: text('time_range').notNull().default(''),
  timeSub: text('time_sub').notNull().default(''),
  location: text('location').notNull().default(''),
  organizer: text('organizer').notNull().default(''),
  price: integer('price'),
  entrySubTh: text('entry_sub_th').notNull().default(''),
  entrySubEn: text('entry_sub_en').notNull().default(''),
  entrySubZh: text('entry_sub_zh').notNull().default(''),
  registrationInfoTh: text('registration_info_th').notNull().default(''),
  registrationInfoEn: text('registration_info_en').notNull().default(''),
  registrationInfoZh: text('registration_info_zh').notNull().default(''),
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
export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lineUserId: text('line_user_id').unique(),
    lineDisplayName: text('line_display_name'),
    name: text('name').notNull().default(''),
    phone: text('phone').notNull().default(''),
    address: text('address').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Phone, not LINE login, is the durable key for "have we seen this
    // customer before" — every order requires a phone, but LINE login can
    // fail/be skipped. Partial (excludes '') so legacy blank-phone rows never
    // collide. Lets /api/customer-lookup and the orders upsert both key on it.
    phoneIdx: uniqueIndex('customers_phone_unique_idx').on(t.phone).where(sql`${t.phone} <> ''`),
  })
)

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
    // 'delivery' (shop delivers, address required, delivery fee may apply) |
    // 'pickup' (customer or their own rider collects at the shop — also the
    // forced value outside the delivery radius, where the shop never delivers).
    deliveryMethod: text('delivery_method').notNull().default('delivery'),
    // [{ id, name, price, qty, note }] — note is a free-text per-line
    // customization ("หวานน้อย, นมอัลมอนด์"), optional.
    items: jsonb('items').notNull().default([]),
    // subtotal (items only); totalAmount = itemsSubtotal + deliveryFee
    itemsSubtotal: integer('items_subtotal').notNull().default(0),
    deliveryFee: integer('delivery_fee').notNull().default(0),
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

// Audit log — one row per bulk menu-import run (see /admin/menu/import).
// `report` keeps the full diff so a past import can be traced.
export const menuImports = pgTable('menu_imports', {
  id: uuid('id').primaryKey().defaultRandom(),
  filename: text('filename'),
  uploadedBy: text('uploaded_by'),
  rowsTotal: integer('rows_total').notNull().default(0),
  rowsCreated: integer('rows_created').notNull().default(0),
  rowsUpdated: integer('rows_updated').notNull().default(0),
  rowsUnchanged: integer('rows_unchanged').notNull().default(0),
  rowsIncomplete: integer('rows_incomplete').notNull().default(0),
  imagesMatched: integer('images_matched').notNull().default(0),
  imagesUnmatched: integer('images_unmatched').notNull().default(0),
  report: jsonb('report'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type MenuImport = typeof menuImports.$inferSelect
export type NewMenuImport = typeof menuImports.$inferInsert

// Simple key/value store for shop settings editable from /admin/settings.
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Setting = typeof settings.$inferSelect
export type NewSetting = typeof settings.$inferInsert
