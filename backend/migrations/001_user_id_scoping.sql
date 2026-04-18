-- Migration 001 — Per-user row scoping (fixes audit H-1)
--
-- Background: the routes in backend/src/routes/ previously queried all rows
-- without filtering by user, relying on the single-user signup gate. This
-- migration adds user_id columns and backfills them from the sole existing
-- user so the route-level filters can be enabled safely.
--
-- Ordering matters. Run in a transaction against the production Supabase DB
-- AFTER taking a snapshot, and BEFORE deploying the backend code that
-- expects these columns.
--
-- Assumes exactly one user exists in the `users` table at migration time.
-- If you already have >1 user, stop and reconcile manually before running.

begin;

-- Sanity check: there must be exactly one user to backfill from.
do $$
declare
  user_count int;
begin
  select count(*) into user_count from users;
  if user_count <> 1 then
    raise exception 'Migration 001 expects exactly 1 user, found %', user_count;
  end if;
end $$;

-- 1. Add nullable columns.
alter table leave_types          add column if not exists user_id uuid references users(id) on delete cascade;
alter table leave_history        add column if not exists user_id uuid references users(id) on delete cascade;
alter table recipients           add column if not exists user_id uuid references users(id) on delete cascade;
alter table settings             add column if not exists user_id uuid references users(id) on delete cascade;
alter table passkey_credentials  add column if not exists user_id uuid references users(id) on delete cascade;
alter table password_reset_tokens add column if not exists user_id uuid references users(id) on delete cascade;

-- 2. Backfill with the single existing user.
update leave_types          set user_id = (select id from users limit 1) where user_id is null;
update leave_history        set user_id = (select id from users limit 1) where user_id is null;
update recipients           set user_id = (select id from users limit 1) where user_id is null;
update settings             set user_id = (select id from users limit 1) where user_id is null;
update passkey_credentials  set user_id = (select id from users limit 1) where user_id is null;
update password_reset_tokens set user_id = (select id from users limit 1) where user_id is null;

-- 3. Promote to NOT NULL now that every row has a value.
alter table leave_types          alter column user_id set not null;
alter table leave_history        alter column user_id set not null;
alter table recipients           alter column user_id set not null;
alter table settings             alter column user_id set not null;
alter table passkey_credentials  alter column user_id set not null;
alter table password_reset_tokens alter column user_id set not null;

-- 4. `settings` uses `key` as a per-user logical unique — rebuild its unique
-- constraint so it covers (user_id, key) rather than global key.
alter table settings drop constraint if exists settings_key_key;
alter table settings add constraint settings_user_id_key_key unique (user_id, key);

-- 5. Indexes for tenant-scoped lookups.
create index if not exists idx_leave_types_user_id          on leave_types          (user_id);
create index if not exists idx_leave_history_user_id        on leave_history        (user_id);
create index if not exists idx_recipients_user_id           on recipients           (user_id);
create index if not exists idx_settings_user_id             on settings             (user_id);
create index if not exists idx_passkey_credentials_user_id  on passkey_credentials  (user_id);
create index if not exists idx_password_reset_tokens_user_id on password_reset_tokens (user_id);

commit;
