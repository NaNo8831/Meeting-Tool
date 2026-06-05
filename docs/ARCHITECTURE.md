# Architecture

## Current Stable Architecture

- Next.js + TypeScript + Tailwind app deployed on Vercel.
- Local Workspace remains browser `localStorage` based.
- Cloud Meeting full-workspace persistence uses manual save/load to `meetings.meeting_data` JSONB.
- Valid `/meeting/[id]` cloud routes run one narrow structured persistence pilot: hydrate `meeting_settings` after the full-workspace backup loads, then debounce settings-only autosave. `/meeting/local` never reads or writes this cloud pilot.
- Backup/Restore JSON export/import remains operational and must stay intact.
- Feedback remains separate from meeting persistence.
- Auth sign out returns to `/`.
- Tactical session history capture is available as an archival flow via `tactical_sessions` + `snapshot_json`, separate from runtime operational persistence.

## Persistence Direction Decision

Stop treating full-workspace JSONB autosave as the long-term architecture.

Reason:

- It is operationally fragile (change detection, race conditions, and large write payloads).
- It is a poor foundation for members, permissions, and realtime collaboration.

New direction:

- Structured persistence by section/item, with incremental rollout and strict backward safety via `meeting_data` backup.

## Manual Save During Autosave Migration

- Manual Save remains visible, available, and required during the structured autosave migration.
- PR #72 autosaves only `meeting_settings`; it does **not** autosave objectives, tasks, agenda items, Strategic Topics, meeting notes, Standard Operating Objectives, Defining Objectives, or other operational runtime state.
- Manual Save writes the full workspace backup to `meetings.meeting_data` and remains the cloud safety net until structured autosave reliably covers all important meeting data.
- Full-workspace JSONB autosave remains out of scope. Future structured autosave expansion should proceed surface-by-surface in separate PRs.
- Once structured autosave handles the core operational workspace reliably, evaluate retiring Manual Save from the primary workflow or moving it into a secondary backup/export utility role. Do not remove or demote Manual Save in PR #72.

## Local Workspace Support and Future Evaluation

- Local Workspace remains supported and browser-only during the current cloud persistence and shared-access stabilization work.
- Local Workspace must not autosave to cloud. Do not remove it in Phase 2.5; it remains a fallback path while structured cloud persistence and shared access are being stabilized.
- After structured cloud autosave protects all valuable meeting data and Phase 3 shared meeting access is stable, evaluate retiring Local Workspace or demoting it to a developer/testing-only mode.
- Maintaining local and cloud as parallel meeting systems creates code duplication, testing burden, and user confusion. The product's team value depends on shared cloud meeting access, which Local Workspace cannot provide, but that transition is a future decision rather than Phase 2.5 scope.

## Target Persistence Architecture

### Data ownership layers

1. **Meeting container layer** (`meetings`)
2. **Membership/authorization layer** (`meeting_members`)
3. **Domain section/item layer** (`objectives`, `tasks`, `strategic_topics`, etc.)
4. **Session/history/rich text layer** (`tactical_sessions`, `strategic_topic_notes`, notes records)
5. **Safety snapshot layer** (`meetings.meeting_data` backup/export format)

### Recommended PR sequence (structured persistence)

1. **Planning + schema design PRs (docs only).**
2. **Table introduction PR(s) (non-breaking, no app read switch).**
3. **Scoped write-path PRs by feature area** (`meeting_settings` is the first narrow pilot; later surfaces remain separate).
4. **Scoped read-path hydration PRs by feature area** with regression validation.
5. **Backup-mode transition PR** where `meeting_data` becomes snapshot/export safety only.
6. **Permissions + member expansion PRs** after structured model is stable.

## Guardrails During Migration

- Do not break manual Save/Load behavior.
- Do not break export/import backup behavior.
- Do not remove `meeting_data` yet.
- Keep rollouts reversible and feature-scoped.
- Keep tactical history snapshots archival-first; do not couple them to realtime or full runtime persistence migration.
- Do not reintroduce full-workspace JSONB autosave. The `meeting_settings` pilot reads and writes only dashboard/playbook-level settings; all other runtime reads remain on the existing workspace backup path.
- Keep structured clients keyed by `meeting_id` and let database RLS enforce access so later `meeting_members` owner/editor/viewer expansion does not require owner-only assumptions in feature code.
- Keep `meetings.name` as the cloud container/dashboard name and `meeting_settings.dashboard_title` as the distinct in-workspace/playbook title; they may initially match but should not be collapsed during this pilot.
- Report settings autosave status separately from the Manual Save full-workspace backup state so non-pilot edits are never presented as autosaved.

## Dashboard Shared Access Planning Context

- Current `/dashboard` meeting listing is a client-side dashboard flow backed by `listDashboardMeetings` in `app/lib/dashboardMeetings.ts`; the helper delegates visible-row loading to `supabaseMeetingClient.listWorkspaces`, so database RLS determines which non-deleted `meetings` rows are returned.
- The dashboard-facing access/listing abstraction maps each visible row to a `DashboardMeeting`, classifies ownership with `meeting.owner_id === auth.user.id`, treats non-owned visible rows as shared, and centralizes `canManageMeetingLifecycle` so duplicate/archive/restore/soft-delete remain owner-only dashboard actions.
- PR 2B renders `Cloud Meetings` with separate `Owned by Me` and `Shared with Me` sections. Search applies once across both sections, the existing Show Archived toggle filters both owned and shared archived rows, and each section sorts alphabetically by meeting name after filtering.
- Shared meeting cards display the meeting name plus `Owner: <display name>` and expose only Open. Owner display uses existing meeting metadata display-name/email fields when present, the current user email for owned rows, and `Owner` as the fallback because there is no public profile table in the current runtime model.
- Invite workflow and access management remain deferred to PR 3; PR 2B does not add migrations, RLS policy changes, auth changes, Local Mode changes, member management, ownership transfer, Viewer UX, autosave changes, or realtime collaboration.
- `/meeting/[id]` should continue to rely on signed-in Supabase requests and membership-aware RLS for route access; PR 2 should not change auth, RLS, migrations, Viewer read-only UX, invite/member management, autosave scope, or Local Mode.

## Supabase Admin Readability Views

- Supabase administrative inspection may use read-only views that join meeting-scoped rows to `meetings.name` so operators can identify the relevant meeting without manual ID lookup.
- These views are inspection helpers only: they add no duplicate storage, no runtime application behavior, no dashboard behavior, no authentication behavior, no meeting access behavior, no autosave behavior, and no audit/change-tracking behavior.
- Admin readability views should stay selective. Add them only where `meeting_name` materially improves database inspection for high-value meeting-scoped tables, not for every table.
- Views should use `security_invoker` so they do not intentionally bypass the underlying table permissions or change RLS semantics.

## Strategic Topic lifecycle (current runtime behavior)

- Lifecycle state is managed in existing Strategic Topic runtime items with `active`, `completed`, and `archived`.
- Archive behavior is confirmation-gated and non-destructive; it does not hard delete topic rows/items.
- Topic-attached Notes remain queryable via `strategic_topic_notes` because topic identity is preserved.
- No realtime/collaborative editing was introduced in this lifecycle slice.

## Phase 3 Shared Meeting Access Direction (Planned)

Phase 3 starts from the stable Phase 2 Single-User Cloud Beta and adds shared meeting access without changing the lightweight meeting model. The implementation sequence is intentionally incremental:

1. **PR 1A — Shared Access Schema Alignment**: align membership roles and add pending-invite storage.
2. **PR 1B — Membership RLS Foundation**: expand authoritative database access from owner-only checks to membership-aware checks while preserving owner access.
3. **PR 2 — Shared Dashboard Access**: evolve the dashboard toward **Owned by Me** and **Shared with Me**.
4. **PR 3 — Meeting Access Management UI**: let the owner manage access from a meeting.
5. **PR 4 — Invite UX Polish**: refine pending, accepted, revoked, and first-time-user flows.
6. **PR 5+ — Structured Autosave Expansion**: continue structured persistence one surface at a time after shared access is stable.

### Shared-access boundaries

- Pending invites must support invited people who do not have an `auth.users` row yet.
- The durable role direction is `owner`, `editor`, `viewer`; Team Beta may expose only Owner and Editor behavior first, with everyone who has access able to edit.
- Last Save Wins is acceptable for Team Beta. Realtime collaboration, presence, cursors, websockets, CRDTs, custom conflict resolution, detailed audit logging, per-field edit history, activity feeds, and attribution-heavy collaboration features are out of scope.
- Manual Save remains the full-workspace cloud backup through `meetings.meeting_data`. Do not reintroduce full-workspace JSONB autosave.
- Structured autosave continues surface-by-surface only after shared access is stable.
- Local Mode remains a browser-only fallback. Do not expand or remove it in the Phase 3 foundation PRs; evaluate hiding or demotion later.

### Audit and attribution posture

- Detailed audit logging and per-user edit attribution are deferred. Do not add audit tables, edit history, activity feeds, or per-field attribution unless a future product decision explicitly prioritizes them.
- The product prioritizes current meeting state, simple shared access, owner control, meeting lifecycle protection, read-only protection for ended/past meetings, and backup/manual-save protection.
- Teams are expected to be small, most meetings will have only one or two editors, and most members are usually present in the same in-person meeting; detailed “who changed this?” logging is therefore lower priority than reliable current-state persistence and access protection.
- Lightweight `updated_at` timestamps remain useful for freshness and ordering. Future `updated_by` may be considered only on major structured tables if it becomes valuable during structured autosave expansion; it is not part of PR 1B.

### Current-to-target authorization transition

The database currently has an owner-only `meetings.owner_id` authority path and owner-check RLS for structured tables. `meeting_members` exists, but its current constraint uses `owner`, `admin`, and `member`, and its rows do not grant runtime access. Phase 3 must align this schema explicitly to the planned `owner`, `editor`, and `viewer` model before membership-based RLS is enabled. Do not silently reinterpret existing role strings in client code.

## User profile foundation

- `public.profiles` is the Phase 3 user-attribution layer for authenticated cloud users. It is separate from `meetings.owner_id` and `meeting_members.user_id`; those ID columns remain the authorization and ownership authorities.
- New auth users receive a profile through a database trigger. Existing auth users are backfilled safely when the dashboard calls `ensure_own_profile()` after sign-in.
- The dashboard Profile editor is intentionally minimal and updates only first/last name. The database derives `display_name` and mirrors email from `auth.users` so display attribution survives future invite workflows and ownership transfers.
- Dashboard owner labels are built from profile data when available, with graceful fallback for legacy rows. A narrow owner-profile RPC returns only owner display/email fallback fields for meetings the caller can already access.
- Invite management, member management, ownership transfer, organizations, avatars, audit history, Viewer UX, and dashboard member lists are outside this foundation PR.


## Invite Flow Architecture Direction

- Phase 3 PR 3B should use the existing `meeting_invitations` pending-invite model rather than introducing token infrastructure or email delivery first.
- Pending invitations are email-address records and must support people who do not yet have an `auth.users` row. Runtime meeting access still comes only from `meetings.owner_id` or active `meeting_members` rows, never from a pending invitation alone.
- The recommended acceptance path is explicit signed-in acceptance: match pending invitations to `lower(trim(auth.users.email))`, then atomically create or reactivate an editor `meeting_members` row and mark the invitation `accepted`.
- Invitation creation, revocation, invitee pending-list reads, and acceptance should be implemented through narrow database-authorized operations, preferably security-definer RPCs with explicit owner/email/status checks.
- PR 3B should not add tokenized invite links, automated email delivery, automatic acceptance on sign-in, Viewer UX, role editing, active member management, ownership transfer, multiple owners, realtime collaboration, Local Mode changes, or dashboard card/count changes.

## Phase 3 PR 3B Invite Flow

- Dashboard shared access now uses the existing `meeting_invitations` pending-invite model through narrow Supabase RPCs rather than direct client writes to access-management tables.
- Owner-facing access UI is placed on active owned dashboard cards. Shared/editor dashboard cards do not show access controls.
- Invitee-facing acceptance UI is placed in a dashboard `Pending invitations` section. It lists only pending invitations that match the signed-in user's normalized auth email.
- Invite acceptance is explicit. Signing in does not auto-accept invitations, pending invitations do not grant meeting access, and `/meeting/[id]` access still depends on meeting RLS resolving an active membership row.
- Tokenized invite links, automated email delivery, Local Mode changes, autosave behavior changes, Viewer UX, member management/removal, role editing, ownership transfer, multiple owners, organizations, and realtime collaboration remain deferred.

## PR 3B follow-up create-meeting RLS fix

- New cloud meeting creation now uses `create_owned_meeting(meeting_name)` instead of a direct dashboard REST insert into `meetings` with a client-supplied `owner_id`.
- The RPC sets `owner_id = auth.uid()` server-side and lets the existing owner-membership trigger create/preserve the owner's `meeting_members` row.
- This keeps shared editors from creating or managing meetings on behalf of another owner while avoiding the fragile direct insert/return path against membership-aware `meetings` RLS.

## Phase 3 Member Management Architecture Direction

- PR 3C should use the existing Phase 3 shared-access model rather than introducing a new member table. `meetings.owner_id` remains the owner authority; `meeting_members` represents accepted identity-linked access; `meeting_invitations` preserves pending/accepted/revoked invite history; and `profiles` supplies minimal display metadata.
- The Access panel should evolve from invite-only management into an access overview with Owner, Members, Pending invitations, Invite email, and owner-only Remove editor controls. Editors may view active owner/editor members but must not manage invitations or removals.
- Runtime member display should use a narrow member-list RPC or equivalent runtime API, not the admin readability views. The response should expose only meeting member identity, display-name/email fallback, and role label for active owner/editor rows visible to the caller.
- Member removal should be an owner-only RPC that marks an active editor membership with `removed_at = now()`. It must not delete membership or invitation history, must not remove the owner, and must not support owner self-removal before ownership transfer exists.
- Dashboard member counts should be loaded with or alongside dashboard meetings through a narrow count RPC/view that returns counts only for accessible meetings. Counts should include the owner plus active editors and exclude pending invites, removed members, and viewers.
- Tactical History remains visible to owners and editors in Phase 3. Do not add an owner-only Tactical History restriction; Viewer behavior remains deferred.

## Phase 3 PR 3C Member Management

- Member management remains a dashboard-level shared-access slice, not a broad dashboard redesign and not a Local Mode change.
- The dashboard uses narrow Supabase RPCs for member access data instead of direct client reads from `meeting_members`:
  - `list_meeting_members(target_meeting_id)` lists active owner/editor rows for meetings the caller can already access.
  - `remove_meeting_editor(target_meeting_id, target_user_id)` soft-removes an active editor from an owned meeting.
  - `get_accessible_meeting_member_counts()` returns dashboard counts only for meetings visible to the caller.
- The Access/Members modal shows the Owner row separately from an `Editors` section that lists active editor rows. Owners additionally see pending invitations, invite email controls, revoke pending invite controls, and remove controls for active editors. Editors can open a members-only version from shared dashboard cards and do not see invite or remove controls. The owner-card `Access` button means owner access management; the shared-card `Members` button means editor read-only access overview.
- Member removal sets `meeting_members.removed_at` and relies on existing membership-aware RLS helpers to remove meeting visibility after refresh/reload. It does not delete membership rows, invitation history, or owner rows.
- Tactical History remains available to owners and editors through existing meeting access policies; Phase 3 PR 3C does not add owner-only Tactical History restrictions.

## Phase 3 Shared Access Hardening Review

PR 3D reviewed Phase 3 shared access as a documentation/security hardening pass only. The implementation is functionally close, but Phase 3 should close only after a small lifecycle mutation hardening PR.

Current architecture confirmations:

- `meetings.owner_id` remains the authoritative owner reference.
- Owner membership rows support future expansion and member-list consistency; they do not replace `owner_id` today.
- Pending invitations are not authorization records. Shared meeting access starts only after explicit acceptance creates or reactivates an active editor membership.
- Profiles are display metadata only and are not authorization inputs.
- Local Mode remains browser-only and separate from shared cloud meeting access.
- Structured autosave is still incomplete. Manual Save remains the full workspace backup safety net and must not be removed or demoted as part of shared-access hardening.

Hardening requirement before Phase 3 closeout:

- Separate owner-only meeting lifecycle/container mutations from editor content/full-backup mutations at the database/API boundary. Editors need content editing and Manual Save while structured autosave remains incomplete, but direct archive, restore, soft-delete, duplicate-source lifecycle, and rename/title container mutations should remain owner-only beyond UI gating.
