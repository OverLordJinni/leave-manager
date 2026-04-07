-- ============================================================
-- Leave Manager — Supabase Schema
-- Run this ONCE in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Leave types (Annual Leave, Sick Leave, custom)
create table if not exists leave_types (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 80),
  total      int  not null check (total between 1 and 365),
  used       int  not null default 0 check (used >= 0),
  color      text not null default '#2563eb' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  "order"    int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Leave history (one row per leave application)
create table if not exists leave_history (
  id            uuid primary key default gen_random_uuid(),
  leave_type_id uuid references leave_types(id) on delete set null,
  type_name     text not null,
  type_color    text not null,
  start_date    date not null,
  end_date      date not null,
  days          int  not null check (days > 0),
  reason        text check (char_length(reason) <= 500),
  applied_at    timestamptz not null default now()
);

-- Viber recipients
create table if not exists recipients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 80),
  phone      text not null check (phone ~ '^\+[1-9]\d{6,14}$'),
  created_at timestamptz not null default now()
);

-- App settings (key-value store)
create table if not exists settings (
  key        text primary key check (key in ('contractRenewal','lastResetDate','onboarded')),
  value      text not null default '',
  updated_at timestamptz not null default now()
);

-- Keep updated_at current automatically
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace trigger leave_types_updated_at
  before update on leave_types
  for each row execute function set_updated_at();

create or replace trigger settings_updated_at
  before update on settings
  for each row execute function set_updated_at();

-- Row Level Security — deny all public access (backend uses service role key)
alter table leave_types    enable row level security;
alter table leave_history  enable row level security;
alter table recipients     enable row level security;
alter table settings       enable row level security;

-- No public policies = no public access. Service role bypasses RLS automatically.

-- Seed default settings rows
insert into settings (key, value) values
  ('contractRenewal', ''),
  ('lastResetDate',   ''),
  ('onboarded',       'false')
on conflict (key) do nothing;
