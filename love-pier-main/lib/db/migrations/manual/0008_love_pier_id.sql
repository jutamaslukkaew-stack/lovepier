-- Love Pier ID (Phase 1) — in-store membership foundation.
--
-- customers.member_no: the human-readable member number shown on the card and
-- read aloud/typed by staff (displayed zero-padded with an LP prefix, e.g. 2
-- -> "LP002" — the raw integer is stored, formatting lives in
-- pages/api/member.js). Assigned from customers_member_no_seq the first time
-- a customer registers.
--
-- A SEQUENCE, not SELECT MAX+1: nextval() is atomic and never hands the same
-- value to two concurrent registrations, with no explicit locking. The app
-- pairs it with a guarded `UPDATE ... WHERE member_no IS NULL`, so a repeat
-- or racing registration consumes no sequence value and is a safe no-op.
--
-- customers.member_code: the unguessable secret that actually goes in the QR
-- (crypto.randomBytes(24).toString('base64url') — see pages/api/member.js).
-- Never encode member_no in the QR: it's a small sequential integer, so
-- anyone could spoof another member by typing one in. A future staff-scan
-- endpoint looks members up by exact member_code match, hence the index.
--
-- customers.birthday: optional (for a future birthday promo), never required
-- at registration.
--
-- Additive and idempotent, applied via scripts/apply-love-pier-id-migration.mjs
-- like 0002-0007. The drizzle-kit journal under lib/db/migrations/meta/ does
-- not track these manual migrations — `drizzle-kit migrate` will not pick
-- this up.

CREATE SEQUENCE IF NOT EXISTS customers_member_no_seq START WITH 1 INCREMENT BY 1;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS member_no integer;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS member_code text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS birthday date;

-- Partial (WHERE ... IS NOT NULL) like customers_phone_unique_idx: most rows
-- are non-members and legitimately hold NULL in both columns.
CREATE UNIQUE INDEX IF NOT EXISTS customers_member_no_unique_idx
  ON customers (member_no) WHERE member_no IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customers_member_code_unique_idx
  ON customers (member_code) WHERE member_code IS NOT NULL;
