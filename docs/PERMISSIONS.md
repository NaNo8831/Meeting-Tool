# Permissions

## Current State (Owner-Only Cloud Meetings)
- Signed-out users can use Local Workspace via `localStorage` and export/import.
- Signed-in users can create/select owner-only cloud meetings.
- Owner can manually save/load meeting workspace data via `meetings.meeting_data`.
- RLS currently protects owner-only access to meeting rows.

## Direction for Structured Persistence Permissions
Permission design should move from owner-only row access to membership-based access using explicit meeting membership rows.

### Planned model
- `meeting_members` links users to meetings.
- Future role direction: `owner`, `admin`, `member` (exact capability matrix deferred).
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

## Out of Scope in This Planning Stage
- Invitation flows.
- Full org/team hierarchy.
- Realtime collaboration policies.
- Final granular permission matrix per entity/action.
