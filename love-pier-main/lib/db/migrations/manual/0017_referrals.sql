-- Agents and referral fees (phase 3 of the 2026-08-26 member-group plan, ผัง 3).
--
-- 0016 gave invite links an owner column that nothing read. This is what reads
-- it: when a customer joins through an agent's link, the agent is recorded on
-- the customer, and every paid order that customer places for the next six
-- months earns the agent a percentage.
--
-- The system does NOT move money and does not convert anything to points. Its
-- job is to total the figure up so it can be checked, and to remember what the
-- shop has already paid out. "ระบบไม่โอนเงินและไม่แปลงเป็นแต้ม — หน้าที่ของมัน
-- คือรวมตัวเลขให้ตรวจสอบได้ แล้วร้านจ่ายเอง".

-- WHO INVITED WHOM. On the customer, not in a join table: a customer has
-- exactly one referrer, for good ("ใครชวนก็เป็นคนนั้นตลอด เข้าลิงก์ตัวแทนคนอื่น
-- ทีหลังไม่เปลี่ยนเจ้าของ เพื่อกันการแย่งลูกทีม"). /api/join only ever writes
-- this where it is NULL.
--
-- ON DELETE SET NULL, not CASCADE: deleting an agent's row must never delete
-- their downline's customer records.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referred_by_customer_id uuid
  REFERENCES customers(id) ON DELETE SET NULL;

-- When the referral was made — the moment the customer opened the link, NOT
-- their first order. The six-month clock starts here: "นาฬิกา 6 เดือนเริ่มนับ
-- ตั้งแต่วันที่ลูกค้าเข้าระบบ ไม่ใช่วันที่สั่งครั้งแรก".
--
-- Separate from customers.created_at because a customer who has ordered for a
-- year can still be recruited by an agent tomorrow, and their window starts
-- tomorrow.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referred_at timestamptz;

-- Nobody may be their own referrer. Cheap to state here, and it means no
-- report has to defend against an agent inflating their own total.
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_no_self_referral;
ALTER TABLE customers ADD CONSTRAINT customers_no_self_referral
  CHECK (referred_by_customer_id IS NULL OR referred_by_customer_id <> id);

-- The report reads this direction: everyone one agent brought in. Partial —
-- almost every customer has no referrer.
CREATE INDEX IF NOT EXISTS customers_referred_by_idx
  ON customers(referred_by_customer_id) WHERE referred_by_customer_id IS NOT NULL;

-- WHAT THE SHOP HAS ALREADY PAID.
--
-- Deliberately a running ledger of payments, NOT a per-period statement. A
-- period model needs every payout to tile the calendar exactly, and the first
-- time someone pays "the last two months plus that one I missed" the gaps and
-- overlaps make the outstanding figure unarguable-with. Here the report
-- computes what an agent has ACCRUED from their downline's orders, subtracts
-- what this table says has been PAID, and the remainder is what is owed —
-- which stays correct no matter when or in what chunks the shop pays.
CREATE TABLE IF NOT EXISTS referral_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  -- Baht actually handed over. Whole baht: this is a bank transfer, and the
  -- fee itself is floored to the baht when it is computed.
  amount integer NOT NULL CHECK (amount > 0),
  -- What the admin was looking at when they paid — informational only, never
  -- used to decide what is still owed.
  order_count integer NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  paid_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_payouts_agent_idx
  ON referral_payouts(agent_customer_id, created_at DESC);
