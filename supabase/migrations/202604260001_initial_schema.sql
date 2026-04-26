create extension if not exists citext with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists app_private;

do $$
begin
  create type public.app_role as enum ('user', 'admin', 'owner');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.account_status as enum ('active', 'suspended');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.umbrella_status as enum ('available', 'borrowed', 'disabled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.borrow_status as enum ('active', 'returned', 'admin_closed');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email extensions.citext not null unique,
  display_name text,
  class_level text,
  student_number integer check (student_number is null or student_number between 1 and 99),
  role public.app_role not null default 'user',
  status public.account_status not null default 'active',
  onboarding_completed boolean not null default false,
  legacy_user_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.locations (
  id text primary key,
  name_th text not null,
  sort_order smallint not null unique
);

create table if not exists public.umbrellas (
  id smallint primary key check (id between 1 and 21),
  location_id text not null references public.locations(id),
  label text not null,
  status public.umbrella_status not null default 'available',
  borrowed_by uuid references auth.users(id) on delete set null,
  borrowed_transaction_id uuid,
  disabled_reason text,
  metadata jsonb not null default '{}'::jsonb,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint umbrella_borrowed_state check (
    (status = 'borrowed' and borrowed_by is not null and borrowed_transaction_id is not null and disabled_reason is null)
    or (status in ('available', 'disabled') and borrowed_by is null and borrowed_transaction_id is null)
  )
);

create table if not exists public.borrow_transactions (
  id uuid primary key default extensions.gen_random_uuid(),
  umbrella_id smallint not null references public.umbrellas(id),
  borrower_id uuid not null references auth.users(id) on delete cascade,
  borrow_location_id text not null references public.locations(id),
  return_location_id text references public.locations(id),
  status public.borrow_status not null default 'active',
  borrowed_at timestamptz not null default now(),
  returned_at timestamptz,
  closed_by uuid references auth.users(id) on delete set null,
  close_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint borrow_return_state check (
    (status = 'active' and returned_at is null and return_location_id is null)
    or (status in ('returned', 'admin_closed') and returned_at is not null)
  )
);

create table if not exists public.feedback (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(trim(message)) between 3 and 1200),
  status text not null default 'new' check (status in ('new', 'reviewed', 'archived')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id text,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists app_private.password_vault (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  key_version text not null default 'v1',
  source text not null default 'app' check (source in ('app', 'legacy_migration')),
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_status_idx on public.profiles(status);
create index if not exists umbrellas_location_idx on public.umbrellas(location_id);
create index if not exists umbrellas_status_idx on public.umbrellas(status);
create index if not exists borrow_transactions_borrower_idx on public.borrow_transactions(borrower_id, borrowed_at desc);
create index if not exists borrow_transactions_umbrella_idx on public.borrow_transactions(umbrella_id, borrowed_at desc);
create index if not exists borrow_transactions_borrow_location_idx on public.borrow_transactions(borrow_location_id);
create index if not exists borrow_transactions_return_location_idx on public.borrow_transactions(return_location_id);
create index if not exists borrow_transactions_closed_by_idx on public.borrow_transactions(closed_by);
create unique index if not exists borrow_transactions_one_active_per_umbrella_idx
  on public.borrow_transactions(umbrella_id)
  where status = 'active';
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id);
create index if not exists audit_logs_target_user_idx on public.audit_logs(target_user_id);
create index if not exists feedback_created_idx on public.feedback(created_at desc);
create index if not exists feedback_user_idx on public.feedback(user_id);
create index if not exists umbrellas_borrowed_by_idx on public.umbrellas(borrowed_by);
create index if not exists password_vault_changed_by_idx on app_private.password_vault(changed_by);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists umbrellas_set_updated_at on public.umbrellas;
create trigger umbrellas_set_updated_at
before update on public.umbrellas
for each row execute function public.set_updated_at();

drop trigger if exists borrow_transactions_set_updated_at on public.borrow_transactions;
create trigger borrow_transactions_set_updated_at
before update on public.borrow_transactions
for each row execute function public.set_updated_at();

drop trigger if exists feedback_set_updated_at on public.feedback;
create trigger feedback_set_updated_at
before update on public.feedback
for each row execute function public.set_updated_at();

create or replace function app_private.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'user'::public.app_role
  );
$$;

create or replace function app_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.current_role() in ('admin'::public.app_role, 'owner'::public.app_role);
$$;

create or replace function app_private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.current_role() = 'owner'::public.app_role;
$$;

create or replace function app_private.is_active_account()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select status = 'active'::public.account_status from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function app_private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, display_name, onboarding_completed)
  values (
    new.id,
    new.email,
    nullif(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), ''),
    false
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function app_private.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.umbrellas enable row level security;
alter table public.borrow_transactions enable row level security;
alter table public.feedback enable row level security;
alter table public.audit_logs enable row level security;
alter table app_private.password_vault enable row level security;

drop policy if exists "profiles read own or staff" on public.profiles;
create policy "profiles read own or staff"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()) or (select app_private.is_admin()));

drop policy if exists "locations read active users" on public.locations;
create policy "locations read active users"
on public.locations
for select
to authenticated
using ((select app_private.is_active_account()) or (select app_private.is_admin()));

drop policy if exists "umbrellas read active users" on public.umbrellas;
create policy "umbrellas read active users"
on public.umbrellas
for select
to authenticated
using ((select app_private.is_active_account()) or (select app_private.is_admin()));

drop policy if exists "borrow transactions read related" on public.borrow_transactions;
create policy "borrow transactions read related"
on public.borrow_transactions
for select
to authenticated
using (borrower_id = (select auth.uid()) or (select app_private.is_admin()));

drop policy if exists "feedback insert own" on public.feedback;
create policy "feedback insert own"
on public.feedback
for insert
to authenticated
with check (user_id = (select auth.uid()) and (select app_private.is_active_account()));

drop policy if exists "feedback read own or owner" on public.feedback;
create policy "feedback read own or owner"
on public.feedback
for select
to authenticated
using (user_id = (select auth.uid()) or (select app_private.is_owner()));

drop policy if exists "feedback update owner" on public.feedback;
create policy "feedback update owner"
on public.feedback
for update
to authenticated
using ((select app_private.is_owner()))
with check ((select app_private.is_owner()));

drop policy if exists "audit read owner" on public.audit_logs;
create policy "audit read owner"
on public.audit_logs
for select
to authenticated
using ((select app_private.is_owner()));

drop policy if exists "password vault deny all" on app_private.password_vault;
create policy "password vault deny all"
on app_private.password_vault
for all
to authenticated
using (false)
with check (false);

revoke all on app_private.password_vault from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant usage on schema app_private to authenticated;
grant execute on function app_private.current_role() to authenticated;
grant execute on function app_private.is_admin() to authenticated;
grant execute on function app_private.is_owner() to authenticated;
grant execute on function app_private.is_active_account() to authenticated;
grant select on public.profiles to authenticated;
grant select on public.locations to authenticated;
grant select on public.umbrellas to authenticated;
grant select on public.borrow_transactions to authenticated;
grant select, insert, update on public.feedback to authenticated;
grant select on public.audit_logs to authenticated;

insert into public.locations (id, name_th, sort_order) values
  ('dome', 'ใต้โดม', 1),
  ('sports_center', 'ศูนย์กีฬา', 2),
  ('cafeteria', 'โรงอาหาร', 3)
on conflict (id) do update
  set name_th = excluded.name_th,
      sort_order = excluded.sort_order;

insert into public.umbrellas (id, location_id, label, status)
select id,
       case
         when id between 1 and 7 then 'dome'
         when id between 8 and 14 then 'sports_center'
         else 'cafeteria'
       end,
       'ร่มหมายเลข ' || id,
       'available'::public.umbrella_status
from generate_series(1, 21) as id
on conflict (id) do update
  set location_id = excluded.location_id,
      label = excluded.label;

alter table public.umbrellas replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.umbrellas;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
