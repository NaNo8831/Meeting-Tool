# Handoff Prompt — PR 1A Shared Access Schema Alignment

Work from `phase-3-shared-access`, based on the stable Phase 2 Single-User Cloud Beta baseline. Implement **PR 1A — Shared Access Schema Alignment** only.

Read first:
- `AGENTS.md`
- `planning/STATE.md`
- `planning/DECISIONS.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/PERMISSIONS.md`
- `docs/VALIDATION.md`
- `planning/sprints/phase-3-shared-access-schema-alignment/requirements.md`
- `planning/sprints/phase-3-shared-access-schema-alignment/blueprint.md`
- `planning/sprints/phase-3-shared-access-schema-alignment/acceptance.md`
- current Supabase migrations and Supabase client/auth helpers

Implement the smallest non-breaking Supabase migration that:
1. explicitly aligns current `meeting_members.role` storage (`owner`, `admin`, `member`) toward the planned `owner`, `editor`, `viewer` model, including deliberate handling for any existing rows;
2. adds meeting-scoped pending invitation storage for invited emails that may not have an `auth.users` row yet;
3. defines the minimal lifecycle and uniqueness rules needed for pending, accepted, revoked, and re-invite behavior; and
4. preserves `meetings.owner_id`, `meetings.meeting_data`, Manual Save, Backup/Restore, Local Mode, and the current `meeting_settings` pilot.

Do **not** add membership-based RLS grants yet; that belongs in PR 1B. Do not add dashboard UI, meeting access-management UI, invite email delivery, ownership transfer, multiple-owner behavior, organization/admin ownership, realtime collaboration, presence, cursors, websockets, CRDTs, conflict resolution, full-workspace JSONB autosave, or structured-autosave expansion.

Before coding, answer the open schema questions in the PR description: role-value migration mapping, owner membership backfill timing, invite table name, normalized-email strategy, lifecycle fields, uniqueness rules, acceptance linkage, revocation behavior, and re-invite behavior.
