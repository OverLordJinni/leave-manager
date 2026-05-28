-- Leave Manager — consolidated schema for Neon Postgres
-- Run ONCE against your Neon database (Neon SQL editor or `psql "$DATABASE_URL" -f schema.sql`).
--
-- This is a plain multi-user Postgres schema. There is no Supabase auth.users
-- and no RLS: the backend connects with a single role and scopes every query
-- by user_id in application code (see backend/src/routes/*).
--
-- gen_random_uuid() is built in to Postgres 13+ (Neon is 15+), no extension needed.

-- ── users ───────────────────────────────────────────────────────────────────
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  name          text,
  created_at    timestamptz not null default now()
);

-- ── leave_types ─────────────────────────────────────────────────────────────
create table if not exists leave_types (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  total      int  not null check (total between 1 and 365),
  used       int  not null default 0 check (used >= 0),
  color      text not null default '#2563eb' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  "order"    int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── leave_history ───────────────────────────────────────────────────────────
create table if not exists leave_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  leave_type_id uuid references leave_types(id) on delete set null,
  type_name     text not null,
  type_color    text not null,
  start_date    date not null,
  end_date      date not null,
  days          int  not null check (days > 0),
  reason        text check (char_length(reason) <= 1000),
  applied_at    timestamptz not null default now()
);

-- ── recipients ──────────────────────────────────────────────────────────────
create table if not exists recipients (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  phone      text not null check (phone ~ '^\+[1-9]\d{6,14}$'),
  created_at timestamptz not null default now()
);

-- ── settings ────────────────────────────────────────────────────────────────
create table if not exists settings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  key        text not null check (key in ('contractRenewal','lastResetDate','onboarded')),
  value      text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

-- ── passkey_credentials (WebAuthn) ───────────────────────────────────────────
create table if not exists passkey_credentials (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  credential_id text not null unique,           -- base64url credential ID
  public_key    text not null,                  -- base64url COSE public key
  counter       bigint not null default 0,      -- WebAuthn signature counter
  transports    text,                           -- JSON array of transports, optional
  created_at    timestamptz not null default now()
);

-- ── password_reset_tokens ────────────────────────────────────────────────────
create table if not exists password_reset_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  token      text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ── updated_at trigger ───────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists leave_types_updated_at on leave_types;
create trigger leave_types_updated_at
  before update on leave_types for each row execute function set_updated_at();

drop trigger if exists settings_updated_at on settings;
create trigger settings_updated_at
  before update on settings for each row execute function set_updated_at();

-- ── indexes for tenant-scoped lookups ────────────────────────────────────────
create index if not exists idx_leave_types_user_id           on leave_types          (user_id);
create index if not exists idx_leave_history_user_id         on leave_history        (user_id);
create index if not exists idx_recipients_user_id            on recipients           (user_id);
create index if not exists idx_settings_user_id              on settings             (user_id);
create index if not exists idx_passkey_credentials_user_id   on passkey_credentials  (user_id);
create index if not exists idx_password_reset_tokens_user_id on password_reset_tokens (user_id);
