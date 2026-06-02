alter table if exists public.meetings
  add column if not exists archived_at timestamptz;

create index if not exists meetings_owner_archived_updated_idx
  on public.meetings (owner_id, archived_at, updated_at desc);
