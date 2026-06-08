# Data Model

## Phase 4 PR 4D objectives/tasks/SOOs data model

- `public.objectives` is the structured Cloud Meeting table for Defining Objectives. It keeps `meeting_id`, `client_objective_id`, `title`, rich description JSON/text compatibility, `status`, `priority`, `due_date`, `color`, `sort_order`, timestamps, and a unique `(meeting_id, client_objective_id)` key.
- `public.tasks` stores embedded Objective Tasks as separate rows keyed by `meeting_id` and `client_task_id`, linked to both `objective_id` where available and `client_objective_id` for import/localStorage compatibility. It stores rich description compatibility, `status`, `due_date`, `assigned_to`/`assignee`, `sort_order`, and JSON arrays for subtasks, comments, and activity history.
- `public.standard_operating_objectives` stores SOOs separately from Defining Objectives with `meeting_id`, `client_soo_id`, `title`, rich description JSON/text compatibility, `color`, `sort_order`, timestamps, and a unique `(meeting_id, client_soo_id)` key.
- `leadership-objectives` and `leadership-standard-operating-objectives` remain in Manual Save/export/import backups. Cloud imports upsert structured rows while preserving numeric client IDs where possible.

## Current Stable State (Phase 2 Cloud Baseline)

- `/dashboard` works for authenticated meeting selection.
- `/meeting/[id]` loads the selected cloud meeting when explicitly requested.
- Manual **Save to Cloud** works and remains the full-workspace backup safety net.
- Structured persistence now covers `meeting_settings`, Strategic Topics/Topic Notes, Meeting Notes/Cascading Communications, and PR 4D Defining Objectives/Tasks/SOOs. Valid loaded `/meeting/[id]` cloud routes hydrate the full-workspace backup first, then overlay structured rows where present. Local mode never sends these cloud reads or writes.
- Refresh reloads the last manual full-workspace cloud backup, then applies the narrow structured `meeting_settings` pilot fields when present.
- JSON export/import works.
- Feedback submission works.
- Sign out routes users to `/`.
- `meetings.meeting_data` JSONB remains the backup/export/import shape and safety fallback.
- `meetings.archived_at` (nullable timestamptz) marks archived meetings without deleting rows.
- Tactical history foundation is active for cloud meetings: each **End Meeting** action creates a `tactical_sessions` row with archival `snapshot_json`, while runtime operational state remains unchanged.

## Why Full-Workspace JSONB Autosave Was Stopped

The prior full-page autosave attempt (PR #41) was abandoned because it introduced regressions and did not deliver reliable persistence:

- Strategic Topics broke.
- The page flashed on edits.
- Autosave still failed in important paths.
- Refresh could revert to the last manual save.

Architecture drawbacks of full JSONB autosave:

- Change detection across the full workspace is fragile.
- Every edit attempts a large JSON write.
- Load/save race conditions are hard to eliminate.
- Model does not fit future multi-user/realtime behavior.

## Meeting Container Name vs. Workspace Title

- `meetings.name` is the Cloud Meeting container name shown on the authenticated dashboard and used to identify the routed cloud workspace.
- `meeting_settings.dashboard_title` is the in-workspace/playbook title shown inside the Meeting Tool workspace.
- The two values may initially match, but they remain distinct concepts and are not collapsed into one field in this pilot.
- Keeping the container identity separate from workspace settings remains compatible with future Phase 3 member-based access.

## Current Split Save Model

- `meeting_settings` autosave persists playbook/settings-level data: `dashboard_title`, `organization_info`, `meeting_section_order`, and `setup_completed`.
- `strategic_topics` autosave persists cloud Strategic Topic rows, including legacy `client_item_id`, title/text, `status`, completed/archive timestamps, captured/removed meeting context, `sort_order`, and metadata.
- `strategic_topic_notes` autosave persists topic-attached rich notes separately from the full-workspace backup using `meeting_id`, nullable `strategic_topic_id`, legacy `strategic_topic_item_id`, `content_json`, and `content_text`.
- Manual Save persists the full operational workspace backup to `meetings.meeting_data`, including objectives, tasks, agenda items, Strategic Topics, meeting notes, Standard Operating Objectives, Defining Objectives, and other runtime meeting state.
- Manual Save remains required, visible, and available until structured autosave reliably covers all important meeting data.
- Full-workspace JSONB autosave remains out of scope. Future structured autosave expansion should continue surface-by-surface in separate PRs.
- Once structured autosave handles the core operational workspace reliably, evaluate retiring Manual Save from the primary workflow or moving it into a secondary backup/export utility role. Do not remove or demote Manual Save in PR #72.

## Current Persistence Shape (Keep During Migration)

`meetings.meeting_data` remains in place as:

- backup/safety net,
- export/import-compatible format,
- manual save/load payload.

Do **not** remove `meeting_data` in this migration planning stage.

## Local Workspace Support and Future Evaluation

- Local Workspace remains browser-only and supported during the current cloud persistence and shared-access stabilization work.
- Local Workspace must not autosave to cloud. Do not remove it in Phase 2.5; it remains a fallback path while structured cloud persistence and shared access are being stabilized.
- After structured cloud autosave protects all valuable meeting data and Phase 3 shared meeting access is stable, evaluate retiring Local Workspace or demoting it to a developer/testing-only mode.
- Maintaining parallel local and cloud meeting systems creates code duplication, testing burden, and user confusion. The product's team value depends on shared cloud meeting access, which Local Workspace cannot provide, but Local Workspace retirement is a future decision.

## Tactical History Foundation (Archival Session Records)

- `tactical_sessions` stores recurring tactical meeting history snapshots.
- `snapshot_json` is intentionally acceptable for historical archival records.
- This history path is separate from the structured operational persistence migration.
- Ending a meeting creates a historical session record and **does not reset** the active meeting workspace.

## Target Structured Persistence Model (Planned)

The long-term direction is section/item persistence with clear entity boundaries.

### Core tables to introduce in sequence (planned)

- `meetings`
- `meeting_members`
- `meeting_sections` (or `meeting_settings` where section metadata belongs)
- `objectives`
- `tasks`
- `standard_operating_objectives`
- `tactical_sessions`
- `tactical_items`
- `strategic_topics`
- `strategic_topic_notes`

### Relationship direction (high level)

- `meetings` is the parent container.
- `meeting_members` links users to meetings for access.
- Section/item tables reference `meeting_id`.
- Strategic topic notes/history records reference `meeting_id` and `strategic_topic_item_id`.
- Rich text or text notes are stored with explicit ownership rather than inside one monolithic JSON blob.

## Save Behavior Target (Structured)

Planned save flow:

1. User edits one item/section.
2. App saves only that item/section row(s).
3. App updates local save status for that section/item.
4. Manual full backup/export remains available as a safety net throughout migration.

## Migration Strategy

- **Phase A:** Keep JSONB backup as source of truth while structured schema and mapping are finalized.
- **Phase B:** Add structured tables; new edits begin dual-write or structured-write per scoped surface.
- **Phase C:** Hydrate app reads from structured tables (surface-by-surface rollout).
- **Phase D:** Keep `meeting_data` for backup/export snapshot only.
- **Phase E:** Add shared membership on top of the stable cloud foundation; keep realtime features deferred unless separately prioritized.

## Structured Persistence Foundation (Phase A/B Schema Introduction)

Supabase migration `20260523000000_add_structured_persistence_foundation.sql` introduces non-breaking structured tables:

- `meeting_members`
- `meeting_settings`
- `objectives`
- `tasks`
- `standard_operating_objectives`
- `strategic_topics`
- `tactical_sessions`
- `tactical_items`
- `strategic_sessions`
- `strategic_session_notes`

The foundation remains non-breaking, with one validated write-path pilot:

- `meeting_settings` receives debounced structured upserts for `dashboard_title`, `organization_info`, `meeting_section_order`, and `setup_completed` only after a signed-in cloud route has finished bootstrapping.
- Unchanged settings payloads are skipped. The UI separately reports settings autosave progress and whether Manual Save is needed for the full workspace backup; failures surface a calm **Settings save failed** state.
- The four pilot fields hydrate from `meeting_settings` after the full-workspace backup loads, so structured settings take precedence on refresh. Objectives, tasks, agenda items, Strategic Topics, meeting notes, SOOs, and other runtime state still hydrate from the existing workspace backup path.
- `meetings.meeting_data` remains the active backup/export/import shape and Manual Save/Load safety net.
- Full-workspace JSONB autosave remains explicitly out of scope.

Why this pilot is intentionally narrow:

- A one-row settings upsert proves the structured write boundary without mixing objectives, tasks, agenda items, Strategic Topics, or notes into the same rollout.
- The client writes by `meeting_id` and relies on RLS rather than hardcoding owner-only behavior, preparing for later `meeting_members` owner/editor/viewer policy expansion without implementing shared access in this slice.

## Explicit Out of Scope (This Plan)

- Realtime behavior.
- Invite delivery and polished onboarding; Phase 3 PR 1A plans pending-invite storage only.
- Full org/team hierarchy.
- Slug URLs.
- Multiple local workspaces.
- Immediate deletion of `meeting_data`.

## Strategic Topic Lifecycle Semantics (Runtime)

- Strategic Topics are historical operational records, not ephemeral checklist rows.
- `completed` means the topic was reviewed/completed and remains historically accessible.
- `archived` means hidden from default active view, but still preserved and recoverable.
- Archive is non-destructive (`archive` ≠ `delete`).
- Archived-meeting soft delete is also non-destructive: `meetings.deleted_at` hides deleted archived meetings from dashboard lists while retaining rows for audit/recovery.
- Completion is non-destructive and distinct from archive (`completed` ≠ `archived`).
- Topic-attached Notes in `strategic_topic_notes` remain attached by `strategic_topic_item_id` across active/completed/archived states.
- Current runtime source remains meeting workspace/runtime storage shape unless/until `public.strategic_topics` is explicitly wired for active reads.

## Phase 3 Meeting Membership and Invite Model (PR 1A Schema Alignment)

Supabase migration `20260603090000_align_shared_access_schema.sql` prepared shared access storage, and migration `20260604090000_add_membership_rls_foundation.sql` adds membership-aware runtime RLS. Neither migration removes or rewrites `meetings.meeting_data`; `meetings.owner_id` remains the owner authority for compatibility and access management.

### Current foundation findings

- `meetings.owner_id` is the current owner authority and remains the compatibility path after PR 1B.
- `meeting_members` stores unique (`meeting_id`, `user_id`) membership edges with `owner`, `editor`, and `viewer` roles.
- Meeting-scoped RLS now uses membership-aware helpers for runtime access while keeping invite/member management owner-only. New meetings also receive an active `meeting_members` owner row through an insert trigger, and `owner_id` updates are blocked until an explicit transfer flow is designed.
- No dashboard sharing, member-management UI, invite UI, realtime behavior, Local Mode change, or structured autosave expansion is included in PR 1B.

### `meeting_members` after PR 1A

`meeting_members` now represents accepted identity-linked access preparation:

- `meeting_id`: the shared cloud meeting.
- `user_id`: accepted authenticated user identity.
- `role`: constrained to `owner`, `editor`, `viewer`.
- `created_at`: original membership creation timestamp.
- `updated_at`: maintained by the shared `set_entity_updated_at()` trigger.
- `invited_by`: optional inviter identity for future rollout metadata.
- `removed_at`: optional soft-removal marker for future access-management work.
- unique accepted membership per (`meeting_id`, `user_id`) remains in place.

Existing role values are migrated explicitly: `owner` remains `owner`, `admin` becomes `editor`, and `member` becomes `editor`. Every existing meeting owner is backfilled into `meeting_members` with role `owner`; if the owner already had a membership row with another role or a `removed_at` value, the row is restored to active owner membership.

For Team Beta, the UI and policies may expose only Owner and Editor behavior initially. Everyone with access can edit in that beta slice. Viewer remains a durable planned role so the schema direction does not need to be redesigned later.

### `meeting_invitations` pending-invite storage

PR 1A adds a dedicated meeting-scoped `meeting_invitations` table for pre-signup invite records instead of forcing a pending invite into `meeting_members.user_id`:

- `id uuid primary key default gen_random_uuid()`.
- `meeting_id uuid not null references public.meetings(id) on delete cascade`.
- `email text not null`; a trigger trims it before insert/update.
- `normalized_email text not null`; a trigger stores lowercase trimmed email and a check keeps it aligned with `email`.
- `role text not null default 'editor' check (role in ('editor','viewer'))`.
- `status text not null default 'pending' check (status in ('pending','accepted','revoked'))`.
- `invited_by uuid null references auth.users(id) on delete set null`.
- `accepted_by uuid null references auth.users(id) on delete set null`.
- `created_at timestamptz not null default now()`.
- `updated_at timestamptz not null default now()` maintained by `set_entity_updated_at()`.
- `accepted_at timestamptz null`.
- `revoked_at timestamptz null`.

Indexes cover `meeting_id`, `normalized_email`, and `status`. A partial unique index on (`meeting_id`, `normalized_email`) where `status = 'pending'` blocks duplicate active pending invitations for the same meeting/email while allowing later accepted/revoked history and re-invite flows.

Email text is suitable for pending invitation matching and onboarding, but it is not runtime authorization authority. Runtime authorization now resolves through authenticated user identity and an active `meeting_members` row, with `removed_at is null`.

### Ownership direction

- Keep `meetings.owner_id` as the active owner authority and access-management authority in PR 1B.
- Keep one active owner authority for the initial Team Beta.
- Add explicit ownership transfer later.
- Defer multiple owners and organization/admin ownership until a later scoped design.

### Membership-aware RLS boundaries after PR 1B

- Owners can access, edit, and manage meeting access.
- Active `owner` and `editor` members can access and edit meeting-scoped content, including the full-workspace `meetings.meeting_data` Manual Save path and the `meeting_settings` pilot.
- Active `viewer` members can read meeting-scoped rows where policies expose read access; Viewer UI/read-only enforcement remains deferred.
- Pending invitations and removed memberships do not grant runtime access.
- Access-management tables (`meeting_members`, `meeting_invitations`) remain owner-only.

### Concurrency and save boundaries

- Last Save Wins is acceptable for Team Beta.
- Realtime collaboration, presence, cursors, websockets, CRDTs, and custom conflict resolution are out of scope.
- Manual Save remains the full-workspace `meetings.meeting_data` cloud backup.
- Do not reintroduce full-workspace JSONB autosave. Continue structured autosave expansion surface-by-surface after shared access is stable.

## Supabase Admin Readability Views

- No existing public profile/user metadata table is present in the current migrations, so admin readability views use `auth.users.email` as display metadata where user lookup helps inspection.
- `meeting_members_with_meeting` exposes membership rows with `meeting_name`, `meeting_id`, `member_email`, `user_id`, `role`, removal state, and timestamps for easier access inspection; `user_id` remains the authorization authority.
- `meeting_invitations_with_meeting` exposes invitation rows with `meeting_name`, invite email fields, `invited_by_email`, `accepted_by_email`, role/status, and lifecycle timestamps.
- `meeting_settings_with_meeting`, `strategic_topics_with_meeting`, and `tactical_sessions_with_meeting` expose compact meeting-name context for high-value structured tables that administrators are likely to inspect.
- These are read-only inspection views over existing tables. They do not add columns, duplicate storage, runtime read/write paths, RLS policies, source-of-truth user metadata in `meeting_members`, or audit/change-event storage.
- Email display fields in these views are for Supabase inspection only and must not be used for access checks.

## Profiles

`profiles` stores durable display metadata for authenticated users:

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `first_name text null`
- `last_name text null`
- `display_name text null`
- `email text not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Rules:

- `user_id` is the durable identity key used by owner, member, invite, future audit, and future ownership-transfer references.
- `email` mirrors `auth.users.email`; users do not edit it in the app.
- `display_name` is derived from first/last name and remains null until at least one name exists, allowing callers to fall back to email and then generic role labels.
- `ensure_own_profile()` creates or refreshes the signed-in user's profile for legacy auth users.
- `get_accessible_meeting_owner_profiles()` returns only `meeting_id`, owner `user_id`, `display_name`, and email fallback for meetings visible to the caller.

## Phase 3 PR 3B Invite Lifecycle

`meeting_invitations` now has first user-facing lifecycle behavior:

- Owners create new pending invitations by email with `role = 'editor'`.
- Pending invitations are matched by lowercase trimmed `normalized_email` against the invitee's signed-in auth email.
- Owners can revoke pending invitations, moving `status` from `pending` to `revoked` and setting `revoked_at`.
- Invitees can accept matching pending invitations, moving `status` from `pending` to `accepted` and setting `accepted_by` plus `accepted_at`.
- Acceptance creates or reactivates the corresponding `meeting_members` row with `role = 'editor'` and `removed_at = null`.
- Accepted and revoked invitation rows are preserved for history. Re-inviting after accepted/revoked history creates a new pending row only when the email is not already an active member.
- Duplicate active pending invitations for the same meeting/email remain blocked by the partial unique index on pending invitations.

## Phase 3 PR 3C Member Management Data Model

- No new member table is introduced. Active membership remains `meeting_members` with `removed_at is null`.
- Visible access-panel rows are limited to the separately shown owner plus active editors and display only profile display name, profile email fallback, auth email fallback, and role label. The active editor list is labeled `Editors`; dashboard `Members: #` still means owner plus active editors.
- Member removal is a soft removal: `remove_meeting_editor(target_meeting_id, target_user_id)` sets `meeting_members.removed_at = now()` for an active editor and preserves the row for history/re-invite reconciliation.
- Re-invite uses the existing invitation path. A removed editor can regain access only when an owner creates a new pending invitation and the removed editor accepts it; acceptance may reactivate the existing membership row by clearing `removed_at`.
- Dashboard member count is calculated as one owner plus active editors for each accessible meeting. Pending invitations, removed members, and viewers are excluded.

## Phase 3 Shared Access Hardening Notes

- `meetings.owner_id` is the authoritative Phase 3 owner field.
- `meeting_members.role = 'owner'` rows are supporting rows for listing/future expansion and must not be treated as a replacement for `meetings.owner_id` until a future ownership-transfer/multiple-owner design explicitly changes that model.
- Active editor access is represented by `meeting_members` rows with `role = 'editor'` and `removed_at is null`.
- Viewer remains a durable schema role value, but Viewer UX/read-only behavior is deferred.
- `meeting_invitations` preserves pending, accepted, and revoked history; pending rows do not grant access.
- Member removal is soft removal through `meeting_members.removed_at`, preserving membership and invite history.
- Dashboard member counts mean owner plus active editors; pending invites, removed members, and viewers are excluded for Phase 3.

## Phase 3 PR 3D Meeting Lifecycle/Content Boundary

- `meetings.meeting_data` remains the full-workspace Manual Save payload. Owners and active editors may update this field so shared meetings stay usable while structured autosave is incomplete.
- `meetings.name`, `meetings.owner_id`, `meetings.metadata_json`, `meetings.archived_at`, and `meetings.deleted_at` are meeting container/lifecycle fields, not editor content fields.
- Dashboard lifecycle state is owner-controlled: archive sets `archived_at`, restore clears `archived_at`, and archived soft-delete sets `deleted_at`. These mutations are performed through owner-only RPCs rather than editor-capable table updates.
- `owner_id` remains immutable because ownership transfer is not implemented. Owner membership rows remain supportive access rows and do not replace `meetings.owner_id` as the owner authority.

## Phase 4 PR 4A Autosave Data Model Clarification

`meetings.meeting_data` stores the full workspace backup object used by Manual Save and Local Workspace migration:

- `app`
- `backupVersion`
- `exportedAt`
- `localStorage`, containing validated `leadership-*` workspace keys

Structured autosave currently has two active cloud payloads. `meeting_settings` stores:

- `dashboard_title`
- `organization_info`
- `meeting_section_order`
- `setup_completed`

PR 4B also uses `strategic_topics` and `strategic_topic_notes` for live Strategic Topic list/lifecycle/order and Topic Notes autosave. Other structured tables (`objectives`, `tasks`, `standard_operating_objectives`, `tactical_sessions`, `tactical_items`, `strategic_sessions`, and `strategic_session_notes`) remain future persistence slices for live objectives, tasks, SOOs, meeting notes, agenda, decisions, cascading communications, or active meeting selection.


## Phase 4 Strategic Topics Autosave Data Model Recommendation

- Current runtime Strategic Topics are `MeetingItem[]` records keyed by numeric client IDs and stored under `leadership-strategic-topic-items`; Manual Save includes this array in `meetings.meeting_data`.
- `public.strategic_topics` should become the active structured autosave table for Strategic Topic rows, using `title`, `status`, `archived_at`, `completed_at`, `sort_order`, and `metadata_json` for current captured-date/meeting context and legacy client-ID compatibility.
- Current Topic Notes are rich text records loaded/saved separately through app calls to `strategic_topic_notes` by `meeting_id` plus numeric `strategic_topic_item_id`; they are not included in Manual Save/export backup.
- PR 4B formalizes `strategic_topic_notes`; `strategic_session_notes` is session-scoped and is not reused for persistent topic-attached notes.


## Strategic Topics Structured Autosave Shape

- `public.strategic_topics` is reused rather than duplicating topic storage. PR 4B adds `client_item_id` for the existing numeric client item identity plus captured/completed/removed context columns and persists list order in `sort_order`.
- `public.strategic_topic_notes` is the durable Topic Notes table. It is meeting-scoped, has a nullable UUID relationship to `strategic_topics`, retains the legacy numeric topic item key, and stores rich text JSON with a plain-text companion for readability/search-oriented future work.
- Existing `strategic_topics.notes` is not the rich Topic Notes source; it remains a legacy/plain text field and the editor reads/writes `strategic_topic_notes`.
- `meetings.meeting_data` continues to include `leadership-strategic-topic-items` when Manual Save/export is used, preserving backup and import compatibility.


## Strategic Topic Notes Backup Shape

- Workspace backups include `leadership-strategic-topic-notes` as an object keyed by numeric Strategic Topic item ID. Each value stores `strategic_topic_item_id`, `content_json`, `content_text`, and optional `updated_at`.
- The backup intentionally uses the numeric client item ID rather than `strategic_topics.id` so notes remain attached when a backup is imported into a different cloud meeting and new structured topic UUIDs are generated.
- On cloud import, restored notes are upserted into `strategic_topic_notes` with the restored item ID; later topic-note opens can also link the note to the new `strategic_topics.id`.

## Phase 4 PR 4C Meeting Notes / Cascading Communications Data Model Recommendation

- Current Meeting Notes are `MeetingRecord[]` records in `leadership-meetings`; the active record is selected by `leadership-active-meeting-id`.
- Each `MeetingRecord` uses a numeric client `id`, `date`, optional `isTestMeeting`, and item arrays for `agendaItems`, `topicItems`, `decisionItems`, and `cascadeItems`.
- Current Cascading Communications are `MeetingItem[]` records in `activeMeeting.cascadeItems`, not a separate localStorage key except for legacy fallback import from `leadership-cascade-items`.
- Manual Save/export remains backup-compatible because it stores `leadership-meetings` and `leadership-active-meeting-id` inside `meetings.meeting_data`.
- Meeting Notes and Cascading Communications are not currently structured persisted.
- `tactical_sessions` stores ended-meeting snapshots and is archival. `tactical_items` is session-linked and should not be used for mutable active notes.
- `strategic_sessions` and `strategic_session_notes` are strategic-session scoped and should not be used for tactical Meeting Notes or Cascading Communications.
- Recommended active table: `meeting_notes`, unique by `(meeting_id, client_meeting_id)`, indexed by `(meeting_id, meeting_date)`, and storing `meeting_date`, `is_test_meeting`, `cascade_items`, and compatibility/pass-through JSON for existing agenda/decision arrays if needed.
- Meeting Notes and Cascading Communications should share the active `meeting_notes` table because the runtime and backup format store them on the same dated meeting-note record.
- Agenda Items and Decisions/Actions should not be treated as first-class PR 4C autosave surfaces; any `agenda_items` or `decision_items` columns should be compatibility/pass-through only until the redesign is decided.
- Import/restore should preserve numeric client meeting IDs where possible and upsert structured rows by `(meeting_id, client_meeting_id)` when authenticated in a valid Cloud Meeting route.

## Phase 4 PR 4C Meeting Notes Structured Autosave Shape

`public.meeting_notes` is the active structured autosave table for dated Meeting Notes and Cascading Communications:

- `id uuid primary key default gen_random_uuid()`
- `meeting_id uuid not null references public.meetings(id) on delete cascade`
- `client_meeting_id bigint not null`
- `meeting_date text not null`
- `is_test_meeting boolean not null default false`
- `notes_json jsonb` for compatibility/pass-through Meeting Notes arrays that are not first-class PR 4C surfaces
- `cascade_items jsonb not null default '[]'::jsonb`
- `created_at` / `updated_at`
- unique constraint on `(meeting_id, client_meeting_id)`

The runtime `MeetingRecord.id` is preserved as `client_meeting_id` so backup/import and localStorage identity remain stable across cloud upserts. `cascadeItems` are stored in `cascade_items` as part of the first-class PR 4C autosave scope. `agendaItems`, `topicItems`, and `decisionItems` are preserved in `notes_json` only to maintain existing `MeetingRecord` compatibility; this pass-through does not make Agenda Items or Decisions/Actions first-class structured autosave surfaces. Agenda/Decision structured schema and workflow redesign remain deferred until their product design is decided.

`meetings.meeting_data` continues to store the full backup object for Manual Save/export/import. Existing Cloud Meetings without `meeting_notes` rows fall back to `meeting_data` during load.

## Phase 4 PR 4D Objectives / Tasks / SOOs Autosave Data Model Review

This review is documentation-only and does not add migrations.

### Current runtime and backup keys

- Defining Objectives use `leadership-objectives` and are stored as an `Objective[]`.
- Tasks are embedded under each Defining Objective as `Objective.tasks` and are therefore backed up inside `leadership-objectives`.
- Standard Operating Objectives use `leadership-standard-operating-objectives` and are stored as a separate `StandardOperatingObjective[]`.
- Manual Save/export/import must continue to preserve both keys while structured autosave expands.

### Current shapes

`Objective` currently contains numeric `id`, `title`, rich `description`, `status`, `priority`, `dueDate`, `color`, and embedded `tasks`.

`Task` currently contains numeric `id`, `title`, rich `description`, `dueDate`, `assignedTo`, `status`, `subtasks`, `comments`, and `activityHistory`. Task completion is represented by `status === 'completed'`; task order is array order under the parent objective.

`StandardOperatingObjective` currently contains numeric `id`, `title`, rich `description`, and optional `color`. SOO order is array order, and there is no active runtime SOO status or separate notes field.

### Existing table findings

- `public.objectives` exists but is not active runtime storage for Defining Objectives.
- `public.tasks` exists but is not active runtime storage for Tasks.
- `public.standard_operating_objectives` exists but is not active runtime storage for SOOs.
- These tables are covered by membership-aware RLS policies, but runtime client methods and hydration/autosave paths are not wired.
- The foundation tables need schema reconciliation before implementation because current app identity is numeric client IDs and current descriptions are rich-text compatible values.

### Recommended schema direction

- Use `public.objectives` for Defining Objectives and add/confirm client identity with `client_objective_id` plus a unique meeting/client key.
- Use `public.tasks` for Tasks instead of embedding all tasks in an objective JSONB column. Keep a UUID objective relationship and client-ID compatibility for import/hydration.
- Use `public.standard_operating_objectives` for SOOs instead of sharing the Defining Objectives table.
- Preserve order through `sort_order` on objectives, tasks, and SOOs.
- Preserve color/status fields as explicit columns where the current UI depends on them, or document any metadata fallback before implementation.
- Preserve rich descriptions with explicit JSON/text columns or a clearly documented `metadata_json` shape.
- Keep nested task subtasks, comments, and activity history as JSONB for the first implementation unless a later product decision requires first-class nested tables.

### Import and fallback direction

Future cloud import should restore backup-compatible local state and then upsert/replace structured DO/task/SOO rows from the restored backup for authenticated valid Cloud Meeting routes. Existing Cloud Meetings should fall back to `meetings.meeting_data.localStorage` and scoped localStorage when structured rows are absent.

## UX-3A Agenda / Decision Future Data Model Recommendation

UX-3A is a planning-only recommendation and does not add tables or migrations.

Current Agenda Items and Decisions/Actions remain runtime `MeetingItem[]` arrays inside `leadership-meetings`, are included in Manual Save/export/import through the workspace backup shape, and are carried through `meeting_notes.notes_json` for compatibility. Cascading Communications is still present in `leadership-meetings`, but also has first-class cloud storage through `meeting_notes.cascade_items`.

Recommended future structured model:

- Add `agenda_items` as the first before-main structured source of truth for Agenda Items and one primary agenda outcome.
- Preserve numeric client IDs with `client_agenda_item_id` mapped from current `MeetingItem.id` and `client_meeting_id` mapped from current `MeetingRecord.id`.
- Store ordering with `sort_order` scoped to the meeting and dated meeting record.
- Store agenda discussion notes either directly on `agenda_items` as rich-text JSON/text fields or, if implementation requires independent note lifecycle, in a one-to-one `agenda_item_notes` table.
- Store one before-main outcome on the Agenda Item with `outcome_type`, `outcome_text`, `is_covered`, and `cascade_needed` fields.
- Defer `agenda_item_outcomes` until user testing proves multiple outcomes per Agenda Item are needed.
- Keep `meeting_notes.notes_json`, `leadership-meetings`, and `meetings.meeting_data` as compatibility/backup paths during migration; do not make `notes_json` the long-term Agenda source of truth.

## UX-3B Agenda Items

`public.agenda_items` is the structured cloud source of truth for Agenda Items. Each row is scoped to a Cloud Meeting (`meeting_id`) and the dated meeting-note record (`client_meeting_id`) while preserving the browser/client item identity in `client_agenda_item_id` for localStorage, Manual Save, export, and import compatibility.

Fields added by UX-3B:

- Identity/order: `id`, `meeting_id`, `client_agenda_item_id`, `client_meeting_id`, `sort_order`.
- Discussion: `title`, `discussion_notes_json`, `discussion_notes_text`.
- Independent outcomes: `has_decision`, `decision_text`, `has_action`, `action_text`. Decision and Action are intentionally not mutually exclusive.
- Workflow: `is_covered`, `cascade_needed`.
- Promotion linkage: `promoted_strategic_topic_id` references `strategic_topics.id` when a saved UUID is available.
- Timestamps: `created_at`, `updated_at`.

Legacy `decisionItems` remain readable in `leadership-meetings` and `meeting_notes.notes_json` during the transition, but new Agenda Item outcomes should be edited on Agenda Items and displayed through the read-only Decisions/Actions rollup.
