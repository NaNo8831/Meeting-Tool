-- PR 3A — User Profile Foundation
-- Establish durable authenticated-user display metadata for shared access
-- attribution without adding invite/member management, ownership transfer, audit
-- history, avatars, organizations, or dashboard member display.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text null,
  last_name text null,
  display_name text null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Durable user profile metadata for owner/member/invite/audit display attribution. auth.users.id remains the identity authority.';
comment on column public.profiles.display_name is
  'Derived from first_name and last_name when either is present; otherwise null so callers can fall back to email or generic role labels.';
comment on column public.profiles.email is
  'Mirrors the current authenticated auth.users.email for display fallback and invitation attribution context; maintained by profile triggers/functions.';

create index if not exists profiles_email_idx on public.profiles (email);

create or replace function public.derive_profile_display_name(
  profile_first_name text,
  profile_last_name text
)
returns text
language sql
immutable
as $$
  select nullif(
    concat_ws(' ', nullif(trim(profile_first_name), ''), nullif(trim(profile_last_name), '')),
    ''
  );
$$;

revoke all on function public.derive_profile_display_name(text, text) from public;

create or replace function public.set_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  auth_email text;
begin
  select u.email into auth_email
  from auth.users u
  where u.id = new.user_id;

  if auth_email is null then
    raise exception 'profile user must reference an auth user';
  end if;

  new.first_name = nullif(trim(new.first_name), '');
  new.last_name = nullif(trim(new.last_name), '');
  new.display_name = public.derive_profile_display_name(new.first_name, new.last_name);
  new.email = auth_email;

  return new;
end;
$$;

drop trigger if exists set_profile_fields on public.profiles;
create trigger set_profile_fields
  before insert or update of user_id, first_name, last_name, email, display_name
  on public.profiles
  for each row
  execute function public.set_profile_fields();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_entity_updated_at();

revoke all on function public.set_profile_fields() from public;

create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (user_id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists sync_profile_for_auth_user on auth.users;
drop trigger if exists create_profile_for_new_auth_user on auth.users;
create trigger sync_profile_for_auth_user
  after insert or update of email on auth.users
  for each row
  execute function public.handle_new_auth_user_profile();

revoke all on function public.handle_new_auth_user_profile() from public;

create or replace function public.ensure_own_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_profile public.profiles;
  auth_email text;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select u.email into auth_email
  from auth.users u
  where u.id = auth.uid();

  if auth_email is null then
    raise exception 'authenticated user email is required';
  end if;

  insert into public.profiles (user_id, email)
  values (auth.uid(), auth_email)
  on conflict (user_id) do update
  set email = excluded.email
  returning * into current_profile;

  return current_profile;
end;
$$;

revoke all on function public.ensure_own_profile() from public;
grant execute on function public.ensure_own_profile() to authenticated;

create or replace function public.get_accessible_meeting_owner_profiles()
returns table (
  meeting_id uuid,
  user_id uuid,
  display_name text,
  email text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id as meeting_id,
    p.user_id,
    p.display_name,
    p.email
  from public.meetings m
  join public.profiles p on p.user_id = m.owner_id
  where m.deleted_at is null
    and public.user_can_access_meeting(m.id);
$$;

revoke all on function public.get_accessible_meeting_owner_profiles() from public;
grant execute on function public.get_accessible_meeting_owner_profiles() to authenticated;

alter table public.profiles enable row level security;

drop policy if exists "Users can select their own profile" on public.profiles;
create policy "Users can select their own profile"
  on public.profiles
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
