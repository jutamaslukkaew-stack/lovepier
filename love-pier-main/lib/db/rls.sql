-- ============================================================
-- Row Level Security + Storage policies for Love Pier menu admin
-- Run this in Supabase → SQL Editor AFTER applying the Drizzle
-- migration (npm run db:migrate or db:push).
-- ============================================================

-- ── categories ──────────────────────────────────────────────
alter table public.categories enable row level security;

-- Public (anon) may read only active categories.
create policy "categories_public_read"
  on public.categories for select
  to anon
  using (is_active = true);

-- Authenticated admins have full read/write.
create policy "categories_admin_all"
  on public.categories for all
  to authenticated
  using (true)
  with check (true);

-- ── menu_items ──────────────────────────────────────────────
alter table public.menu_items enable row level security;

-- Public (anon) may read only available, non-deleted items.
create policy "menu_items_public_read"
  on public.menu_items for select
  to anon
  using (is_available = true and is_deleted = false);

-- Authenticated admins have full read/write.
create policy "menu_items_admin_all"
  on public.menu_items for all
  to authenticated
  using (true)
  with check (true);

-- ── Storage: menu-images bucket ─────────────────────────────
-- Create the bucket (public read) if it does not exist.
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

-- Anyone can view images (bucket is public).
create policy "menu_images_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'menu-images');

-- Only authenticated admins can upload / update / delete images.
create policy "menu_images_admin_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'menu-images');

create policy "menu_images_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'menu-images');

create policy "menu_images_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'menu-images');
