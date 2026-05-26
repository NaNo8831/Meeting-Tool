create table if not exists public.strategic_topic_notes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  strategic_topic_item_id bigint not null,
  content_json jsonb null,
  content_text text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(meeting_id, strategic_topic_item_id)
);

create index if not exists strategic_topic_notes_meeting_id_idx
  on public.strategic_topic_notes(meeting_id);

create index if not exists strategic_topic_notes_topic_item_id_idx
  on public.strategic_topic_notes(strategic_topic_item_id);

alter table public.strategic_topic_notes enable row level security;

drop policy if exists "Meeting owners full access" on public.strategic_topic_notes;
create policy "Meeting owners full access" on public.strategic_topic_notes
  for all
  to authenticated
  using (public.user_owns_meeting(meeting_id))
  with check (public.user_owns_meeting(meeting_id));

drop trigger if exists set_strategic_topic_notes_updated_at on public.strategic_topic_notes;
create trigger set_strategic_topic_notes_updated_at
  before update on public.strategic_topic_notes
  for each row
  execute function public.set_entity_updated_at();
