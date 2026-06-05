# Permissions

## Current State (Membership-Aware Cloud Meetings)

- Signed-out users can use Local Workspace via `localStorage` and export/import.
- Signed-in users can create cloud meetings they own and can access cloud meetings where RLS recognizes their active membership.
- Owners and active `owner`/`editor` members can manually save/load meeting workspace data through `meetings.meeting_data`; active `viewer` members can read meeting rows, but Viewer UI/enforcement remains deferred.
- RLS is the runtime authorization source for cloud meeting rows, the full-workspace `meeting_data` backup path, the `meeting_settings` pilot, tactical/strategic history tables, membership rows, and invitation rows.

## Membership Architecture (Foundation)

The permission foundation is membership-first, not email-first.

### Core tables and identity

- `meetings`: canonical meeting container; `owner_id` is the current authority for owner-level administration.
- `meeting_members`: membership edge table linking `meeting_id` + `user_id` with lifecycle/status fields as needed.
- Domain tables (for example `tasks`, `objectives`, `strategic_topics`) reference `meeting_id` and inherit access from membership and role policy.

### Access evaluation order

1. Verify authenticated user identity (`auth.uid()`).
2. Resolve meeting scope (`meeting_id`).
3. Resolve membership row in `meeting_members`.
4. Resolve effective role for the requested action.
5. Apply entity-level constraints (for example delete restrictions, archival rules, session locks).

This keeps authorization consistent across all section/item tables and avoids one-off policy drift.

## Roles (Current PR 1B Authorization Shape)

Role behavior is now enforced at the database policy layer for meeting access and editing. Final UI affordances and finer container actions can still be refined later:

- `owner`
  - Meeting administrator.
  - Can manage membership and role assignment.
  - Can perform all workspace operations, including destructive actions.
- `editor`
  - Can create/update operational meeting content.
  - Can participate in structured write surfaces (tasks, objectives, topics, items).
  - Cannot transfer ownership or manage sensitive membership actions unless explicitly granted.
- `viewer`
  - Read-focused participation.
  - No destructive mutations.
  - Intended for stakeholders needing meeting visibility without operational editing authority.

## Ownership Handling

Ownership needs explicit, auditable behavior rather than implicit assumptions.

### Owner invariants

- Every cloud meeting has exactly one active owner authority at a time.
- Owner authority is represented by durable user identity (UUID), not email text.
- Runtime policies should treat owner checks as role/capability checks, not hard-coded UI assumptions.

### Ownership transfer direction (future)

- Transfer should be explicit and reversible-safe (confirmation + audit metadata).
- Transfer should update both meeting authority and membership role mapping atomically.
- Transfer behavior should not break existing manual Save/Load or backup/export expectations.

## Permission Foundation Principles

These principles guide policy expansion:

1. **Least privilege first**: default deny; grant only required actions per role.
2. **Single policy model**: avoid per-feature custom auth logic that bypasses membership checks.
3. **RLS as source of truth**: UI state is advisory; database policy is authoritative.
4. **Stable migration path**: keep owner-only behavior valid while editor/viewer expansion is phased in.
5. **Backup safety preserved**: permission changes must not remove JSON export/import recovery paths.
6. **No overbuild in Phase 1/early Phase 2**: add only permission surfaces needed for the current structured-write rollout.

## Structured Persistence Permissions

Permission design now uses explicit meeting membership rows for runtime access while preserving `meetings.owner_id` as the owner compatibility path.

### Current model

- `meeting_members` links authenticated users to meetings.
- Current roles are `owner`, `editor`, and `viewer`.
- Meeting owner remains the meeting administrator through `meetings.owner_id`.
- Active members gain row access through shared helper functions and RLS policies.

### Policy principles

- Do not rely on email text fields for authorization.
- Use authenticated user IDs and active membership relationships.
- `owner_email` (if kept) is convenience metadata only (admin/debug), not policy authority.

## Phase 3 Shared Access Permission State After PR 1B

PR 1B adds the membership-aware RLS foundation. It does not add dashboard sharing UI, invite UI, member-management UI, Local Mode changes, autosave expansion, ownership transfer, multiple owners, or realtime collaboration.

### Schema-aligned role state

- `meeting_members.role` is migrated from the older `owner`/`admin`/`member` vocabulary to `owner`/`editor`/`viewer`.
- Existing `owner` rows remain `owner`; existing `admin` and `member` rows become `editor`.
- The role constraint now accepts only `owner`, `editor`, and `viewer`.
- Every pre-existing `meetings.owner_id` user is backfilled into `meeting_members` with role `owner`, new meetings receive an owner membership row through the PR 1B trigger, and `meetings.owner_id` remains the owner authority for compatibility and access management.

### Invitation permissions

- `meeting_invitations` stores pending, accepted, and revoked meeting-scoped invite records.
- Pending invitation email is normalized as lowercase trimmed text and can exist before an `auth.users` row exists.
- Duplicate active pending invitations for the same meeting and normalized email are blocked by a partial unique index.
- Email text is not runtime authorization authority; runtime access is tied to authenticated user identity and an active `meeting_members` row.

### RLS helper functions after PR 1B

- `public.user_owns_meeting(target_meeting_id uuid)` remains the owner compatibility helper and checks `meetings.owner_id = auth.uid()`.
- `public.user_is_active_meeting_member(target_meeting_id uuid)` returns true only for authenticated users with a `meeting_members` row for that meeting, role `owner`, `editor`, or `viewer`, and `removed_at is null`.
- `public.user_can_access_meeting(target_meeting_id uuid)` allows the owner or any active member role to read meeting-scoped content.
- `public.user_can_edit_meeting(target_meeting_id uuid)` allows the owner or active `owner`/`editor` membership to edit meeting-scoped content.
- `public.user_can_manage_meeting_access(target_meeting_id uuid)` remains owner-only for access management.
- `public.ensure_meeting_owner_member()` maintains an active owner membership row when a new meeting is created; `public.prevent_meeting_owner_id_update()` blocks implicit ownership transfer because transfer is not implemented.

### RLS behavior after PR 1B

- `meetings` select allows non-deleted meetings when `user_can_access_meeting(id)` is true.
- `meetings` update allows `user_can_edit_meeting(id)` so the existing `meetings.meeting_data` Manual Save path can work for Team Beta editors; insert remains `owner_id = auth.uid()`.
- `meeting_settings`, `objectives`, `tasks`, `standard_operating_objectives`, `strategic_topics`, `strategic_topic_notes`, `tactical_sessions`, `tactical_items`, `strategic_sessions`, and `strategic_session_notes` allow active members to select and active owners/editors to insert/update/delete.
- `meeting_members` remains owner/manage-only for select, insert, update, and delete. Editors and viewers cannot invite, remove, or change roles through RLS.
- `meeting_invitations` remains owner/manage-only. Pending invite email alone does not grant runtime access.
- Archived dashboard soft-delete uses the narrow `soft_delete_owned_archived_meeting` RPC so only `meetings.owner_id = auth.uid()` can mark an archived, non-deleted meeting as deleted without granting editors container lifecycle permissions.
- Removed members (`removed_at is not null`) are excluded from all access/edit helpers.
- PR 4B formalizes `strategic_topic_notes` with membership-aware RLS: active members can read, and active owners/editors can insert/update/delete.

### Team Beta capability shape

| Capability                             | Owner               | Editor                                                | Viewer        | PR 1B runtime state                                                                                          |
| -------------------------------------- | ------------------- | ----------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------ |
| View shared meeting                    | Yes                 | Yes                                                   | Yes           | Membership-aware RLS grants read access to active members.                                                   |
| Edit operational meeting content       | Yes                 | Yes                                                   | No            | Owners and active editors can edit meeting-scoped content; Viewer UI/read-only enforcement remains deferred. |
| Use Manual Save full-workspace backup  | Yes                 | Yes for Team Beta unless narrowed by a later decision | No by default | `meetings` update RLS allows owners/editors so `meeting_data` save can work for editors.                     |
| Invite/revoke members and change roles | Yes                 | No                                                    | No            | Access-management tables remain owner/manage-only; no UI/runtime flow added yet.                             |
| Transfer ownership                     | Later explicit flow | No                                                    | No            | Not implemented; `owner_id` updates are blocked.                                                             |

The first Team Beta may expose only Owner and Editor behavior in UI. Viewer can read at the database policy layer after PR 1B, but read-only workspace UX/enforcement remains deferred until Viewer is intentionally exposed.

### Admin readability views

- Admin readability views join selected meeting-scoped tables to `meetings.name` for easier Supabase inspection.
- Membership and invitation readability views also expose `auth.users.email` as display metadata because the current migrations do not define a public profile/user metadata table.
- `user_id` remains the authorization authority. Email display fields such as `member_email`, `invited_by_email`, and `accepted_by_email` are inspection-only and must not be used for access checks.
- These views do not grant new meeting access, change dashboard visibility, alter authentication, modify meeting membership permissions, add stored name/email columns to `meeting_members`, or change any RLS policy.
- The views use invoker security so inspection follows the underlying table privileges/RLS posture instead of creating a new runtime access path or broadening access to auth user data.

### Audit and attribution posture

- Detailed audit logging and per-user edit attribution are deferred. Do not add audit tables, edit history, activity feeds, or per-field attribution unless a future product decision explicitly prioritizes them.
- Lightweight `updated_at` remains useful for freshness, ordering, and operational debugging. Future `updated_by` may be considered only on major structured tables if it becomes valuable during structured autosave expansion; it is not part of PR 1B.
- The current safety model relies on database access control, owner-only access management, meeting lifecycle state, read-only past/ended meetings, and backup/manual-save protection rather than attribution-heavy collaboration features.

### Deferred ownership models

- Keep one active owner authority for the initial rollout.
- Add explicit ownership transfer later.
- Do not implement multiple owners or organization/admin ownership in PR 1A.

## Out of Scope in This Planning Stage

- Realtime collaboration policies, presence, cursors, websockets, CRDTs, and conflict resolution.
- Full org/team hierarchy or organization/admin ownership.
- Multiple active owners.
- Ownership-transfer UI or migration behavior.
- Final granular viewer permission matrix per entity/action.

## Profile permissions

- Authenticated users may select, insert, and update only their own `profiles` row through direct table RLS.
- Profile triggers keep email and display-name derivation server-side so users cannot spoof another account's email or hand-edit derived display names.
- Dashboard owner attribution for shared meetings does not open broad profile reads. It uses `get_accessible_meeting_owner_profiles()`, which returns only owner display/email fallback data for meetings the caller can already access through meeting RLS helpers.
- Future access-management UI should continue to treat meeting ownership and membership IDs as authorization facts; profile data is display metadata only.


## Invite permissions direction

- Owners are the only users who should create or revoke pending invitations for a meeting. Editors and viewers must not manage access.
- Pending invitations do not grant meeting read or edit access. Access begins only after a pending invitation is accepted and an active `meeting_members` row exists.
- Invitee pending-invite reads should be scoped to the signed-in user's current normalized auth email. Users must not see invitation rows for other email addresses.
- Invitation acceptance should require a matching pending invite for the signed-in user's normalized auth email, reject revoked or accepted rows, create/reactivate an editor membership, and stamp `accepted_by`/`accepted_at`.
- Revocation should only affect pending invitations. Removing accepted members belongs to a later member-management PR.

## Phase 3 PR 3B Invitation Permissions

PR 3B adds explicit invite RPCs without broadening meeting RLS:

- `create_meeting_invitation(target_meeting_id, invite_email)` allows only meeting access managers (currently the owner) to create pending editor invitations.
- `list_meeting_pending_invitations(target_meeting_id)` allows only meeting access managers to list pending invitations for that meeting.
- `revoke_meeting_invitation(target_invitation_id)` allows only meeting access managers to revoke pending invitations.
- `list_my_pending_meeting_invitations()` returns only pending invitations whose normalized email matches the signed-in user's normalized auth email.
- `accept_meeting_invitation(target_invitation_id)` requires a matching signed-in email and atomically creates/reactivates editor membership before marking the invitation accepted.

Pending invitations are not access grants. Runtime access remains based on `meetings`/meeting-scoped RLS and active `meeting_members` rows. Editors can edit shared meetings after acceptance but cannot create, list, or revoke invitations.

## PR 3B follow-up meeting creation permission

`create_owned_meeting(meeting_name)` restores authenticated meeting creation without broadening shared-editor authority. The function creates only a meeting owned by the caller's `auth.uid()`, does not accept an owner override, and relies on the existing owner-membership trigger for owner membership setup. Shared editors still cannot manage lifecycle or access for meetings they do not own.

## Phase 3 PR 3C Member Management Permissions Direction

- Owners and active editors may view the active owner/editor member list for meetings they can already access. Viewer behavior remains deferred and should not be exposed in Phase 3C UI.
- Member listing should use a narrow RPC or equivalent runtime API guarded by `user_can_access_meeting(target_meeting_id)` so editors can see display-safe member data without receiving access-management authority or broad `meeting_members` table reads.
- Owners are the only users who may remove active editors. Removal should use a narrow owner-only RPC guarded by `user_can_manage_meeting_access(target_meeting_id)`, reject unauthenticated callers, reject editors/non-members, reject removed users, reject owner rows, and reject owner self-removal.
- Member removal should set `meeting_members.removed_at = now()` instead of deleting rows. Existing access helpers already exclude removed members from access/edit checks, so removed users should lose meeting access after refresh/reload and should no longer appear under `Shared with Me`.
- Removing a member must not delete `meeting_invitations` history. Re-inviting a removed member should continue through the normal pending-invite acceptance path, which can reactivate the existing membership by clearing `removed_at`.
- Tactical History is viewable by owners and editors for Phase 3. Do not add an owner-only Tactical History restriction; Viewer behavior remains deferred.

## Phase 3 PR 3C Member Management Permissions

- `list_meeting_members(target_meeting_id)` requires `user_can_access_meeting(target_meeting_id)` and returns only display-safe owner/editor rows for that meeting using profile display name, profile email, auth email fallback, and role label. Owners and editors can view the owner plus active `Editors` section; non-members cannot list members. Viewer behavior remains deferred.
- `remove_meeting_editor(target_meeting_id, target_user_id)` requires `user_can_manage_meeting_access(target_meeting_id)`. It rejects unauthenticated callers, editors, non-members, removed users, owner rows, and owner self-removal. Ownership transfer remains deferred, so owners cannot remove themselves in Phase 3.
- `get_accessible_meeting_member_counts()` returns counts only for meetings already accessible to the caller. Counts include the owner and active editors and exclude pending invitations, removed members, and viewers.
- Editors can view the member list but cannot remove members by UI or direct RPC. Shared/editor dashboard cards expose a members-only modal and do not expose invite controls.
- Tactical History remains visible to owners and editors. Phase 3 PR 3C intentionally does not add owner-only Tactical History restrictions; Viewer behavior remains deferred.

## Phase 3 Shared Access Hardening Summary

Phase 3 permission intent after PR 3D review:

| Capability | Owner | Active editor | Viewer | Pending invitee | Removed member | Non-member |
| --- | --- | --- | --- | --- | --- | --- |
| Open cloud meeting | Yes | Yes | Deferred/no UI | No | No after refresh/reload | No |
| Edit meeting content | Yes | Yes | Deferred | No | No after refresh/reload | No |
| Manual Save full workspace backup | Yes | Yes while autosave is incomplete | Deferred | No | No after refresh/reload | No |
| View member list | Yes | Yes | Deferred | No | No | No |
| Create/revoke invitations | Yes | No | No | No | No | No |
| Remove active editors | Yes | No | No | No | No | No |
| Archive/restore/delete/rename lifecycle | Owner-only intent; needs final DB/API hardening before Phase 3 closeout | No | No | No | No | No |
| Tactical History | Yes | Yes | Deferred | No | No | No |

Hardening note: dashboard UI already hides owner-only lifecycle controls from shared/editor cards, and access-management RPCs are owner-guarded. The remaining closeout requirement is to ensure direct database/API updates cannot use the broad editor `meetings` update path to mutate owner-only lifecycle/container fields.

## Phase 3 PR 3D Meeting Mutation Boundary

- Owners can create, open, edit, Manual Save, duplicate owned meetings through the dashboard, archive owned meetings, restore owned archived meetings, soft-delete owned archived meetings, manage invitations, remove active editors, list members, and view Tactical History.
- Editors can open shared meetings, edit meeting content, use Manual Save to update `meetings.meeting_data`, view the read-only member list, and view Tactical History.
- Editors must not mutate meeting lifecycle/container fields. Direct REST/table attempts to change `meetings.name`, `owner_id`, `metadata_json`, `archived_at`, or `deleted_at` should fail through column privileges and the non-owner container-update trigger.
- Owner-only lifecycle/container RPCs are `duplicate_owned_meeting(source_meeting_id, duplicate_name)`, `archive_owned_meeting(target_meeting_id)`, `restore_owned_archived_meeting(target_meeting_id)`, `soft_delete_owned_archived_meeting(target_meeting_id)`, and `rename_owned_meeting(target_meeting_id, meeting_name)`.
- Non-members cannot open meetings, list members, view Tactical History, update `meeting_data`, or call owner-only lifecycle/access RPCs successfully.

## Phase 4 PR 4A Autosave Permission Clarification

- Owners and active editors can update `meetings.meeting_data` through Manual Save while structured autosave remains incomplete.
- Owners and active editors can read/write the current `meeting_settings` structured autosave pilot under membership-aware content RLS.
- Meeting container/lifecycle fields (`name`, `owner_id`, `metadata_json`, `archived_at`, and `deleted_at`) remain owner-only through dashboard RPCs and PR 3D hardening; editor Manual Save must not imply editor permission to rename, archive, restore, duplicate, or delete shared meeting containers.
- Structured content tables have membership-aware RLS for owner/editor content editing. Runtime autosave currently uses `meeting_settings`, `strategic_topics`, and `strategic_topic_notes`; objectives, tasks, SOOs, meeting notes, agenda, decisions/actions, and cascading communication remain Manual Save/full-backup dependent until implementation PRs add explicit structured persistence.


## Phase 4 Strategic Topics Autosave Permissions Recommendation

- Structured Strategic Topic autosave should follow the existing meeting-content RLS model: active members can read, and active owners/editors can insert/update/delete.
- Existing `strategic_topics` policies already use `user_can_access_meeting(meeting_id)` for select and `user_can_edit_meeting(meeting_id)` for writes.
- PR 4B adds `strategic_topic_notes` policies equivalent to other structured meeting content: owner/editor writes and active-member reads.
- Do not use owner-only policies for topic autosave; editors are expected to edit meeting content during Team Beta.


## Phase 4 PR 4B Strategic Topic Permissions

- Strategic Topic autosave uses existing `strategic_topics` membership policies: owners and active editors can create/edit/archive/complete/reorder; active members can read; non-members cannot access rows.
- Topic Notes use `strategic_topic_notes` RLS with the same meeting membership helpers. Owner/editor users can edit notes; active members can read; removed editors lose access once membership RLS no longer matches after refresh/reload.
- The client does not implement Viewer UX in PR 4B; database policies remain the enforcement boundary.

## Phase 4 PR 4C Meeting Notes / Cascading Communications Permission Expectations

- This review does not change permissions or RLS.
- A future active `meeting_notes` table should follow existing meeting-scoped access helpers: active members can read, and owners plus active editors can insert/update/delete.
- Non-members, pending invitees without accepted membership, and removed editors must not be able to read or write Meeting Notes or Cascading Communications rows.
- Removed editors should lose access through the existing `removed_at is null` active-member helper behavior after refresh/reload.
- Viewer UI/read-only enforcement remains deferred and should not be expanded by the PR 4C implementation unless a separate Viewer decision is made.

## Phase 4 PR 4C Meeting Notes RLS

`public.meeting_notes` follows the existing shared-access helper model for meeting-scoped content:

- active meeting members can select rows through `public.user_can_access_meeting(meeting_id)`;
- owners and active editors can insert, update, and delete rows through `public.user_can_edit_meeting(meeting_id)`;
- non-members cannot read or write rows;
- removed editors lose access after refresh/reload because the helpers exclude removed membership rows.

No Viewer UX is added in this PR. Last Save Wins remains the editing model for owners/editors.

## Phase 4 PR 4D Objectives / Tasks / SOOs Permission Review

This review does not change RLS or runtime behavior.

Future Defining Objectives, Tasks, and SOOs autosave should reuse the existing membership-aware meeting-content boundaries:

- Owners can read and write DO/task/SOO rows.
- Active editors can read and write DO/task/SOO rows.
- Non-members cannot read or write DO/task/SOO rows.
- Removed editors lose access because `user_can_access_meeting` and `user_can_edit_meeting` exclude removed membership rows.
- Viewer read-only UX remains deferred; do not introduce new Viewer behavior in the DO/task/SOO implementation slice.

Existing foundation policies on `objectives`, `tasks`, and `standard_operating_objectives` already use meeting member select and meeting editor insert/update/delete patterns, but the tables are not active runtime storage yet.
