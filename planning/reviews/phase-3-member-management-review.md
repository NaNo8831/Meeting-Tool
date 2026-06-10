# Phase 3 PR 3C Architecture Review — Member Management

## Scope

This is a planning, documentation, and architecture review for the next member-management implementation slice. It does not change runtime behavior, application code, Supabase schema, RLS policies, authentication, Local Mode, autosave behavior, Viewer UX, role editing, ownership transfer, organizations, or realtime collaboration.

## Files reviewed

- `supabase/migrations/20260603090000_align_shared_access_schema.sql`
- `supabase/migrations/20260604090000_add_membership_rls_foundation.sql`
- `supabase/migrations/20260604100000_add_admin_readability_views.sql`
- `supabase/migrations/20260604110000_add_user_metadata_to_admin_readability_views.sql`
- `supabase/migrations/20260604130000_add_user_profiles.sql`
- `supabase/migrations/20260604140000_add_invite_flow_rpcs.sql`
- `app/dashboard/page.tsx`
- `app/lib/supabaseClient.ts`
- `app/lib/dashboardMeetings.ts`
- `app/components/meeting/MeetingWorkspace.tsx`
- `docs/ARCHITECTURE.md`
- `docs/PERMISSIONS.md`
- `docs/VALIDATION.md`
- `planning/STATE.md`
- `planning/DECISIONS.md`
- `planning/QUESTIONS.md`
- `planning/reviews/phase-3-invite-flow-review.md`

## 1. Current membership model assessment

### Tables

The current Phase 3 tables are sufficient for PR 3C member-management implementation:

- `meetings.owner_id` remains the authoritative owner identity.
- `meeting_members` represents accepted identity-linked access and already has `meeting_id`, `user_id`, `role`, `invited_by`, `created_at`, `updated_at`, and `removed_at`.
- `meeting_invitations` represents pending/accepted/revoked invitation history and should remain separate from active member display.
- `profiles` provides display metadata for authenticated users while leaving auth IDs as the authorization facts.

No new member table is recommended for Phase 3C. Active and removed member display can be modeled from `meeting_members.removed_at` and `role`, with owner display anchored to `meetings.owner_id` plus the owner membership row backfill/trigger. Invite history should stay in `meeting_invitations`; removing a member should not delete accepted invitation rows.

### Fields

Existing fields are sufficient for the Phase 3C active/removed distinction:

- Active member: `meeting_members.removed_at is null`.
- Removed member: `meeting_members.removed_at is not null`.
- Displayable Phase 3 roles: `owner` and `editor`; `viewer` remains a database role direction but no Viewer UI should be added.
- Re-invite/reactivation: existing invite acceptance can reactivate a removed membership by clearing `removed_at` and setting `role = 'editor'`.

Existing profile fields are sufficient for member display:

- Primary display: `profiles.display_name` when available.
- Fallback display: `profiles.email` or the signed-in/auth email available through a narrow server-side helper.
- No avatars should be added.

### Views and RPCs

The existing admin readability views are not the right runtime contract for the Access panel. They are inspection helpers, not product APIs.

Recommended Phase 3C runtime additions:

1. A narrow member-display RPC for owners and active editors, returning only the active owner/editor list needed by the Access panel.
2. A narrow owner-only removal RPC that marks an active editor as removed with `removed_at = now()`.
3. A dashboard member-count source, preferably an RPC or view that returns counts by meeting for meetings the caller can already access.

Direct client aggregation from broad table reads is not recommended because current `meeting_members` RLS is owner/manage-only and because dashboard cards should not expose member details just to show a count.

## 2. Member list model

The Access panel should evolve from pending-invite management into a lightweight access overview:

Current Access panel:

- Invite email
- Pending invitations
- Revoke pending invite

Recommended future Access panel:

- Owner
- Members
- Pending invitations
- Invite email
- Remove editor

### Owner view

Owners should see:

- Owner row with display name/email fallback and `Owner` role label.
- Active editor member rows with display name/email fallback and `Editor` role label.
- Pending invitations.
- Invite email form.
- Revoke pending invite action.
- Remove editor action for active editors only.

Owners should not see:

- Remove-self control.
- Role editing.
- Ownership transfer.
- Viewer UI.
- Removed-member history in the normal active list.

### Editor view

Editors should see:

- Owner row.
- Active editor member rows.
- Role labels.

Editors should not see:

- Invite form.
- Pending invitation management, unless a later product decision intentionally exposes pending invite visibility.
- Revoke invite action.
- Remove member action.
- Role editing.
- Ownership transfer.

### Shared users

For Phase 3C, “shared users” means accepted active editors. They should follow the editor view above. Viewer behavior remains deferred and should not be inferred from database-level viewer policies.

### Non-members

Non-members should not be able to:

- Open the meeting.
- List members.
- See pending invitations.
- Remove members.
- Use member-count/member-list APIs for inaccessible meetings.

## 3. Member removal model

Safest Phase 3C removal behavior:

- Owner can remove an active editor.
- Removal sets `meeting_members.removed_at = now()` rather than deleting the row.
- Removed editor loses meeting access after refresh/reload because access helpers require `removed_at is null`.
- Removed editor no longer appears in `Shared with Me` because meeting selection uses membership-aware RLS.
- Removed editor is excluded from the Access panel member list.
- Removed editor is excluded from dashboard member count.
- Owner cannot remove themselves.
- Editor cannot remove anyone.
- Removing an accepted member does not delete invite history.
- Re-inviting a removed member should use the normal pending-invite flow; acceptance reactivates the existing membership by clearing `removed_at`.

Recommended removal RPC characteristics:

- Input should identify `target_meeting_id` and `target_user_id`, or a member row ID plus a meeting guard.
- It should require `auth.uid()` and `user_can_manage_meeting_access(target_meeting_id)`.
- It should require the target row to be active, role `editor`, and not the meeting owner.
- It should reject owner rows and any self-removal attempt.
- It should return the removed member summary or updated row needed for the UI refresh.

## 4. Member count model

Dashboard cards should eventually show:

```text
Owner: Test One
Members: 3
```

Count definition:

- Include the owner.
- Include active editors.
- Exclude pending invitations.
- Exclude removed members.
- Exclude viewers for Phase 3C.

Recommended implementation:

- Load member count with dashboard meetings or immediately alongside the dashboard meeting list so cards do not make per-card member-count requests.
- Prefer a narrow RPC or view returning `meeting_id` and `member_count` only for meetings the caller can already access.
- Avoid client aggregation over member rows on the dashboard because it exposes unnecessary member details and fights current owner/manage-only `meeting_members` RLS.
- Keep the count resilient to owner-membership drift by counting `meetings.owner_id` as one owner and adding active `meeting_members` editor rows; do not rely solely on owner membership rows for the owner count.

## 5. Member profile display

Member list display should use only minimal profile metadata:

- Display name if available.
- Email fallback.
- Role label.

Example owner row:

```text
Owner
Test One
```

Example editor row:

```text
Editor
Test Two
```

Do not add avatars, organization labels, status badges, audit metadata, or last-active information in Phase 3C.

## 6. Permission strategy

### Listing members

Owners and active editors should be allowed to list active owner/editor members for meetings they can already access. A narrow RPC is recommended over direct `meeting_members` reads because:

- Current `meeting_members` RLS is owner/manage-only.
- Editors need read-only member visibility without gaining access-management authority.
- The runtime response can expose only display-safe fields.
- Unauthorized and removed users can be blocked by `user_can_access_meeting(target_meeting_id)` and `removed_at is null` checks.

### Removing members

Member removal should use a narrow owner-only RPC rather than broad table update permissions because:

- Editors must not manage access.
- The RPC can explicitly prevent owner removal and self-removal.
- The RPC can limit removal to active editor rows.
- The RPC can preserve invitation history and membership history.

Unauthorized users should be blocked by the RPC guard plus existing RLS helpers. Removed users should be blocked because helper functions already exclude rows with `removed_at is not null`.

## 7. Tactical History visibility

Durable Phase 3 decision:

- Owners can view Tactical History.
- Editors can view Tactical History.
- No owner-only Tactical History restriction should be added in Phase 3.
- Viewer behavior remains deferred.

This matches current membership-aware read policy direction for tactical session history and keeps editor collaboration usable for Team Beta.

## 8. Recommended PR 3C implementation scope

Small implementation PR scope:

- Add member list to the Access panel.
- Owners and editors can view active owner/editor list.
- Owners can remove active editors.
- Editors cannot remove members.
- Dashboard cards show `Members: #`.
- Tactical History remains visible to owners and editors.

Explicitly out of scope:

- Role editing.
- Ownership transfer.
- Owner self-removal.
- Viewer UI/read-only UX.
- Organizations.
- Multiple owners.
- Avatars.
- Realtime collaboration.
- Local Mode changes.
- Autosave behavior changes.
- Supabase schema expansion beyond the narrow RPC/view implementation decision.

## 9. Risks

- Accidentally allowing owner removal before ownership transfer exists.
- Removed user still seeing cached meeting state until refresh/reload.
- Stale dashboard member counts after removal or invite acceptance.
- Exposing too much profile data through member-list or dashboard APIs.
- Re-invite/reactivation edge cases if a removed member has old accepted invite history plus a new pending invite.
- RLS bypass risk if RPCs are too broad or do not check `auth.uid()` and meeting access/manage helpers.
- Confusing pending invitations with active members in the Access panel.
- Owner membership row drift if future migrations or imports diverge from `meetings.owner_id`.

## 10. Validation plan

### Owner

- Owner sees owner row and active editor rows.
- Owner can remove an active editor.
- Owner cannot remove themselves.
- Owner sees member count update after removal.
- Owner can re-invite a removed editor through the normal invite flow.
- Re-invited removed editor regains access only after accepting the pending invitation.

### Editor

- Editor sees owner and active editor list.
- Editor does not see removal controls.
- Editor cannot remove members through the UI or RPC.
- Editor sees Tactical History.
- Editor loses access after owner removal and refresh/reload.

### Non-member

- Non-member cannot open the meeting.
- Non-member cannot list members.
- Non-member cannot remove members.
- Non-member cannot see pending invitations for the meeting.

### Dashboard

- Member count includes owner plus active editors.
- Member count excludes pending invitations.
- Member count excludes removed members.
- Member count excludes viewers.
- Removed editor no longer sees the meeting under `Shared with Me` after refresh/reload.

## Documentation-only confirmation

This PR 3C architecture review is docs/planning only. It intentionally makes no application-code changes, no Supabase migration changes, no RLS changes, no authentication changes, no runtime behavior changes, no Local Mode changes, and no autosave changes.
