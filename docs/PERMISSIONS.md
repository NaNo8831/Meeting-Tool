# Permissions

## Current State (Owner-Only Cloud Meetings)
- Signed-out users can use Local Workspace via `localStorage` and export/import.
- Signed-in users can create/select owner-only cloud meetings.
- Owner can manually save/load meeting workspace data via `meetings.meeting_data`.
- RLS currently protects owner-only access to meeting rows.

## Membership Architecture (Foundation)
The permission foundation is membership-first, not email-first.

### Core tables and identity
- `meetings`: canonical meeting container; `owner_id` is the current authority for owner-level administration.
- `meeting_members`: membership edge table linking `meeting_id` + `user_id` with lifecycle/status fields as needed.
- Domain tables (for example `tasks`, `objectives`, `strategic_topics`) reference `meeting_id` and inherit access from membership and role policy.

### Access evaluation order (target)
1. Verify authenticated user identity (`auth.uid()`).
2. Resolve meeting scope (`meeting_id`).
3. Resolve membership row in `meeting_members`.
4. Resolve effective role for the requested action.
5. Apply entity-level constraints (for example delete restrictions, archival rules, session locks).

This keeps authorization consistent across all section/item tables and avoids one-off policy drift.

## Roles (Planned Capability Direction)
Role names are directional and can be refined later, but behavior should map to this shape:

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

## Future Permission Foundation Principles
These principles should guide all future policy expansion:

1. **Least privilege first**: default deny; grant only required actions per role.
2. **Single policy model**: avoid per-feature custom auth logic that bypasses membership checks.
3. **RLS as source of truth**: UI state is advisory; database policy is authoritative.
4. **Stable migration path**: keep owner-only behavior valid while editor/viewer expansion is phased in.
5. **Backup safety preserved**: permission changes must not remove JSON export/import recovery paths.
6. **No overbuild in Phase 1/early Phase 2**: add only permission surfaces needed for the current structured-write rollout.

## Direction for Structured Persistence Permissions
Permission design should move from owner-only row access to membership-based access using explicit meeting membership rows.

### Planned model
- `meeting_members` links users to meetings.
- Future role direction: `owner`, `editor`, `viewer` (exact capability matrix deferred).
- Meeting owner remains the meeting administrator.
- Members gain row access through membership joins/policies.

### Policy principles
- Do not rely on email text fields for authorization.
- Use authenticated user IDs and membership relationships.
- `owner_email` (if kept) is convenience metadata only (admin/debug), not policy authority.

## Current Structured Table Policy Baseline
The structured persistence foundation migration enables RLS on all newly introduced structured tables and applies an initial safe owner-only rule:
- authenticated users can select/insert/update/delete only rows whose `meeting_id` belongs to a meeting they own (`meetings.owner_id = auth.uid()`).
- this is enforced per table through owner-check policies and a shared meeting ownership helper.
- `meeting_members` exists now for future sharing expansion, but does **not** yet grant non-owner access in runtime policies.

## Phase 3 Shared Access Permission Direction (Planned, Not Implemented)
Phase 3 begins with a safe transition from owner-only RLS to membership-aware RLS. The database remains authoritative; dashboard filtering and UI controls must not substitute for policies.

### Current mismatch to resolve in PR 1A
- Current schema role values: `owner`, `admin`, `member`.
- Planned durable role values: `owner`, `editor`, `viewer`.
- Do not silently map or reinterpret these values in client code. PR 1A must define an explicit migration/alignment strategy before PR 1B grants member access.

### Team Beta capability shape
| Capability | Owner | Editor | Viewer (planned later) |
| --- | --- | --- | --- |
| View shared meeting | Yes | Yes | Yes |
| Edit operational meeting content | Yes | Yes | No |
| Use Manual Save full-workspace backup | Yes | Yes for Team Beta unless narrowed by a later decision | No by default |
| Invite/revoke members and change roles | Yes | No | No |
| Transfer ownership | Later explicit flow | No | No |

The first Team Beta may expose only Owner and Editor behavior. Everyone with access can edit during that beta. Viewer remains part of the long-term model, but read-only enforcement and UX can follow after the shared-access foundation is stable.

### Invitation authority boundary
- Pending invitations must work for email addresses that do not yet map to `auth.users`.
- Email is acceptable for pending invite matching and onboarding.
- Accepted runtime authorization must resolve through authenticated user identity and meeting membership, not email text.

### Deferred ownership models
- Keep one active owner authority for the initial rollout.
- Add explicit ownership transfer later.
- Do not implement multiple owners or organization/admin ownership in the first Phase 3 PR.

## Out of Scope in This Planning Stage
- Realtime collaboration policies, presence, cursors, websockets, CRDTs, and conflict resolution.
- Full org/team hierarchy or organization/admin ownership.
- Multiple active owners.
- Ownership-transfer UI or migration behavior.
- Final granular viewer permission matrix per entity/action.
