-- PR 4C — Meeting Notes / Cascading Communications Autosave
-- Adds active structured autosave storage for dated meeting-note records and
-- cascading communications while leaving Agenda Items and Decisions/Actions as
-- pass-through JSON compatibility fields inside notes_json.

create table if not exists public.meeting_notes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  client_meeting_id bigint not null,
  meeting_date text not null,
  is_test_meeting boolean not null default false,
  notes_json jsonb,
  cascade_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meeting_notes_meeting_client_meeting_id_key unique (meeting_id, client_meeting_id),
  constraint meeting_notes_cascade_items_array_check check (jsonb_typeof(cascade_items) = 'array')
);

create index if not exists meeting_notes_meeting_date_idx
  on public.meeting_notes(meeting_id, meeting_date, client_meeting_id);

create index if not exists meeting_notes_meeting_id_idx
  on public.meeting_notes(meeting_id);

drop trigger if exists set_meeting_notes_updated_at on public.meeting_notes;
create trigger set_meeting_notes_updated_at
before update on public.meeting_notes
for each row execute function public.set_entity_updated_at();

alter table public.meeting_notes enable row level security;

drop policy if exists "Meeting members can select" on public.meeting_notes;
drop policy if exists "Meeting editors can insert" on public.meeting_notes;
drop policy if exists "Meeting editors can update" on public.meeting_notes;
drop policy if exists "Meeting editors can delete" on public.meeting_notes;

create policy "Meeting members can select"
  on public.meeting_notes
  for select
  to authenticated
  using (public.user_can_access_meeting(meeting_id));

create policy "Meeting editors can insert"
  on public.meeting_notes
  for insert
  to authenticated
  with check (public.user_can_edit_meeting(meeting_id));

create policy "Meeting editors can update"
  on public.meeting_notes
  for update
  to authenticated
  using (public.user_can_edit_meeting(meeting_id))
  with check (public.user_can_edit_meeting(meeting_id));

create policy "Meeting editors can delete"
  on public.meeting_notes
  for delete
  to authenticated
  using (public.user_can_edit_meeting(meeting_id));
