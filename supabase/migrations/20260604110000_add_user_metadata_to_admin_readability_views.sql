drop view if exists public.meeting_members_with_meeting;

create view public.meeting_members_with_meeting
with (security_invoker = true)
as
select
  m.name as meeting_name,
  mm.meeting_id,
  member_user.email as member_email,
  mm.user_id,
  mm.role,
  mm.removed_at,
  mm.created_at,
  mm.updated_at
from public.meeting_members mm
join public.meetings m on m.id = mm.meeting_id
left join auth.users member_user on member_user.id = mm.user_id;

comment on view public.meeting_members_with_meeting is
  'Read-only admin readability view that joins meeting_members to meetings and auth.users email display metadata; user_id remains the authorization authority and the view does not change storage, RLS, or runtime access.';

drop view if exists public.meeting_invitations_with_meeting;

create view public.meeting_invitations_with_meeting
with (security_invoker = true)
as
select
  m.name as meeting_name,
  mi.meeting_id,
  mi.email,
  mi.normalized_email,
  invited_by_user.email as invited_by_email,
  accepted_by_user.email as accepted_by_email,
  mi.role,
  mi.status,
  mi.created_at,
  mi.accepted_at,
  mi.revoked_at
from public.meeting_invitations mi
join public.meetings m on m.id = mi.meeting_id
left join auth.users invited_by_user on invited_by_user.id = mi.invited_by
left join auth.users accepted_by_user on accepted_by_user.id = mi.accepted_by;

comment on view public.meeting_invitations_with_meeting is
  'Read-only admin readability view that joins meeting_invitations to meetings and auth.users email display metadata; identity ids remain the durable references and the view does not change storage, RLS, or runtime access.';
