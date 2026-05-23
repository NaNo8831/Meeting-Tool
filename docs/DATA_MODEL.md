# Data Model

## Current Stable State (Phase 2 Cloud Baseline)
- `/dashboard` works for authenticated meeting selection.
- `/meeting/[id]` loads the selected cloud meeting when explicitly requested.
- Manual **Save to Cloud** works.
- Refresh reloads the last manual cloud save.
- JSON export/import works.
- Feedback submission works.
- Sign out routes users to `/`.
- `meetings.meeting_data` JSONB remains the backup/export/import shape and safety fallback.
- `meetings.archived_at` (nullable timestamptz) marks archived meetings without deleting rows.

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

## Current Persistence Shape (Keep During Migration)
`meetings.meeting_data` remains in place as:
- backup/safety net,
- export/import-compatible format,
- manual save/load payload.

Do **not** remove `meeting_data` in this migration planning stage.

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
- `strategic_sessions`
- `strategic_session_notes` (or a rich-text records table)

### Relationship direction (high level)
- `meetings` is the parent container.
- `meeting_members` links users to meetings for access.
- Section/item tables reference `meeting_id`.
- Session-specific records reference both `meeting_id` and their parent session row.
- Rich text is stored with explicit ownership (topic/session/item) rather than inside one monolithic JSON blob.

## Save Behavior Target (Structured)
Planned save flow:
1. User edits one item/section.
2. App saves only that item/section row(s).
3. App updates local save status for that section/item.
4. Manual full backup/export remains available as a safety net throughout migration.

## Migration Strategy (No Runtime Changes in This PR)
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

This is schema-only groundwork:
- Runtime app reads/writes are **not** switched to these tables yet.
- `meetings.meeting_data` remains the active source of truth for current app behavior.
- Manual Save/Load and JSON export/import remain unchanged.

Recommended next step after this PR:
- Validate one small structured write surface first (likely `meeting_settings` or `strategic_topics`) before any broader runtime migration.

## Explicit Out of Scope (This Plan)
- Realtime behavior.
- Invitations.
- Full org/team hierarchy.
- Slug URLs.
- Multiple local workspaces.
- Immediate deletion of `meeting_data`.
