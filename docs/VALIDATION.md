# Validation

## Phase 4 PR 4D objectives/tasks/SOOs validation

Automated validation for PR 4D:

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run `npm run build`.

Manual validation should cover owner/editor creation, edit, reorder, completion/deletion, rich descriptions, task status/due date/assignee, nested task subtasks/comments/activity history, SOO edit/reorder/recolor, refresh/new-browser persistence, backup export/import into a Cloud Meeting, non-member blocking, removed-editor blocking after refresh, and regression checks for existing settings, Strategic Topics, Topic Notes, Meeting Notes, Cascading Communications, Manual Save, Local Mode, Agenda Items, and Decisions/Actions behavior.

## Current Validation Approach

- Manual PR testing for changed user flows.
- Vercel preview testing for user-facing changes.
- `npm run lint` for linting.
- `npx tsc --noEmit` for TypeScript checking.
- `npm run build` for production build verification.
- Backup/export/import testing for changes that touch persistence, localStorage keys, or workspace restoration.

## Pre-Merge Checklist

- Confirm branch context is correct for the work.
- Review `git diff --name-only` for unexpected app or config changes.
- For documentation-only changes, confirm no app behavior changed; lint/type/build are not required.
- For app-code changes, run lint, typecheck, and build when practical.
- Manually test affected meeting-critical flows.
- Verify Backup/Restore still works after persistence-related changes.
- Use Vercel preview for user-facing changes before merge.

## Phase 3 Shared Access Validation Areas (Planned)

Apply these checks incrementally as each Phase 3 implementation PR lands. PR 1A changes schema and documentation only; it does not change application runtime code.

### PR 1A — Schema alignment

Validation performed for `20260603090000_align_shared_access_schema.sql`:

- Migration SQL reviewed for coherent PostgreSQL/Supabase ordering: add membership metadata, drop old role check, migrate role values, add new role check, backfill owner rows, add triggers, create invitation table, indexes, unique pending-invite guard, and owner-only invitation RLS.
- Role alignment is explicit: `owner` → `owner`, `admin` → `editor`, and `member` → `editor`.
- Owner backfill is included so every `meetings.owner_id` has an active `meeting_members` owner row while `meetings.owner_id` remains authoritative.
- Pending invite records can exist before the invited person signs up because `meeting_invitations.email`/`normalized_email` are required but `accepted_by` is nullable.
- Duplicate active pending invitations for the same meeting/email are blocked by a partial unique index on (`meeting_id`, `normalized_email`) where `status = 'pending'`.
- `meeting_invitations` RLS is enabled with owner-only access through `user_owns_meeting(meeting_id)`. Existing meeting-scoped RLS policies are not changed to member-aware policies.
- No application runtime access is expanded; no dashboard sharing, member-management UI, realtime collaboration, autosave expansion, Local Mode change, or `meetings.meeting_data` removal/rewrite is included.
- Documentation was updated to match the migration and to keep PR 1B open for membership-aware RLS.

### PR 1B — Membership RLS foundation

- Owner access remains unchanged for `meetings` and every structured table.
- Accepted members can access only meetings they belong to.
- Non-members cannot read or mutate shared meeting rows by guessing IDs.
- Pending invite email alone does not grant runtime meeting access.
- Membership policies cover manual backup load/save and the `meeting_settings` structured pilot without policy drift.

### Dashboard and access-management follow-ups

- Dashboard distinguishes **Owned by Me** from **Shared with Me**.
- Owner-only access-management controls are not exposed as effective authorization for editors.
- Team Beta Owner and Editor users can edit shared meeting content under Last Save Wins behavior.
- Viewer enforcement is validated before Viewer is exposed in the UI.
- Local Mode remains browser-only and unexpanded. Backup export/import and Manual Save continue to work.

### PR 2A — Dashboard query/access abstraction

- `/dashboard` now loads cloud meeting cards through `listDashboardMeetings`, which reuses the existing `meetings` query and Supabase RLS instead of adding migrations, RLS changes, auth changes, Local Mode changes, invite UI, member-management UI, Viewer UX, autosave expansion, or realtime collaboration.
- `DashboardMeeting` classifies visible rows as owned when `owner_id` matches the signed-in user and shared otherwise; shared role lookup remains intentionally minimal because `meeting_members` is access-management data.
- Dashboard duplicate, archive, restore, and soft-delete controls are gated by `canManageMeetingLifecycle`, which is true only for owned meetings; shared meetings returned by RLS remain Open-only until PR 2B renders the final Shared with Me section.
- Duplicate inserts use an owner-only source guard, an explicit client-side meeting id, `return=minimal`, and a follow-up owner-visible fetch so insert success is not coupled to PostgREST representation reads under membership-aware RLS.
- Archived soft-delete uses `public.soft_delete_owned_archived_meeting(target_meeting_id uuid)`, a narrow owner-only RPC for archived, non-deleted meetings, because the membership-aware `meetings` update policy can reject a row after `deleted_at` makes it non-active. The RPC does not broaden shared editor permissions or return the updated hidden row.
- Owner account, shared/editor account, and non-member checks should be repeated on a Supabase-configured preview because local CI does not exercise deployed RLS.

### PR 2B — Owned by Me / Shared with Me dashboard UI

- `/dashboard` should show `Cloud Meetings` with separate `Owned by Me` and `Shared with Me` sections; owned and shared cards must not be mixed and no ownership badges should be used.
- Search should be a single dashboard search over both sections, with results still rendered under the correct section headings.
- Section contents should sort alphabetically by meeting name after search and archive filtering.
- The existing Show Archived toggle should hide archived owned and shared meetings when off, and show archived owned and shared meetings when on.
- Shared cards should show `Owner: <display name>` from existing metadata when available, email-derived display text when available, or `Owner` as the fallback; shared cards should expose only Open.
- Owner cards should keep existing lifecycle actions: active owned cards show Open, Duplicate, Archive; archived owned cards show Open, Restore, Delete.
- Preview validation should repeat Mariano owner-account checks, FSP shared/editor-account checks, and non-member visibility checks before merge.
- Invite User Flow, member management, ownership transfer, multiple owners, Viewer UX, realtime collaboration, autosave behavior changes, Supabase schema changes, migrations, RLS policy changes, authentication changes, and Local Mode changes remain deferred/out of scope.

### Explicit non-goals for validation

Do not add realtime collaboration test requirements for Phase 3 Team Beta: presence, cursors, websockets, CRDTs, and custom conflict resolution remain out of scope.

### PR 1B — Membership RLS foundation

Validation performed for `20260604090000_add_membership_rls_foundation.sql`:

- Migration SQL reviewed for coherent PostgreSQL/Supabase ordering: preserve `user_owns_meeting`, add membership-aware helper functions, add a new-meeting owner-membership trigger and an owner-id update guard, replace inherited `Workspace owners ...` `meetings` policies, keep access-management tables owner/manage-only, then replace owner-only structured-table policies with select/edit splits.
- Helper behavior is explicit: owners can access/edit/manage; active `owner` and `editor` membership rows can access/edit; active `viewer` membership rows can access/read; all membership checks require `removed_at is null`; pending invitation email text is never consulted for runtime access.
- `meetings.meeting_data` remains in place and is still loaded/saved through the `meetings` table, now protected by the membership-aware `meetings` select/update RLS policies rather than a separate API-only authorization helper.
- Meeting-scoped structured tables covered by membership RLS include `meeting_settings`, `objectives`, `tasks`, `standard_operating_objectives`, `strategic_topics`, `strategic_topic_notes`, `tactical_sessions`, `tactical_items`, `strategic_sessions`, and `strategic_session_notes`.
- Access-management tables covered by owner-only management policies are `meeting_members` and `meeting_invitations`; editors and viewers cannot manage members or invitations.
- PR 4B creates and policies `strategic_topic_notes`; validate owner/editor note writes, active-member reads, and non-member blocking.
- No dashboard sharing UI, invite UI, member-management UI, ownership transfer, multiple owners, Viewer UI/read-only enforcement, autosave expansion, realtime collaboration, Local Mode removal, or `meetings.meeting_data` rewrite is included.
- PR #77 manual validation passed for owner access, editor direct-URL access to the shared cloud meeting, removed-member blocking, pending invitations not granting access, and shared dashboard visibility remaining deferred to PR 2.
- Documentation now records the decision to defer detailed audit logging and per-user edit attribution.
- Full migration application and broader role-matrix validation should still be repeated in a Supabase-linked preview before deployed-environment merge when practical.

## PR 3A user profile validation

Automated validation:

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run `npm run build`.

Manual validation:

- Sign in as an existing user and confirm the dashboard bootstraps a profile without forcing setup.
- Open Dashboard Profile, set first and last name, save, refresh, and confirm the values persist.
- Confirm owned/shared dashboard cards show `Owner: <display_name>` when profile data exists.
- Confirm legacy users with no first/last name fall back to email, then `Owner` if no display data is available.
- Confirm direct profile editing is limited to the signed-in user's own row.


## PR 3B invite flow validation plan

Manual validation for the invite implementation PR should cover:

- Owner invites an existing user by email.
- Existing user signs in, sees a matching pending invite, accepts it, and the meeting appears under `Shared with Me` after refresh.
- Accepted invitation records `status = accepted`, `accepted_by`, and `accepted_at`; accepted membership is an active editor row.
- Owner revokes a pending invite, and the revoked invite cannot be accepted.
- Invite to a non-existing email remains pending until a user signs up/signs in with that same email, if allowed by the auth flow.
- Non-owner cannot create or revoke invites.
- Unrelated signed-in user cannot see or accept another email's invite.
- Existing active member cannot receive a duplicate pending invite.
- Pending invite alone does not allow direct meeting access before acceptance.
- Local Mode, existing dashboard card actions, Supabase schema outside the invite implementation, and RLS boundaries remain unchanged except where PR 3B explicitly adds invite RPC/policy support.

## PR 3B invite flow validation

Automated validation:

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run `npm run build`.

Manual validation:

- Owner can invite an existing user by email from an active owned dashboard card.
- Owner can see that meeting's pending invitations in the Access modal.
- Owner can revoke a pending invitation.
- Owner cannot create a duplicate active pending invite for the same meeting/email.
- Owner cannot invite an email that already belongs to an active meeting member.
- A signed-in user with a matching auth email sees the pending invitation in the dashboard pending-invitations section.
- An unrelated signed-in user does not see or accept another email's invitation.
- Invitee accepts the invitation, an active editor membership is created/reactivated, and the meeting appears in `Shared with Me` after dashboard refresh.
- Revoked and accepted invitations cannot be accepted again.
- Pending invitations alone do not allow direct meeting access before acceptance.
- Shared/editor users cannot manage invitations, non-owners cannot revoke invitations, non-members cannot access meetings, and existing meeting RLS remains intact.

## PR 3B follow-up validation

Automated validation:

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run `npm run build`.

Manual validation:

- Authenticated owner can create a new meeting from the dashboard.
- Created meeting has `owner_id = auth.uid()` and an active owner membership row.
- Owner can still invite a user, the invitee sees and accepts the pending invite, and the meeting appears under `Shared with Me`.
- Shared editor cannot access invite controls or manage another owner's meeting lifecycle/access.
- The pending-invitations dashboard section is hidden when the signed-in user has no pending invitations and shown only while loading or when invitations exist.

## Phase 3 PR 3C Member Management Validation Plan

Use this plan when the member-management implementation PR is created.

### Owner validation

- Owner sees an Owner row and active Editor rows in the Access panel.
- Owner can remove an active editor.
- Owner cannot remove themselves.
- Owner sees dashboard `Members: #` update after removal/refresh.
- Owner can re-invite a removed editor through the normal invite flow.
- Removed editor regains shared access only after accepting the new pending invitation.

### Editor validation

- Editor sees the active member list with Owner and Editor labels.
- Editor does not see member-removal controls.
- Editor cannot remove members by calling the removal API directly.
- Editor can view Tactical History.
- Editor loses meeting access after owner removal and refresh/reload.

### Non-member validation

- Non-member cannot open the meeting.
- Non-member cannot list members.
- Non-member cannot remove members.
- Non-member cannot view pending invitations for the meeting.

### Dashboard validation

- Member count includes the owner plus active editors.
- Member count excludes pending invitations.
- Member count excludes removed members.
- Member count excludes viewers.
- Removed editor no longer sees the meeting under `Shared with Me` after refresh/reload.

## Phase 3 PR 3C Member Management Validation

Automated validation:

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run `npm run build`.

Manual validation:

- Owner account sees the owner row, `Editors` section with active editor rows, pending invitations, invite email input, and active-editor remove controls in the Access modal.
- Owner account can invite a user, revoke a pending invitation, remove an active editor, and cannot remove the owner/self.
- Owner dashboard cards show `Owner: Test One` when a profile display name exists and `Members: #` correctly; counts exclude pending invitations, removed members, and viewers.
- Editor account sees owner/editor display names from a shared dashboard card, sees the active editor list labeled `Editors`, does not see invite or remove controls, cannot remove members by direct RPC, can view Tactical History, and loses access after owner removal plus refresh/reload.
- Non-member account cannot see the meeting, list members, remove members, or view Tactical History for the meeting.
- Re-invite flow works through the normal invitation path: a removed editor receives a new pending invite, accepts it, regains access, and member count updates after refresh/reload.

## PR 3D Shared Access Hardening Review Validation

This PR is documentation/review only.

Automated/document validation:

- Confirm the diff is limited to `planning/` and `docs/`.
- Confirm no `app/` code changes.
- Confirm no `supabase/migrations/` changes.
- Confirm no RLS, schema, authentication, Local Mode, autosave, or runtime behavior changes.

Recommended closeout validation environment:

- Keep one protected live account/meeting out of PR validation.
- Use `test1@example.test` as the primary owner test account.
- Use `test2@example.test` as the shared/editor invitee account.
- Use `test3@example.test` as the unrelated/non-member security account.
- Keep test meetings owned by the test accounts.
- Do not require personal email accounts for routine validation.

Recommended validation for the follow-up lifecycle hardening PR:

- Owner can still open, edit, Manual Save, archive, restore, soft-delete archived meetings, invite, revoke, list members, remove active editors, and view Tactical History.
- Editor can still open shared meetings, edit content, Manual Save while structured autosave is incomplete, list members read-only, and view Tactical History.
- Editor cannot create/revoke invitations, remove members, archive, restore, soft-delete, rename/title-edit the meeting container, or duplicate a shared meeting through UI or direct API/RPC attempts.
- Removed editor loses access after refresh/reload and is excluded from dashboard member count.
- Pending invitee cannot open a meeting before acceptance.
- Non-member cannot open the meeting, list members, accept another user's invite, or view Tactical History.

## Phase 3 PR 3D Lifecycle Mutation Hardening Validation

Automated validation:

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run `npm run build`.

Manual validation:

- Owner/Test One can create a cloud meeting, open it, edit content, use Manual Save, duplicate an owned meeting, archive it, restore it, soft-delete it while archived, invite/revoke/list/remove editors, and view Tactical History.
- Editor/Test Two can open a shared meeting, edit content, use Manual Save/full workspace backup, view the member list, and view Tactical History.
- Editor/Test Two does not see dashboard archive, restore, delete, duplicate, invitation-management, or member-removal controls for shared meetings.
- Editor/Test Two direct REST/RPC attempts to mutate protected meeting container/lifecycle fields (`name`, `owner_id`, `metadata_json`, `archived_at`, `deleted_at`) fail.
- Removed editor access is lost after refresh/reload.
- Non-member/Test Three cannot open the meeting, list members, mutate the meeting, or view Tactical History.

## Phase 4 PR 4A Autosave Audit Validation

This PR is documentation/review only.

Automated/document validation:

- Confirm the diff is limited to `planning/` and `docs/`.
- Confirm no `app/` code changes.
- Confirm no `supabase/migrations/` changes.
- Confirm no RLS, schema, authentication, Local Mode, autosave, Manual Save, UI, or runtime behavior changes.

Recommended validation for the next implementation PRs:

- Owner and editor can refresh a Cloud Meeting after editing a newly structured surface and see the saved structured data without Manual Save.
- Owner and editor can still use Manual Save as full-workspace backup while structured autosave expands.
- Stale owner/editor Last Save Wins scenarios are explicitly tested and documented.
- Session-expiry testing confirms structured autosave failures and Manual Save failures surface clearly while browser-local data remains available in the same browser.
- Import/restore still applies only to the current browser view until Manual Save writes the backup to `meetings.meeting_data`.
- Direct REST/RPC negative tests continue to confirm editors cannot mutate owner-only meeting container/lifecycle fields.


## Phase 4 PR 4B Strategic Topics Autosave Review Validation

This PR is documentation/review only.

Automated/document validation:

- Confirm the diff is limited to `planning/` and `docs/`.
- Confirm no `app/` code changes.
- Confirm no `supabase/migrations/` changes.
- Confirm no schema, RLS, authentication, Local Mode, Manual Save, autosave implementation, UI, or runtime behavior changes.

Recommended validation for a future implementation PR:

- Owner can create, edit, complete, restore, archive, unarchive, and order Strategic Topics, then refresh and see structured cloud data without Manual Save.
- Owner can edit Topic Notes, refresh, and open a new browser/profile with notes intact.
- Editor can edit Strategic Topics and Topic Notes, refresh, and open a new browser/profile with changes intact.
- Non-member and pending invitee cannot access topic/note rows; removed editor loses access after refresh/reload.
- Manual Save still backs up the full workspace, and Local Mode remains browser-only.


## Phase 4 PR 4B Strategic Topics Autosave Validation

Automated validation:

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run `npm run build`.

Manual validation:

- Owner creates, edits, completes, archives, restores, reorders Strategic Topics, edits Topic Notes, refreshes, and confirms structured persistence.
- Editor opens a shared meeting, edits/reorders Strategic Topics and Topic Notes, refreshes or opens another browser/profile, and sees the same order/content.
- Non-member cannot access topic or note rows; a removed editor loses topic/note access after refresh/reload.
- Manual Save, export, import, workspace backup restore, Local Mode, and existing meetings backed only by `meeting_data` still load.
- Last Save Wins remains expected for concurrent edits; do not validate realtime merge behavior because it is intentionally deferred.


## PR 4B Follow-up Strategic Topic Notes Backup Validation

- Create a Strategic Topic, add a Topic Note, Manual Save, export a backup, create a new meeting, import/restore the backup, open the Strategic Topic Note, and confirm the note content is restored.
- Confirm Strategic Topic creation/edit/order autosave still persists after refresh and in a private window.
- Confirm editor topic/note/order autosave still works, Local Mode still works, and Manual Save still works.

## Phase 4 PR 4C Meeting Notes / Cascading Communications Autosave Review Validation

This PR is documentation/review only.

Automated/document validation:

- Confirm the diff is limited to `planning/` and `docs/`.
- Confirm no `app/` code changes.
- Confirm no `supabase/migrations/` changes.
- Confirm no schema, RLS, authentication, Local Mode, Manual Save, autosave implementation, UI redesign, or runtime behavior changes.

Recommended validation for a future implementation PR:

- Owner edits Meeting Notes, refreshes, and sees the changes without Manual Save.
- Owner edits Cascading Communications, refreshes, and sees the changes without Manual Save.
- Owner opens the Cloud Meeting in a new browser/profile/private window and sees Meeting Notes and Cascading Communications.
- Owner uses Manual Save, exports a backup, imports/restores it, and confirms Meeting Notes and Cascading Communications remain backup-compatible.
- Editor edits Meeting Notes and Cascading Communications; owner refreshes and sees the editor changes.
- Editor refreshes or opens a new browser/profile/private window and sees the shared changes.
- Non-member is blocked from the meeting and structured rows.
- Removed editor loses access after refresh/reload.
- Local Mode remains browser-only, Manual Save remains available, and Agenda Items / Decisions / Actions behavior is unchanged.

## Phase 4 PR 4C Meeting Notes / Cascading Communications Validation

Automated checks for the implementation PR:

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run `npm run build`.

Manual validation should cover:

- Owner edits Meeting Notes, refreshes, and confirms the notes persist without Manual Save.
- Owner edits Cascading Communications, refreshes, and confirms the cascade items persist without Manual Save.
- Owner opens the same Cloud Meeting in a private window/new browser and confirms Meeting Notes and Cascading Communications appear.
- Owner runs Manual Save, exports a backup, creates/opens another Cloud Meeting, imports the backup, and confirms Meeting Notes and Cascading Communications restore.
- Editor opens a shared meeting, edits Meeting Notes and Cascading Communications, refreshes, and confirms the owner sees the editor changes after refresh.
- Non-member cannot open the meeting or read/write `meeting_notes` rows.
- Removed editor loses access after refresh/reload.
- First-class autosaved surfaces in PR 4C are limited to Meeting Notes and Cascading Communications.
- Agenda Items and Decisions/Actions remain compatibility pass-through fields inside the current `MeetingRecord`/`notes_json` shape; their UI behavior is unchanged and they are not validated as first-class structured autosave surfaces.
- Local Mode, Manual Save, Strategic Topics autosave, Topic Notes backup/import, Agenda Items, and Decisions/Actions remain unchanged.

Remaining before-main autosave dependencies: Defining Objectives, Tasks, and Standard Operating Objectives are intentionally deferred to PR 4D. Agenda/Decision structured schema and workflow redesign remain deferred.

## Phase 4 PR 4D Objectives / Tasks / SOOs Autosave Review Validation

This PR is documentation/review only.

Document validation:

- Confirm the diff is limited to `planning/` and `docs/`.
- Confirm there are no `app/` code changes.
- Confirm there are no `supabase/migrations/` changes.
- Confirm there are no runtime behavior, RLS, Local Mode, Manual Save, or UI redesign changes.

Future implementation validation:

Owner:

- Edit Top Priority / Thematic Goal if applicable and confirm it remains settings/playbook state, not Defining Objective storage.
- Create, edit, reorder, complete, color, and delete Defining Objectives.
- Create, edit, complete, and delete Tasks.
- Edit Task details: rich description, assignee, due date, subtasks, comments, and activity history.
- Create, edit, reorder, recolor, and delete Standard Operating Objectives.
- Refresh the same browser and confirm DO/task/SOO changes persist.
- Open a private window/new browser as owner and confirm DO/task/SOO state hydrates from cloud.
- Manual Save, export, import, and confirm DO/task/SOO state and nested Task details survive.

Editor:

- Edit DOs, Tasks, nested Task details, and SOOs.
- Refresh and confirm edits persist.
- Confirm owner sees editor changes after refresh/load.
- Open a private window/new browser and confirm cloud-hydrated state.

Security:

- Confirm a non-member cannot open the meeting or directly select/mutate DO/task/SOO rows.
- Confirm a removed editor loses access after refresh/reload and cannot directly select/mutate DO/task/SOO rows.

Regression:

- Confirm `meeting_settings` autosave still works.
- Confirm Strategic Topics autosave still works.
- Confirm Topic Notes autosave still works.
- Confirm Strategic Topic ordering autosave still works.
- Confirm Meeting Notes autosave still works.
- Confirm Cascading Communications autosave still works.
- Confirm Local Mode remains browser-only.
- Confirm Manual Save remains the full workspace backup.
