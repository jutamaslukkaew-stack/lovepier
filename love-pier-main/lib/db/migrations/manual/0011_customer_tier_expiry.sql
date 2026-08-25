-- Special member groups can be time-limited. Pricing treats a date before
-- today's Bangkok date as expired and falls back to the general tier.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tier_expires_at date;

CREATE TABLE IF NOT EXISTS customer_tier_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  previous_tier text NOT NULL,
  new_tier text NOT NULL,
  previous_expires_at date,
  new_expires_at date,
  changed_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_tier_history_customer_idx
  ON customer_tier_history(customer_id, created_at DESC);
