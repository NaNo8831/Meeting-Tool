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
- `meeting_settings`, `objectives`, `tasks`, `standard_operating_objectives`, `strategic_topics`, `tactical_sessions`, `tactical_items`, `strategic_sessions`, and `strategic_session_notes` allow active members to select and active owners/editors to insert/update/delete.
- `meeting_members` remains owner/manage-only for select, insert, update, and delete. Editors and viewers cannot invite, remove, or change roles through RLS.
- `meeting_invitations` remains owner/manage-only. Pending invite email alone does not grant runtime access.
- Removed members (`removed_at is not null`) are excluded from all access/edit helpers.
- The repo does not currently include a Supabase migration-created `strategic_topic_notes` table, so PR 1B does not invent or policy that table.

### Team Beta capability shape
| Capability | Owner | Editor | Viewer | PR 1B runtime state |
| --- | --- | --- | --- | --- |
| View shared meeting | Yes | Yes | Yes | Membership-aware RLS grants read access to active members. |
| Edit operational meeting content | Yes | Yes | No | Owners and active editors can edit meeting-scoped content; Viewer UI/read-only enforcement remains deferred. |
| Use Manual Save full-workspace backup | Yes | Yes for Team Beta unless narrowed by a later decision | No by default | `meetings` update RLS allows owners/editors so `meeting_data` save can work for editors. |
| Invite/revoke members and change roles | Yes | No | No | Access-management tables remain owner/manage-only; no UI/runtime flow added yet. |
| Transfer ownership | Later explicit flow | No | No | Not implemented; `owner_id` updates are blocked. |

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
