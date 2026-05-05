create unique index if not exists borrow_transactions_one_active_per_borrower_idx
  on public.borrow_transactions(borrower_id)
  where status = 'active';

create table if not exists app_private.auth_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  attempt_key text not null,
  email text not null,
  ip inet,
  success boolean not null default false,
  attempted_at timestamptz not null default now()
);

create index if not exists auth_attempts_key_time_idx
  on app_private.auth_attempts(attempt_key, attempted_at desc);

create index if not exists auth_attempts_email_time_idx
  on app_private.auth_attempts(email, attempted_at desc);

alter table app_private.auth_attempts enable row level security;

drop policy if exists "auth attempts deny all" on app_private.auth_attempts;
create policy "auth attempts deny all"
on app_private.auth_attempts
for all
to authenticated
using (false)
with check (false);

revoke all on app_private.auth_attempts from anon, authenticated;

create or replace function app_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.current_role() in ('admin'::public.app_role, 'owner'::public.app_role)
    and app_private.is_active_account();
$$;

create or replace function app_private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.current_role() = 'owner'::public.app_role
    and app_private.is_active_account();
$$;

create index if not exists profiles_status_role_idx
  on public.profiles(status, role);
