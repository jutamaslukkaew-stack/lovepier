-- Loyalty points + member discount for /delivery (LINE OA journey):
--   - customers.points_balance: running total, denormalized cache.
--   - orders.discount_amount / orders.points_earned: computed once at order
--     creation (see lib/points.js#calcOrderDiscountAndPoints), points
--     "banked" into point_transactions + customers.points_balance only once
--     payment is confirmed (lib/slipVerification.js).
--   - point_transactions: append-only ledger, one row per order that earned
--     points. order_id is UNIQUE — the idempotency guard so a slip getting
--     re-verified (or the LINE-webhook and web-upload doors racing) can
--     never double-credit the same order.
--
-- Additive + guarded, applied directly like 0002-0005 — the drizzle
-- snapshot is out of sync with the real DB, so this isn't run via
-- `drizzle-kit migrate` (see scripts/apply-loyalty-points-migration.mjs).

ALTER TABLE customers ADD COLUMN IF NOT EXISTS points_balance integer NOT NULL DEFAULT 0;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount integer NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_earned integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  phone text NOT NULL DEFAULT '',
  points integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
