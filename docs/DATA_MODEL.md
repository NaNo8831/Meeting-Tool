# Data Model

## Current Storage
Local Workspace persists workspace data as JSON in browser `localStorage`. Export/import backs up and restores the same Meeting Tool workspace keys. Selected Cloud Meetings save/load that full backup object in Supabase while retaining browser fallback state and without forcing migration from Local Workspace. Optional local-to-cloud migration uses the same backup object shape and leaves Local Workspace `localStorage` intact after a successful cloud save.

## Logical Entities
| Entity | Current Meaning |
| --- | --- |
| Workspace | The local collection of Meeting Tool data stored in browser storage. |
| Meeting Setup State | Browser-local completion flag plus setup-backed fields used to personalize the workspace. |
| Playbook Definitions | Organizational context and definitions used to guide leadership alignment. |
| Top Priority | Current short-term rallying priority / thematic goal. |
| Defining Objective | Temporary qualitative objective that supports the Top Priority. |
| Task | Action item with title, description, assignee, due date, status, subtasks, comments, and activity history. |
| Subtask | Smaller checklist item within a task. |
| Comment | Note attached to a task. |
| Activity History | Timestamped task history such as subtask and due-date changes. |
| Standard Operating Objective | Ongoing operating priority that persists beyond the current Top Priority. |
| Strategic Topic | Persistent strategic holding item not intended to be resolved in tactical meetings. |
| Meeting | A meeting record/date containing section items. |
| Meeting Section Item | Agenda, topic, decision/action, or cascade item captured during meeting workflow. |

## Phase 2 Open Design Items
- Whether basic JSONB workspace persistence should later be normalized into separate tables.
- Whether later normalized storage should replace or complement the current JSON backup object.
- How owner/editor/viewer permissions affect entity access and mutation.
- Whether realtime collaboration is required after basic cloud persistence.

## Phase 2 Feedback Table

Tester feedback is intentionally lightweight and non-ticket-based. It is stored separately from workspace data so feedback collection does not change the existing `localStorage` workspace behavior.

Supabase migration: `supabase/migrations/20260515000000_create_feedback.sql`.

```sql
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
```

No admin dashboard, ticket status, assignment, notifications, threaded comments, file upload, or screenshot data is part of this foundation.

## Phase 2 Cloud Meeting Persistence

Cloud workspace persistence keeps the lightweight Supabase `meetings` table as the workspace identity/container and adds a nullable `meeting_data` JSONB column for the full Meeting Tool backup object. The saved object uses the same export shape as JSON Backup/Restore: `app`, `backupVersion`, `exportedAt`, and `localStorage` entries for Meeting Tool workspace keys.

Supabase migrations: `supabase/migrations/20260516000000_create_workspaces.sql` and `supabase/migrations/20260517000000_add_meeting_data.sql`.

```sql
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  metadata_json jsonb null,
  meeting_data jsonb null
);
```

Only authenticated owners can select/update rows through RLS. New cloud meetings may have `meeting_data = null`; the app does not auto-copy Local Workspace data on first selection, and dropdown selection does not load `meeting_data` until the user clicks Load Cloud Meeting. Saving current data to cloud requires an overwrite confirmation. Optional Local Workspace migration writes the current unscoped `leadership-*` Local Workspace entries into the selected Cloud Meeting using the same backup shape, checks whether the selected cloud meeting already has `meeting_data`, warns before overwrite, and records a browser-local migrated/skipped signature keyed by user and cloud meeting. No forced migration, realtime collaboration, team sharing, or member-role model is included in this basic persistence step.
