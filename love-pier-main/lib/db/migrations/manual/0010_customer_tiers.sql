-- Customer discount tiers (2026-08-24 journey review, section 2 "Persona").
-- The shop sells to four groups at four prices: ordinary LINE members 10%,
-- condo/referred customers 15%, staff of the affiliated company 50%, and the
-- shop's own team 100% while the system is being trialled.
--
-- A TIER KEY on the customer, not a percentage. The percentages are policy and
-- change (the meeting already revised the referral quota twice); they live in
-- the `settings` table where /admin/settings edits them, exactly like the
-- delivery fee bands. What belongs on the customer row is which group they
-- are in, and that only staff can change.
--
-- 'general' as the default, NOT NULL: every existing row is an ordinary
-- customer, and there is no meaningful difference between "no tier" and
-- "general" — unlike orders.scheduled_for in 0009, where NULL was itself the
-- value. No CHECK constraint: an unknown tier reads as 0% in
-- lib/points.js rather than erroring, so a future tier added in code cannot
-- fail an INSERT against a database that has not been migrated yet.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'general';

-- The percentage ACTUALLY APPLIED to this order, alongside the baht in
-- discount_amount (which already exists, from 0006). Stored rather than
-- recomputed because the tier percentages are editable settings: without it,
-- raising the condo rate from 15% to 20% would silently rewrite the meaning
-- of every past order's discount. 0 is right for every existing row — the
-- delivery member discount has been switched off since 2026-08-17, so every
-- order in the table was placed at 0%.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_percent integer NOT NULL DEFAULT 0;

-- No index on either. `tier` is read one customer at a time by primary key or
-- by line_user_id (both already indexed) and would be a useless index on a
-- column where nearly every row says 'general'; discount_percent is only ever
-- read back on a row already being fetched.
