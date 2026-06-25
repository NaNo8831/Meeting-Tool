-- Sprint 3B-4 — Fix list_meeting_members to include viewer members.
-- Previously active_editors CTE filtered mm.role = 'editor', so viewer members
-- were silently excluded from the returned list. This rename + filter removal
-- makes the CTE return all non-owner active members regardless of role.
-- The role column is already returned; the UI uses it for Owner/Editor/Viewer badges.

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
security definer
set search_path = public, auth
as $$
  with accessible_meeting as (
    select m.id, m.owner_id, m.created_at, m.updated_at
    from public.meetings m
    where m.id = target_meeting_id
      and m.deleted_at is null
      and public.user_can_access_meeting(m.id)
  ), active_non_owner_members as (
    select
      mm.meeting_id,
      mm.user_id,
      mm.role,
      mm.created_at,
      mm.updated_at
    from public.meeting_members mm
    join accessible_meeting am on am.id = mm.meeting_id
    where mm.removed_at is null
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
    from active_non_owner_members ae
  )
  select
    active_members.meeting_id,
    active_members.user_id,
    active_members.role,
    p.display_name,
    coalesce(nullif(p.email, ''), nullif(u.email, '')) as email,
    active_members.created_at,
    active_members.updated_at
  from active_members
  left join public.profiles p on p.user_id = active_members.user_id
  left join auth.users u on u.id = active_members.user_id
  order by
    case active_members.role when 'owner' then 0 when 'editor' then 1 else 2 end,
    coalesce(nullif(p.display_name, ''), nullif(p.email, ''), nullif(u.email, ''), active_members.user_id::text);
$$;

revoke all on function public.list_meeting_members(uuid) from public;
grant execute on function public.list_meeting_members(uuid) to authenticated;

comment on function public.list_meeting_members(uuid) is
  'Accessible-meeting helper that lists all active members (owner, editor, viewer) with display name, email fallback, and role.';
