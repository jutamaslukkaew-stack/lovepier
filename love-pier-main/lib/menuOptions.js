// Global per-item option set for /delivery — same choices apply to every
// menu item regardless of category (2026-08-17 journey review: one shared
// set, not per-item/admin-configured). First entry in each is the default:
// shown pre-selected in the Summary item cards (components/delivery/OrderFlow.js)
// without being written to the cart item until the customer actually picks
// something (see lib/cart.js#updateSweetness/updateCoffeeBean), and used as
// the server-side fallback in pages/api/orders.js when a line has none set.
//
// Plain JS constants, no React/DB import — safe to use from both the client
// component and the API route.
export const SWEETNESS_OPTIONS = ['ปกติ', 'หวานน้อย', 'ไม่หวาน']
export const COFFEE_BEAN_OPTIONS = ['อาราบิก้า', 'โรบัสต้า', 'รวม']
