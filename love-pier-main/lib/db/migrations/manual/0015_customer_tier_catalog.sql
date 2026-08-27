-- Customer tier CATALOG (phase 1 of the 2026-08-26 member-group plan).
--
-- 0010 put a tier KEY on the customer and left the percentages in `settings`,
-- with the set of tiers themselves hard-coded in lib/tiers.js#TIERS. That was
-- right while there were exactly four groups agreed in a meeting. It is wrong
-- now: the shop wants to add groups (agents/downline, and whatever comes
-- after) without a deploy, and a fifth group cannot be expressed as a fifth
-- fixed settings key.
--
-- So the LIST of groups moves into a table, and the percentage moves with it —
-- one row per group, one editable number on that row. The four
-- `tier_discount_*` settings keys are deliberately NOT deleted below; they are
-- the rollback path, and a dropped key cannot be un-dropped by flipping a
-- switch.
--
-- What must NOT change: what any existing customer pays. See the seed.
CREATE TABLE IF NOT EXISTS customer_tiers (
  -- The key written to customers.tier. Lowercase snake so it can be typed
  -- into a URL and read in a log line; CHECKed because unlike 0010 (where an
  -- unknown key harmlessly read as 0%) this table is now the definition of
  -- what "known" means, and a stray 'Condo ' would be a group nobody can see.
  key text PRIMARY KEY CHECK (key ~ '^[a-z][a-z0-9_]{0,31}$'),
  label_th text NOT NULL,
  label_en text NOT NULL DEFAULT '',
  -- Whole percent off the item subtotal, never off the delivery fee. Bounded
  -- here as well as in lib/tiers.js: this column is now the pricing input, and
  -- a 900% typed into the admin form must not be storable at all.
  discount_percent integer NOT NULL DEFAULT 0
    CHECK (discount_percent BETWEEN 0 AND 100),
  -- True = only an admin may put someone in this group. Defaults to TRUE, the
  -- cautious direction: a group created next year is closed to self-service
  -- until someone deliberately opens it, rather than being reachable by
  -- anyone who guesses an invite URL.
  staff_only boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  -- Retire a group without deleting it. Customers already carrying the key
  -- keep their discount; it just stops being offered in the pickers. Deleting
  -- the row instead would silently demote those customers to 'general'.
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seeded ONCE, guarded on the table being empty rather than by ON CONFLICT.
-- This migration is meant to be re-runnable like its neighbours, and a bare
-- ON CONFLICT DO NOTHING would leave the UPDATE below free to run a second
-- time and stamp the shop's later admin edits back to whatever the stale
-- `settings` rows still say.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM customer_tiers) THEN
    RETURN;
  END IF;

  -- The four groups from the 2026-08-24 journey review, with the same default
  -- percentages, labels and staff_only flags that lib/tiers.js#TIERS shipped.
  INSERT INTO customer_tiers (key, label_th, label_en, discount_percent, staff_only, sort_order) VALUES
    ('general', 'ลูกค้าทั่วไป',              'General',                 10, false, 10),
    ('condo',   'คอนโด / แนะนำพิเศษ',        'Condo / referred',        15, false, 20),
    ('scc',     'พนักงานในเครือ (SCC)',      'Affiliated staff (SCC)',  50, true,  30),
    ('staff',   'ทีมงาน (ทดลองระบบ)',        'Team (system trial)',    100, true,  40);

  -- THE LINE THAT KEEPS PRICES IDENTICAL.
  --
  -- The defaults above are only what a fresh install gets. A shop that has
  -- ever opened /admin/settings has its real rates in `settings`, and those
  -- are what customers are being charged today. Copy them over the defaults,
  -- because seeding 15% into a shop that had set condo to 20% would quietly
  -- take 5% off every condo order the moment this deploys.
  --
  -- The key naming lines up exactly: 'tier_discount_' || key.
  --
  -- Rounding and clamping mirror lib/tiers.js#tierDiscountPercent so the
  -- migrated number is the one the old code would have produced. The regex
  -- drops values that are not plainly numeric; getShopSettings() already
  -- discarded those via Number.isFinite, so they were never in force and the
  -- code default is the correct thing to keep.
  UPDATE customer_tiers t
  SET discount_percent = LEAST(100, GREATEST(0, ROUND(s.value::numeric)::int))
  FROM settings s
  WHERE s.key = 'tier_discount_' || t.key
    AND s.value ~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$';
END $$;

-- Every picker and admin list reads the catalog in display order, and it is a
-- handful of rows read on most admin requests.
CREATE INDEX IF NOT EXISTS customer_tiers_order_idx
  ON customer_tiers(is_active, sort_order, key);
