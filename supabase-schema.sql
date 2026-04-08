-- Leave Manager — Multi-User Schema using Supabase Auth
-- Run in Supabase SQL Editor to reset everything cleanly

drop table if exists leave_history  cascade;
drop table if exists leave_types    cascade;
drop table if exists recipients     cascade;
drop table if exists settings       cascade;
drop table if exists users          cascade;

create table leave_types (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  total      int  not null check (total between 1 and 365),
  used       int  not null default 0 check (used >= 0),
  color      text not null default '#2563eb' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  "order"    int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table leave_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  leave_type_id uuid references leave_types(id) on delete set null,
  type_name     text not null,
  type_color    text not null,
  start_date    date not null,
  end_date      date not null,
  days          int  not null check (days > 0),
  reason        text check (char_length(reason) <= 500),
  applied_at    timestamptz not null default now()
);

create table recipients (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  phone      text not null check (phone ~ '^\\+[1-9]\\d{6,14}$'),
  created_at timestamptz not null default now()
);

create table settings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  key        text not null check (key in ('contractRenewal','lastResetDate','onboarded')),
  value      text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace trigger leave_types_updated_at
  before update on leave_types for each row execute function set_updated_at();
create or replace trigger settings_updated_at
  before update on settings for each row execute function set_updated_at();

alter table leave_types   enable row level security;
alter table leave_history enable row level security;
alter table recipients    enable row level security;
alter table settings      enable row level security;

create policy "Users see own leave_types"   on leave_types   for all using (auth.uid() = user_id);
create policy "Users see own leave_history" on leave_history for all using (auth.uid() = user_id);
create policy "Users see own recipients"    on recipients    for all using (auth.uid() = user_id);
create policy "Users see own settings"      on settings      for all using (auth.uid() = user_id);

create index on leave_types   (user_id);
create index on leave_history (user_id);
create index on recipients    (user_id);
create index on settings      (user_id);
