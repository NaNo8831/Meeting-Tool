# Project State

## Current Snapshot

- Product: Meeting Tool by LyArk in the `Meeting-Tool` repo.
- Status: live/deployed operational beta.
- Deployment: Vercel.
- Persistence: Local Workspace uses browser `localStorage`; selected Cloud Meetings can save/load full workspace backup JSON in Supabase, and optionally receive explicit Local Workspace migration.
- Backup: JSON export/import workspace backup.
- Current focus: Cloud Persistence Architecture Plan (docs-only) to move from full-workspace JSONB autosave attempts toward structured section/item persistence while preserving manual save/load and backup safety.
- Current branch note: Routing Foundation work is based from the updated `phase-2-cloud` branch context.

## Production State

- The app supports lightweight leadership meeting operations around Meeting Setup, Playbook Definitions, Top Priority, Defining Objectives, tasks, Standard Operating Objectives, Strategic Topics, meeting sections, and Cascading Communication.
- Tasks follow the workflow `Planning → In Progress → Completed` and include details, descriptions, comments, activity history, and subtasks.
- RichTextEditor provides lightweight formatting for applicable descriptions/content.

## Active Work

- Keep the planning source of truth current, including the new deferred-scope registry in `planning/FUTURE_PHASES.md`.
- Keep `main` stable for production and UX stabilization.
- Treat the Meeting Setup flow as part of the current production baseline on `main` after PR #23.
- Document and sequence structured persistence migration planning without changing runtime behavior or breaking current owner-only cloud save/load.

## Sprint Status

- Completed sprint: Dashboard / Meeting Selector (authenticated dashboard cards, user-scoped meeting list, open-route entry, and local fallback completed on `phase-2-cloud`).
- Current architecture status: App route separation is active with ` / ` landing/auth entry, `/dashboard` authenticated meeting selector cards, and `/meeting/[id]` route-driven cloud meeting load with manual cloud save preserved; autosave repair is deferred.
- Next recommended sprint: Structured Persistence Phase A/B planning and non-breaking schema introduction sequence (docs + migration design only, no runtime switch).
- Blockers: Full-workspace autosave approach was abandoned (PR #41); structured section/item persistence design and sequencing is now required before new cloud persistence implementation.

## Parked / Deferred Work
- Full collaboration-grade Phase 2 remains deferred. Basic Cloud Meeting persistence stores the full backup JSON in `meetings.meeting_data`, but realtime collaboration, team sharing, editor/viewer roles, and forced migration remain out of scope.
- Deferred ideas are now tracked in `planning/FUTURE_PHASES.md` to prevent scope creep in active delivery work.

## Next Actions

- Use the planning files as the source of truth before future changes.
- Continue Phase 1 operational usability and stability improvements.
- Validate Cloud Meeting Persistence on a Supabase-configured preview, including signed-out local mode, signed-in create/select/switch behavior, no auto-load or auto-migration on dropdown selection, explicit save/load, optional Local Workspace migration into empty and populated cloud meetings, migration cancel behavior, duplicate-prompt suppression, import while Cloud Meeting is selected, overwrite confirmation, user-scoped workspace selection, owner-only RLS, existing localStorage data, export/import, and Feedback Widget behavior.
- Plan any future normalization, migration, sharing, roles, and realtime collaboration separately before expanding beyond basic owner-only JSONB persistence.
