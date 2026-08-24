// Per-item option set for /delivery — the structured picks a customer makes
// on each cart line at the Summary step (components/delivery/OrderFlow.js),
// alongside the free-text note.
//
// 2026-08-24 journey review, checklist item "โครงสร้างเมนูที่มีตัวเลือกเนื้อ
// (SKU แยก หรือ option เดียว)": the shop chose ONE menu item with options,
// not separate SKUs per cut. That decision lives here — nothing in the menu
// schema (lib/db/schema.ts) or the Excel importer changes because of it.
//
// Plain JS constants, no React/DB import — safe to use from both the client
// component and the API route.
//
// First entry in each group is the default: shown pre-selected in the Summary
// item cards without being written to the cart item until the customer
// actually picks something (see lib/cart.js#updateOption), and used as the
// server-side fallback in pages/api/orders.js when a line has none set.
export const SWEETNESS_OPTIONS = ['ปกติ', 'หวานน้อย', 'ไม่หวาน']
export const COFFEE_BEAN_OPTIONS = ['อาราบิก้า', 'โรบัสต้า', 'รวม']
// The journey document's worked example — "เลือกอาหาร เช่น ข้าวมันไก่
// (เลือกเนื้อ)". Unlike the two above, this one is meaningless on a latte, so
// it is scoped to its category (see `cats` below).
export const PROTEIN_OPTIONS = ['น่อง', 'สะโพก', 'อก', 'รวม']

/**
 * Every option group, in the order they render.
 *
 * `field` is the property name on the cart line AND on the stored order item
 * (orders.items jsonb) — keep them identical so one name traces end to end
 * from the picker through pages/api/orders.js to the LINE card.
 *
 * `cats` scopes a group to menu categories: null = every line (how sweetness
 * and coffee bean have always behaved), otherwise a list of category keys
 * from components/menu/menuData.js#TAB_SECTION_CATS.
 */
export const OPTION_GROUPS = [
  { field: 'sweetness', labelKey: 'sweetnessLabel', options: SWEETNESS_OPTIONS, cats: null },
  { field: 'coffeeBean', labelKey: 'coffeeBeanLabel', options: COFFEE_BEAN_OPTIONS, cats: null },
  { field: 'protein', labelKey: 'proteinLabel', options: PROTEIN_OPTIONS, cats: ['chicken-rice'] },
]

/**
 * Which menu category a cart line came from.
 *
 * Cart ids are built as `${section.cat}-${item.num}` in
 * components/menu/MenuSections.js#MenuSectionPanel (e.g. 'chicken-rice-01'),
 * so the category is already in the id and does not need to be stored a
 * second time — which also means lines already sitting in a customer's
 * localStorage cart resolve correctly instead of losing their options.
 * Promotion lines are 'promo-<id>' and match no category, so they only ever
 * get the ungated groups.
 */
export function categoryOfCartItem(id) {
  const match = /^(.*)-\d+$/.exec(String(id || ''))
  return match ? match[1] : ''
}

/** The option groups that apply to one cart line. */
export function optionGroupsFor(id) {
  const cat = categoryOfCartItem(id)
  return OPTION_GROUPS.filter((group) => !group.cats || group.cats.includes(cat))
}

/**
 * Server-side normalization for one order line: keep only values this line is
 * actually allowed to carry, and fall back to each group's default. Mirrors
 * what the picker shows, so a tampered or stale client payload can never put
 * an unknown cut of chicken on a kitchen ticket.
 */
export function normalizeItemOptions(item) {
  const out = {}
  for (const group of optionGroupsFor(item?.id)) {
    const value = item?.[group.field]
    out[group.field] = group.options.includes(value) ? value : group.options[0]
  }
  return out
}
