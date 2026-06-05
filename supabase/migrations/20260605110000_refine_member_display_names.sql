-- PR 3C follow-up — prefer profile display names in owner/member UI.
-- Keep the same RPC security boundaries while tightening display fallback order:
-- profile display_name, derived profile display name, profile email, auth email.

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
set search_path = public, auth
as $$
  select
    m.id as meeting_id,
    m.owner_id as user_id,
    coalesce(
      nullif(p.display_name, ''),
      public.derive_profile_display_name(p.first_name, p.last_name)
    ) as display_name,
    coalesce(nullif(p.email, ''), nullif(u.email, '')) as email
  from public.meetings m
  left join public.profiles p on p.user_id = m.owner_id
  left join auth.users u on u.id = m.owner_id
  where m.deleted_at is null
    and public.user_can_access_meeting(m.id);
$$;

revoke all on function public.get_accessible_meeting_owner_profiles() from public;
grant execute on function public.get_accessible_meeting_owner_profiles() to authenticated;

comment on function public.get_accessible_meeting_owner_profiles() is
  'Accessible-meeting helper that returns display-safe owner attribution using profile display name first, then profile email, then auth email fallback.';

create or replace function public.list_meeting_members(
  target_meeting_id uuid
)
returns table (
  meeting_id uuid,
  user_id uuid,
  role text,
  display_name text,
  email text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  with accessible_meeting as (
    select m.id, m.owner_id, m.created_at, m.updated_at
    from public.meetings m
    where m.id = target_meeting_id
      and m.deleted_at is null
      and public.user_can_access_meeting(m.id)
  ), active_editors as (
    select
      mm.meeting_id,
      mm.user_id,
      mm.role,
      mm.created_at,
      mm.updated_at
    from public.meeting_members mm
    join accessible_meeting am on am.id = mm.meeting_id
    where mm.removed_at is null
      and mm.role = 'editor'
      and mm.user_id is distinct from am.owner_id
  ), active_members as (
    select
      am.id as meeting_id,
      am.owner_id as user_id,
      'owner'::text as role,
      am.created_at,
      am.updated_at
    from accessible_meeting am
    union all
    select
      ae.meeting_id,
      ae.user_id,
      ae.role,
      ae.created_at,
      ae.updated_at
    from active_editors ae
  )
  select
    active_members.meeting_id,
    active_members.user_id,
    active_members.role,
    coalesce(
      nullif(p.display_name, ''),
      public.derive_profile_display_name(p.first_name, p.last_name)
    ) as display_name,
    coalesce(nullif(p.email, ''), nullif(u.email, '')) as email,
    active_members.created_at,
    active_members.updated_at
  from active_members
  left join public.profiles p on p.user_id = active_members.user_id
  left join auth.users u on u.id = active_members.user_id
  order by
    case active_members.role when 'owner' then 0 else 1 end,
    coalesce(
      nullif(p.display_name, ''),
      public.derive_profile_display_name(p.first_name, p.last_name),
      nullif(p.email, ''),
      nullif(u.email, ''),
      active_members.user_id::text
    );
$$;

revoke all on function public.list_meeting_members(uuid) from public;
grant execute on function public.list_meeting_members(uuid) to authenticated;

comment on function public.list_meeting_members(uuid) is
  'Accessible-meeting helper that lists active owner/editor members using profile display name first, then profile email, then auth email fallback; viewers remain deferred.';
