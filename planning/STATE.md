# Project State

## Current Snapshot

- Product: Meeting Tool by LyArk in the `Meeting-Tool` repo.
- Status: live/deployed operational beta.
- Deployment: Vercel.
- Persistence: Local Workspace uses browser `localStorage`; selected Cloud Meetings have structured autosave for `meeting_settings`, Strategic Topics, Topic Notes, Meeting Notes, Cascading Communications, Defining Objectives, embedded Tasks, Standard Operating Objectives, and Agenda Items, with `meetings.meeting_data` full-workspace Manual Save as the safety net and fallback hydration source.
- Backup: JSON export/import workspace backup (full workspace + structured rows).
- Current Project Status: **PR #110 Forgot Password validation complete. All checklist items passed (Resend SMTP confirmed, reset link opens deployed /reset-password, password update and re-login work). PR #110 is ready to merge to phase-3-shared-access. Next: merge PR #110, then Main Readiness Review.**

## Documentation Refresh Sprint

- Completed a docs-only sprint refreshing all major developer/agent reference documents to reflect the actual pre-main state of the app.
- README.md refreshed: current feature set, roles table, architecture summary, setup instructions, key reference links.
- docs/ARCHITECTURE.md rewritten as a clean reference document covering tech stack, routes, key file structure, Supabase integration, cloud persistence, autosave, Local Mode, auth model, RLS helpers, meeting lifecycle, and dashboard UX.
- docs/DATA_MODEL.md rewritten as a clean reference document covering all Supabase tables, key columns, relationships, RLS approach, structured autosave tables, archival tables, source-of-truth summary, and compatibility notes.
- docs/PERMISSIONS.md rewritten as a clean reference document covering role matrix, RLS helper functions, table-level policy summary, owner-only RPCs, invitation flow, lifecycle mutation hardening, and ownership invariants.
- docs/VALIDATION.md updated with current validation approach, pre-merge checklist, Forgot Password validation checklist, Main Readiness Review checklist, and shared access regression reference.
- planning/QUESTIONS.md updated: closed all resolved questions, left only genuine open questions (auth email config, Forgot Password merge/validation, Continue/Reopen lifecycle, custom SMTP provider, post-main deferred items).
- docs/CURRENT_PROJECT_STATUS.md updated: Documentation Refresh marked complete; Forgot Password PR #110 (implementation complete, pending merge and email-link validation) documented; merge concern for PR #112 hotfix documented.
- This STATE.md updated to reflect the documentation sprint completion and current next actions.
- No app code, schema, migrations, RLS, auth, persistence, UI, or runtime behavior was changed in this sprint.
- Current focus: transition from Codex/ChatGPT-assisted development to Claude Code / Claude Chat with little downtime, then finish Forgot Password validation and main readiness.
- Current branch note: `transition-docs-update-for-claude` is documentation-only and updates Claude Code / Claude Chat handoff, auth email setup, validation, status, README, and planning docs. It does not change runtime behavior, schema, migrations, RLS, auth implementation, persistence, or UI.
- Workspace modal/menu polish now locks background page scroll while overlays or popups are open, keeps signed-in user details and sign out inside the Meeting Menu, and uses icon-only Meeting Menu and Dashboard Menu triggers. Dashboard archive visibility is a standalone control, Dashboard Import Backup is inside the Dashboard Menu, and visible placeholder coming-soon items are hidden.

## Codex to Claude Transition / Auth Email Stopping Point

- The project is transitioning from Codex/ChatGPT-assisted development to Claude Code / Claude Chat.
- PR #107 added AI Agent Workflow and Current Project Status docs.
- PR #108 added Meeting State Review.
- PR #109 implemented Meeting State follow-up, was tested as merge-ready, and is reflected in this branch state.
- PR #110 Forgot Password implementation is complete and fully validated. Supabase Auth URL Configuration is confirmed correct. Custom SMTP (Resend) is configured and confirmed delivering email. All PR #110 validation checklist items passed: reset link opens deployed `/reset-password`, password update succeeds, re-login with new password works.
- A recovery token session-exchange bug was found and fixed during audit: the raw `access_token` from the URL hash was being used directly as Bearer for `PUT /auth/v1/user`, which can return 200 without committing the change. Fix exchanges the recovery `refresh_token` for a live session first.
- PR #110 is ready to merge to `phase-3-shared-access`. Remaining roadmap: merge PR #110, Main Readiness Review, then merge to `main`.

## Meeting State Follow-up Implementation

- Implemented the required before-main Meeting State Review follow-up as focused lifecycle UX/copy clarification rather than a schema, permissions, persistence, or reopen-workflow change.
- The Meeting Workspace now surfaces the active dated record state as a compact Open Meeting, Closed Meeting, Past Meeting, or Test Mode chip in the sticky header, with explanatory help available from the adjacent help control instead of a persistent header panel.
- Cloud Meeting load/refresh now prefers the current open dated record when one exists, then the newest real dated record, instead of defaulting to the oldest record or the stored legacy active pointer.
- End Meeting copy now clarifies that the action captures Tactical History, makes the dated meeting read-only, leaves autosave/Manual Save behavior unchanged, and does not advance, reset, or rewrite the workspace.
- Remaining meeting-state questions stay deferred: whether a future Continue/Reopen action is needed and whether End Meeting should optionally trigger a full Manual Save backup.

## Meeting State Review

- Added `planning/reviews/meeting-state-review.md` as a documentation-only before-main review of meeting state sources, route hydration, lifecycle behavior, open/closed/Test Mode behavior, autosave/Manual Save interaction, Tactical History snapshots, Local Mode differences, and Shared Access effects.
- Finding: the known refresh concern is consistent with current behavior because the active dated meeting is restored from `leadership-active-meeting-id`; past or Tactical History-captured records are read-only unless a test meeting is being viewed with Test Mode active.
- Before-main recommendation: clarify lifecycle UX/copy and validation around Start/Edit/View/End/Test Mode, read-only ended meetings, refresh expectations, and End Meeting versus Manual Save before the final main-readiness pass.
- This review is documentation/planning-only and intentionally does not modify app code, runtime behavior, schema, migrations, RLS, auth, persistence, UI, Manual Save, Backup/Restore, or Local Mode.

## Transition Review + Claude Handoff

- Added `docs/HANDOFF_TO_CLAUDE_CODE.md` as the current handoff package for a future Claude Code transition, including executive summary, current product vision, architecture summary, data model summary, UX decisions, known technical debt, before-main roadmap, and recommended first Claude tasks.
- Added `docs/PROJECT_HISTORY.md` as a chronological summary of major phases, architecture decisions, product decisions, UX evolution, and decision rationale.
- Added `docs/AI_AGENT_WORKFLOW.md` to document the AI-agent working process, PR types, red flags, expectations, and reusable prompt pattern that stabilized Phase 3 / Phase 4 work.
- Added `docs/CURRENT_PROJECT_STATUS.md` as a concise status snapshot covering completed systems, current branch context, before-main roadmap, and known before-main risks.
- Refreshed `README.md` to reflect the current Supabase/shared-access/structured-autosave state and link to the handoff/history/workflow/status documents.
- Before-main roadmap is now prioritized as: Meeting State Review, Forgot Password, Documentation Refresh, and Main Readiness Review.
- This transition review is documentation-only and intentionally does not modify runtime behavior, schema, RLS, auth, persistence, UI, Manual Save, Backup/Restore, or Local Mode.

## Agenda Workspace Layout + Agenda Item UX Polish Implementation

- Implemented the approved meeting workspace hierarchy: full-width Agenda Items first, then Strategic Topics and Cascading Communication as secondary follow-up sections beneath. Agenda Items are fixed and no longer draggable by users; Strategic Topics and Cascading Communication remain ordered within the secondary area when existing section order supports it.
- Polished Agenda Item cards with left-leading Notes controls, compact status badges, clearer Decision versus Action outcome panels, covered-card auto-collapse, read-first inline Discussion Notes editing on double-click, and promoted-to-Strategic-Topic feedback that disables duplicate promotion.
- Replaced the always-visible Decisions/Actions rollup with a collapsed-by-default read-only summary so live meeting space stays focused on Agenda Items while preserving outcome visibility.
- Intentionally did not change database architecture, autosave architecture, backup/import behavior, Manual Save behavior, permissions, shared access, schema, migrations, RLS, or Local Mode behavior.

## Agenda Item UX Polish Review

- Added `planning/reviews/agenda-item-ux-polish-review.md` as a documentation-only UX review after PR #102 added Agenda Item persistence, Discussion Notes, Decision support, Action support, Covered state, Cascade Needed, and Strategic Topic promotion.
- Recommendation: polish Agenda Item cards before main by moving Notes to a stable left-side/left-leading position, making Discussion Notes read-first with double-click editing, collapsing covered cards to title-only by default, and tightening Decision/Action readability.
- Recommendation: do not keep the always-visible Decisions/Actions rollup as the default long-term pattern; replace it with an optional collapsed summary before main if feasible, or hide/remove it from the live workspace while preserving legacy data until a later migration/display decision.
- Before-main classification: Notes placement, covered-card collapse, and rollup noise reduction should happen before main; broader card-system refactors, multiple outcomes, legacy migration tooling, and outcome-summary relocation can happen after main.

## Agenda Workspace Layout Review

- Added `planning/reviews/agenda-workspace-layout-review.md` as a docs/planning-only review of the Meeting page hierarchy after first-class Agenda Item outcomes, Decisions/Actions rollup behavior, cascade-needed support, and Promote-to-Strategic-Topic support.
- Recommended future layout direction: Agenda Items should become a fixed full-width primary workspace, with Strategic Topics and Cascading Communication beneath as secondary follow-up/output surfaces.
- Recommended before-main stance: implement the layout alignment before main if Agenda outcome capture is part of the main candidate; expected future implementation complexity is low to moderate and should not require schema, migration, autosave, persistence, RLS, or permission changes.

## UX-3A Agenda / Decision Architecture Review

- Added `planning/reviews/ux-3a-agenda-decision-architecture-review.md` as a documentation-only architecture review; no app code, migrations, RLS, persistence, Manual Save, Local Mode, or runtime behavior are changed.
- Recommendation: Agenda Item should become the first-class parent object for discussion notes, one primary Decision/Action outcome selector, covered/completed state, cascade-needed marker, and promote-to-Strategic-Topic action. Agenda actions should not have due dates; ownership, due dates, status, and task tracking stay in Defining Objectives / Tasks.
- Recommendation: the current separate Decisions/Actions capture section should eventually be removed as a competing input surface and replaced with a read-only rollup/summary from Agenda Item outcomes, with legacy `decisionItems` preserved during transition for backup/import compatibility.
- Before-main recommendation: if the main release presents Agenda/Decision as part of the stable meeting workspace, Agenda/Decision first-class autosave should be completed before main; the next implementation PR should target Agenda Items + notes + outcome selector + covered + cascade-needed + read-only rollup, while preserving Manual Save and Local Mode.

## UX-2A Simple UI Cleanup

- Dashboard meeting cards now make Open the dominant two-thirds action where space allows, with Members and Actions retained beneath Open as secondary controls. Owner-only Duplicate, Archive, Restore, and Delete actions remain behind existing lifecycle gates.
- The Members panel now puts owner invite entry at the top, removes redundant role captions under grouped users, and uses concise panel copy while preserving invite, revoke, remove, and read-only member-list behavior.
- The meeting sticky header now keeps autosave status and Manual Save visible while moving Dashboard navigation back into the Meeting Menu and reusing existing Start/End/Test Mode handlers in the header. The separate meeting-actions strip was removed to avoid duplicate controls.
- Defining Objective detail copy now uses Review wording and removes the redundant workflow helper sentence.
- Cloud meeting header title alignment was handled as display-only: opened cloud meetings prefer the existing `meetings.name` value already used by dashboard cards, with no syncing or persistence changes between `meetings.name`, `meeting_settings.dashboard_title`, local workspace title, or cloud meeting title.

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

- Phase 3 Shared Access is effectively complete for the Team Beta owner/editor model.
- Current transition status is documentation and handoff readiness, not runtime implementation.
- Before-main work should stay narrow and prioritized: Meeting State Review, Forgot Password, Documentation Refresh, then Main Readiness Review.
- Preserve the current transition architecture while those reviews happen: structured surface autosave, Manual Save full-workspace backup, JSON export/import, membership-aware RLS, owner-only lifecycle/container actions, and browser-only Local Mode.
- Do not add schema, RLS, auth, persistence, or UI changes as part of transition-review documentation work.

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

- Local Mode decommission or demotion remains deferred until cloud structured autosave and shared access are validated as main-ready.
- Manual Save demotion/removal remains deferred; it is still the required full-workspace cloud safety snapshot.
- Ownership transfer, multiple owners, organizations, full Viewer UX, role editing, owner self-removal, realtime collaboration, presence, locks, cursors, websockets, CRDTs, conflict resolution, and merge UI remain post-main unless final validation identifies a blocker.
- Transactional Promote to Strategic Topic RPC, legacy decision migration tooling, and multiple outcomes/actions per Agenda Item remain future follow-up candidates.
- Deferred ideas are tracked in `planning/FUTURE_PHASES.md` to prevent scope creep in active delivery work.

## Next Actions

1. **Merge Forgot Password (PR #110)** — validation complete. All checklist items passed: Resend SMTP delivering email, reset link opens deployed `/reset-password`, password update and re-login work. Merge `codex/add-forgot-password-implementation` to `phase-3-shared-access`.
2. ~~**Fix/confirm Supabase Auth URL Configuration**~~ — confirmed correct.
3. ~~**Set up custom SMTP (Resend)**~~ — complete.
4. **Run Main Readiness Review** — full validation checklist in `docs/VALIDATION.md` on an integrated Vercel/Supabase preview with dedicated test accounts. Merge to `main` only after this gate passes.
5. Keep realtime collaboration, ownership transfer, full Viewer UX, Local Mode decommission, and broader schema/RLS changes separate from the before-main path.

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

## UX-3B Agenda / Decision Autosave Implementation

- Current work: UX-3B implements structured Agenda Item persistence and autosave on `ux-3b-agenda-decision-autosave` from `phase-3-shared-access` context.
- Agenda Items now support Discussion Notes, independent Decision and Action outcomes, Covered, Cascade Needed, and Promote to Strategic Topic in the meeting UI.
- Decisions/Actions is converted to a read-only rollup from Agenda Item outcomes with legacy `decisionItems` still displayed for compatibility.
- Cascading Communication keeps editable notes and adds a generated rollup for Agenda Items marked Cascade Needed.
- Manual Save, export/import, Local Mode, and `meeting_notes.notes_json` compatibility remain in place while structured `agenda_items` becomes the Agenda source of truth.
