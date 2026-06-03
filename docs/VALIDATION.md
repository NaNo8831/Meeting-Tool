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

### Explicit non-goals for validation
Do not add realtime collaboration test requirements for Phase 3 Team Beta: presence, cursors, websockets, CRDTs, and custom conflict resolution remain out of scope.
