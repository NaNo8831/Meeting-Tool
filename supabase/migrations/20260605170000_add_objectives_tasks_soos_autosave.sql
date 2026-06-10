-- PR 4D — Defining Objectives / Tasks / SOOs Autosave
-- Reconciles the existing foundation tables so the current localStorage/export
-- shapes can be stored as meeting-scoped structured rows without replacing the
-- Manual Save or backup/import path.

alter table public.objectives
  add column if not exists client_objective_id bigint,
  add column if not exists description_json jsonb,
  add column if not exists priority text,
  add column if not exists due_date text,
  add column if not exists color text;

with numbered_objectives as (
  select
    id,
    ((extract(epoch from created_at) * 1000)::bigint + row_number() over (partition by meeting_id order by sort_order, created_at, id)) as generated_client_objective_id
  from public.objectives
  where client_objective_id is null
)
update public.objectives o
set client_objective_id = numbered_objectives.generated_client_objective_id
from numbered_objectives
where o.id = numbered_objectives.id;

alter table public.objectives
  alter column client_objective_id set not null,
  alter column status set default 'planning',
  alter column priority set default 'medium',
  alter column color set default 'green';

alter table public.tasks
  add column if not exists client_task_id bigint,
  add column if not exists client_objective_id bigint,
  add column if not exists description_json jsonb,
  add column if not exists description_text text,
  add column if not exists assigned_to text,
  add column if not exists subtasks_json jsonb not null default '[]'::jsonb,
  add column if not exists comments_json jsonb not null default '[]'::jsonb,
  add column if not exists activity_history_json jsonb not null default '[]'::jsonb;

update public.tasks
set assigned_to = coalesce(assigned_to, assignee),
    description_text = coalesce(description_text, description)
where assigned_to is null
   or description_text is null;

update public.tasks t
set client_objective_id = o.client_objective_id
from public.objectives o
where t.objective_id = o.id
  and t.client_objective_id is null;

with numbered_tasks as (
  select
    id,
    ((extract(epoch from created_at) * 1000)::bigint + row_number() over (partition by meeting_id order by sort_order, created_at, id)) as generated_client_task_id
  from public.tasks
  where client_task_id is null
)
update public.tasks t
set client_task_id = numbered_tasks.generated_client_task_id
from numbered_tasks
where t.id = numbered_tasks.id;

alter table public.tasks
  alter column client_task_id set not null,
  alter column status set default 'planning';

alter table public.standard_operating_objectives
  add column if not exists client_soo_id bigint,
  add column if not exists description text,
  add column if not exists description_json jsonb,
  add column if not exists color text;

with numbered_soos as (
  select
    id,
    ((extract(epoch from created_at) * 1000)::bigint + row_number() over (partition by meeting_id order by sort_order, created_at, id)) as generated_client_soo_id
  from public.standard_operating_objectives
  where client_soo_id is null
)
update public.standard_operating_objectives soo
set client_soo_id = numbered_soos.generated_client_soo_id
from numbered_soos
where soo.id = numbered_soos.id;

alter table public.standard_operating_objectives
  alter column client_soo_id set not null,
  alter column color set default 'green';

create unique index if not exists objectives_meeting_client_objective_id_key
  on public.objectives(meeting_id, client_objective_id);

create index if not exists objectives_meeting_sort_order_idx
  on public.objectives(meeting_id, sort_order, created_at);

create unique index if not exists tasks_meeting_client_task_id_key
  on public.tasks(meeting_id, client_task_id);

create index if not exists tasks_meeting_objective_client_id_idx
  on public.tasks(meeting_id, client_objective_id, sort_order, created_at);

create unique index if not exists standard_operating_objectives_meeting_client_soo_id_key
  on public.standard_operating_objectives(meeting_id, client_soo_id);

create index if not exists standard_operating_objectives_meeting_sort_order_idx
  on public.standard_operating_objectives(meeting_id, sort_order, created_at);

alter table public.tasks
  drop constraint if exists tasks_subtasks_json_array_check,
  add constraint tasks_subtasks_json_array_check check (jsonb_typeof(subtasks_json) = 'array'),
  drop constraint if exists tasks_comments_json_array_check,
  add constraint tasks_comments_json_array_check check (jsonb_typeof(comments_json) = 'array'),
  drop constraint if exists tasks_activity_history_json_array_check,
  add constraint tasks_activity_history_json_array_check check (jsonb_typeof(activity_history_json) = 'array');

-- RLS policies already use public.user_can_access_meeting and
-- public.user_can_edit_meeting from the membership RLS foundation. Recreate them
-- here so fresh or drifted databases have the expected PR 4D boundaries.
alter table public.objectives enable row level security;
alter table public.tasks enable row level security;
alter table public.standard_operating_objectives enable row level security;

drop policy if exists "Meeting members can select" on public.objectives;
drop policy if exists "Meeting editors can insert" on public.objectives;
drop policy if exists "Meeting editors can update" on public.objectives;
drop policy if exists "Meeting editors can delete" on public.objectives;
create policy "Meeting members can select" on public.objectives for select to authenticated using (public.user_can_access_meeting(meeting_id));
create policy "Meeting editors can insert" on public.objectives for insert to authenticated with check (public.user_can_edit_meeting(meeting_id));
create policy "Meeting editors can update" on public.objectives for update to authenticated using (public.user_can_edit_meeting(meeting_id)) with check (public.user_can_edit_meeting(meeting_id));
create policy "Meeting editors can delete" on public.objectives for delete to authenticated using (public.user_can_edit_meeting(meeting_id));

drop policy if exists "Meeting members can select" on public.tasks;
drop policy if exists "Meeting editors can insert" on public.tasks;
drop policy if exists "Meeting editors can update" on public.tasks;
drop policy if exists "Meeting editors can delete" on public.tasks;
create policy "Meeting members can select" on public.tasks for select to authenticated using (public.user_can_access_meeting(meeting_id));
create policy "Meeting editors can insert" on public.tasks for insert to authenticated with check (public.user_can_edit_meeting(meeting_id));
create policy "Meeting editors can update" on public.tasks for update to authenticated using (public.user_can_edit_meeting(meeting_id)) with check (public.user_can_edit_meeting(meeting_id));
create policy "Meeting editors can delete" on public.tasks for delete to authenticated using (public.user_can_edit_meeting(meeting_id));

drop policy if exists "Meeting members can select" on public.standard_operating_objectives;
drop policy if exists "Meeting editors can insert" on public.standard_operating_objectives;
drop policy if exists "Meeting editors can update" on public.standard_operating_objectives;
drop policy if exists "Meeting editors can delete" on public.standard_operating_objectives;
create policy "Meeting members can select" on public.standard_operating_objectives for select to authenticated using (public.user_can_access_meeting(meeting_id));
create policy "Meeting editors can insert" on public.standard_operating_objectives for insert to authenticated with check (public.user_can_edit_meeting(meeting_id));
create policy "Meeting editors can update" on public.standard_operating_objectives for update to authenticated using (public.user_can_edit_meeting(meeting_id)) with check (public.user_can_edit_meeting(meeting_id));
create policy "Meeting editors can delete" on public.standard_operating_objectives for delete to authenticated using (public.user_can_edit_meeting(meeting_id));
