-- Pre-order ("สั่งล่วงหน้า") — the hour the customer wants their order ready.
-- Applies to BOTH delivery and pickup; payment is still immediate at order
-- time, so the existing PromptPay + SlipOK path is untouched.
--
-- NULL means "as soon as possible", which is exactly what every order placed
-- before this column existed was. Hence nullable, no default and no backfill —
-- unlike 0004's `default 'delivery'`, where the old rows genuinely had an
-- implied value. Here NULL *is* the value.
--
-- ONE timestamptz, not a date + 'HH:MM' text pair. Thailand is a fixed UTC+7
-- with no DST, so the customer's wall-clock slot converts to an instant
-- exactly and reversibly. lib/preorder.js does both directions with a literal
-- '+07:00' — never the process timezone, which is UTC on Vercel and UTC+7 on
-- a shop laptop, and would otherwise disagree by 7 hours. One column also
-- means "is it in the past", "what is due next" and the /admin/orders sort
-- are plain comparisons on a single value, and half a schedule (a date with
-- no slot) is not representable.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

-- Partial, like customers_member_no_unique_idx in 0008: the overwhelming
-- majority of rows are ASAP orders holding NULL and never take part in a
-- schedule query. This does NOT serve listOrders()' CASE-based ORDER BY —
-- that reads at most 200 rows and does not need an index. It exists for the
-- queries the shop will want next ("pre-orders due today", a kitchen list).
CREATE INDEX IF NOT EXISTS orders_scheduled_for_idx
  ON orders (scheduled_for) WHERE scheduled_for IS NOT NULL;
