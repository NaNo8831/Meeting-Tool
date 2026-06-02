create or replace function public.user_owns_meeting(target_meeting_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.meetings m
    where m.id = target_meeting_id
      and m.owner_id = auth.uid()
  );
$$;

create or replace function public.set_entity_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.meeting_members (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (meeting_id, user_id)
);

create table if not exists public.meeting_settings (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null unique references public.meetings(id) on delete cascade,
  dashboard_title text null,
  organization_info jsonb null,
  meeting_section_order jsonb null,
  setup_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.objectives (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  title text not null,
  description text null,
  status text null,
  sort_order integer not null default 0,
  metadata_json jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  objective_id uuid null references public.objectives(id) on delete set null,
  title text not null,
  description text null,
  status text null,
  assignee text null,
  due_date date null,
  sort_order integer not null default 0,
  metadata_json jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.standard_operating_objectives (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  title text not null,
  status text null,
  sort_order integer not null default 0,
  metadata_json jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.strategic_topics (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  title text not null,
  notes text null,
  status text not null default 'active',
  archived_at timestamptz null,
  completed_at timestamptz null,
  sort_order integer not null default 0,
  metadata_json jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tactical_sessions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  session_date date not null default current_date,
  title text null,
  status text not null default 'open',
  snapshot_json jsonb null,
  created_at timestamptz not null default now(),
  ended_at timestamptz null
);

create table if not exists public.tactical_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  tactical_session_id uuid null references public.tactical_sessions(id) on delete cascade,
  item_type text not null,
  title text not null,
  notes text null,
  status text null,
  sort_order integer not null default 0,
  metadata_json jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.strategic_sessions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  session_date date not null default current_date,
  title text null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  ended_at timestamptz null
);

create table if not exists public.strategic_session_notes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  strategic_session_id uuid not null references public.strategic_sessions(id) on delete cascade,
  content_json jsonb null,
  content_text text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meeting_members_meeting_id_idx on public.meeting_members(meeting_id);
create index if not exists meeting_members_user_id_idx on public.meeting_members(user_id);
create index if not exists meeting_settings_meeting_id_idx on public.meeting_settings(meeting_id);
create index if not exists objectives_meeting_id_idx on public.objectives(meeting_id);
create index if not exists tasks_meeting_id_idx on public.tasks(meeting_id);
create index if not exists tasks_objective_id_idx on public.tasks(objective_id);
create index if not exists standard_operating_objectives_meeting_id_idx on public.standard_operating_objectives(meeting_id);
create index if not exists strategic_topics_meeting_id_idx on public.strategic_topics(meeting_id);
create index if not exists tactical_sessions_meeting_id_idx on public.tactical_sessions(meeting_id);
create index if not exists tactical_items_meeting_id_idx on public.tactical_items(meeting_id);
create index if not exists tactical_items_tactical_session_id_idx on public.tactical_items(tactical_session_id);
create index if not exists strategic_sessions_meeting_id_idx on public.strategic_sessions(meeting_id);
create index if not exists strategic_session_notes_meeting_id_idx on public.strategic_session_notes(meeting_id);
create index if not exists strategic_session_notes_strategic_session_id_idx on public.strategic_session_notes(strategic_session_id);

drop trigger if exists set_meeting_settings_updated_at on public.meeting_settings;
create trigger set_meeting_settings_updated_at before update on public.meeting_settings for each row execute function public.set_entity_updated_at();
drop trigger if exists set_objectives_updated_at on public.objectives;
create trigger set_objectives_updated_at before update on public.objectives for each row execute function public.set_entity_updated_at();
drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at before update on public.tasks for each row execute function public.set_entity_updated_at();
drop trigger if exists set_standard_operating_objectives_updated_at on public.standard_operating_objectives;
create trigger set_standard_operating_objectives_updated_at before update on public.standard_operating_objectives for each row execute function public.set_entity_updated_at();
drop trigger if exists set_strategic_topics_updated_at on public.strategic_topics;
create trigger set_strategic_topics_updated_at before update on public.strategic_topics for each row execute function public.set_entity_updated_at();
drop trigger if exists set_tactical_items_updated_at on public.tactical_items;
create trigger set_tactical_items_updated_at before update on public.tactical_items for each row execute function public.set_entity_updated_at();
drop trigger if exists set_strategic_session_notes_updated_at on public.strategic_session_notes;
create trigger set_strategic_session_notes_updated_at before update on public.strategic_session_notes for each row execute function public.set_entity_updated_at();

alter table public.meeting_members enable row level security;
alter table public.meeting_settings enable row level security;
alter table public.objectives enable row level security;
alter table public.tasks enable row level security;
alter table public.standard_operating_objectives enable row level security;
alter table public.strategic_topics enable row level security;
alter table public.tactical_sessions enable row level security;
alter table public.tactical_items enable row level security;
alter table public.strategic_sessions enable row level security;
alter table public.strategic_session_notes enable row level security;

drop policy if exists "Meeting owners full access" on public.meeting_members;
create policy "Meeting owners full access" on public.meeting_members for all to authenticated using (public.user_owns_meeting(meeting_id)) with check (public.user_owns_meeting(meeting_id));
drop policy if exists "Meeting owners full access" on public.meeting_settings;
create policy "Meeting owners full access" on public.meeting_settings for all to authenticated using (public.user_owns_meeting(meeting_id)) with check (public.user_owns_meeting(meeting_id));
drop policy if exists "Meeting owners full access" on public.objectives;
create policy "Meeting owners full access" on public.objectives for all to authenticated using (public.user_owns_meeting(meeting_id)) with check (public.user_owns_meeting(meeting_id));
drop policy if exists "Meeting owners full access" on public.tasks;
create policy "Meeting owners full access" on public.tasks for all to authenticated using (public.user_owns_meeting(meeting_id)) with check (public.user_owns_meeting(meeting_id));
drop policy if exists "Meeting owners full access" on public.standard_operating_objectives;
create policy "Meeting owners full access" on public.standard_operating_objectives for all to authenticated using (public.user_owns_meeting(meeting_id)) with check (public.user_owns_meeting(meeting_id));
drop policy if exists "Meeting owners full access" on public.strategic_topics;
create policy "Meeting owners full access" on public.strategic_topics for all to authenticated using (public.user_owns_meeting(meeting_id)) with check (public.user_owns_meeting(meeting_id));
drop policy if exists "Meeting owners full access" on public.tactical_sessions;
create policy "Meeting owners full access" on public.tactical_sessions for all to authenticated using (public.user_owns_meeting(meeting_id)) with check (public.user_owns_meeting(meeting_id));
drop policy if exists "Meeting owners full access" on public.tactical_items;
create policy "Meeting owners full access" on public.tactical_items for all to authenticated using (public.user_owns_meeting(meeting_id)) with check (public.user_owns_meeting(meeting_id));
drop policy if exists "Meeting owners full access" on public.strategic_sessions;
create policy "Meeting owners full access" on public.strategic_sessions for all to authenticated using (public.user_owns_meeting(meeting_id)) with check (public.user_owns_meeting(meeting_id));
drop policy if exists "Meeting owners full access" on public.strategic_session_notes;
create policy "Meeting owners full access" on public.strategic_session_notes for all to authenticated using (public.user_owns_meeting(meeting_id)) with check (public.user_owns_meeting(meeting_id));
