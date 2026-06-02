create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  metadata_json jsonb null
);

create index if not exists workspaces_owner_id_idx
  on public.workspaces (owner_id);

create or replace function public.set_workspace_updated_at()
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

drop trigger if exists set_workspace_updated_at on public.workspaces;
create trigger set_workspace_updated_at
  before update on public.workspaces
  for each row
  execute function public.set_workspace_updated_at();

alter table public.workspaces enable row level security;

drop policy if exists "Workspace owners can insert" on public.workspaces;
create policy "Workspace owners can insert"
  on public.workspaces
  for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Workspace owners can select" on public.workspaces;
create policy "Workspace owners can select"
  on public.workspaces
  for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Workspace owners can update" on public.workspaces;
create policy "Workspace owners can update"
  on public.workspaces
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
