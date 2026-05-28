alter table if exists public.meetings
  add column if not exists deleted_at timestamptz;

create index if not exists meetings_owner_archived_deleted_updated_idx
  on public.meetings (owner_id, archived_at, deleted_at, updated_at desc);
