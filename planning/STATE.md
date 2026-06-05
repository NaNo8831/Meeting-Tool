# Project State

## Current Snapshot

- Product: Meeting Tool by LyArk in the `Meeting-Tool` repo.
- Status: live/deployed operational beta.
- Deployment: Vercel.
- Persistence: Local Workspace uses browser `localStorage`; selected Cloud Meetings can manually save/load full workspace backup JSON in Supabase, optionally receive explicit Local Workspace migration, and now hydrate plus autosave only the narrow `meeting_settings` structured pilot after route bootstrap.
- Backup: JSON export/import workspace backup.
- Current focus: Phase 3 **PR 3D Architecture Review — Shared Access Hardening** documents the final shared-access security and permission review before Phase 3 closeout. Current shared access supports owner-created meetings, profiles/owner attribution, owned/shared dashboard sections, pending invitations, invite acceptance, accepted editor memberships, shared editor access, owner/editor member visibility, owner-only active-editor removal, dashboard member counts, and Tactical History visibility for owners/editors.
- Current branch note: Phase 3 work targets `phase-3-shared-access`. This local checkout is named `work` and is based on merge commit `cac3380` (`Merge pull request #74 from NaNo8831/phase-2-cloud`); no git remote is configured in this container.
- Workspace modal/menu polish now locks background page scroll while overlays or popups are open, keeps signed-in user details and sign out inside the Meeting Menu, and uses icon-only Meeting Menu and Dashboard Menu triggers. Dashboard archive visibility is a standalone control, Dashboard Import Backup is inside the Dashboard Menu, and visible placeholder coming-soon items are hidden.

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
- Next recommended action: create a small implementation hardening PR that makes meeting lifecycle/container mutations owner-only at the database/API boundary while preserving Manual Save for owners/editors. Then run a Supabase-linked closeout validation with owner, editor, non-member, re-invite, member-count, Tactical History, and direct RPC/REST negative scenarios. Role editing, ownership transfer, owner self-removal, Viewer UX, organizations, Local Mode changes, autosave expansion, and realtime collaboration remain deferred.

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
- Current architecture status: App route separation is active with `/` landing/auth entry, `/dashboard` authenticated cloud meeting cards and create/duplicate/archive controls, `/meeting/local` browser-only local mode, and `/meeting/[id]` route-driven cloud meeting load with manual cloud save preserved. Cloud UI now separates the narrow settings-autosave state from the Manual Save full-workspace backup state, and only the `meeting_settings` structured pilot hydrates from structured storage and autosaves after cloud bootstrap with a debounce.
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
