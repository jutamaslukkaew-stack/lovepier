-- Phone becomes the durable key for "have we seen this customer before" —
-- every order requires a phone number, but LINE login (the previous only key,
-- via line_user_id) can fail or be skipped. This lets /api/orders upsert on
-- phone unconditionally and /api/customer-lookup find a returning customer
-- by phone alone. Partial (WHERE phone <> '') so legacy blank-phone rows,
-- if any, never collide with each other.
--
-- Safe to run repeatedly (IF NOT EXISTS). Checked beforehand: 0 duplicate
-- non-blank phones exist in the live customers table, so this cannot fail.
CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_unique_idx ON customers (phone) WHERE phone <> '';
