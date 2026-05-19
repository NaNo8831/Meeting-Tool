# Project State

## Current Snapshot

- Product: Meeting Tool by LyArk in the `Meeting-Tool` repo.
- Status: live/deployed operational beta.
- Deployment: Vercel.
- Persistence: Local Workspace uses browser `localStorage`; selected Cloud Workspaces can save/load full workspace backup JSON in Supabase and optionally receive explicit Local Workspace migration.
- Backup: JSON export/import workspace backup.
- Current focus: production UX stabilization, Meeting Setup follow-through, and basic Phase 2 cloud persistence validation.
- Current branch note: Cloud Workspace Foundation is based from the updated `phase-2-cloud` branch context.

## Production State

- The app supports lightweight leadership meeting operations around Meeting Setup, Playbook Definitions, Top Priority, Defining Objectives, tasks, Standard Operating Objectives, Strategic Topics, meeting sections, and Cascading Communication.
- Tasks follow the workflow `Planning → In Progress → Completed` and include details, descriptions, comments, activity history, and subtasks.
- RichTextEditor provides lightweight formatting for applicable descriptions/content.

## Active Work

- Cloud Workspace Persistence adds owner-only Supabase save/load plus an intentional Local Workspace migration prompt for selected Cloud Workspaces while preserving Local Workspace `localStorage`, per-user cloud selection, explicit load/save actions, overwrite confirmation, duplicate-prompt suppression, and JSON export/import backup.
- Keep the 120x operating structure accurate through lightweight planning and documentation maintenance.
- Keep `main` stable for production and UX stabilization.
- Treat the Meeting Setup flow as part of the current production baseline on `main` after PR #23.

## Parked / Deferred Work
- Full collaboration-grade Phase 2 remains deferred. Basic Cloud Workspace persistence stores the full backup JSON in `workspaces.workspace_data`, but realtime collaboration, team sharing, editor/viewer roles, and forced migration remain out of scope.

## Next Actions

- Use the planning files as the source of truth before future changes.
- Continue Phase 1 operational usability and stability improvements.
- Validate Cloud Workspace Persistence on a Supabase-configured preview, including signed-out local mode, signed-in create/select/switch behavior, no auto-load or auto-migration on dropdown selection, explicit save/load, optional Local Workspace migration into empty and populated cloud workspaces, migration cancel behavior, duplicate-prompt suppression, import while Cloud Workspace is selected, overwrite confirmation, user-scoped workspace selection, owner-only RLS, existing localStorage data, export/import, and Feedback Widget behavior.
- Plan any future normalization, migration, sharing, roles, and realtime collaboration separately before expanding beyond basic owner-only JSONB persistence.
