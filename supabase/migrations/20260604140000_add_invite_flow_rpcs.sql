-- PR 3B — Invite User Flow
-- Add narrow security-definer helpers for explicit email-match invitation
-- creation, listing, revocation, and acceptance without broadening meeting RLS.

create or replace function public.create_meeting_invitation(
  target_meeting_id uuid,
  invite_email text
)
returns public.meeting_invitations
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_invite_email text := lower(trim(coalesce(invite_email, '')));
  created_invitation public.meeting_invitations;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if normalized_invite_email = '' then
    raise exception 'Enter an email address to invite.';
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
    'editor',
    'pending',
    auth.uid()
  )
  returning * into created_invitation;

  return created_invitation;
end;
$$;

revoke all on function public.create_meeting_invitation(uuid, text) from public;
grant execute on function public.create_meeting_invitation(uuid, text) to authenticated;

comment on function public.create_meeting_invitation(uuid, text) is
  'Owner-only helper that creates a new pending editor invitation while preserving accepted/revoked invitation history.';

create or replace function public.list_meeting_pending_invitations(
  target_meeting_id uuid
)
returns setof public.meeting_invitations
language sql
stable
security definer
set search_path = public
as $$
  select mi.*
  from public.meeting_invitations mi
  where mi.meeting_id = target_meeting_id
    and mi.status = 'pending'
    and public.user_can_manage_meeting_access(mi.meeting_id)
  order by mi.created_at desc;
$$;

revoke all on function public.list_meeting_pending_invitations(uuid) from public;
grant execute on function public.list_meeting_pending_invitations(uuid) to authenticated;

comment on function public.list_meeting_pending_invitations(uuid) is
  'Owner-only helper that lists pending invitations for a meeting without exposing accepted or revoked invite history in the dashboard UI.';

create or replace function public.revoke_meeting_invitation(
  target_invitation_id uuid
)
returns public.meeting_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  revoked_invitation public.meeting_invitations;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  update public.meeting_invitations mi
  set status = 'revoked',
      revoked_at = now()
  where mi.id = target_invitation_id
    and mi.status = 'pending'
    and public.user_can_manage_meeting_access(mi.meeting_id)
  returning * into revoked_invitation;

  if revoked_invitation.id is null then
    raise exception 'Only pending invitations for owned meetings can be revoked.';
  end if;

  return revoked_invitation;
end;
$$;

revoke all on function public.revoke_meeting_invitation(uuid) from public;
grant execute on function public.revoke_meeting_invitation(uuid) to authenticated;

comment on function public.revoke_meeting_invitation(uuid) is
  'Owner-only helper that moves a pending invitation to revoked without deleting invitation history.';

create or replace function public.list_my_pending_meeting_invitations()
returns table (
  id uuid,
  meeting_id uuid,
  meeting_name text,
  email text,
  normalized_email text,
  role text,
  status text,
  invited_by uuid,
  owner_display_name text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    mi.id,
    mi.meeting_id,
    m.name as meeting_name,
    mi.email,
    mi.normalized_email,
    mi.role,
    mi.status,
    mi.invited_by,
    coalesce(nullif(p.display_name, ''), nullif(p.email, ''), 'Owner') as owner_display_name,
    mi.created_at
  from public.meeting_invitations mi
  join public.meetings m on m.id = mi.meeting_id
  left join public.profiles p on p.user_id = m.owner_id
  join auth.users u on u.id = auth.uid()
  where mi.status = 'pending'
    and m.deleted_at is null
    and mi.normalized_email = lower(trim(coalesce(u.email, '')))
  order by mi.created_at desc;
$$;

revoke all on function public.list_my_pending_meeting_invitations() from public;
grant execute on function public.list_my_pending_meeting_invitations() to authenticated;

comment on function public.list_my_pending_meeting_invitations() is
  'Invitee helper that lists only pending invitations matching the signed-in user email; pending rows do not grant meeting access.';

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
    'editor',
    invitation.invited_by,
    null
  )
  on conflict (meeting_id, user_id) do update
  set role = 'editor',
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
  'Invitee helper that atomically creates or reactivates editor membership and marks a matching pending invitation accepted.';
