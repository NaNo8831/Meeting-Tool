-- PR 3C — Member Management
-- Add narrow security-definer helpers for member listing, owner-only editor
-- removal, and dashboard member counts without broadening meeting_members RLS.

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
    p.display_name,
    coalesce(nullif(p.email, ''), nullif(u.email, '')) as email,
    active_members.created_at,
    active_members.updated_at
  from active_members
  left join public.profiles p on p.user_id = active_members.user_id
  left join auth.users u on u.id = active_members.user_id
  order by
    case active_members.role when 'owner' then 0 else 1 end,
    coalesce(nullif(p.display_name, ''), nullif(p.email, ''), nullif(u.email, ''), active_members.user_id::text);
$$;

revoke all on function public.list_meeting_members(uuid) from public;
grant execute on function public.list_meeting_members(uuid) to authenticated;

comment on function public.list_meeting_members(uuid) is
  'Accessible-meeting helper that lists active owner/editor members with display name, email fallback, and role only; viewers remain deferred.';

create or replace function public.remove_meeting_editor(
  target_meeting_id uuid,
  target_user_id uuid
)
returns table (
  meeting_id uuid,
  user_id uuid,
  role text,
  removed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  removed_member public.meeting_members;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not public.user_can_manage_meeting_access(target_meeting_id) then
    raise exception 'Only the meeting owner can remove editors.';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Owners cannot remove themselves. Ownership transfer is not implemented.';
  end if;

  if exists (
    select 1
    from public.meetings m
    where m.id = target_meeting_id
      and m.owner_id = target_user_id
  ) then
    raise exception 'Owner rows cannot be removed.';
  end if;

  update public.meeting_members mm
  set removed_at = now(),
      updated_at = now()
  where mm.meeting_id = target_meeting_id
    and mm.user_id = target_user_id
    and mm.role = 'editor'
    and mm.removed_at is null
  returning * into removed_member;

  if removed_member.meeting_id is null then
    raise exception 'Only active editors can be removed from this meeting.';
  end if;

  meeting_id := removed_member.meeting_id;
  user_id := removed_member.user_id;
  role := removed_member.role;
  removed_at := removed_member.removed_at;
  return next;
end;
$$;

revoke all on function public.remove_meeting_editor(uuid, uuid) from public;
grant execute on function public.remove_meeting_editor(uuid, uuid) to authenticated;

comment on function public.remove_meeting_editor(uuid, uuid) is
  'Owner-only helper that soft-removes an active editor by setting meeting_members.removed_at; owner removal and ownership transfer are deferred.';

create or replace function public.get_accessible_meeting_member_counts()
returns table (
  meeting_id uuid,
  member_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id as meeting_id,
    (
      1 + count(distinct mm.user_id) filter (
        where mm.removed_at is null
          and mm.role = 'editor'
          and mm.user_id is distinct from m.owner_id
      )
    )::integer as member_count
  from public.meetings m
  left join public.meeting_members mm on mm.meeting_id = m.id
  where m.deleted_at is null
    and public.user_can_access_meeting(m.id)
  group by m.id;
$$;

revoke all on function public.get_accessible_meeting_member_counts() from public;
grant execute on function public.get_accessible_meeting_member_counts() to authenticated;

comment on function public.get_accessible_meeting_member_counts() is
  'Dashboard helper that returns owner plus active editors for meetings the caller can already access, excluding pending invitations, removed members, and viewers.';
