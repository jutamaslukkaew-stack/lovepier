-- Phase 3 (image pipeline). Cache-busting counter: the webp files live at a
-- fixed path (menu/{import_code}/{size}.webp), so overwriting them leaves the
-- URL unchanged and CDNs/browsers keep serving the old image. Renderers append
-- ?v={image_version}; this column is bumped every time an image is reprocessed.
-- Additive + guarded, applied directly like 0002.
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_version integer NOT NULL DEFAULT 0;

-- Excel image_file override (which photo filename maps to this item). Used only
-- by the image matcher; blank means match by import_code.
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_file text;
