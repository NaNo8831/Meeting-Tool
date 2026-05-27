alter table if exists public.meetings
  add column if not exists deleted_at timestamptz;

create index if not exists meetings_owner_deleted_updated_idx
  on public.meetings (owner_id, deleted_at, updated_at desc);
