-- Sprint 3B-4 — Add invite_role parameter to create_meeting_invitation RPC.
-- The meeting_invitations.role column already has check (role in ('editor', 'viewer'))
-- so no schema change is needed — only the RPC signature is updated.
-- Existing callers that omit invite_role receive the same 'editor' default as before.

create or replace function public.create_meeting_invitation(
  target_meeting_id uuid,
  invite_email text,
  invite_role text default 'editor'
)
returns public.meeting_invitations
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_invite_email text := lower(trim(coalesce(invite_email, '')));
  normalized_invite_role  text := lower(trim(coalesce(invite_role, 'editor')));
  created_invitation public.meeting_invitations;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if normalized_invite_email = '' then
    raise exception 'Enter an email address to invite.';
  end if;

  if normalized_invite_role not in ('editor', 'viewer') then
    raise exception 'Role must be editor or viewer.';
  end if;

  if not public.user_can_manage_meeting_access(target_meeting_id) then
    raise exception 'Only the meeting owner can invite users.';
  end if;

  if exists (
    select 1
    from public.meeting_members mm
    join auth.users u on u.id = mm.user_id
    where mm.meeting_id = target_meeting_id
      and mm.removed_at is null
      and lower(trim(coalesce(u.email, ''))) = normalized_invite_email
  ) then
    raise exception 'This user already has active access to the meeting.';
  end if;

  if exists (
    select 1
    from public.meeting_invitations mi
    where mi.meeting_id = target_meeting_id
      and mi.normalized_email = normalized_invite_email
      and mi.status = 'pending'
  ) then
    raise exception 'A pending invitation already exists for this email.';
  end if;

  insert into public.meeting_invitations (
    meeting_id,
    email,
    normalized_email,
    role,
    status,
    invited_by
  ) values (
    target_meeting_id,
    trim(invite_email),
    normalized_invite_email,
    normalized_invite_role,
    'pending',
    auth.uid()
  )
  returning * into created_invitation;

  return created_invitation;
end;
$$;

revoke all on function public.create_meeting_invitation(uuid, text, text) from public;
grant execute on function public.create_meeting_invitation(uuid, text, text) to authenticated;

comment on function public.create_meeting_invitation(uuid, text, text) is
  'Owner-only helper that creates a new pending invitation with the specified role (editor or viewer, default editor) while preserving accepted/revoked invitation history.';
