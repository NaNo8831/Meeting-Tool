-- Pre-beta polish — Fix remove_meeting_editor to allow owner to remove viewers.
-- Previously the UPDATE WHERE clause filtered mm.role = 'editor', so attempting
-- to remove a viewer matched zero rows and raised 'Only active editors can be
-- removed from this meeting.' The role check is redundant: the owner guard and
-- owner-row guard already prevent illegal removals. Removing the role filter
-- lets the owner soft-remove any non-owner active member (editor or viewer).

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
    raise exception 'Only the meeting owner can remove members.';
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
    and mm.removed_at is null
  returning * into removed_member;

  if removed_member.meeting_id is null then
    raise exception 'No active member found with that user ID in this meeting.';
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
  'Owner-only helper that soft-removes any active non-owner member (editor or viewer) by setting meeting_members.removed_at.';
