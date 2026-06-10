create or replace view public.meeting_members_with_meeting
with (security_invoker = true)
as
select
  m.name as meeting_name,
  mm.meeting_id,
  mm.user_id,
  mm.role,
  mm.removed_at,
  mm.created_at,
  mm.updated_at
from public.meeting_members mm
join public.meetings m on m.id = mm.meeting_id;

comment on view public.meeting_members_with_meeting is
  'Read-only admin readability view that joins meeting_members to meetings for meeting names; does not change storage, RLS, or runtime access.';

create or replace view public.meeting_invitations_with_meeting
with (security_invoker = true)
as
select
  m.name as meeting_name,
  mi.meeting_id,
  mi.email,
  mi.normalized_email,
  mi.role,
  mi.status,
  mi.invited_by,
  mi.accepted_by,
  mi.created_at
from public.meeting_invitations mi
join public.meetings m on m.id = mi.meeting_id;

comment on view public.meeting_invitations_with_meeting is
  'Read-only admin readability view that joins meeting_invitations to meetings for meeting names; does not change storage, RLS, or runtime access.';

create or replace view public.meeting_settings_with_meeting
with (security_invoker = true)
as
select
  m.name as meeting_name,
  ms.meeting_id,
  ms.dashboard_title,
  ms.setup_completed,
  ms.created_at,
  ms.updated_at
from public.meeting_settings ms
join public.meetings m on m.id = ms.meeting_id;

comment on view public.meeting_settings_with_meeting is
  'Read-only admin readability view that joins meeting_settings to meetings for meeting names; does not change storage, RLS, or runtime access.';

create or replace view public.strategic_topics_with_meeting
with (security_invoker = true)
as
select
  m.name as meeting_name,
  st.meeting_id,
  st.id as strategic_topic_id,
  st.title,
  st.status,
  st.archived_at,
  st.completed_at,
  st.sort_order,
  st.created_at,
  st.updated_at
from public.strategic_topics st
join public.meetings m on m.id = st.meeting_id;

comment on view public.strategic_topics_with_meeting is
  'Read-only admin readability view that joins strategic_topics to meetings for meeting names; does not change storage, RLS, or runtime access.';

create or replace view public.tactical_sessions_with_meeting
with (security_invoker = true)
as
select
  m.name as meeting_name,
  ts.meeting_id,
  ts.id as tactical_session_id,
  ts.session_date,
  ts.title,
  ts.status,
  ts.created_at,
  ts.ended_at
from public.tactical_sessions ts
join public.meetings m on m.id = ts.meeting_id;

comment on view public.tactical_sessions_with_meeting is
  'Read-only admin readability view that joins tactical_sessions to meetings for meeting names; does not change storage, RLS, or runtime access.';
