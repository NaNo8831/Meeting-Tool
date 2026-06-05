# Data Model

## Current Stable State (Phase 2 Cloud Baseline)

- `/dashboard` works for authenticated meeting selection.
- `/meeting/[id]` loads the selected cloud meeting when explicitly requested.
- Manual **Save to Cloud** works and remains the full-workspace backup safety net.
- `meeting_settings` is the only structured persistence pilot: valid loaded `/meeting/[id]` cloud routes hydrate its dashboard/playbook-level fields after the full-workspace backup loads, then debounce changed settings and upsert the one row for that meeting. Local mode never sends this read or write.
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
