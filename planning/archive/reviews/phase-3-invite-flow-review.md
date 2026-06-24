# Phase 3 Invite Flow Architecture Review

Date: 2026-06-04
Branch target: `phase-3-shared-access`
PR intent: Phase 3 PR 3B planning/review only; no invite UI, invitation acceptance implementation, runtime behavior, dashboard behavior, Supabase schema, RLS policy, auth, Local Mode, member-management, ownership transfer, Viewer UX, email delivery, or realtime collaboration changes.

## Reviewed files

### Planning and durable context
- `planning/STATE.md`
- `planning/DECISIONS.md`
- `planning/DOMAIN.md`
- `planning/RISKS.md`
- `planning/QUESTIONS.md`
- `planning/reviews/phase-3-dashboard-shared-access-review.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/PERMISSIONS.md`
- `docs/VALIDATION.md`

### Supabase shared-access/profile migrations reviewed for architecture only
- `supabase/migrations/20260603090000_align_shared_access_schema.sql`
- `supabase/migrations/20260604090000_add_membership_rls_foundation.sql`
- `supabase/migrations/20260604100000_add_admin_readability_views.sql`
- `supabase/migrations/20260604110000_add_user_metadata_to_admin_readability_views.sql`
- `supabase/migrations/20260604130000_add_user_profiles.sql`

### Application surfaces reviewed for placement/context only
- `app/dashboard/page.tsx`
- `app/components/meeting/MeetingWorkspace.tsx`
- `app/lib/dashboardMeetings.ts`
- `app/lib/supabaseClient.ts`
- `app/hooks/useSupabaseAuth.ts`

## Current schema assessment

### `meeting_invitations` fields

The current invitation table already stores the core pending-invite data needed by PR 3B:

- `id`
- `meeting_id`
- `email`
- `normalized_email`
- `role`
- `status`
- `invited_by`
- `accepted_by`
- `created_at`
- `updated_at`
- `accepted_at`
- `revoked_at`

### Sufficiency for pending invites

The table is sufficient for basic pending invitations because a pending invite can exist before the invited person has an `auth.users` row. The invite is keyed by `meeting_id` plus normalized email rather than by user id, so it can represent both existing users and future sign-ups.

### Status values

`pending`, `accepted`, and `revoked` are sufficient for PR 3B.

Do not add `expired`, `declined`, `resent`, or delivery-specific states in PR 3B unless the implementation scope expands. Expiration, resend, and email delivery are separate product decisions.

### Email normalization

Email normalization is handled by both schema and trigger:

- `email` must be non-empty after trim.
- `normalized_email` must equal `lower(trim(email))`.
- A trigger trims `email` and rewrites `normalized_email` before insert/update.

This is sufficient for Team Beta. PR 3B should use the same lower-trim normalization in client validation only for immediate feedback, while the database remains authoritative.

### Constraints and indexes

The current constraints/indexes are adequate for PR 3B:

- `meeting_id` index supports owner-scoped pending invite lists for a meeting.
- `normalized_email` index supports invitee lookup by signed-in auth email.
- `status` index supports pending filtering.
- Partial unique index on `(meeting_id, normalized_email)` where `status = 'pending'` blocks duplicate active pending invitations.

Implementation should still block inviting an existing active member, because the table-level unique pending index does not prevent inviting someone who already has a `meeting_members` row.

## Current access model assessment

### Current authorities

- `meetings.owner_id` remains the durable meeting owner authority.
- `meeting_members` grants active runtime access when `removed_at is null` and `role in ('owner', 'editor', 'viewer')`.
- `user_can_access_meeting()` allows owners and active members to read/open meetings.
- `user_can_edit_meeting()` allows owners and active owner/editor members to edit.
- `user_can_manage_meeting_access()` is owner-only.
- `profiles` supplies display attribution only; profile data must not become an authorization source.

### Accepting an invite

Accepting a pending invite should be a single database-authorized operation that:

1. Confirms the caller is authenticated.
2. Normalizes the caller's current auth email.
3. Finds a `pending` invitation for that normalized email.
4. Confirms the invitation has not been revoked or accepted.
5. Inserts or reactivates one `meeting_members` row for `(meeting_id, auth.uid())` with `role = 'editor'` for PR 3B.
6. Sets `meeting_members.invited_by` from `meeting_invitations.invited_by` when available.
7. Clears `meeting_members.removed_at` if reactivating a formerly removed member.
8. Sets the invitation `status = 'accepted'`, `accepted_by = auth.uid()`, and `accepted_at = now()`.

The member insert/update and invitation status update should be atomic so users do not receive membership without an accepted invite record, or vice versa.

### Attribution fields

- `invited_by` should be populated when an owner creates the invite.
- `accepted_by` should be populated when an invitee accepts.
- `meeting_members.invited_by` should be populated from the accepted invitation when the member row is created or reactivated.
- Profiles can be used later for display labels, but `auth.users.id` remains the authority.

### Revoked invitations

Revoking a pending invite should preserve the invitation row as `status = 'revoked'` with `revoked_at = now()`. A revoked invite must not be accepted, must not create membership, and must not grant runtime access.

Only meeting owners should be able to revoke pending invitations. Accepted invitations should not be revoked as a substitute for member removal; active-member removal belongs in PR 3C.

### Repeated invites

PR 3B should use these rules:

- If a pending invite already exists for `(meeting_id, normalized_email)`, do not insert another row. Reuse or return the existing pending invite.
- If the user is already an active member, block the invite and show a clear message.
- If a prior invite was revoked or accepted, allow a new pending invite only when there is no active member for that email/user.
- Preserve old accepted/revoked rows for audit/debugging rather than overwriting historical rows.

## Invitation lifecycle recommendation

Recommended PR 3B lifecycle:

1. Owner opens a narrow meeting access/invite surface from an owned meeting.
2. Owner enters an email.
3. App validates non-empty email and sends it to a narrow database operation.
4. Database normalizes email and creates or returns one pending invitation.
5. Owner can list pending invitations for that meeting.
6. Owner can revoke a pending invitation.
7. Signed-in invitee can see pending invitations matching their current auth email.
8. Invitee explicitly accepts an invitation.
9. Acceptance creates/reactivates an editor `meeting_members` row and marks the invitation accepted.
10. The accepted meeting becomes visible through existing membership-aware RLS and appears under `Shared with Me` after dashboard data refresh.

Do not grant access from pending invitation rows alone. Runtime access must continue to flow only through owner authority or active `meeting_members` rows.

## Acceptance model recommendation

### Option A — signed-in matching-email acceptance

This is the recommended Team Beta path.

A signed-in user sees pending invitations that match the normalized current auth email and explicitly accepts inside the app. This supports existing users immediately and also supports non-users after they sign up with the same email, without adding token infrastructure.

### Option B — invite link with token

Defer for PR 3B.

Token links are useful for email delivery, cross-device handoff, and a more polished first-run flow, but they add token generation, storage/hash decisions, expiry semantics, link routing, leakage risk, and extra validation paths. They are not necessary to prove the Team Beta shared-access loop.

### Option C — automatic acceptance on first sign-in

Do not use as the first implementation.

Automatic acceptance can surprise users by silently adding shared meetings to their account, makes revocation timing harder to explain, and still requires careful email matching. A signed-in pending-invitation list with explicit acceptance is safer and easier to validate.

### Recommended hybrid

Use Option A with post-sign-up compatibility:

- Existing account: user signs in, sees matching pending invite, accepts.
- New user: owner creates pending invite by email; user signs up with that same email; after sign-in/profile bootstrap, user sees matching pending invite and accepts.
- No token is required in PR 3B.
- No automatic acceptance is required in PR 3B.

## Email delivery recommendation

Do not add automated email delivery in PR 3B unless a pre-existing infrastructure path is already production-ready.

PR 3B should create pending invitation records and may provide a simple owner-facing instruction such as “Ask this person to sign in with this email.” A copyable generic app/dashboard URL can be considered if trivial, but avoid tokenized invite links and email-provider integration in the first invite implementation.

## UI placement recommendation

### Owner-facing invite management

Use a narrow **Meeting Access** modal/panel launched from the meeting workspace menu for owned meetings.

Reasons:

- Owners usually invite people to a specific meeting while already inside that meeting.
- It avoids adding more dashboard card actions.
- It keeps invite creation/revocation close to meeting ownership context.
- It can later grow into member management without changing the dashboard card model.

### Invitee-facing acceptance

Use the dashboard as the signed-in landing context only for accepting invitations, but keep impact minimal:

- Do not change meeting cards.
- Do not add pending counts to owned/shared cards in PR 3B.
- Prefer a small dashboard menu item or compact pending-invitations panel/modal.
- After acceptance, refresh the dashboard meeting list so the meeting appears under `Shared with Me` through the existing PR 2B classification.

## RLS / RPC strategy recommendation

Direct table access is not enough for acceptance because invitees need to read/accept rows by email before they are members, and acceptance must atomically create membership plus mark the invitation accepted. Prefer narrow security-definer RPC functions with explicit checks, plus existing RLS as the baseline guard.

### Owner creates invites

Use a narrow owner-only create-invite operation.

- It must require `auth.uid()`.
- It must verify `user_can_manage_meeting_access(meeting_id)`.
- It must normalize email server-side.
- It must default role to `editor` for PR 3B.
- It must block active members and duplicate pending invites.
- It must set `invited_by = auth.uid()`.

This can be an RPC, or direct insert behind owner/manage RLS if duplicate/active-member checks are kept reliable. RPC is preferred for consistent idempotency and clearer error messages.

### Owner revokes invites

Use a narrow owner-only revoke operation.

- It must verify `user_can_manage_meeting_access(meeting_id)`.
- It must update only `status = 'pending'` invitations.
- It must set `status = 'revoked'` and `revoked_at = now()`.
- It must not remove active members.

### Invitees read pending invitations

Use an invitee-facing RPC that returns pending invitations where `normalized_email = lower(trim(current auth email))`.

- It must require authenticated users.
- It should return only minimal display fields needed to decide whether to accept, such as invitation id, meeting id, meeting name, owner display/email fallback when safe, inviter display/email fallback when available, and created time.
- It must not expose arbitrary invitation lists or other invited emails.

### Invitees accept invitations

Use a narrow accept-invitation RPC.

- It must require authenticated users.
- It must match the pending invitation to the caller's normalized auth email.
- It must reject revoked/accepted invitations.
- It must create/reactivate an editor membership row.
- It must mark the invite accepted with `accepted_by` and `accepted_at`.
- It should return the accepted `meeting_id` or a minimal success payload so the client can refresh dashboard data.

### Unauthorized users

Unauthorized users are blocked by the RPC checks and existing RLS:

- Non-owners cannot create or revoke meeting invites.
- Users whose auth email does not match the pending invite cannot accept it.
- Pending invites do not grant meeting access until acceptance creates an active membership row.
- Revoked invites cannot be accepted.
- Removed members stay blocked unless a valid accepted invite reactivates their membership.

## PR 3B scope

Include only:

- Owner creates pending invite by email.
- Owner sees pending invites for an owned meeting.
- Owner revokes pending invites.
- Signed-in invitee sees matching pending invites.
- Signed-in invitee explicitly accepts matching pending invites.
- Accepted users become editors.
- Dashboard list refresh after acceptance so existing `Shared with Me` behavior picks up the new membership.

Exclude from PR 3B:

- Viewer UX.
- Role editing.
- Active member list/removal UI.
- Ownership transfer.
- Multiple owners.
- Automated email delivery.
- Tokenized invite links.
- Realtime collaboration.
- Local Mode changes.
- Dashboard card redesign or pending counts.
- Broad auth changes.
- Structured autosave expansion.

## PR 3C boundary

PR 3C should handle active member management after the pending-invite loop is proven:

- List active members.
- Show owner/editor labels.
- Remove/deactivate members.
- Decide how removed former members can be re-invited.
- Consider role display and later role editing.

PR 3C should still defer ownership transfer, multiple owners, organizations/admins, Viewer UX exposure, and realtime collaboration unless a new decision changes scope.

## Dashboard impact

PR 3B should keep dashboard impact minimal:

- Do not change dashboard card actions.
- Do not add pending invite counts to cards.
- Do not mix pending invites into `Owned by Me` or `Shared with Me` meeting lists.
- A lightweight pending-invitations entry point for signed-in invitees is acceptable if needed for acceptance.
- After accepting an invite, refresh the existing dashboard query; the meeting should appear under `Shared with Me` because membership-aware RLS now returns it.

## Risks

- **Email mismatch risk:** If the invite email differs from the user's auth email alias, the invite will not appear. Keep messaging explicit.
- **Auth email changes:** Profiles mirror auth email, but invite matching should use the current auth email at acceptance time.
- **RPC correctness risk:** Acceptance must be atomic and must not create membership for non-matching emails.
- **Duplicate state risk:** Block active-member invites and make duplicate pending invites idempotent.
- **Revocation race risk:** Acceptance must re-check `status = 'pending'` at update time.
- **Dashboard discoverability risk:** If automated email is deferred, users need clear owner instructions and an obvious signed-in place to check pending invites.
- **Preview validation risk:** Local checks do not prove deployed Supabase RLS/RPC behavior; PR 3B must be validated on a Supabase-configured preview.

## Manual validation checklist for PR 3B

- Owner invites an existing user by email.
- Existing user signs in and sees the pending invite.
- Existing user accepts the invite.
- Accepted user's `meeting_members` row exists as `editor` with `removed_at is null`.
- Accepted invitation is marked `accepted` with `accepted_by` and `accepted_at`.
- Shared meeting appears under `Shared with Me` after refresh.
- Owner revokes a pending invite.
- Revoked invite is marked `revoked` with `revoked_at`.
- Revoked invite cannot be accepted.
- Invite to a non-existing email remains pending.
- After account creation/login with the same email, the pending invite is visible and can be accepted if Supabase auth email confirmation constraints allow sign-in.
- Non-owner cannot create an invite.
- Non-owner cannot revoke an invite.
- Unrelated signed-in user cannot see or accept another email's invite.
- Existing active member cannot receive a duplicate pending invite.
- Pending invite alone does not allow direct meeting access before acceptance.
- Local Mode behavior is unchanged.
- Dashboard cards and existing owned/shared actions are unchanged except for data refresh after accepted membership.

## Final recommendation

Proceed with PR 3B as a narrow pending-invitation implementation using the existing `meeting_invitations` table, explicit signed-in email-match acceptance, editor-only accepted memberships, and narrow security-definer RPCs for invite creation/revocation/listing/acceptance. Defer tokenized links, automated email delivery, Viewer UX, role editing, active member management, ownership transfer, realtime collaboration, and dashboard card changes.
