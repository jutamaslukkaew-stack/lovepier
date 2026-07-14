-- ─────────────────────────────────────────────────────────────────────────────
-- Delivery ordering tables — run this once in the Supabase SQL editor
-- (Dashboard → SQL Editor → New query → paste → Run)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists customers (
  id                uuid primary key default gen_random_uuid(),
  line_user_id      text unique,
  line_display_name text,
  name              text not null default '',
  phone             text not null default '',
  address           text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists orders (
  id             uuid primary key default gen_random_uuid(),
  order_no       text not null unique,
  line_user_id   text,
  customer_name  text not null,
  phone          text not null,
  address        text not null default '',
  note           text not null default '',
  items          jsonb not null default '[]'::jsonb,
  items_subtotal integer not null default 0,
  delivery_fee   integer not null default 0,
  total_amount   integer not null,
  status         text not null default 'pending',
  payment_method text not null default 'promptpay',
  payment_ref    text,
  slip_url       text,
  slip_ref       text,
  distance_km    numeric(5,1),
  created_at     timestamptz not null default now()
);

create index if not exists orders_created_at_idx on orders (created_at);
create index if not exists orders_status_idx    on orders (status);

create table if not exists settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);
alter table settings enable row level security;

-- The app writes orders through the server (service-role key), which bypasses RLS,
-- so no public policies are needed. Enable RLS to keep the tables private to clients.
alter table customers enable row level security;
alter table orders    enable row level security;
