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
Apply these checks incrementally as each Phase 3 implementation PR lands. This planning PR changes documentation only.

### PR 1A — Schema alignment
- Existing owner-created cloud meetings remain accessible.
- Membership role migration/alignment handles the current `owner`/`admin`/`member` constraint explicitly and produces the intended `owner`/`editor`/`viewer` direction.
- Pending invite records can exist before the invited person signs up.
- Duplicate invite, accepted-member, revoke, and re-invite behavior is defined and tested.
- No migration removes or rewrites `meetings.meeting_data`; Manual Save remains intact.

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
