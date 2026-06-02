alter table public.workspaces
  add column if not exists workspace_data jsonb null;

comment on column public.workspaces.workspace_data is
  'Full Meeting Tool workspace backup JSON for basic owner-only cloud persistence.';
