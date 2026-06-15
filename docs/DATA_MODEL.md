# Data Model

This document describes all Supabase tables, key columns, relationships, RLS approach, and structured autosave tables as of Sprint 3A. Migrations are in `supabase/migrations/` and must be applied in timestamp order.

---

## Table Overview

| Table | Purpose |
|-------|---------|
| `meetings` | Meeting container (cloud meeting identity, owner, lifecycle state, full-workspace backup) |
| `meeting_members` | Meeting-scoped membership (owner/editor/viewer roles, soft removal) |
| `meeting_invitations` | Pending/accepted/revoked email-based invitations |
| `meeting_settings` | Structured autosave for playbook/settings fields |
| `meeting_notes` | Structured autosave for dated meeting notes and cascade items |
| `strategic_topics` | Structured autosave for strategic topic rows |
| `strategic_topic_notes` | Structured autosave for topic-attached rich notes |
| `objectives` | Structured autosave for defining objectives |
| `tasks` | Structured autosave for tasks embedded in objectives |
| `standard_operating_objectives` | Structured autosave for SOOs |
| `agenda_items` | Structured autosave for agenda items with discussion notes and outcomes |
| `profiles` | User display metadata (first/last name, derived display_name, email) |
| `tactical_sessions` | Archival tactical history snapshots (End Meeting) |
| `tactical_items` | Individual items within a tactical session snapshot |
| `strategic_sessions` | Archival strategic session records |
| `strategic_session_notes` | Notes attached to strategic sessions |
| `feedback` | Tester feedback collection (separate from meeting data) |

---

## Core Tables

### `meetings`

The meeting container and top-level parent for all cloud meeting data.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | Meeting identity |
| `owner_id` | uuid | Foreign key to `auth.users.id`. Authoritative owner. |
| `name` | text | Meeting container name shown on the dashboard. |
| `meeting_data` | jsonb | Full-workspace backup JSON written by Manual Save. Fallback hydration source. |
| `metadata_json` | jsonb | Owner-only container metadata. Not written by editors. |
| `archived_at` | timestamptz | Null for active meetings; set when archived. |
| `deleted_at` | timestamptz | Null for visible meetings; set by soft-delete (only for archived meetings). |
| `created_at` | timestamptz | Creation timestamp. |
| `updated_at` | timestamptz | Auto-updated by trigger. |

**RLS:**
- Select: `user_can_access_meeting(id)` — owner or any active member.
- Insert: `owner_id = auth.uid()` (or via `create_owned_meeting` RPC).
- Update: `user_can_edit_meeting(id)` — narrowed to `meeting_data` column by column privileges; protected lifecycle columns (`name`, `owner_id`, `metadata_json`, `archived_at`, `deleted_at`) guarded by `prevent_non_owner_meeting_container_update` trigger.

**Important:** `meetings.owner_id` is the authoritative owner field. Owner `meeting_members` rows are for future expansion and do not replace `owner_id`.

---

### `meeting_members`

Meeting-scoped membership linking authenticated users to meetings.

| Column | Type | Notes |
|--------|------|-------|
| `meeting_id` | uuid | References `meetings.id`. |
| `user_id` | uuid | References `auth.users.id`. |
| `role` | text | Constrained to `owner`, `editor`, `viewer`. |
| `invited_by` | uuid | Optional: who created the invite. |
| `removed_at` | timestamptz | Null for active members; set when removed. Active membership requires `removed_at is null`. |
| `created_at` / `updated_at` | timestamptz | Managed by triggers. |

**Unique constraint:** `(meeting_id, user_id)`.

**RLS:** Owner/manage-only for all operations. Editors and viewers cannot manage membership rows.

**Trigger:** `ensure_meeting_owner_member()` creates an active owner membership row when a new meeting is inserted.

---

### `meeting_invitations`

Pending, accepted, and revoked email-based invitations.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `meeting_id` | uuid | References `meetings.id`. |
| `email` | text | Raw email as entered. |
| `normalized_email` | text | Lowercase trimmed; used for duplicate/match checks. |
| `role` | text | Currently always `editor`. |
| `status` | text | `pending`, `accepted`, or `revoked`. |
| `invited_by` | uuid | Owner who created the invitation. |
| `accepted_by` | uuid | User who accepted (nullable). |
| `accepted_at` / `revoked_at` | timestamptz | Set on transition. |

**Partial unique index:** `(meeting_id, normalized_email)` where `status = 'pending'` — prevents duplicate active pending invitations for the same meeting and email.

**RLS:** Owner/manage-only. Pending invitations are not access grants; accepted editor membership is required for meeting access.

---

### `profiles`

User display metadata. Not used for authorization.

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | uuid PK | References `auth.users.id`. |
| `first_name` / `last_name` | text | User-editable via dashboard profile form. |
| `display_name` | text | Derived server-side from first/last name. |
| `email` | text | Mirrored from `auth.users.email` by trigger. |

**RLS:** Own-row only for direct access. Dashboard owner attribution for shared meetings uses the `get_accessible_meeting_owner_profiles()` RPC, which returns display data only for meetings the caller can already access.

---

## Structured Autosave Tables

All structured autosave tables are keyed by `meeting_id` and inherit RLS from the meeting access helpers:

- **Select:** `user_can_access_meeting(meeting_id)` — owner or active member.
- **Insert/Update/Delete:** `user_can_edit_meeting(meeting_id)` — owner or active editor.

---

### `meeting_settings`

One row per cloud meeting storing playbook/settings fields.

| Column | Notes |
|--------|-------|
| `meeting_id` | PK |
| `dashboard_title` | In-workspace title (distinct from `meetings.name`). |
| `organization_info` | JSONB rich text payload for org info fields. |
| `meeting_section_order` | JSONB array of section ordering. |
| `setup_completed` | Boolean. |

**Edit Playbook note (Sprint 2):** The Edit Playbook modal reads/writes the runtime `organizationInfo` state, which is persisted to the scoped `localStorage` key `leadership-organization-info` via `getWorkspaceScopedStorageKey`. This data is currently **not cloud-persisted** — `meeting_settings.organization_info` exists in the schema but is not yet written by the Edit Playbook flow. Sprint 3 will wire the Edit Playbook save path through `meeting_settings.organization_info` for cross-device, cross-session persistence. Until then, Edit Playbook data is per-browser and will be lost if localStorage is cleared.

---

### `meeting_notes`

Active dated meeting records storing meeting notes and cascade items.

| Column | Notes |
|--------|-------|
| `meeting_id` | |
| `client_meeting_id` | Numeric ID matching the runtime `MeetingRecord.id`. Compatibility bridge. |
| `captured_date` | ISO date string for the dated meeting record. |
| `is_test_meeting` | Boolean — true for Test Mode records. |
| `notes_json` | JSONB array of meeting note/agenda items. |
| `cascade_items` | JSONB array of cascading communication items. |

**Note:** Archival tactical and strategic history records (`tactical_sessions`, `tactical_items`, `strategic_sessions`, `strategic_session_notes`) are separate tables and are not used for active autosave.

---

### `strategic_topics`

Structured source of truth for Strategic Topic rows.

| Column | Notes |
|--------|-------|
| `meeting_id` | |
| `client_item_id` | Numeric ID for runtime/import compatibility. |
| `text` | Topic title/text. |
| `status` | `active`, `completed`, or `archived`. |
| `sort_order` | Integer ordering. |
| `captured_meeting_id` | Numeric meeting ID when the topic was captured. |
| `removed_meeting_id` | Numeric meeting ID when the topic was removed. |
| `completed_date` / `archived_at` | Timestamps for lifecycle transitions. |

### `strategic_topic_notes`

Rich notes attached to strategic topics.

| Column | Notes |
|--------|-------|
| `meeting_id` | |
| `strategic_topic_id` | UUID FK to `strategic_topics` (nullable for legacy compatibility). |
| `strategic_topic_item_id` | Numeric `client_item_id` — primary compatibility key. |
| `content_json` | JSONB rich text document. |
| `content_text` | Plain text fallback. |

---

### `objectives`

Defining Objectives with status, priority, color, and ordering.

| Column | Notes |
|--------|-------|
| `meeting_id` | |
| `client_objective_id` | Numeric ID for runtime/import compatibility. Unique with `meeting_id`. |
| `title` | |
| `description` | Plain text description. |
| `description_json` | JSONB rich text description. |
| `status` | `planning`, `in-progress`, or `completed`. |
| `priority` | `high`, `medium`, or `low`. |
| `due_date` | ISO date string (nullable). |
| `color` | Color variant string. |
| `sort_order` | Integer ordering. |

---

### `tasks`

Tasks embedded within objectives.

| Column | Notes |
|--------|-------|
| `meeting_id` | |
| `client_task_id` | Numeric ID for runtime/import compatibility. Unique with `meeting_id`. |
| `client_objective_id` | Links to `objectives.client_objective_id` for import compatibility. |
| `objective_id` | UUID FK to `objectives` (nullable). |
| `title` | |
| `description` / `description_json` | Plain text and JSONB rich text. |
| `status` | `planning`, `in-progress`, or `completed`. |
| `due_date` | |
| `assigned_to` / `assignee` | Assignee label. |
| `sort_order` | |
| `subtasks_json` | JSONB array of `Subtask` objects. |
| `comments_json` | JSONB array of `TaskComment` objects. |
| `activity_history_json` | JSONB array of `TaskActivity` objects. |

---

### `standard_operating_objectives`

Standard Operating Objectives with ordering and color.

| Column | Notes |
|--------|-------|
| `meeting_id` | |
| `client_soo_id` | Numeric ID for runtime/import compatibility. Unique with `meeting_id`. |
| `title` | |
| `description` / `description_json` | Plain text and JSONB rich text. |
| `color` | Color variant string. |
| `sort_order` | |

---

### `agenda_items`

First-class agenda items with discussion notes and Decision/Action outcomes.

| Column | Notes |
|--------|-------|
| `meeting_id` | |
| `client_agenda_item_id` | Numeric ID for runtime/import compatibility. |
| `client_meeting_id` | Links to the dated `meeting_notes` record by client ID. |
| `captured_date` | ISO date string for the meeting this item belongs to. |
| `title` | Agenda item title. |
| `discussion_notes_json` | JSONB rich text discussion notes. |
| `has_decision` | Boolean — item has a Decision outcome. |
| `decision_text` | Text of the decision. |
| `has_action` | Boolean — item has an Action outcome. |
| `action_text` | Text of the action. |
| `is_covered` | Boolean — item was covered in the meeting. |
| `cascade_needed` | Boolean — outcome should cascade to communications. |
| `promoted_strategic_topic_id` | UUID FK to `strategic_topics` (nullable) — set when promoted. |
| `sort_order` | |

---

## Archival Tables

These tables store read-only historical records and are not used for active autosave.

| Table | Purpose |
|-------|---------|
| `tactical_sessions` | One archival snapshot per End Meeting. Contains `snapshot_json` with the full workspace state at the time of ending. |
| `tactical_items` | Items within a tactical session snapshot. |
| `strategic_sessions` | Strategic meeting history records. |
| `strategic_session_notes` | Notes attached to strategic sessions. |

---

## Source-of-Truth Summary

| Data | Authoritative source |
|------|---------------------|
| Meeting container / title / lifecycle | `meetings` + owner-only RPCs |
| Meeting ownership | `meetings.owner_id` |
| Access/edit permissions | `meeting_members` + RLS helpers + owner-only lifecycle controls |
| Settings | `meeting_settings` (structured), fallback from `meetings.meeting_data` |
| Strategic Topics / Topic Notes | `strategic_topics` + `strategic_topic_notes` (structured), fallback from `meetings.meeting_data` |
| Meeting Notes / Cascade Items | `meeting_notes` (structured), fallback from `meetings.meeting_data` |
| Objectives / Tasks / SOOs | `objectives` + `tasks` + `standard_operating_objectives` (structured), fallback from `meetings.meeting_data` |
| Agenda Items | `agenda_items` (structured), fallback from `meetings.meeting_data` |
| Full workspace backup / safety net | `meetings.meeting_data` + JSON export/import |
| User display metadata | `profiles` (display only, not authorization) |

---

## Compatibility Notes

- **Numeric client IDs** (`client_objective_id`, `client_task_id`, `client_item_id`, etc.) bridge the runtime JavaScript objects (which use numeric IDs) with the structured UUID-keyed Supabase rows. They must be preserved in migrations and import/export payloads.
- **`meetings.meeting_data`** remains in place as the full-workspace backup, export/import shape, and safety fallback. Do not remove it.
- **Import into Cloud Meeting** upserts structured rows while preserving `meetings.meeting_data`. Cloud imports restore Objective/Task/SOO structured rows and the full workspace backup simultaneously.
- **Legacy `decisionItems`** in older backup payloads remain readable through backup/import compatibility paths. A migration tool for legacy decision data is deferred to post-main.

---

## Migration Inventory

All 22 migration files in `supabase/migrations/`, in chronological order.

| Filename | What it does | Tables / Objects affected | Status |
|----------|-------------|--------------------------|--------|
| `20260515000000_create_feedback.sql` | Creates the `feedback` table for tester feedback submission with RLS insert policy. | `feedback` | active |
| `20260516000000_create_workspaces.sql` | Creates the original `workspaces` table (later renamed `meetings`) with owner RLS and `updated_at` trigger. | `workspaces`, `set_workspace_updated_at()` | superseded by rename migration |
| `20260517000000_add_workspace_data.sql` | Adds `workspace_data` JSONB column to `workspaces` for full backup cloud persistence. | `workspaces` | superseded by rename migration |
| `20260521000000_rename_workspaces_to_meetings.sql` | Renames `workspaces` → `meetings`, `workspace_data` → `meeting_data`, and all related indexes and functions. | `meetings` (renamed), `set_meeting_updated_at()` | active (schema shape now in effect) |
| `20260523000000_add_structured_persistence_foundation.sql` | Creates 10 structured content tables with owner-only RLS and helper functions. | `meeting_members`, `meeting_settings`, `objectives`, `tasks`, `standard_operating_objectives`, `strategic_topics`, `tactical_sessions`, `tactical_items`, `strategic_sessions`, `strategic_session_notes`, `user_owns_meeting()`, `set_entity_updated_at()` | active |
| `20260523110000_add_meetings_archived_at.sql` | Adds `archived_at` timestamp column to `meetings` for soft archive. | `meetings` | active |
| `20260528090000_add_meetings_deleted_at.sql` | Adds `deleted_at` timestamp column to `meetings` for permanent soft delete of archived meetings. | `meetings` | active |
| `20260603090000_align_shared_access_schema.sql` | Updates `meeting_members` roles to owner/editor/viewer and creates the `meeting_invitations` table with email-normalization trigger. | `meeting_members`, `meeting_invitations`, `normalize_meeting_invitation_email()` | active |
| `20260604090000_add_membership_rls_foundation.sql` | Expands RLS from owner-only to membership-based across all content tables; adds four RLS helper functions and owner-enforcement triggers on `meetings`. | `meetings`, `meeting_members`, all content tables, `user_is_active_meeting_member()`, `user_can_access_meeting()`, `user_can_edit_meeting()`, `user_can_manage_meeting_access()`, `ensure_meeting_owner_member()`, `prevent_meeting_owner_id_update()` | active |
| `20260604100000_add_admin_readability_views.sql` | Creates five read-only admin views joining content tables to `meetings` for dashboard display. | views: `meeting_members_with_meeting`, `meeting_invitations_with_meeting`, `meeting_settings_with_meeting`, `strategic_topics_with_meeting`, `tactical_sessions_with_meeting` | active |
| `20260604110000_add_user_metadata_to_admin_readability_views.sql` | Enhances two readability views with auth.users email join for member/invitation attribution. | views: `meeting_members_with_meeting`, `meeting_invitations_with_meeting` | active |
| `20260604120000_add_owned_archived_meeting_soft_delete_rpc.sql` | Adds owner-only RPC to soft-delete archived meetings without broadening REST update permissions. | `soft_delete_owned_archived_meeting(uuid)` | active |
| `20260604130000_add_user_profiles.sql` | Creates `profiles` table with display name derivation and auth sync triggers. | `profiles`, `derive_profile_display_name()`, `set_profile_fields()`, `handle_new_auth_user_profile()`, `ensure_own_profile()`, `get_accessible_meeting_owner_profiles()` | active |
| `20260604140000_add_invite_flow_rpcs.sql` | Implements full invitation lifecycle with five RPCs for owner-managed invites and invitee acceptance. | `create_meeting_invitation()`, `list_meeting_pending_invitations()`, `revoke_meeting_invitation()`, `list_my_pending_meeting_invitations()`, `accept_meeting_invitation()` | active |
| `20260604150000_add_owned_meeting_create_rpc.sql` | Adds narrow RPC for creating meetings without allowing client-supplied owner manipulation. | `create_owned_meeting(text)` | active |
| `20260605100000_add_member_management_rpcs.sql` | Adds member listing and removal RPCs for the dashboard member management UI. | `list_meeting_members()`, `remove_meeting_editor()`, `get_accessible_meeting_member_counts()` | active |
| `20260605110000_refine_member_display_names.sql` | Refines display name fallback priority (profile display_name → derived name → email) across owner profile and member list RPCs. | `get_accessible_meeting_owner_profiles()`, `list_meeting_members()` | active |
| `20260605120000_harden_meeting_lifecycle_mutations.sql` | Restricts direct REST mutations on `meetings`, adds trigger defense against non-owner container updates, and adds four owner-only lifecycle RPCs. | `meetings`, `prevent_non_owner_meeting_container_update()`, `duplicate_owned_meeting()`, `archive_owned_meeting()`, `restore_owned_archived_meeting()`, `rename_owned_meeting()` | active |
| `20260605150000_add_strategic_topic_autosave.sql` | Adds client ID and lifecycle columns to `strategic_topics`; creates `strategic_topic_notes` table for topic-attached autosave notes. | `strategic_topics`, `strategic_topic_notes` | active |
| `20260605160000_add_meeting_notes_autosave.sql` | Creates `meeting_notes` table for dated meeting records with notes and cascade items. | `meeting_notes` | active |
| `20260605170000_add_objectives_tasks_soos_autosave.sql` | Adds client ID mapping and structured fields to `objectives`, `tasks`, and `standard_operating_objectives`. | `objectives`, `tasks`, `standard_operating_objectives` | active |
| `20260608100000_add_agenda_items_autosave.sql` | Creates `agenda_items` table as first-class autosave for agenda discussion notes, decisions, actions, and promote linkage. | `agenda_items` | active |

---

## Orphaned Schema

The following tables exist in the database (created in `20260523000000_add_structured_persistence_foundation.sql`) but have **no references in current application code** as of Sprint 3A:

| Table | Created by | App references | Notes |
|-------|-----------|---------------|-------|
| `tactical_items` | `20260523000000` | None | Schema exists alongside `tactical_sessions` but the app only reads/writes `tactical_sessions.snapshot_json`. Items were intended as a normalized alternative but were never used. |
| `strategic_sessions` | `20260523000000` | None | No app code creates or reads strategic session records. |
| `strategic_session_notes` | `20260523000000` | None | No app code creates or reads notes for strategic sessions. |

**Do not drop these tables via a new migration without explicit product approval.** The tables carry no user data and impose no runtime cost, but dropping them is irreversible. They are candidates for removal in a post-Sprint-3 cleanup migration if the product decision is made not to implement strategic session history.

---

## RLS Approach

- Structured content tables follow the pattern: active members can select; active owners/editors can insert/update/delete.
- Helper functions (`user_can_access_meeting`, `user_can_edit_meeting`) are the shared RLS building block across all content tables.
- Meeting container lifecycle mutations are separated from content editing and protected through owner-only RPCs and a `prevent_non_owner_meeting_container_update` trigger.
- Removed members (`removed_at is not null`) are excluded from all access/edit checks.
- `profiles` and admin readability views use invoker security; they do not grant new meeting access or change dashboard visibility.
