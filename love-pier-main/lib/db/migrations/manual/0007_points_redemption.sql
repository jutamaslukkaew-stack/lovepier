-- Replace the instant member discount with saved points:
-- ฿20 food spend = 1 point; 1 point = ฿1 off a later food order.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_redeemed integer NOT NULL DEFAULT 0;
ALTER TABLE point_transactions ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'earn';

ALTER TABLE point_transactions DROP CONSTRAINT IF EXISTS point_transactions_order_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS point_transactions_order_type_unique_idx
  ON point_transactions (order_id, type);

-- Versioned key intentionally replaces the old ฿25-per-point setting so an
-- existing production value cannot silently keep the previous policy alive.
INSERT INTO settings (key, value)
VALUES ('loyalty_baht_per_point_v2', '20')
ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now();
