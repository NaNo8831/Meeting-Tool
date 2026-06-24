# Phase 3 Shared Access Schema Alignment — Requirements

## Purpose
Prepare the first Phase 3 implementation PR: **PR 1A — Shared Access Schema Alignment**. This sprint file is planning-only. Do not modify application code, RLS policies, or Supabase migrations as part of this documentation PR.

## Baseline
- `main` is the stable Phase 2 Single-User Cloud Beta baseline.
- Phase 3 implementation work targets `phase-3-shared-access`.
- `meetings.owner_id` is the current owner authority.
- `meeting_members` exists but currently constrains roles to `owner`, `admin`, `member`.
- Structured-table RLS is owner-only through `user_owns_meeting(meeting_id)`.
- No pending-invite table exists.
- Manual Save writes the full-workspace backup to `meetings.meeting_data`; `meeting_settings` is the narrow structured-autosave pilot.

## Product requirements
1. Start Phase 3 with Shared Meeting Access Foundation.
2. Support pending invited users who have not signed up yet.
3. Use `owner`, `editor`, `viewer` as the long-term role direction.
4. Allow Team Beta to expose only Owner and Editor behavior first; everyone with access can edit.
5. Keep one active owner initially. Plan explicit ownership transfer later; do not implement multiple-owner or organization/admin ownership in PR 1A.
6. Accept Last Save Wins for Team Beta. Do not add realtime collaboration, presence, cursors, websockets, CRDTs, or conflict resolution.
7. Preserve Local Mode without expanding it. Preserve Manual Save as the full-workspace cloud backup. Do not reintroduce full-workspace JSONB autosave.
8. Continue structured autosave expansion surface-by-surface only after shared access is stable.

## PR 1A implementation scope
- Add the smallest non-breaking migration needed to align `meeting_members` with the planned role model.
- Add meeting-scoped pending-invite storage that supports invited emails before an `auth.users` row exists.
- Define lifecycle fields and uniqueness rules needed for safe pending, accepted, revoked, and re-invite behavior.
- Preserve the existing owner path and all current Phase 2 data.
- Document any backfill or compatibility handling for existing `owner`/`admin`/`member` rows.

## Out of scope for PR 1A
- Membership-based RLS grants.
- Dashboard UI changes.
- Access-management UI.
- Invite email delivery or polished onboarding.
- Ownership transfer, multiple owners, organizations, or admin hierarchy.
- Realtime collaboration.
- Structured-autosave expansion.
- Local Mode changes.
