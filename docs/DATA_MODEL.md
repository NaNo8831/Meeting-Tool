# Data Model

## Current Stable State (Phase 2 Cloud Baseline)
- `/dashboard` works for authenticated meeting selection.
- `/meeting/[id]` loads the selected cloud meeting when explicitly requested.
- Manual **Save to Cloud** works and remains the full-workspace backup safety net.
- `meeting_settings` is the only structured autosave pilot: valid loaded `/meeting/[id]` cloud routes debounce changed dashboard/playbook-level settings and upsert the one row for that meeting. Local mode never sends this write.
- Refresh reloads the last manual cloud save.
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

## Current Persistence Shape (Keep During Migration)
`meetings.meeting_data` remains in place as:
- backup/safety net,
- export/import-compatible format,
- manual save/load payload.

Do **not** remove `meeting_data` in this migration planning stage.

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
- **Phase E:** Add members/realtime features on top of structured tables.

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
- Runtime app reads are **not** switched to `meeting_settings` yet; refresh still hydrates from the existing workspace backup path.
- `meetings.meeting_data` remains the active backup/export/import shape and Manual Save/Load safety net.
- Full-workspace JSONB autosave remains explicitly out of scope.

Why this pilot is intentionally narrow:
- A one-row settings upsert proves the structured write boundary without mixing objectives, tasks, agenda items, Strategic Topics, or notes into the same rollout.
- The client writes by `meeting_id` and relies on RLS rather than hardcoding owner-only behavior, preparing for later `meeting_members` owner/editor/viewer policy expansion without implementing shared access in this slice.

## Explicit Out of Scope (This Plan)
- Realtime behavior.
- Invitations.
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
