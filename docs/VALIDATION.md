# Validation

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
- Meeting-scoped structured tables covered by PR 1B are `meeting_settings`, `objectives`, `tasks`, `standard_operating_objectives`, `strategic_topics`, `tactical_sessions`, `tactical_items`, `strategic_sessions`, and `strategic_session_notes`.
- Access-management tables covered by owner-only management policies are `meeting_members` and `meeting_invitations`; editors and viewers cannot manage members or invitations.
- The repository migrations do not currently create `strategic_topic_notes`, so PR 1B intentionally does not invent that table or add policies for it.
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
