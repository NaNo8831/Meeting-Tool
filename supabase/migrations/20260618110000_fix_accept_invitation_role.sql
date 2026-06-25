-- Sprint 3B-4 — Fix accept_meeting_invitation to honour invitation.role.
-- Previously the RPC hardcoded 'editor' when inserting/updating meeting_members,
-- ignoring the role stored on the invitation. This meant viewer invitations were
-- always accepted as editors. Now invitation.role is used so the stored member
-- role matches what was invited.

create or replace function public.accept_meeting_invitation(
  target_invitation_id uuid
)
returns public.meeting_invitations
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  auth_email text;
  normalized_auth_email text;
  invitation public.meeting_invitations;
  accepted_invitation public.meeting_invitations;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select u.email into auth_email
  from auth.users u
  where u.id = auth.uid();

  normalized_auth_email := lower(trim(coalesce(auth_email, '')));
  if normalized_auth_email = '' then
    raise exception 'authenticated user email is required';
  end if;

  select mi.* into invitation
  from public.meeting_invitations mi
  join public.meetings m on m.id = mi.meeting_id
  where mi.id = target_invitation_id
    and m.deleted_at is null
  for update of mi;

  if invitation.id is null then
    raise exception 'Invitation was not found.';
  end if;

  if invitation.status <> 'pending' then
    raise exception 'Only pending invitations can be accepted.';
  end if;

  if invitation.normalized_email <> normalized_auth_email then
    raise exception 'This invitation does not match the signed-in email.';
  end if;

  if exists (
    select 1
    from public.meeting_members mm
    where mm.meeting_id = invitation.meeting_id
      and mm.user_id = auth.uid()
      and mm.removed_at is null
  ) then
    raise exception 'This user already has active access to the meeting.';
  end if;

  insert into public.meeting_members (
    meeting_id,
    user_id,
    role,
    invited_by,
    removed_at
  ) values (
    invitation.meeting_id,
    auth.uid(),
    invitation.role,
    invitation.invited_by,
    null
  )
  on conflict (meeting_id, user_id) do update
  set role = invitation.role,
      invited_by = excluded.invited_by,
      removed_at = null,
      updated_at = now()
  where public.meeting_members.removed_at is not null;

  update public.meeting_invitations mi
  set status = 'accepted',
      accepted_by = auth.uid(),
      accepted_at = now()
  where mi.id = invitation.id
    and mi.status = 'pending'
  returning * into accepted_invitation;

  if accepted_invitation.id is null then
    raise exception 'Invitation could not be accepted.';
  end if;

  return accepted_invitation;
end;
$$;

revoke all on function public.accept_meeting_invitation(uuid) from public;
grant execute on function public.accept_meeting_invitation(uuid) to authenticated;

comment on function public.accept_meeting_invitation(uuid) is
  'Invitee helper that atomically creates or reactivates membership with the role from the invitation (editor or viewer) and marks the invitation accepted.';
