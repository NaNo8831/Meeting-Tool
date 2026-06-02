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
- `meeting_settings` autosave persists playbook/settings-level data only: `dashboard_title`, `organization_info`, `meeting_section_order`, and `setup_completed`.
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

## Phase 3 Meeting Membership and Invite Model (Planned, Not Implemented)
Phase 3 introduces shared meeting access as a layered extension of the Phase 2 meeting container. No schema change is included in this planning PR.

### Existing foundation findings
- `meetings.owner_id` is the current owner authority and remains the compatibility path for the first migrations.
- `meeting_members` already exists with unique (`meeting_id`, `user_id`) membership edges.
- The current `meeting_members.role` constraint is `owner`, `admin`, `member`. This does **not** match the planned long-term model of `owner`, `editor`, `viewer`.
- Current structured-table RLS uses `user_owns_meeting(meeting_id)` and does not grant access through `meeting_members`.
- No meeting invitation table exists yet.

### Intended membership model
`meeting_members` should represent accepted identity-linked access:
- `meeting_id`: the shared cloud meeting.
- `user_id`: accepted authenticated user identity.
- `role`: planned long-term values `owner`, `editor`, `viewer`.
- lifecycle timestamps/status metadata only where needed for safe rollout and auditability.
- unique accepted membership per (`meeting_id`, `user_id`).

For Team Beta, the UI and policies may expose only Owner and Editor behavior initially. Everyone with access can edit in that beta slice. Viewer remains a durable planned role so the schema direction does not need to be redesigned later.

### Intended pending-invite model
Add a dedicated meeting-scoped invitation record in PR 1A rather than forcing a pre-signup invite into `meeting_members.user_id`:
- meeting reference,
- normalized invited email,
- intended role (Team Beta can default to `editor`),
- invitation lifecycle such as pending, accepted, and revoked,
- inviter identity and timestamps,
- acceptance linkage or audit metadata needed to connect the invite to an authenticated user safely.

Exact table name, token strategy, expiration behavior, and acceptance flow remain implementation-design questions for PR 1A. Email text is suitable for pending invitation matching but must not become the long-term authorization authority after acceptance.

### Ownership direction
- Keep one active owner authority for the initial Team Beta.
- Add explicit ownership transfer later.
- Defer multiple owners and organization/admin ownership until a later scoped design.

### Concurrency and save boundaries
- Last Save Wins is acceptable for Team Beta.
- Realtime collaboration, presence, cursors, websockets, CRDTs, and custom conflict resolution are out of scope.
- Manual Save remains the full-workspace `meetings.meeting_data` cloud backup.
- Do not reintroduce full-workspace JSONB autosave. Continue structured autosave expansion surface-by-surface after shared access is stable.
