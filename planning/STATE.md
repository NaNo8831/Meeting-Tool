# Project State

## Current Snapshot

- Product: Meeting Tool by LyArk in the `Meeting-Tool` repo.
- Status: live/deployed operational beta.
- Deployment: Vercel.
- Persistence: Local Workspace uses browser `localStorage`; selected Cloud Meetings can save/load full workspace backup JSON in Supabase, and optionally receive explicit Local Workspace migration.
- Backup: JSON export/import workspace backup.
- Current focus: Structured Persistence Phase A/B schema foundation on `phase-2-cloud` direction, introducing non-breaking structured tables while preserving current manual save/load and backup behavior, plus dashboard create/duplicate/archive/restore meeting management and lightweight dashboard/menu UX cleanup.
- Current branch note: Strategic Topic History Modal UX is based from the available `phase-2-cloud` branch context in this workspace.

## Production State

- The app supports lightweight leadership meeting operations around first-time setup, Edit Playbook, Top Priority, Defining Objectives, tasks, Standard Operating Objectives, Strategic Topics, meeting sections, and Cascading Communication.
- Tasks follow the workflow `Planning → In Progress → Completed` and include details, descriptions, comments, activity history, and subtasks.
- RichTextEditor provides lightweight formatting for applicable descriptions/content.

## Active Work

- Keep the planning source of truth current, including the new deferred-scope registry in `planning/FUTURE_PHASES.md`.
- Keep `main` stable for production and UX stabilization.
- Treat the Meeting Setup flow as part of the current production baseline on `main` after PR #23.
- First-Time Setup cleanup is stable on the `phase-2-cloud` flow: use cloud meeting row title as setup title fallback, remove setup filler defaults/placeholders, and keep manual save behavior unchanged.
- Keep structured persistence schema foundation aligned with owner-only RLS and no runtime read/write switch yet.
- Document and sequence next migration slices without breaking current owner-only cloud save/load behavior.
- Keep membership architecture, role direction (`owner`/`editor`/`viewer`), and ownership-handling rules documented as the permission foundation for future sharing work.

## Sprint Status

- Completed sprint: Dashboard / Meeting Selector (authenticated dashboard cards, user-scoped meeting list, open-route entry, and local fallback completed on `phase-2-cloud`).
- Current architecture status: App route separation is active with ` / ` landing/auth entry, `/dashboard` authenticated meeting selector cards and create/duplicate/archive controls, and `/meeting/[id]` route-driven cloud meeting load with manual cloud save preserved; autosave repair is deferred.
- Archived Meeting soft-delete is now active on the dashboard for cloud meetings: archived cards can be restored by clearing `archived_at` or soft-deleted via confirmation, `meetings.deleted_at` is populated only for archived delete, and dashboard list queries exclude soft-deleted rows by default.
- Tactical history foundation added on cloud meetings: **End Meeting** now writes archival tactical session snapshots to `tactical_sessions` (with `snapshot_json`) and a lightweight Tactical History viewer is available in the meeting workspace; operational runtime state still remains on `meetings.meeting_data`.
- Strategic Topic notes/history foundation added for cloud meetings: each Strategic Topic can open a lightweight **History / Notes** modal and manually save/load topic-scoped notes via `strategic_topic_notes` keyed by (`meeting_id`, `strategic_topic_item_id`).
- Strategic Topic lifecycle behavior is now active in the runtime UI with non-destructive states (`active`, `completed`, `archived`); completed and archived topics move out of the active list into a lightweight History modal while preserving topic-attached Notes.
- Next recommended sprint: First structured write pilot on a narrow surface (likely `meeting_settings` or `strategic_topics`) after validating the schema foundation.
- Blockers: Full-workspace autosave approach was abandoned (PR #41); structured section/item persistence design and sequencing is now required before new cloud persistence implementation.

## Parked / Deferred Work
- Full collaboration-grade Phase 2 remains deferred. Basic Cloud Meeting persistence stores the full backup JSON in `meetings.meeting_data`, but realtime collaboration, team sharing, editor/viewer roles, and forced migration remain out of scope.
- Deferred ideas are now tracked in `planning/FUTURE_PHASES.md` to prevent scope creep in active delivery work.

## Next Actions

- Use the planning files as the source of truth before future changes.
- Continue Phase 1 operational usability and stability improvements.
- Validate Cloud Meeting Persistence on a Supabase-configured preview, including signed-out local mode, signed-in create/select/switch behavior, no auto-load or auto-migration on dropdown selection, explicit save/load, optional Local Workspace migration into empty and populated cloud meetings, migration cancel behavior, duplicate-prompt suppression, import while Cloud Meeting is selected, overwrite confirmation, user-scoped workspace selection, owner-only RLS, existing localStorage data, export/import, and Feedback Widget behavior.
- Plan any future normalization, migration, sharing, roles, and realtime collaboration separately before expanding beyond basic owner-only JSONB persistence.
