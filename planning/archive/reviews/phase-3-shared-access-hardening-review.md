# Phase 3 Shared Access Hardening Review

Date: 2026-06-05
Branch target: `phase-3-shared-access`
PR intent: PR 3D architecture/security review only. No runtime behavior, app-code, Supabase schema, migration, RLS policy, auth, Local Mode, autosave, UI, Viewer UX, ownership-transfer, organization, realtime, or member-management implementation changes.

## Files reviewed

### Planning and documentation

- `planning/STATE.md`
- `planning/DECISIONS.md`
- `planning/QUESTIONS.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/PERMISSIONS.md`
- `docs/VALIDATION.md`
- `planning/reviews/phase-3-dashboard-shared-access-review.md`
- `planning/reviews/phase-3-invite-flow-review.md`
- `planning/reviews/phase-3-member-management-review.md`

### App/auth/access code reviewed for behavior boundaries only

- `app/lib/supabaseClient.ts`
- `app/lib/dashboardMeetings.ts`
- `app/dashboard/page.tsx`
- `app/meeting/[id]/page.tsx`
- `app/components/meeting/MeetingWorkspace.tsx`
- `app/hooks/useSupabaseAuth.ts`

### Supabase migrations reviewed

- `supabase/migrations/20260516000000_create_workspaces.sql`
- `supabase/migrations/20260517000000_add_workspace_data.sql`
- `supabase/migrations/20260521000000_rename_workspaces_to_meetings.sql`
- `supabase/migrations/20260523110000_add_meetings_archived_at.sql`
- `supabase/migrations/20260528090000_add_meetings_deleted_at.sql`
- `supabase/migrations/20260603090000_align_shared_access_schema.sql`
- `supabase/migrations/20260604090000_add_membership_rls_foundation.sql`
- `supabase/migrations/20260604100000_add_admin_readability_views.sql`
- `supabase/migrations/20260604110000_add_user_metadata_to_admin_readability_views.sql`
- `supabase/migrations/20260604120000_add_owned_archived_meeting_soft_delete_rpc.sql`
- `supabase/migrations/20260604130000_add_user_profiles.sql`
- `supabase/migrations/20260604140000_add_invite_flow_rpcs.sql`
- `supabase/migrations/20260604150000_add_owned_meeting_create_rpc.sql`
- `supabase/migrations/20260605100000_add_member_management_rpcs.sql`
- `supabase/migrations/20260605110000_refine_member_display_names.sql`

## Executive recommendation

Phase 3 shared access is functionally close, but it should not be closed until one small implementation hardening PR separates owner-only meeting lifecycle mutations from editor content/full-backup mutations at the database/API boundary.

The review found no evidence that pending invitations grant meeting access, that removed editors retain access after refresh/reload, or that profile metadata is used for authorization. The main hardening issue is that the membership-aware `meetings` update policy intentionally lets active editors update the `meetings` row so Manual Save can continue writing `meeting_data`, but that same broad row update can also mutate container lifecycle fields such as `archived_at`, `deleted_at`, and `name` if called directly. The dashboard UI gates lifecycle buttons correctly for owners, and archived soft-delete already has an owner-only RPC, but database/API hardening should make lifecycle columns owner-only rather than relying on UI affordances.

Recommended next PR: **PR 3E Lifecycle Mutation Hardening**.

## Finding categories

### Must fix before Phase 3 complete

1. **Harden `meetings` lifecycle mutations so active editors cannot directly archive, restore, soft-delete, or rename a cloud meeting through the broad `meetings` update path.**
   - Current intent: editors can edit content and Manual Save full workspace backup.
   - Current risk: the `Meeting editors can update active meetings` policy is broad enough for editor direct REST updates to fields beyond `meeting_data` and the narrow autosave settings surface.
   - Recommended scope: introduce narrow owner-only RPCs or column-specific safeguards for archive/restore/delete/rename lifecycle operations, and constrain editor updates to the content/backup fields that remain necessary during the autosave migration.
   - Do not expand autosave in that hardening PR.

### Should fix before main

1. **Document and/or implement stale dashboard refresh expectations after access changes.**
   - Owner-side member count is optimistically decremented and then refreshed, which is acceptable but can be stale until the refresh resolves.
   - Removed editors may retain an already-open in-memory meeting until refresh/reload; this matches the current expected boundary, but should stay explicit in docs and validation.
2. **Tighten wording around `Access` vs `Members`.**
   - The owner view is an access-management panel.
   - The editor view is a members/read-only visibility panel.
   - Future polish can make this clearer without adding new role editing, Viewer UX, or member-management features.
3. **Keep direct RPC validation in the Phase 3 closeout test pass.**
   - Specifically test editor attempts to call invite, revoke, remove, archive/restore/delete/rename lifecycle, and non-member attempts to list members or accept another user's invite.

### Backlog / Phase 4

- Autosave audit / structured autosave expansion.
- Forgot password.
- Meeting rename/edit title.
- Import backup to a new cloud meeting.
- Dashboard card UX polish.
- Tactical History rename.
- Responsive/sticky header polish.
- Manual Save retirement or move into secondary backup/export utility.
- Ownership transfer.
- Multiple owners.
- Viewer UX/read-only enforcement.
- Role editing.
- Organizations.
- Audit history.
- Realtime collaboration.
- Email delivery and tokenized invite links.

## 1. Ownership model review

### Confirmed

- `meetings.owner_id` remains the authoritative owner reference for Phase 3.
- Owner membership rows are compatibility/future-expansion rows and do not replace `meetings.owner_id` as the owner authority.
- The owner-membership trigger keeps an active owner row aligned for new meetings.
- The owner-id update trigger blocks ownership transfer because ownership transfer is not implemented.
- Owner self-removal is blocked in the member-removal RPC and no dashboard owner remove control is exposed.
- Ownership transfer remains deferred to Phase 4/backlog.

### Findings

- No reviewed runtime UI treats multiple owners as available.
- Some helper names and role vocabulary include `owner` membership rows, which is acceptable if docs continue to state that `meetings.owner_id` is authoritative today.
- Keep future docs from implying `meeting_members.role = owner` is sufficient authority without the corresponding `meetings.owner_id` row.

## 2. Role model review

### Confirmed

- Durable role vocabulary is `owner`, `editor`, `viewer`.
- Phase 3 UI exposes only owner/editor behavior.
- Viewer remains schema/RLS-direction only and has no Phase 3 UI/read-only experience.
- Editors can edit meeting content and use current full-workspace Manual Save paths for accessible meetings.
- Editors cannot manage invites or remove members through the UI or the member/invite RPC guards.
- Dashboard lifecycle actions are hidden/guarded in UI for shared/editor cards.

### Findings

- Legacy `admin`/`member` values were migrated to `editor`; no current docs should reintroduce `admin` as a durable runtime role.
- `DashboardMeetingRole` includes `viewer` as a type placeholder, but current mapping returns `owner` or `null`; this does not expose Viewer behavior.
- Must-fix hardening: database/API update boundaries should make archive, restore, soft-delete, and rename/title lifecycle mutations owner-only even if an editor calls REST directly.

## 3. Invitation lifecycle review

Reviewed RPCs:

- `create_meeting_invitation`
- `list_meeting_pending_invitations`
- `revoke_meeting_invitation`
- `list_my_pending_meeting_invitations`
- `accept_meeting_invitation`

### Confirmed

- A pending invitation does not grant meeting access; runtime access uses owner or active membership helpers.
- Invitees can list only pending invitations matching the signed-in normalized auth email.
- Invitees can accept only matching pending invites.
- Acceptance creates a new editor membership or reactivates a removed membership by clearing `removed_at`.
- `accepted_by` and `accepted_at` are populated during acceptance.
- Revoked or accepted invites cannot be accepted again because acceptance requires `status = pending`.
- Duplicate pending invites are blocked by both an RPC check and the partial unique index on pending invites.
- Active members cannot be re-invited by email.
- Revoked and accepted invite history is preserved.
- Re-inviting after removal follows the normal pending-invite and explicit-acceptance flow.

### Edge cases to carry forward

- Email matching depends on normalized auth email. If a user's auth email changes, existing pending invites for the old email will not match; this is acceptable for Team Beta and should be documented if it becomes common.
- Invitations do not expire automatically; revocation remains the only pending-invite cleanup path.
- Tokenized invite links and automated email delivery remain deferred.

## 4. Member lifecycle review

Reviewed RPCs/data:

- `list_meeting_members`
- `remove_meeting_editor`
- `get_accessible_meeting_member_counts`
- `meeting_members.removed_at`

### Confirmed

- Owners and active editors can list active owner/editor members for meetings they can access.
- Non-members cannot list members because the listing RPC requires `user_can_access_meeting`.
- Owners can remove active editors.
- Editors cannot remove members because removal requires `user_can_manage_meeting_access`, which resolves to `meetings.owner_id = auth.uid()`.
- Owner rows cannot be removed.
- Owner self-removal is blocked.
- Removal sets `meeting_members.removed_at`; it does not delete the membership row.
- Removed members lose access after refresh/reload because access helpers require `removed_at is null`.
- Removed members are excluded from dashboard member counts.
- Pending invitations are excluded from dashboard member counts.
- Viewers are excluded from dashboard member counts.
- Invite history is preserved after member removal.

### Risks / notes

- Dashboard member count can be stale briefly after removal until refresh completes.
- A removed editor with an already-loaded meeting may see stale in-memory content until refresh/reload. This is the documented Phase 3 boundary and should be retested before closeout.
- The member list correctly avoids removed rows and viewer rows for Phase 3.

## 5. Dashboard access model review

### Confirmed

- `listDashboardMeetings` loads RLS-visible meetings and classifies `meeting.owner_id === currentUserId` as `owned`; visible non-owned rows are classified as `shared`.
- Owned meetings render under `Owned by Me`; shared meetings render under `Shared with Me`.
- Lifecycle action rendering is tied to `canManageMeetingLifecycle`, which is owner-only in the helper.
- Shared/editor cards do not render duplicate/archive/restore/delete buttons.
- Owner cards expose `Access`; shared/editor cards expose `Members` and can open the read-only member panel.
- Dashboard cards show member counts only as a count, not member names.
- Archived shared meetings follow the same dashboard archived visibility toggle as owned meetings.

### Findings

- UI affordance gating is consistent with Phase 3 requirements.
- Security-sensitive lifecycle behavior should not rely on UI gating alone; see must-fix lifecycle mutation hardening.
- Future UX wording can make the owner access-management panel vs editor members-only panel clearer.

## 6. Meeting route access review

Reviewed `/meeting/[id]` and `MeetingWorkspace` bootstrap behavior.

### Confirmed

- Owners can open owned cloud meetings through RLS-visible meeting row access.
- Active editors can open shared cloud meetings through membership-aware RLS.
- Removed editors cannot open after refresh/reload because the meeting select/load path no longer sees the row.
- Non-members cannot open because the meeting row is not RLS-visible.
- Local Mode remains separate at `/meeting/local` and is not changed by shared access.
- The meeting route does not add access-management UI controls for editors.

### Finding

- Editors currently share the same meeting workspace editing surface as owners. This is intended for Phase 3 owner/editor behavior, with Viewer read-only enforcement deferred.

## 7. Profile visibility review

### Confirmed

- Profile data is display metadata only and is not used for authorization.
- Owner/member displays prefer `display_name`, then email fallback.
- Broad direct profile table access remains own-row scoped; accessible owner/member display is exposed through narrow security-definer helpers.
- No avatars or extra profile fields are introduced.

### Notes

- Email fallback remains necessary for legacy/incomplete profile rows and for users without display names.
- Future polish can reduce email exposure in routine UI by encouraging profile display-name setup, but authorization must continue to use `auth.uid()`/membership and not profile fields.

## 8. Tactical History visibility review

### Confirmed

- Owners can view Tactical History.
- Editors can view Tactical History.
- Viewer behavior remains deferred.
- No owner-only Tactical History restriction was introduced in Phase 3.

## 9. Recommended testing environment

Routine PR validation should use dedicated test accounts and test meetings rather than protected live operational meetings:

- Keep one protected live account/meeting that is not used for PR validation.
- Use `test1@example.test` as the primary owner test account.
- Use `test2@example.test` as the shared/editor invitee account.
- Use `test3@example.test` as the unrelated/non-member security account.
- Test meetings should belong to test accounts.
- Personal email accounts should not be required for routine validation.

## 10. Deferred backlog confirmation

The following remain deferred and should not be implemented in PR 3D or the recommended lifecycle hardening PR unless explicitly rescoped:

- Autosave expansion.
- Forgot password.
- Meeting rename/edit title.
- Import backup to a new cloud meeting.
- Dashboard card UX polish.
- Tactical History rename.
- Responsive/sticky header polish.
- Manual Save retirement or move.
- Ownership transfer.
- Multiple owners.
- Viewer UX.
- Role editing.
- Organizations.
- Audit history.
- Realtime collaboration.
- Email delivery/tokenized invite links.

## 11. Recommended PR 3D / next implementation scope

Because this PR is documentation/review only, the implementation work should be a follow-up PR with narrow scope:

1. Keep Manual Save functional for owners and editors while structured autosave remains incomplete.
2. Prevent editor direct updates to owner-only meeting lifecycle/container fields such as `archived_at`, `deleted_at`, and `name`.
3. Prefer narrow owner-only RPCs for archive/restore/rename lifecycle operations, matching the existing owner-only soft-delete RPC pattern.
4. Preserve `meetings.owner_id` authority and do not add ownership transfer.
5. Do not add Viewer UX, role editing, organizations, realtime collaboration, Local Mode changes, or autosave expansion.
6. Add direct RPC/REST negative tests or manual validation steps for editor/non-member lifecycle and access-management attempts.

## Phase 3 completion recommendation

Phase 3 can be considered complete after a small lifecycle mutation hardening PR and a Supabase-linked validation pass with owner, editor, and non-member accounts. No blocker was found in invitation acceptance, member listing/removal, owner/member attribution, dashboard sectioning, meeting route access, profile visibility, or Tactical History visibility that requires expanding Phase 3 scope beyond that hardening work.
