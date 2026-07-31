-- Manual, idempotent migration for the bulk menu-import feature (Phase 1).
--
-- Applied directly (scripts/apply-menu-import-migration.mjs), NOT via
-- drizzle-kit migrate: the drizzle snapshot is out of sync with the real DB
-- (orders/customers/settings/events were created with `db:push`, so a
-- generated migration would try to CREATE TABLE tables that already exist).
-- Every statement below is additive and guarded, so re-running is a no-op.

-- ── categories.category_no ────────────────────────────────────────────────
ALTER TABLE categories ADD COLUMN IF NOT EXISTS category_no text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_category_no_unique') THEN
    ALTER TABLE categories ADD CONSTRAINT categories_category_no_unique UNIQUE (category_no);
  END IF;
END $$;

-- ── menu_items import fields ──────────────────────────────────────────────
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS import_code   text;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sub_category  text;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS status        text NOT NULL DEFAULT 'published';
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS price_original numeric(10,2);
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS note_internal text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'menu_items_import_code_unique') THEN
    ALTER TABLE menu_items ADD CONSTRAINT menu_items_import_code_unique UNIQUE (import_code);
  END IF;
END $$;

-- ── menu_imports audit log ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_imports (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename         text,
  uploaded_by      text,
  rows_total       integer NOT NULL DEFAULT 0,
  rows_created     integer NOT NULL DEFAULT 0,
  rows_updated     integer NOT NULL DEFAULT 0,
  rows_unchanged   integer NOT NULL DEFAULT 0,
  rows_incomplete  integer NOT NULL DEFAULT 0,
  images_matched   integer NOT NULL DEFAULT 0,
  images_unmatched integer NOT NULL DEFAULT 0,
  report           jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);
