-- Pickup times for pre-orders: the shop says when a dish can be collected,
-- the customer says when they are coming.
--
-- Until now the only time control anywhere was preorder_items.lead_days ("สั่ง
-- ล่วงหน้ากี่วัน") plus the shop's trading hours. A shop could not express
-- "ขนมจีนน้ำยารับได้ 10:00-14:00 เท่านั้น", and once an order was placed
-- nobody could move its time without phoning the customer. This adds both
-- halves of that conversation.
--
-- Everything here is additive and repeatable. Every column is nullable or
-- defaulted so an existing row means exactly what it meant before: NULL on the
-- two preorder_items columns is "no restriction, use the shop's hours".

-- WHEN A DISH CAN BE COLLECTED. Wall-clock 'HH:MM' in Bangkok, never an
-- instant — these are a rule that repeats every day, not a moment. The one
-- place a wall-clock pair becomes an instant is bangkokSlotToInstant() in
-- lib/preorder.js, and that stays true.
--
-- The END is INCLUSIVE: it is the last slot a customer may book, so
-- '10:00'-'14:00' offers 14:00. That differs from shop_close_time, which is
-- the moment the door shuts and therefore excludes its own last slot. See
-- resolveSlotBounds() in lib/preorder.js for why the two are not the same
-- kind of number.
ALTER TABLE preorder_items ADD COLUMN IF NOT EXISTS pickup_start text;
ALTER TABLE preorder_items ADD COLUMN IF NOT EXISTS pickup_end text;

-- Cheap, and it means no reader downstream has to defend against garbage.
-- The admin action rejects an inverted window before it ever gets here; this
-- is only about the shape.
DO $$
BEGIN
  ALTER TABLE preorder_items ADD CONSTRAINT preorder_items_pickup_start_format
    CHECK (pickup_start IS NULL OR pickup_start ~ '^[0-2][0-9]:[0-5][0-9]$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE preorder_items ADD CONSTRAINT preorder_items_pickup_end_format
    CHECK (pickup_end IS NULL OR pickup_end ~ '^[0-2][0-9]:[0-5][0-9]$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- WHAT THE CUSTOMER WANTS TO SAY ABOUT TIMING, in their own words — "ขอมารับ
-- ก่อน 12:00 ได้ไหม", "จะให้คนอื่นมารับแทน". Deliberately NOT folded into
-- orders.note: that one is about the food, this one is about the handover, and
-- they end up on different rows of the LINE card read by different people.
-- NOT NULL DEFAULT '' matches orders.note so no reader needs a null branch.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_note text NOT NULL DEFAULT '';

-- Half-hour slots, on from the moment this runs.
--
-- Written as a row rather than changed as a code default on purpose: SLOT_MINUTES
-- in lib/preorder.js stays 60 so the existing tests and any shop that has not
-- run this migration keep today's behaviour exactly. Choosing 30 is this shop's
-- decision, so it lives in this shop's database, and it is reversible from the
-- settings page without a deploy.
--
-- DO NOTHING, not DO UPDATE: re-running the migration must never overwrite a
-- shop that has since chosen 60 back.
INSERT INTO settings (key, value) VALUES ('preorder_slot_minutes', '30')
  ON CONFLICT (key) DO NOTHING;
