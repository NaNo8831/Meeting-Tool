# Phase 3 Shared Access Schema Alignment — Blueprint

## Current findings
### Existing schema
- `meetings.owner_id` is non-null and remains the current owner authority.
- `meeting_members` has `id`, `meeting_id`, `user_id`, `role`, `created_at`, and unique (`meeting_id`, `user_id`).
- `meeting_members.role` currently accepts `owner`, `admin`, `member`.
- No meeting invitation table exists.

### Existing RLS
- The renamed `meetings` table retains owner-only policies created originally for `workspaces`.
- Structured tables and `meeting_members` enable RLS.
- Structured-table policies call `user_owns_meeting(meeting_id)` and therefore grant only meeting owners access.
- `meeting_members` does not yet grant member runtime access.

### Existing runtime
- Dashboard meeting listing calls the `meetings` REST endpoint and relies on RLS for visibility.
- Cloud meeting routes load/save `meetings.meeting_data` manually and hydrate/autosave only `meeting_settings` as the structured pilot.
- Auth/session storage is client-side Supabase auth session persistence; there is no invite acceptance runtime yet.

## Planned PR 1A design work
1. Choose an explicit migration strategy from current `owner`/`admin`/`member` values to planned `owner`/`editor`/`viewer`. Do not silently reinterpret values in app code.
2. Decide whether owner membership rows are backfilled immediately or introduced alongside PR 1B policy work. Keep `meetings.owner_id` authoritative during the transition.
3. Add a meeting-scoped pending-invite table with normalized email, intended role, lifecycle state, inviter, timestamps, and acceptance linkage/audit metadata as needed.
4. Define uniqueness and re-invite rules so duplicate pending records cannot create ambiguous access.
5. Preserve compatibility with Manual Save, Backup/Restore, Local Mode, and the narrow `meeting_settings` pilot.

## Recommended migration boundaries
- Prefer one reversible, additive/alignment migration.
- Do not drop `meetings.owner_id`.
- Do not remove or rewrite `meetings.meeting_data`.
- Do not grant new member access until PR 1B policies are reviewed separately.
- Do not add organization tables or realtime infrastructure.

## Follow-up roadmap
1. **PR 1A — Shared Access Schema Alignment**
2. **PR 1B — Membership RLS Foundation**
3. **PR 2 — Shared Dashboard Access** with **Owned by Me** and **Shared with Me**
4. **PR 3 — Meeting Access Management UI**
5. **PR 4 — Invite UX Polish**
6. **PR 5+ — Structured Autosave Expansion**
