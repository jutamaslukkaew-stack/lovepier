-- Invite links (phase 2 of the 2026-08-26 member-group plan).
--
-- 0015 made the set of customer groups editable. This is the second way into
-- one: instead of an admin finding a customer in /admin/customers and setting
-- their group by hand, the admin mints a link, sends it into LINE, and the
-- customer puts themselves in the group by opening it.
--
-- Both paths end at the same write — customers.tier — which is the point of
-- ผัง 1 in the plan: the discount a customer gets must not depend on how they
-- got into the group.
CREATE TABLE IF NOT EXISTS group_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The unguessable part of the URL. Uppercase, no ambiguous characters, so
  -- it survives being read aloud or typed off a printed QR — see
  -- lib/invites.js#INVITE_ALPHABET. UNIQUE because it is the lookup key.
  code text NOT NULL UNIQUE,
  -- Which group this link puts people in. A real FK, unlike customers.tier:
  -- an invite pointing at a group that does not exist can only fail at the
  -- moment a customer taps it, which is the worst possible time to find out.
  -- RESTRICT rather than CASCADE — deleting a group should be refused while
  -- links to it are still in circulation, not silently void them.
  tier_key text NOT NULL REFERENCES customer_tiers(key) ON DELETE RESTRICT,
  -- The admin's own note ("คอนโด A รอบ ก.ค."), shown only in /admin/invites.
  label text NOT NULL DEFAULT '',
  -- NULL = unlimited. A bounded link is the safer default for something that
  -- gets forwarded in group chats, so the admin form fills a number in.
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  use_count integer NOT NULL DEFAULT 0,
  -- NULL = the link never stops working.
  expires_at timestamptz,
  -- What to stamp on customers.tier_expires_at when this link is redeemed —
  -- how long the customer's DISCOUNT lasts, which is a different thing from
  -- expires_at above (how long the LINK works). A month-long campaign can
  -- hand out a year of membership, or the reverse.
  tier_expires_at date,
  -- Phase 3 (agents/downline): the customer who owns this link, so a referral
  -- can be attributed. Nothing reads it yet; it is here because ผัง 3 defines
  -- an agent as "someone who holds their own invite link", which makes owner
  -- a property of the invite rather than something to bolt on later.
  owner_customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Who actually used which link. Kept separate from customer_tier_history
-- (0011), which records every tier change including admin edits: this table
-- answers "how did this campaign perform" and, in phase 3, "who did this
-- agent bring in".
CREATE TABLE IF NOT EXISTS group_invite_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL REFERENCES group_invites(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  -- What they were in before, so a mistaken campaign can be reasoned about
  -- (and, if it comes to it, reversed) without reading the whole tier history.
  previous_tier text NOT NULL,
  new_tier text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- One redemption per person per link. Somebody tapping the same link twice
  -- is the normal case, not an attack — they closed the webview and came back
  -- — and it must not burn a second use off a limited link. The API treats a
  -- conflict here as success.
  UNIQUE (invite_id, customer_id)
);

CREATE INDEX IF NOT EXISTS group_invites_tier_idx ON group_invites(tier_key);
CREATE INDEX IF NOT EXISTS group_invite_redemptions_invite_idx
  ON group_invite_redemptions(invite_id, created_at DESC);
-- Phase 3 reads this direction: everyone one agent brought in.
CREATE INDEX IF NOT EXISTS group_invites_owner_idx
  ON group_invites(owner_customer_id) WHERE owner_customer_id IS NOT NULL;
