create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid null references auth.users(id) on delete set null,
  user_email text null,
  type text not null check (type in ('Bug', 'UX Friction', 'Suggestion', 'Confusing Workflow')),
  severity text not null check (severity in ('Minor', 'Blocking')),
  note text not null,
  intent text null,
  page text null,
  browser text null,
  app_version text null,
  workspace_snapshot jsonb null,
  metadata_json jsonb null
);

alter table public.feedback enable row level security;

create policy "Allow tester feedback inserts"
  on public.feedback
  for insert
  to anon, authenticated
  with check (user_id is null or auth.uid() = user_id);
