-- PR 4B — Strategic Topics + Topic Notes Autosave
-- Reconcile runtime Strategic Topic fields with structured persistence and
-- formalize topic-attached notes for owner/editor autosave.

alter table public.strategic_topics
  add column if not exists client_item_id bigint,
  add column if not exists captured_date date,
  add column if not exists captured_meeting_id bigint,
  add column if not exists captured_meeting_index integer,
  add column if not exists completed_date date,
  add column if not exists removed_meeting_id bigint,
  add column if not exists removed_meeting_index integer,
  add column if not exists removed_date date;

with numbered_topics as (
  select
    id,
    ((extract(epoch from created_at) * 1000)::bigint + row_number() over (order by created_at, id)) as generated_client_item_id
  from public.strategic_topics
  where client_item_id is null
)
update public.strategic_topics st
set client_item_id = numbered_topics.generated_client_item_id
from numbered_topics
where st.id = numbered_topics.id;

alter table public.strategic_topics
  alter column client_item_id set not null;

alter table public.strategic_topics
  drop constraint if exists strategic_topics_status_check;

alter table public.strategic_topics
  add constraint strategic_topics_status_check
  check (status in ('active', 'completed', 'archived'));

create unique index if not exists strategic_topics_meeting_client_item_id_key
  on public.strategic_topics(meeting_id, client_item_id);

create index if not exists strategic_topics_meeting_sort_order_idx
  on public.strategic_topics(meeting_id, sort_order, created_at);

create table if not exists public.strategic_topic_notes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  strategic_topic_id uuid null references public.strategic_topics(id) on delete set null,
  strategic_topic_item_id bigint not null,
  content_json jsonb null,
  content_text text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.strategic_topic_notes
  add column if not exists strategic_topic_id uuid null references public.strategic_topics(id) on delete set null,
  add column if not exists strategic_topic_item_id bigint,
  add column if not exists content_json jsonb,
  add column if not exists content_text text;

with numbered_notes as (
  select
    id,
    ((extract(epoch from created_at) * 1000)::bigint + row_number() over (order by created_at, id)) as generated_topic_item_id
  from public.strategic_topic_notes
  where strategic_topic_item_id is null
)
update public.strategic_topic_notes stn
set strategic_topic_item_id = numbered_notes.generated_topic_item_id
from numbered_notes
where stn.id = numbered_notes.id;

alter table public.strategic_topic_notes
  alter column strategic_topic_item_id set not null;

create unique index if not exists strategic_topic_notes_meeting_item_id_key
  on public.strategic_topic_notes(meeting_id, strategic_topic_item_id);

create index if not exists strategic_topic_notes_meeting_id_idx
  on public.strategic_topic_notes(meeting_id);

create index if not exists strategic_topic_notes_topic_id_idx
  on public.strategic_topic_notes(strategic_topic_id);

update public.strategic_topic_notes stn
set strategic_topic_id = st.id
from public.strategic_topics st
where stn.strategic_topic_id is null
  and stn.meeting_id = st.meeting_id
  and stn.strategic_topic_item_id = st.client_item_id;

drop trigger if exists set_strategic_topic_notes_updated_at on public.strategic_topic_notes;
create trigger set_strategic_topic_notes_updated_at
before update on public.strategic_topic_notes
for each row execute function public.set_entity_updated_at();

alter table public.strategic_topic_notes enable row level security;

drop policy if exists "Meeting members can select" on public.strategic_topic_notes;
drop policy if exists "Meeting editors can insert" on public.strategic_topic_notes;
drop policy if exists "Meeting editors can update" on public.strategic_topic_notes;
drop policy if exists "Meeting editors can delete" on public.strategic_topic_notes;

create policy "Meeting members can select"
  on public.strategic_topic_notes
  for select
  to authenticated
  using (public.user_can_access_meeting(meeting_id));

create policy "Meeting editors can insert"
  on public.strategic_topic_notes
  for insert
  to authenticated
  with check (public.user_can_edit_meeting(meeting_id));

create policy "Meeting editors can update"
  on public.strategic_topic_notes
  for update
  to authenticated
  using (public.user_can_edit_meeting(meeting_id))
  with check (public.user_can_edit_meeting(meeting_id));

create policy "Meeting editors can delete"
  on public.strategic_topic_notes
  for delete
  to authenticated
  using (public.user_can_edit_meeting(meeting_id));
