# Project State

## Current Snapshot

- Product: Meeting Tool by LyArk in the `Meeting-Tool` repo.
- Status: live/deployed operational beta.
- Deployment: Vercel.
- Persistence: Local Workspace uses browser `localStorage`; selected Cloud Meetings can manually save/load full workspace backup JSON in Supabase, optionally receive explicit Local Workspace migration, and now hydrate/autosave `meeting_settings`, structured Strategic Topics, Topic Notes, topic ordering, Meeting Notes, Cascading Communications, Defining Objectives, embedded Tasks, and Standard Operating Objectives after route bootstrap.
- Backup: JSON export/import workspace backup.
- Current focus: **Before Main UX Follow-up Review** organizes post-PR #98 user testing notes into safe follow-up scopes: UX-2A Simple UI Cleanup, UX-2B Rich Text Editing UX Review, UX-3A Agenda/Decision Architecture Review, and UX-3B Agenda/Decision Implementation + First-Class Autosave.
- Current branch note: `before-main-ux-followup-review` is documentation/planning-only against `phase-3-shared-access`. It must not change app code, runtime behavior, persistence, schema, migrations, RLS, auth, Manual Save, Local Mode, shared-access logic, or Agenda/Decision autosave.
- Workspace modal/menu polish now locks background page scroll while overlays or popups are open, keeps signed-in user details and sign out inside the Meeting Menu, and uses icon-only Meeting Menu and Dashboard Menu triggers. Dashboard archive visibility is a standalone control, Dashboard Import Backup is inside the Dashboard Menu, and visible placeholder coming-soon items are hidden.

## Before Main UX Follow-up Review

- This review is documentation/planning-only and adds `planning/reviews/before-main-ux-followup-review.md`; it makes no app-code, runtime behavior, migration, RLS, persistence, Manual Save, Local Mode, or Agenda/Decision autosave changes.
- User testing notes are classified into three lanes: simple before-main UI cleanup, later rich text editing UX review, and Agenda/Decision architecture before implementation.
- Recommended sequence is UX-2A Simple UI Cleanup, UX-2B Rich Text Editing UX Review, UX-3A Agenda/Decision Architecture Review, and UX-3B Agenda/Decision Implementation + First-Class Autosave.
- Before-main recommendation: only UX-2A is a candidate before main; rich text editor system changes and Agenda/Decision implementation should remain separate and post-main by default unless final validation identifies a blocker.

## Before Main UX Architecture Review

- This review is documentation/planning-only and adds `planning/reviews/before-main-ux-architecture-review.md`; it makes no app-code, runtime behavior, migration, RLS, persistence, Manual Save, or Local Mode changes.
- The review recommends a focused UX sprint around dashboard card hierarchy, sticky meeting header/autosave confidence, lightweight workspace navigation, card/button hierarchy, Strategic Topics label/control cleanup, Tactical History label consistency, Manual Save/Backup wording, Local Mode browser-only fallback wording, and responsive polish.
- Critical before-main concern: Agenda Items and Decisions/Actions should be visually redesigned before persistence; the recommended direction is Agenda Items as first-class discussion/outcome containers with discussion notes, decision, action items, completed state, promote-to-Strategic-Topic action, and cascade-needed markers, while Decisions/Actions remains a summary/rollup.
- Recommended next action: refine the UX visually in Cursor, approve the Agenda/Decision workflow, then implement small UX PRs and a separate first-class Agenda/Decision autosave PR only after the workflow is accepted.

## Phase 4 PR 4R Before Main Readiness Review

- PR 4R is a review/documentation/planning PR only and adds `planning/reviews/phase-4-before-main-readiness-review.md`.
- The review finds Phase 4 persistence broadly ready for final validation, with structured autosave now covering Settings, Strategic Topics, Topic Notes, Meeting Notes, Cascading Communications, Defining Objectives, Tasks, and SOOs.
- Manual Save remains required for full-workspace backup parity and for Agenda Items and Decisions/Actions until the future agenda/decision redesign.
- Required before-main sequence is: PR A Forgot Password, PR B Documentation Refresh Sprint, and PR C Main Readiness Review.
- Local Mode should be retained for main as a browser-only fallback and documented with a backup/import migration path.

## Phase 4 PR 4D implementation — Defining Objectives / Tasks / SOOs Autosave

- Schema reconciliation adds numeric client IDs, rich-text JSON/text fields, sort order support, objective/task/SOO color/status/priority/due-date compatibility, and nested task detail JSON columns to the existing `objectives`, `tasks`, and `standard_operating_objectives` tables.
- Cloud meeting load still starts from `meetings.meeting_data` / scoped browser fallback, then overlays structured Defining Objective, Task, and SOO rows when they exist. Existing meetings without structured rows continue to load from the full-workspace backup path.
- Owners and active editors autosave Defining Objectives, embedded Tasks, nested task details, and SOOs with a debounced Last Save Wins flow. Local Mode remains browser-only and Manual Save remains the full-workspace safety net.
- Importing a JSON backup into a Cloud Meeting now restores structured Defining Objective, Task, nested task detail, and SOO rows in addition to the full localStorage-compatible workspace state.
- Remaining before-main dependencies: Forgot Password, UX polish, documentation refresh/main-readiness review, Supabase preview validation, and the future Agenda/Decision workflow redesign remain deferred.

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
- Keep full-workspace JSONB autosave out of scope. Manual Save to `meetings.meeting_data` remains visible, available, and required as the full-workspace cloud backup safety net while structured surfaces are validated one at a time.
- Document and sequence later migration slices without breaking current cloud save/load behavior or hardcoding owner-only client assumptions that would fight Phase 3 member roles.
- Continue Phase 3 after the shared-access foundation with PR 2 dashboard discovery/listing/entry. PR 2A introduced the dashboard query/access abstraction; PR 2B adds the visible Owned by Me / Shared with Me sections, search across both sections, alphabetical sorting within each section, and shared-card owner display text without adding invite/member-management flows.
- Keep membership architecture and long-term role direction (`owner`/`editor`/`viewer`) explicit. PR 1A migration `20260603090000_align_shared_access_schema.sql` aligns `meeting_members.role` to `owner`/`editor`/`viewer`, maps existing `admin` and `member` values to `editor`, and backfills owner membership rows while preserving `meetings.owner_id` as the runtime owner authority.
- Support pending invitations for people who have not signed up yet. For the first Team Beta, expose only Owner and Editor behavior if needed and allow everyone with access to edit; defer Viewer enforcement until the permission surface is ready.
- Keep Last Save Wins as the Team Beta concurrency model. Realtime collaboration, presence, cursors, websockets, CRDTs, and conflict resolution remain out of scope.
- Next recommended action: run a Supabase-linked Phase 3 closeout validation with owner, editor, removed-editor, non-member, re-invite, member-count, Tactical History, Manual Save, and direct RPC/REST negative scenarios. Role editing, ownership transfer, owner self-removal, Viewer UX, organizations, Local Mode changes, autosave expansion, and realtime collaboration remain deferred.

## Phase 3 PR 3D lifecycle mutation hardening implementation

- Direct REST updates to `meetings` are narrowed to the editor-safe `meeting_data` Manual Save field; existing RLS still requires active owner/editor edit access.
- Owner-only meeting lifecycle/container fields are protected: `name`, `owner_id`, `metadata_json`, `archived_at`, and `deleted_at`. A trigger also blocks non-owner changes to protected columns if update privileges are accidentally broadened.
- Dashboard duplicate/archive/restore now use `duplicate_owned_meeting(source_meeting_id, duplicate_name)`, `archive_owned_meeting(target_meeting_id)`, and `restore_owned_archived_meeting(target_meeting_id)` RPCs. Archived soft-delete remains on `soft_delete_owned_archived_meeting(target_meeting_id)`, and `rename_owned_meeting(target_meeting_id, meeting_name)` is available for future owner-only title changes.
- Structured autosave remains incomplete; Manual Save remains required and available to owners/editors as the full workspace backup safety net.

## Phase 3 PR 3C member management implementation

- Added narrow member-management RPCs: `list_meeting_members(target_meeting_id)`, `remove_meeting_editor(target_meeting_id, target_user_id)`, and `get_accessible_meeting_member_counts()`.
- The dashboard Access/Members modal now lists the owner row separately from an `Editors` section, pending invitations for owners, and owner-only remove controls for active editors.
- Dashboard cards show `Members: #` when counts are available; the count is owner plus active editors and excludes pending invitations, removed members, and viewers. Access/member UI prefers profile display name, then profile email, then auth email fallback.
- Removal is soft removal through `meeting_members.removed_at`; invite history is preserved, and removed editors can regain access only by accepting a new pending invite.
- Tactical History remains visible to owners and editors; owner-only Tactical History restrictions and Viewer behavior remain deferred.

## Phase 3 PR 3D shared access hardening review

- Added `planning/reviews/phase-3-shared-access-hardening-review.md` as the final Phase 3 shared-access architecture/security review.
- Review confirms the ownership model remains `meetings.owner_id` authoritative; owner membership rows support future expansion only and do not replace `owner_id`.
- Review confirms pending invitations do not grant access, explicit acceptance creates/reactivates editor membership, owner/editor member visibility is narrow, owner-only editor removal preserves history through `removed_at`, profile metadata is display-only, and Tactical History remains visible to owners and editors.
- Must-fix before Phase 3 closeout: harden direct meeting lifecycle/container mutations so active editors cannot archive, restore, soft-delete, or rename a cloud meeting through the broad `meetings` update path that currently supports editor Manual Save.
- Phase 3 appears ready to close after that small lifecycle mutation hardening PR plus a Supabase-linked validation pass using dedicated owner/editor/non-member test accounts.

## Sprint Status

- Completed sprint: Dashboard / Meeting Selector (authenticated dashboard cards, user-scoped meeting list, open-route entry, and local fallback completed on `phase-2-cloud`).
- Current architecture status: App route separation is active with `/` landing/auth entry, `/dashboard` authenticated cloud meeting cards and create/duplicate/archive controls, `/meeting/local` browser-only local mode, and `/meeting/[id]` route-driven cloud meeting load with manual cloud save preserved. Cloud UI now separates settings autosave, Strategic Topics autosave, and Manual Save full-workspace backup state; `meeting_settings`, `strategic_topics`, and `strategic_topic_notes` hydrate from structured storage and autosave after cloud bootstrap with debounced Last Save Wins writes.
- Archived Meeting soft-delete is now active on the dashboard for cloud meetings: archived cards can be restored by clearing `archived_at` or soft-deleted via confirmation, `meetings.deleted_at` is populated only for archived delete, and dashboard plus Cloud Meeting load/save queries exclude soft-deleted rows by default.
- Tactical history foundation added on cloud meetings: **End Meeting** writes archival tactical session snapshots to `tactical_sessions` (with `snapshot_json`) and leaves the active workspace visible with a calm success message; Tactical History opens intentionally from Meeting History in the workspace menu, shows readable historical summaries, and defaults to the latest five sessions while preserving all historical records.
- Testing Mode meeting date override is available only when a preview/development deployment explicitly sets `NEXT_PUBLIC_ENABLE_TESTING_TOOLS=true`: testers can enable the workspace toggle, choose a past, present, or future date, create or reopen the single meeting record for that selected date, and end test-created meetings to accelerate Meeting History and Tactical History validation. Test-created notes and tactical snapshots display a **Test Date** badge. Live production must keep the flag disabled or unset; when it is not exactly `true`, controls do not render and the standard today-only lifecycle remains unchanged.
- Strategic Topic notes/history foundation added for cloud meetings: each Strategic Topic can open a lightweight **History / Notes** modal and manually save/load topic-scoped rich text notes via existing `strategic_topic_notes` fields keyed by (`meeting_id`, `strategic_topic_item_id`).
- Strategic Topic lifecycle behavior is now active in the runtime UI with non-destructive states (`active`, `completed`, `archived`); completed and archived topics move out of the active list into a lightweight History modal while preserving topic-attached Notes.
- Strategic Topic active cards are compact for meeting scanning, and the Notes modal now leads with the selected topic title and dismisses intentionally through Close or a successful Save Notes action rather than backdrop clicks.
- Defining Objective cards use compact scan cards in the main meeting view: each card shows the objective title, direct color selector, compact Planning / In Progress / Completed task summary, and **Open details** action. Full objective editing and workflow details remain in the click-in detail modal, including title, description, color, task workflow, and task detail access.
- Adding a new Defining Objective automatically opens its detail modal so the user can immediately fill in the title, description, task/workflow details, and color.
- Standard Operating Objective cards follow the same visual distribution pattern as Defining Objective cards so both sections feel consistent during meeting scans.
- Shared objective card layout rules are accepted: one to four cards preserve the standard card width and are centered or evenly distributed; five cards use the standard card width; six cards use compact width to fit across when screen width allows; seven or more cards wrap to a second row with centered remainder rows.
- Objective card polish keeps the shared layered vertical color menu above wrapped rows without click-through and allows Standard Operating Objective titles to wrap to two lines.
- Runtime editing UX now favors intentional entry: meeting items, objective titles/descriptions, and task detail title/description use double-click-to-edit, while playbook-controlled runtime summaries show an Edit Playbook reminder instead of direct editing. Meeting lifecycle actions now sit under the workspace title: Start/Edit/View Meeting resolves to one notes record per date, Meeting Notes navigation moves chronologically from oldest to newest even when Testing Mode adds an older date later, ended or past notes are read-only, and deletion remains scoped to the current editable notes record.
- Phase 2.5 QA found the core workflows passing: Dashboard create/open/archive/restore/delete/duplicate; Cloud Meeting load; title/settings autosave; Manual Save full-workspace backup; refresh preservation; sign out route; Start/Edit/View Meeting; one meeting per date; Testing Mode date override; End Meeting and Tactical History snapshot; Meeting Notes agenda/decisions/cascading communication, chronological navigation, and ended/past read-only behavior; Strategic Topics add/notes/complete/archive/restore/history; Defining Objective cards/details/tasks; Standard Operating Objective cards/editor/color selectors; and Local Mode browser-only edits without cloud autosave.
- Current stabilization slice: keep Phase 3 dashboard discovery/listing/entry focused on the PR 2A abstraction and PR 2B sectioned UI; avoid expanding into invite/member management, lifecycle permission changes, Viewer UX, or collaboration scope.
- Blockers: Full-workspace autosave approach remains abandoned (PR #41); additional structured surfaces must stay separate until the current pilot is validated on a Supabase-configured preview.

## Parked / Deferred Work

- Full collaboration-grade Phase 2 remains deferred. Basic Cloud Meeting persistence stores the full backup JSON in `meetings.meeting_data`, but realtime collaboration, team sharing, editor/viewer roles, and forced migration remain out of scope.
- Local Workspace remains supported and browser-only as a fallback during cloud persistence and shared-access stabilization. It must not autosave to cloud. After structured cloud autosave protects all valuable meeting data and Phase 3 shared meeting access is stable, evaluate retiring Local Workspace or demoting it to a developer/testing-only mode to reduce parallel-system duplication, test burden, and user confusion. Local Workspace cannot provide the shared cloud access that creates the product's team value.
- Manual Save remains part of the primary workflow during migration because PR #72 autosaves only `meeting_settings`. After structured autosave reliably covers the core operational workspace, evaluate retiring Manual Save from the primary workflow or moving it into a secondary backup/export utility role.
- Broader responsive/layout polish remains deferred; do not turn Phase 2.5 into a responsive redesign or sticky-header redesign.
- Additional structured autosave surfaces remain deferred and should be sequenced independently after the existing pilot is validated.
- Phase 3 shared meeting access is active implementation work. PR 1A schema alignment is complete, PR 1B adds the membership-aware RLS foundation, PR 2A adds the dashboard access abstraction, PR 2B adds visible owned/shared dashboard discovery, PR 3A adds the user profile foundation, PR 3B adds the invite flow, and the PR 3C member-management architecture review recommends a narrow member-list/removal/count implementation.
- Documentation/user guide work remains deferred until the shared access foundation is established.
- Deferred ideas are now tracked in `planning/FUTURE_PHASES.md` to prevent scope creep in active delivery work.

## Next Actions

- Use `planning/reviews/phase-3-member-management-review.md` as the PR 3C planning baseline for member-management implementation.
- Next recommended action: implement **PR 3C — Member Management** with an Access panel active member list, owner-only active-editor removal, and dashboard member counts, while keeping role editing, ownership transfer, owner self-removal, Viewer UX, organizations, Local Mode, autosave, and realtime collaboration out of scope.
- Use the planning files as the source of truth before future changes.
- Validate the `meeting_settings` hydrate/autosave pilot and its separate Manual Save backup signaling on a Supabase-configured Phase 2 preview.
- Validate Cloud Meeting Persistence on a Supabase-configured preview, including signed-out local mode, signed-in local mode staying browser-only, signed-in create/select/switch behavior from the dashboard, no auto-load or auto-migration from local mode, manual full-workspace save/load only on valid Cloud Meeting routes, soft-deleted meetings staying hidden/inaccessible, optional Local Workspace migration into empty and populated cloud meetings from a valid cloud route, migration cancel behavior, duplicate-prompt suppression, import while Cloud Meeting is selected, overwrite confirmation, user-scoped workspace selection, owner-only RLS, existing localStorage data, export/import, and Feedback Widget behavior.
- Keep realtime collaboration and broader ownership models separate from Phase 3 Team Beta. Resolve shared-access schema alignment before expanding membership RLS or structured autosave surfaces.

## PR 3A — User Profile Foundation

- Phase 3 PR 3A adds a minimal `profiles` foundation for durable user attribution across shared access. The table stores `user_id`, first/last name, derived `display_name`, mirrored auth email, and timestamps.
- Profile creation is database-backed for new auth users and bootstrapped by the app at sign-in for legacy users. The dashboard exposes a small Profile editor for first and last name only.
- Dashboard owner attribution now uses profile display data when available and falls back gracefully to email/legacy metadata/`Owner` without requiring existing users to update immediately.
- Direct profile table access remains own-row only. A narrow accessible-meeting owner profile RPC supports safe dashboard display for meetings visible through existing meeting RLS.
- Deferred from PR 3A: invite UI, member management UI, ownership transfer, multiple owners, audit history, member card display, avatar system, organizations, Viewer UX, and Local Mode changes.

## Phase 3 PR 3B Invite User Flow

- Added database RPCs for owner pending-invite creation, owner pending-invite listing, owner revocation, invitee matching-email pending-invite listing, and explicit invite acceptance.
- Invite acceptance creates or reactivates an active editor membership and marks the invitation accepted in the same database function.
- Pending invitations remain non-authoritative for runtime access; meetings are visible/openable only after existing RLS sees an active membership.
- Dashboard owner UI is intentionally minimal and lives behind an `Access` button on active owned meeting cards.
- Dashboard invitee UI is a pending-invitations section above Cloud Meetings with an explicit Accept action.
- Tokenized links, automated email delivery, member management/removal, role editing, Viewer UX, ownership transfer, multiple owners, organizations, realtime collaboration, Local Mode changes, and autosave behavior changes remain deferred.

## PR 3B follow-up create-meeting fix

- Fixed the PR 3B create-meeting RLS regression by moving dashboard/selector meeting creation from direct `meetings` REST insert to `create_owned_meeting(meeting_name)`, which creates only meetings owned by the signed-in user and preserves owner membership setup through the existing trigger.
- Cleaned up dashboard invite UX so the Pending Invitations section is hidden for normal dashboards with zero pending invites and appears only while loading or when matching pending invitations exist.


## Phase 3 PR 3C Member Management Architecture Review

- Added a docs-only review at `planning/reviews/phase-3-member-management-review.md`.
- Recommendation: no new member table for Phase 3C; use `meetings.owner_id`, active `meeting_members` rows, `meeting_invitations` history, and `profiles` display metadata.
- Recommended implementation scope: Access panel member list for owners/editors, owner-only active-editor removal via narrow RPC, dashboard member count loaded with/alongside dashboard meetings, and Tactical History visible to owners/editors.
- Deferred: role editing, ownership transfer, owner self-removal, Viewer UX, organizations, multiple owners, avatars, Local Mode changes, autosave behavior changes, and realtime collaboration.

## Phase 4 PR 4A Autosave Audit Review

- Added `planning/reviews/phase-4-autosave-audit-review.md` as a documentation-only architecture review of current autosave, Manual Save, localStorage, shared-editor, session, and before-main persistence risks.
- Confirmed structured autosave remains intentionally narrow: only `meeting_settings` fields for dashboard title, organization/playbook setup info, meeting section order, and setup completed state autosave to cloud after cloud-route bootstrap.
- Confirmed Manual Save to `meetings.meeting_data` remains required for full workspace cloud backup of DOs/objectives, tasks, SOOs, Strategic Topics list/lifecycle, meeting date records, Agenda Items, Decisions/Actions, Cascading Communications, and full backup parity.
- Confirmed Tactical History snapshots persist only on explicit End Meeting and do not replace active-workspace autosave or Manual Save.
- Flagged a schema/documentation boundary: app code references `strategic_topic_notes`, but the reviewed repository migrations do not create that table/RLS, so Strategic Topic notes persistence is deployment-dependent until reconciled.
- Before main/team beta, recommend structured autosave expansion for Strategic Topics plus notes first, then Meeting Notes/Agenda/Decisions/Cascading Communications, followed by DO/SOO objectives and tasks.

## Phase 4 PR 4B Strategic Topics Autosave Architecture Review

- Added `planning/reviews/phase-4-strategic-topics-autosave-review.md` as a documentation-only review of Strategic Topics, Topic Notes, existing structured tables, shared-access write expectations, migration strategy, validation, and before-main implications.
- Confirmed current Strategic Topics list/lifecycle are runtime `MeetingItem[]` records in localStorage plus Manual Save backup under `leadership-strategic-topic-items`; the app does not currently hydrate or write the live topic list through `public.strategic_topics`.
- Confirmed Topic Notes are separate cloud-only rich text records attempted through `strategic_topic_notes` and are not covered by Manual Save/export backup; repo migrations still do not create that table.
- Recommended PR 4B implementation scope: Strategic Topics + Topic Notes + Ordering after schema reconciliation, preserving Manual Save, Local Mode, Last Save Wins, and `meeting_data` fallback during a dual-write period.

## Phase 4 PR 4B Strategic Topics Autosave Implementation

- Implemented structured autosave for cloud Strategic Topics through `public.strategic_topics`, including title/text, lifecycle status, completed/archive timestamps, captured/removed meeting context, and `sort_order` ordering.
- Formalized `public.strategic_topic_notes` for cloud Topic Notes with meeting scope, nullable structured topic linkage, legacy numeric topic item linkage, rich text JSON, plain text, updated-at trigger, indexes, and membership-aware RLS.
- Cloud meeting hydration remains backward-safe: load `meetings.meeting_data` backup first, overlay `meeting_settings`, then overlay structured Strategic Topics when rows exist; meetings without structured topic rows continue using backup/localStorage fallback.
- Manual Save, export/import, workspace backup restore, Local Mode, shared owner/editor editing, and Last Save Wins remain intact. Objectives, tasks, SOOs, meeting notes, agenda/decisions/cascade autosave, realtime collaboration, Viewer UX, and ownership transfer remain deferred.

## PR 4B Follow-up — Strategic Topic Notes Backup Compatibility

- Strategic Topic Notes are now included in workspace backups under the `leadership-strategic-topic-notes` backup key, keyed by the same legacy numeric Strategic Topic item IDs used by `leadership-strategic-topic-items`.
- Manual Save and JSON export collect cloud Topic Notes plus locally cached/open note drafts so topic-attached notes are included in the full-workspace backup safety net.
- Import/restore reads `leadership-strategic-topic-notes` back into workspace state and, for cloud meetings, immediately restores those notes into `strategic_topic_notes` using the restored topic item IDs. This keeps notes attached when a backup is restored into a new meeting and structured topic UUIDs are recreated.
- Structured Strategic Topic and Topic Notes autosave remains primary for cloud editing; backup/import compatibility is an additional fallback path and does not change Local Mode, Manual Save, shared editor behavior, or Last Save Wins.

## Phase 4 PR 4C Meeting Notes / Cascading Communications Autosave Review

- Added the documentation-only PR 4C architecture review for Meeting Notes and Cascading Communications autosave.
- Current model confirmed: Meeting Notes live in the `leadership-meetings` workspace payload, the active record is selected by `leadership-active-meeting-id`, and Cascading Communications live as `activeMeeting.cascadeItems` within the same dated meeting-note record.
- Current persistence confirmed: both surfaces remain Manual Save/export/import backed through `meetings.meeting_data`; neither surface is structured autosaved today.
- Recommendation: implement Meeting Notes + Cascading Communications together next, using a new active `meeting_notes` table, while leaving Agenda Items and Decisions/Actions out of first-class autosave until the future combined workflow redesign is decided.
- Existing tactical and strategic session tables remain archival/history tables and should not be reused for active autosave.
- Remaining before-main Manual Save dependency risk after this slice: Defining Objectives, Tasks, Standard Operating Objectives, then Agenda/Decision redesign-dependent surfaces.

## Phase 4 PR 4C Meeting Notes / Cascading Communications implementation

- Added active structured `public.meeting_notes` storage for dated `MeetingRecord` rows keyed by `(meeting_id, client_meeting_id)`.
- Cloud Meeting load hydrates Meeting Notes and Cascading Communications from `meeting_notes` when rows exist, with `meetings.meeting_data` remaining the fallback for existing meetings.
- Owner/editor changes to Meeting Notes records and Cascading Communications autosave with debounce and Last Save Wins. Manual Save remains the full-workspace backup path.
- Backup export/import still includes `leadership-meetings` and `leadership-active-meeting-id`; cloud imports also upsert restored Meeting Notes rows into `meeting_notes` while preserving numeric client meeting IDs.
- Agenda Items and Decisions/Actions remain pass-through compatibility JSON inside `notes_json` because they currently live in the same `MeetingRecord`; their first-class structured schema and workflow redesign remain deferred.
- Autosave status summaries now explicitly show Settings, Strategic Topics, and Meeting Notes/Cascading Communications statuses in cloud status clusters without adding a sticky header redesign.
- Before `main`, Defining Objectives, Tasks, and SOOs remain the next required autosave dependencies for PR 4D.


## Phase 4 PR 4D Objectives / Tasks / SOOs Autosave Review Notes

- Current Defining Objectives live in `leadership-objectives` as an `Objective[]`; Tasks are embedded under each objective and include status, assignee, due date, rich description, subtasks, comments, and activity history.
- Current Standard Operating Objectives live in `leadership-standard-operating-objectives` as a separate `StandardOperatingObjective[]` with title, rich description, optional color, and array-order sorting.
- Existing `objectives`, `tasks`, and `standard_operating_objectives` tables exist but are not active runtime tables; they need schema reconciliation for numeric client IDs, ordering, color/rich-text fields, and nested task detail compatibility before implementation.
- Recommended implementation scope for the next autosave slice is Defining Objectives + Tasks + SOOs together, while keeping Manual Save/export/import, Local Mode, Last Save Wins, and existing UI behavior unchanged.
- Remaining before-main dependencies after this future implementation should be Agenda Items / Decisions/Actions redesign, Manual Save as full backup, sticky status/header UX, Forgot Password, and Documentation Refresh.
