-- UX-3B — Agenda / Decision Implementation + First-Class Autosave
-- Adds structured Agenda Item storage as the source of truth for agenda
-- discussion notes, independent Decision and Action outcomes, covered/cascade
-- workflow flags, and promotion linkage. Legacy decisionItems and meeting_notes
-- notes_json remain compatibility payloads during transition.

create table if not exists public.agenda_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  client_agenda_item_id bigint not null,
  client_meeting_id bigint not null,
  title text not null default '',
  discussion_notes_json jsonb,
  discussion_notes_text text,
  has_decision boolean not null default false,
  decision_text text,
  has_action boolean not null default false,
  action_text text,
  is_covered boolean not null default false,
  cascade_needed boolean not null default false,
  promoted_strategic_topic_id uuid references public.strategic_topics(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agenda_items_meeting_client_agenda_item_id_key unique (meeting_id, client_agenda_item_id)
);

create index if not exists agenda_items_meeting_client_meeting_sort_idx
  on public.agenda_items(meeting_id, client_meeting_id, sort_order, created_at);

create index if not exists agenda_items_meeting_id_idx
  on public.agenda_items(meeting_id);

create index if not exists agenda_items_promoted_strategic_topic_id_idx
  on public.agenda_items(promoted_strategic_topic_id);

drop trigger if exists set_agenda_items_updated_at on public.agenda_items;
create trigger set_agenda_items_updated_at
before update on public.agenda_items
for each row execute function public.set_entity_updated_at();

alter table public.agenda_items enable row level security;

drop policy if exists "Meeting members can select" on public.agenda_items;
drop policy if exists "Meeting editors can insert" on public.agenda_items;
drop policy if exists "Meeting editors can update" on public.agenda_items;
drop policy if exists "Meeting editors can delete" on public.agenda_items;

create policy "Meeting members can select"
  on public.agenda_items
  for select
  to authenticated
  using (public.user_can_access_meeting(meeting_id));

create policy "Meeting editors can insert"
  on public.agenda_items
  for insert
  to authenticated
  with check (public.user_can_edit_meeting(meeting_id));

create policy "Meeting editors can update"
  on public.agenda_items
  for update
  to authenticated
  using (public.user_can_edit_meeting(meeting_id))
  with check (public.user_can_edit_meeting(meeting_id));

create policy "Meeting editors can delete"
  on public.agenda_items
  for delete
  to authenticated
  using (public.user_can_edit_meeting(meeting_id));
