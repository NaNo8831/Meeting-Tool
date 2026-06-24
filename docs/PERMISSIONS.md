# Permissions

This document covers owner/editor/viewer roles, RLS policies, Shared Access member management, and what each role can and cannot do. Last updated 2026-06-24 (pre-beta polish).

---

## Roles

Meeting Tool uses three roles, enforced at the database level through Supabase RLS.

### Owner

- The meeting administrator. Every cloud meeting has exactly one owner, identified by `meetings.owner_id`.
- Can perform all operations: read, edit, lifecycle management, and access management.
- Lifecycle actions (archive, restore, soft-delete, rename, duplicate) are owner-only and gated by owner-only RPCs.
- Can invite editors, revoke pending invitations, and remove active editors and viewers.

### Editor

- Active collaborator with content editing rights.
- Can read and edit all meeting content surfaces (settings, agenda, topics, notes, objectives, tasks, SOOs).
- Can use Manual Save (full-workspace backup) while structured autosave stabilizes.
- Can view the active member list and Tactical History.
- Cannot perform lifecycle actions: cannot archive, restore, soft-delete, rename, or duplicate a meeting.
- Cannot manage members: cannot invite, revoke invitations, or remove other editors.
- Cannot mutate owner-only container fields (`name`, `owner_id`, `metadata_json`, `archived_at`, `deleted_at`).

### Viewer

- Read-focused role direction supported at the RLS layer.
- Active viewers can access meeting rows through `user_can_access_meeting`.
- Polished read-only UI enforcement is deferred to post-main. The current product exposes owner/editor behavior only.

---

## Role Matrix (Current Team Beta State)

| Capability | Owner | Editor | Viewer | Notes |
|-----------|-------|--------|--------|-------|
| View shared meeting content | Yes | Yes | Yes (RLS only; UI deferred) | `user_can_access_meeting` |
| Edit meeting content | Yes | Yes | No | `user_can_edit_meeting` |
| Manual Save full-workspace backup | Yes | Yes | No | `meetings` update allows owners/editors |
| Invite / revoke invitations | Yes | No | No | `user_can_manage_meeting_access` |
| Remove active non-owner members (editors and viewers) | Yes | No | No | `remove_meeting_editor` RPC (owner-only) |
| Archive / restore meeting | Yes | No | No | Owner-only RPCs |
| Soft-delete archived meeting | Yes | No | No | `soft_delete_owned_archived_meeting` RPC |
| Duplicate meeting | Yes | No | No | Owner-only dashboard action |
| Rename meeting container | Yes | No | No | `rename_owned_meeting` RPC |
| View member list | Yes | Yes | No | `list_meeting_members` RPC (owner/editor) |
| View Tactical History | Yes | Yes | No | Meeting-scoped RLS covers tactical tables |
| Transfer ownership | Deferred | No | No | Not implemented |
| Self-removal as owner | No (deferred) | N/A | N/A | Deferred |

---

## RLS Helper Functions

Defined in `supabase/migrations/20260604090000_add_membership_rls_foundation.sql`.

| Function | Returns true when |
|----------|------------------|
| `user_owns_meeting(target_meeting_id uuid)` | `meetings.owner_id = auth.uid()` |
| `user_is_active_meeting_member(target_meeting_id uuid)` | Active `meeting_members` row exists for `auth.uid()` with `removed_at is null` |
| `user_can_access_meeting(target_meeting_id uuid)` | `user_owns_meeting` OR `user_is_active_meeting_member` |
| `user_can_edit_meeting(target_meeting_id uuid)` | `user_owns_meeting` OR active owner/editor membership |
| `user_can_manage_meeting_access(target_meeting_id uuid)` | `user_owns_meeting` only |

All helper functions require `auth.uid()` to be non-null. Unauthenticated requests are denied at every level.

---

## Table-Level Policy Summary

| Table | Select | Insert | Update | Delete |
|-------|--------|--------|--------|--------|
| `meetings` | `user_can_access_meeting` | `owner_id = auth.uid()` | `user_can_edit_meeting` (narrowed to `meeting_data`; lifecycle fields protected by trigger) | Not exposed through app |
| `meeting_members` | `user_can_manage_meeting_access` | Owner trigger / RPCs | Owner RPCs | Owner RPCs |
| `meeting_invitations` | `user_can_manage_meeting_access` | `user_can_manage_meeting_access` | Owner RPCs | Not exposed |
| `meeting_settings` | `user_can_access_meeting` | `user_can_edit_meeting` | `user_can_edit_meeting` | `user_can_edit_meeting` |
| `meeting_notes` | `user_can_access_meeting` | `user_can_edit_meeting` | `user_can_edit_meeting` | `user_can_edit_meeting` |
| `strategic_topics` | `user_can_access_meeting` | `user_can_edit_meeting` | `user_can_edit_meeting` | `user_can_edit_meeting` |
| `strategic_topic_notes` | `user_can_access_meeting` | `user_can_edit_meeting` | `user_can_edit_meeting` | `user_can_edit_meeting` |
| `objectives` | `user_can_access_meeting` | `user_can_edit_meeting` | `user_can_edit_meeting` | `user_can_edit_meeting` |
| `tasks` | `user_can_access_meeting` | `user_can_edit_meeting` | `user_can_edit_meeting` | `user_can_edit_meeting` |
| `standard_operating_objectives` | `user_can_access_meeting` | `user_can_edit_meeting` | `user_can_edit_meeting` | `user_can_edit_meeting` |
| `agenda_items` | `user_can_access_meeting` | `user_can_edit_meeting` | `user_can_edit_meeting` | `user_can_edit_meeting` |
| `tactical_sessions` | `user_can_access_meeting` | `user_can_edit_meeting` | — | — |
| `profiles` | Own row only | Own row only | Own row only | — |
| `feedback` | Owner of own rows | Authenticated | — | — |

---

## Owner-Only RPCs

These RPCs require `meetings.owner_id = auth.uid()` and run as SECURITY DEFINER or check ownership inside the function:

| RPC | What it does |
|-----|-------------|
| `create_owned_meeting(meeting_name text)` | Creates a meeting with `owner_id = auth.uid()`. |
| `duplicate_owned_meeting(source_meeting_id, duplicate_name)` | Creates a copy owned by `auth.uid()`. |
| `archive_owned_meeting(target_meeting_id)` | Sets `archived_at`. |
| `restore_owned_archived_meeting(target_meeting_id)` | Clears `archived_at`. |
| `soft_delete_owned_archived_meeting(target_meeting_id)` | Sets `deleted_at` on an already-archived meeting. |
| `rename_owned_meeting(target_meeting_id, meeting_name)` | Updates `meetings.name`. |
| `create_meeting_invitation(target_meeting_id, invite_email)` | Creates a pending invitation (owner only). |
| `list_meeting_pending_invitations(target_meeting_id)` | Lists pending invitations (owner only). |
| `revoke_meeting_invitation(target_invitation_id)` | Revokes a pending invitation (owner only). |
| `remove_meeting_editor(target_meeting_id, target_user_id)` | Soft-removes any active non-owner member — editor or viewer — (sets `removed_at`). Owner only. |

---

## Editor/Member RPCs

Available to owners and active editors:

| RPC | What it does |
|-----|-------------|
| `list_meeting_members(target_meeting_id)` | Lists all active member rows (owner, editors, and viewers) with display names. |
| `get_accessible_meeting_member_counts()` | Returns `(meeting_id, member_count)` for meetings the user can access. |

---

## Invitation Flow

1. Owner creates a pending invitation via `create_meeting_invitation(meeting_id, email)`.
2. The invited user signs in, sees the pending invitation in the dashboard, and accepts it via `accept_meeting_invitation(invitation_id)`.
3. Acceptance atomically creates/reactivates an active editor `meeting_members` row and marks the invitation `accepted`.
4. The meeting appears under Shared with Me after dashboard refresh.
5. Revoked invitations cannot be accepted. Accepted invitations cannot be re-accepted.
6. A removed editor can regain access only by accepting a new pending invitation.

**Pending invitations are not access grants.** Runtime access begins only after an active `meeting_members` row exists.

---

## Lifecycle Mutation Hardening

Two layers prevent editors from mutating owner-only meeting container fields:

1. **Column privileges:** Direct `meetings` updates through the REST API are restricted to the `meeting_data` column. Editors can write Manual Save but cannot touch `name`, `owner_id`, `metadata_json`, `archived_at`, or `deleted_at` through the broad update path.

2. **`prevent_non_owner_meeting_container_update` trigger:** A database trigger blocks any attempt by a non-owner to update protected columns, even if column privileges are accidentally broadened.

Owner lifecycle actions (archive, restore, soft-delete, rename, duplicate) use narrow RPCs that check `meetings.owner_id = auth.uid()` explicitly.

---

## Profile Permissions

- Users may select, insert, and update only their own `profiles` row.
- Email and `display_name` derivation are server-side (triggers); users cannot spoof another account's email or derived display name.
- Dashboard owner attribution for shared meetings uses `get_accessible_meeting_owner_profiles()`, which returns only display/email fallback data for meetings the caller can already access. It does not open broad profile reads.
- Profile data is display metadata. It is never used for authorization.

---

## Removed Member Behavior

- `remove_meeting_editor(meeting_id, user_id)` sets `meeting_members.removed_at` to the current timestamp for any active non-owner member (editor or viewer).
- All RLS helpers exclude removed members (`removed_at is null` condition). A removed member loses access after their next dashboard refresh or page load.
- The invite/accept history row is preserved for audit.
- Removed members are excluded from the dashboard member count.
- Re-invitation is the only path back to access: owner creates a new pending invite, the removed member accepts it.

---

## Ownership Invariants

- Every cloud meeting has exactly one active owner, identified by `meetings.owner_id`.
- `prevent_meeting_owner_id_update` trigger blocks direct `owner_id` changes.
- Owner membership rows in `meeting_members` are maintained by the `ensure_meeting_owner_member` trigger as support rows for future expansion; they do not replace `owner_id` as the authority.
- Ownership transfer is not implemented. It is deferred to post-main.

---

## Principles

1. **RLS is the source of truth.** UI state is advisory; database policy is authoritative. Do not replicate authorization logic in application code.
2. **Least privilege.** Default deny; grant only what each role requires.
3. **Identity = `auth.uid()`.** Email text fields are display metadata only, never authorization input.
4. **Pending invitations are not access.** Only accepted active membership grants access.
5. **Backup safety preserved.** Permission changes must not remove JSON export/import or Manual Save recovery paths.
6. **No overbuild.** Do not add granular viewer enforcement, audit tables, or realtime locking unless a future product decision explicitly requires it.
