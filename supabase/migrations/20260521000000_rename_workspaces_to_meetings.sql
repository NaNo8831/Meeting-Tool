alter table if exists public.workspaces rename to meetings;

alter index if exists public.workspaces_owner_id_idx rename to meetings_owner_id_idx;

alter trigger if exists set_workspace_updated_at on public.meetings rename to set_meeting_updated_at;
alter function if exists public.set_workspace_updated_at() rename to set_meeting_updated_at;

alter table if exists public.meetings
  rename column workspace_data to meeting_data;

comment on column public.meetings.meeting_data is
  'Full Meeting Tool meeting backup JSON for basic owner-only cloud persistence.';
