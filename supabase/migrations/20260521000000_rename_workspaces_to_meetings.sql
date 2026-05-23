do $$
begin
  if to_regclass('public.workspaces') is not null
     and to_regclass('public.meetings') is null then
    alter table public.workspaces rename to meetings;
  end if;

  if to_regclass('public.workspaces_owner_id_idx') is not null
     and to_regclass('public.meetings_owner_id_idx') is null then
    alter index public.workspaces_owner_id_idx rename to meetings_owner_id_idx;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'meetings'
      and column_name = 'workspace_data'
  )
  and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'meetings'
      and column_name = 'meeting_data'
  ) then
    alter table public.meetings rename column workspace_data to meeting_data;
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_workspace_updated_at'
  )
  and not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_meeting_updated_at'
  ) then
    alter function public.set_workspace_updated_at() rename to set_meeting_updated_at;
  end if;
end $$;

comment on column public.meetings.meeting_data is
  'Full Meeting Tool meeting backup JSON for basic owner-only cloud persistence.';