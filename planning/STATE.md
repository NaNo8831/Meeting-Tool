# Project State

## Current Snapshot

- Product: Meeting Tool by LyArk in the `Meeting-Tool` repo.
- Status: live/deployed operational beta.
- Deployment: Vercel.
- Persistence: Local Workspace uses browser `localStorage`; selected Cloud Meetings can save/load full workspace backup JSON in Supabase, and optionally receive explicit Local Workspace migration.
- Backup: JSON export/import workspace backup.
- Current focus: Cloud Autosave Repair / Persistence Hardening (`/meeting/[id]` cloud route autosave reliability, shared save helper behavior, and refresh persistence hardening) while preserving backup/import/export safety.
- Current branch note: Routing Foundation work is based from the updated `phase-2-cloud` branch context.

## Production State

- The app supports lightweight leadership meeting operations around Meeting Setup, Playbook Definitions, Top Priority, Defining Objectives, tasks, Standard Operating Objectives, Strategic Topics, meeting sections, and Cascading Communication.
- Tasks follow the workflow `Planning → In Progress → Completed` and include details, descriptions, comments, activity history, and subtasks.
- RichTextEditor provides lightweight formatting for applicable descriptions/content.

## Active Work

- Keep the planning source of truth current, including the new deferred-scope registry in `planning/FUTURE_PHASES.md`.
- Keep `main` stable for production and UX stabilization.
- Treat the Meeting Setup flow as part of the current production baseline on `main` after PR #23.
- Validate the existing Cloud Meeting Persistence behavior in preview environments without broadening into collaboration or role expansion.

## Sprint Status

- Completed sprint: Dashboard / Meeting Selector (authenticated dashboard cards, user-scoped meeting list, open-route entry, and local fallback completed on `phase-2-cloud`).
- Completed sprint: Cloud Autosave Repair / Persistence Hardening (route-driven cloud meeting autosave restored with debounce + load guards, shared cloud save helper retained for manual save backup, and refresh persistence reliability improved).
- Current architecture status: App route separation remains active with ` / ` landing/auth entry, `/dashboard` authenticated meeting selector cards, and `/meeting/[id]` route-driven cloud meeting load with manual save + guarded autosave for cloud routes.
- Next recommended sprint: Cloud persistence regression QA and UX polish across autosave status messaging, feedback/export/import, and owner-scoped route/load/save behavior.
- Blockers: Structured persistence normalization and realtime collaboration remain intentionally deferred beyond this sprint.

## Parked / Deferred Work
- Full collaboration-grade Phase 2 remains deferred. Basic Cloud Meeting persistence stores the full backup JSON in `meetings.meeting_data`; structured persistence normalization, realtime collaboration, team sharing, editor/viewer roles, and forced migration remain out of scope.
- Deferred ideas are now tracked in `planning/FUTURE_PHASES.md` to prevent scope creep in active delivery work.

## Next Actions

- Use the planning files as the source of truth before future changes.
- Continue Phase 1 operational usability and stability improvements.
- Validate Cloud Meeting Persistence on a Supabase-configured preview, including signed-out local mode, signed-in create/select/switch behavior, no auto-load or auto-migration on dropdown selection, explicit save/load, optional Local Workspace migration into empty and populated cloud meetings, migration cancel behavior, duplicate-prompt suppression, import while Cloud Meeting is selected, overwrite confirmation, user-scoped workspace selection, owner-only RLS, existing localStorage data, export/import, and Feedback Widget behavior.
- Plan any future normalization, migration, sharing, roles, and realtime collaboration separately before expanding beyond basic owner-only JSONB persistence.
