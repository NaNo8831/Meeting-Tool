# Project State

## Current Snapshot

- Product: Meeting Tool by LyArk in the `Meeting-Tool` repo.
- Status: live/deployed operational beta.
- Deployment: Vercel.
- Persistence: Local Workspace uses browser `localStorage`; selected Cloud Meetings can manually save/load full workspace backup JSON in Supabase, optionally receive explicit Local Workspace migration, and now hydrate plus autosave only the narrow `meeting_settings` structured pilot after route bootstrap.
- Backup: JSON export/import workspace backup.
- Current focus: stabilize cloud save feedback and validate one intentionally narrow Phase B structured-write pilot: debounced `meeting_settings` autosave on valid cloud meeting routes while preserving current manual full-workspace save/load and backup behavior.
- Current branch note: Cloud Save Status Hardening + Structured Autosave Pilot is based from the available Phase 2 cloud branch context in this workspace; this container has no configured git remote, so latest remote refresh could not be performed locally.
- Workspace modal/menu polish now locks background page scroll while overlays or popups are open, keeps signed-in user details and sign out inside the Meeting Menu, and uses an icon-only Meeting Menu trigger.

## Production State

- The app supports lightweight leadership meeting operations around first-time setup, Edit Playbook, Top Priority, Defining Objectives, tasks, Standard Operating Objectives, Strategic Topics, meeting sections, and Cascading Communication.
- Tasks follow the workflow `Planning → In Progress → Completed` and include details, descriptions, comments, activity history, and subtasks.
- RichTextEditor provides lightweight formatting for applicable descriptions/content.

## Active Work

- Keep the planning source of truth current, including the new deferred-scope registry in `planning/FUTURE_PHASES.md`.
- Keep `main` stable for production and UX stabilization.
- Treat the Meeting Setup flow as part of the current production baseline on `main` after PR #23.
- First-Time Setup cleanup is stable on the `phase-2-cloud` flow: use cloud meeting row title as setup title fallback, remove setup filler defaults/placeholders, and keep manual save behavior unchanged.
- Keep the `meeting_settings` structured persistence pilot intentionally narrow: dashboard/playbook-level settings hydrate after the manual backup loads and autosave after cloud-route bootstrap, unchanged payloads are skipped, and every non-pilot runtime read remains on the existing browser/workspace backup path.
- Keep full-workspace JSONB autosave out of scope. Manual Save to `meetings.meeting_data` remains the backup safety net while structured surfaces are validated one at a time.
- Document and sequence later migration slices without breaking current cloud save/load behavior or hardcoding owner-only client assumptions that would fight Phase 3 member roles.
- Keep membership architecture, role direction (`owner`/`editor`/`viewer`), and ownership-handling rules documented as the permission foundation for future sharing work.

## Sprint Status

- Completed sprint: Dashboard / Meeting Selector (authenticated dashboard cards, user-scoped meeting list, open-route entry, and local fallback completed on `phase-2-cloud`).
- Current architecture status: App route separation is active with ` / ` landing/auth entry, `/dashboard` authenticated cloud meeting cards and create/duplicate/archive controls, `/meeting/local` browser-only local mode, and `/meeting/[id]` route-driven cloud meeting load with manual cloud save preserved. Cloud UI now separates the narrow settings-autosave state from the Manual Save full-workspace backup state, and only the `meeting_settings` structured pilot hydrates from structured storage and autosaves after cloud bootstrap with a debounce.
- Archived Meeting soft-delete is now active on the dashboard for cloud meetings: archived cards can be restored by clearing `archived_at` or soft-deleted via confirmation, `meetings.deleted_at` is populated only for archived delete, and dashboard plus Cloud Meeting load/save queries exclude soft-deleted rows by default.
- Tactical history foundation added on cloud meetings: **End Meeting** writes archival tactical session snapshots to `tactical_sessions` (with `snapshot_json`) and leaves the active workspace visible with a calm success message; Tactical History opens intentionally from Meeting History in the workspace menu, shows readable historical summaries, and defaults to the latest five sessions while preserving all historical records.
- Testing Mode meeting date override is available only when a preview/development deployment explicitly sets `NEXT_PUBLIC_ENABLE_TESTING_TOOLS=true`: testers can enable the workspace toggle, choose a past, present, or future date, create or reopen the single meeting record for that selected date, and end test-created meetings to accelerate Meeting History and Tactical History validation. Test-created notes and tactical snapshots display a **Test Date** badge. Live production must keep the flag disabled or unset; when it is not exactly `true`, controls do not render and the standard today-only lifecycle remains unchanged.
- Strategic Topic notes/history foundation added for cloud meetings: each Strategic Topic can open a lightweight **History / Notes** modal and manually save/load topic-scoped rich text notes via existing `strategic_topic_notes` fields keyed by (`meeting_id`, `strategic_topic_item_id`).
- Strategic Topic lifecycle behavior is now active in the runtime UI with non-destructive states (`active`, `completed`, `archived`); completed and archived topics move out of the active list into a lightweight History modal while preserving topic-attached Notes.
- Strategic Topic active cards are compact for meeting scanning, and the Notes modal now dismisses intentionally through Close or a successful Save Notes action rather than backdrop clicks.
- Defining Objective cards use compact scan cards in the main meeting view: each card shows the objective title, direct color selector, compact Planning / In Progress / Completed task summary, and **Open details** action. Full objective editing and workflow details remain in the click-in detail modal, including title, description, color, task workflow, and task detail access.
- Adding a new Defining Objective automatically opens its detail modal so the user can immediately fill in the title, description, task/workflow details, and color.
- Standard Operating Objective cards follow the same visual distribution pattern as Defining Objective cards so both sections feel consistent during meeting scans.
- Shared objective card layout rules are accepted: one to four cards preserve the standard card width and are centered or evenly distributed; five cards use the standard card width; six cards use compact width to fit across when screen width allows; seven or more cards wrap to a second row with centered remainder rows.
- Objective card polish keeps the shared layered vertical color menu above wrapped rows without click-through and allows Standard Operating Objective titles to wrap to two lines.
- Runtime editing UX now favors intentional entry: meeting items, objective titles/descriptions, and task detail title/description use double-click-to-edit, while playbook-controlled runtime summaries show an Edit Playbook reminder instead of direct editing. Meeting lifecycle actions now sit under the workspace title: Start/Edit/View Meeting resolves to one notes record per date, Meeting Notes navigation moves chronologically from oldest to newest even when Testing Mode adds an older date later, ended or past notes are read-only, and deletion remains scoped to the current editable notes record.
- Current stabilization slice: validate and polish the intentionally narrow `meeting_settings` structured-write pilot before sequencing any additional structured surface.
- Blockers: Full-workspace autosave approach remains abandoned (PR #41); additional structured surfaces must stay separate until this pilot is validated on a Supabase-configured preview.

## Parked / Deferred Work
- Full collaboration-grade Phase 2 remains deferred. Basic Cloud Meeting persistence stores the full backup JSON in `meetings.meeting_data`, but realtime collaboration, team sharing, editor/viewer roles, and forced migration remain out of scope.
- Deferred ideas are now tracked in `planning/FUTURE_PHASES.md` to prevent scope creep in active delivery work.

## Next Actions

- Use the planning files as the source of truth before future changes.
- Validate the `meeting_settings` hydrate/autosave pilot and its separate Manual Save backup signaling on a Supabase-configured Phase 2 preview.
- Validate Cloud Meeting Persistence on a Supabase-configured preview, including signed-out local mode, signed-in local mode staying browser-only, signed-in create/select/switch behavior from the dashboard, no auto-load or auto-migration from local mode, manual full-workspace save/load only on valid Cloud Meeting routes, soft-deleted meetings staying hidden/inaccessible, optional Local Workspace migration into empty and populated cloud meetings from a valid cloud route, migration cancel behavior, duplicate-prompt suppression, import while Cloud Meeting is selected, overwrite confirmation, user-scoped workspace selection, owner-only RLS, existing localStorage data, export/import, and Feedback Widget behavior.
- Plan any future normalization, migration, sharing, roles, and realtime collaboration separately before expanding beyond basic owner-only JSONB persistence.
