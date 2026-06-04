# Phase 3 Dashboard Shared Access Architecture Review

Date: 2026-06-04
Branch target: `phase-3-shared-access`
PR intent: Phase 3 PR 2 planning/review only; no runtime, dashboard behavior, auth, RLS, migration, invite, member-management, Viewer UX, autosave, or Local Mode changes.

## Reviewed files

### Planning and durable context
- `planning/STATE.md`
- `planning/DECISIONS.md`
- `planning/QUESTIONS.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/PERMISSIONS.md`
- `docs/VALIDATION.md`

### Dashboard and meeting entry code
- `app/dashboard/page.tsx`
- `app/components/workspace/MeetingSelector.tsx`
- `app/meeting/[id]/page.tsx`
- `app/components/meeting/MeetingWorkspace.tsx`

### Supabase/auth/client code
- `app/lib/supabaseClient.ts`
- `app/hooks/useSupabaseAuth.ts`

### Relevant migrations reviewed for access implications only
- `supabase/migrations/20260603090000_align_shared_access_schema.sql`
- `supabase/migrations/20260604090000_add_membership_rls_foundation.sql`
- `supabase/migrations/20260604100000_add_admin_readability_views.sql`
- `supabase/migrations/20260604110000_add_user_metadata_to_admin_readability_views.sql`

## Current dashboard architecture summary

- `/dashboard` is a client component that owns all dashboard state, data loading, meeting-card rendering, create/duplicate/archive/restore/delete handlers, dashboard menu state, and archive visibility state in one file.
- There is no extracted dashboard meeting-card component yet. The card markup and per-card actions are inline in `app/dashboard/page.tsx`.
- The dashboard imports the low-level REST helper directly from `app/lib/supabaseClient.ts` and calls `supabaseMeetingClient.listWorkspaces(session.accessToken)` from a `useEffect` after auth is available.
- Dashboard meeting state is a flat `SupabaseMeeting[]`. The type exposes `owner_id`, but it does not expose a viewer/editor/member role, access source, or section classification.
- Dashboard cards are currently one list, not separated by ownership. Active vs archived display is controlled by `showArchived`; there is no search input or search state.
- Dashboard ordering comes from the Supabase REST query (`updated_at.desc`) plus local prepend behavior after create/duplicate. It is not alphabetized.
- The older in-workspace `MeetingSelector` also calls `listWorkspaces`, but it is not the primary `/dashboard` card UI. It contains an explicit owner assumption by storing `workspaceOwnerId = session.user.id` and hiding loaded workspaces unless that local value matches the signed-in user.

## Current meeting loading flow

1. `useSupabaseAuth` reads the browser-stored Supabase session, refreshes it if near expiry, or calls `/auth/v1/user` to refresh user metadata.
2. `/dashboard` redirects unauthenticated users back to `/` once auth loading finishes.
3. When a session exists and Supabase is configured, `/dashboard` calls `supabaseMeetingClient.listWorkspaces(session.accessToken)`.
4. `listWorkspaces` issues a direct REST request to `meetings` with `select=*`, `deleted_at=is.null`, and `order=updated_at.desc`.
5. The dashboard stores the returned rows as `meetings` and locally derives `activeMeetings`, `archivedMeetings`, and `visibleMeetings` from `archived_at` plus `showArchived`.
6. Opening a card uses a plain Next `Link` to `/meeting/${meeting.id}`.
7. `/meeting/[id]/page.tsx` only renders `MeetingWorkspace`; `MeetingWorkspace` reads the route param and performs cloud-route bootstrap.
8. On a cloud route, `MeetingWorkspace` calls `supabaseMeetingClient.getWorkspace` for `id`, `name`, `owner_id`, `archived_at`, and `deleted_at`; when accessible, it sets `selectedMeetingId` and later loads full `meeting_data` plus `meeting_settings`.

## Query and ownership filtering findings

### Current dashboard query

```text
GET /rest/v1/meetings?select=*&deleted_at=is.null&order=updated_at.desc
```

### Filtering location

- Owner filtering is not expressed in the dashboard query string.
- Before PR 1B, owner-only RLS effectively made this query owner-scoped.
- After PR 1B, the same query should return all non-deleted meetings the signed-in user can access through membership-aware RLS, including owned and shared meetings.
- The client/helper does not currently centralize an ownership/access classification. `listWorkspaces` returns raw `SupabaseMeeting` rows with no computed `accessKind`, `membershipRole`, `isOwnedByCurrentUser`, or action permissions.
- Dashboard page code assumes the returned rows are safe to render as the user's meetings, but it does not classify them.

## Current dashboard action map

| Action | Current location | Current behavior | Shared-editor concern |
| --- | --- | --- | --- |
| Create New Meeting | Dashboard header | Inserts a new `meetings` row with `owner_id = session.user.id`, then routes to it. | Safe as an owner-creating action; unrelated to a shared card. |
| Import Backup | Dashboard menu | Validates JSON but intentionally does not write a new cloud meeting yet. | Safe as currently inert; future write behavior should create an owned meeting only. |
| Open | Meeting card | Links to `/meeting/[id]`. | Safe for shared editors if RLS grants access. |
| Duplicate | Active meeting card + confirmation modal | Creates a new meeting owned by the signed-in user and copies `metadata_json` plus `meeting_data` from the source row. | Treat as owner-only for PR 2; copying shared content into a new owned container is a product/security decision, not discovery/listing. |
| Archive | Active meeting card | Patches `archived_at` on the `meetings` row. | Owner-only in UI for PR 2; it is a meeting-container lifecycle action. |
| Restore | Archived meeting card | Clears `archived_at` on an archived, non-deleted row. | Owner-only in UI for PR 2; it changes shared archive visibility for everyone. |
| Delete | Archived meeting card + confirmation modal | Soft-deletes an archived row by setting `deleted_at`. | Owner-only in UI for PR 2; it hides the shared meeting from dashboard/load queries. |
| Show/Hide Archived | Dashboard header | Toggles whether archived rows are included in the visible list. | Safe if applied consistently to both Owned by Me and Shared with Me sections. |
| Settings | Dashboard menu | Visible placeholder/no-op. | Avoid expanding in PR 2. If later made functional, scope it to owner-managed dashboard settings. |
| Logout | Dashboard menu | Signs out and routes to `/`. | Safe. |

## Owner-only action list for PR 2

These should not appear on Shared with Me cards in PR 2:

- Duplicate meeting.
- Archive meeting.
- Restore archived meeting.
- Soft-delete archived meeting.
- Any future dashboard settings that mutate a meeting container or access-management data.
- Invite/member-management, role editing, ownership transfer, or multiple-owner controls.

Rationale: PR 2 is scoped to meeting discovery/listing/entry only. Even though PR 1B permits editors to update `meetings` so Manual Save can continue to work, dashboard container lifecycle controls need explicit product decisions before they are exposed to editors.

## Shared-editor-safe action list for PR 2

These are safe for shared editor meetings within the stated PR 2 boundary:

- Display a shared meeting card in the Shared with Me section.
- Open the meeting route via `/meeting/[id]`.
- Include shared meetings in dashboard search results while preserving separate Owned by Me and Shared with Me sections.
- Apply the same archive visibility toggle semantics to shared meetings as owned meetings.
- Allow meeting-route editing behavior already permitted by membership-aware RLS and existing Team Beta Last Save Wins expectations.

## Archive, restore, delete, duplicate, and open behavior notes

- Active vs archived is determined only by `archived_at` in dashboard state.
- Soft-deleted meetings are excluded at the query/helper layer with `deleted_at=is.null`.
- Archived meetings remain in the loaded dashboard array, but the dashboard hides them unless `showArchived` is enabled.
- Restore and soft-delete require the row to be archived and non-deleted in the helper query.
- Soft-delete sets `deleted_at` and then removes the row from local dashboard state.
- Duplicate currently relies on the source row from `select=*`, including `meeting_data`, and creates a new owned row with copied backup data. Tactical/Strategic history records are not copied.
- Open does not check ownership in UI. It depends on the meeting route helper and database RLS. `getWorkspace`, `loadWorkspaceData`, `loadMeetingSettings`, and Manual Save all use the signed-in access token against meeting-scoped RLS-protected tables.
- `/meeting/[id]` currently excludes soft-deleted rows but does not exclude archived rows. This matches the existing dashboard behavior where archived cards can still render an Open link when archived meetings are visible.

## Search/filtering findings

- No dashboard search is currently implemented.
- The only dashboard filter is archive visibility (`showArchived`).
- PR 2 search should be implemented after meetings are classified into Owned by Me and Shared with Me, then applied across both datasets while rendering results in separate sections.
- PR 2 should sort meetings alphabetically inside each section after search/filtering. The current `updated_at.desc` order should not be preserved for the new section lists unless the product decision changes.

## Route access notes

- `/meeting/[id]` should work with membership-aware RLS after PR 1B for owners and accepted editors because it uses the signed-in access token and queries by meeting ID without an `owner_id` client filter.
- PR 1B's `meetings` select policy uses `user_can_access_meeting(id)` and excludes deleted rows; its update policy uses `user_can_edit_meeting(id)`. That means direct-route access for accepted editors should pass while removed members and pending invitees remain blocked.
- The route still has no Viewer read-only UX. Viewer exists in schema/RLS, but Viewer productization remains deferred and should not be exposed by PR 2.

## Risks for PR 2

- The current `SupabaseMeeting` type and dashboard state do not carry membership role or access-source metadata, so UI cannot reliably decide which card actions to hide for shared editor meetings without adding an access abstraction.
- Reusing `listWorkspaces` as-is after PR 1B may suddenly show shared meetings in the current single list with owner-oriented actions if PR 2 UI changes are not sequenced carefully.
- `select=*` returns `meeting_data` to the dashboard even though the dashboard only needs listing metadata. This matters more with shared access because it increases payload size and makes duplicate behavior depend on list payload data.
- Duplicate of shared meetings needs a product decision because it copies shared content into a new meeting owned by the editor.
- Archive/restore/delete may be allowed by current editor update RLS on `meetings`; UI must intentionally withhold those controls from shared editor cards until container-lifecycle permissions are decided.
- Existing in-workspace `MeetingSelector` has owner-oriented assumptions and should not be expanded for shared discovery in PR 2 unless it is deliberately retired or isolated.
- Dashboard search must avoid collapsing Owned by Me and Shared with Me into one mixed list.

## Recommendation: split PR 2 into PR 2A and PR 2B

PR 2 should be split:

### PR 2A — Dashboard query/access abstraction

Purpose: make access classification explicit without changing user-visible dashboard behavior.

Recommended boundaries:
- Add a dashboard/listing helper that returns lean meeting-card records rather than raw `select=*` meeting rows.
- Classify each meeting as `owned` or `shared` using `owner_id === session.user.id` as the first safe discriminator.
- Keep membership role optional or deferred unless a single, safe Supabase query can retrieve it without changing RLS or adding migrations.
- Preserve current dashboard rendering and action behavior for owned meetings only.
- Add tests or low-level assertions if a test harness exists; otherwise keep the change small and manually validate.
- Do not add invite UI, access management, Viewer UX, autosave expansion, Local Mode changes, migrations, or RLS changes.

### PR 2B — Owned by Me / Shared with Me UI

Purpose: introduce the user-visible sectioned dashboard after PR 2A has made action gating explicit.

Recommended boundaries:
- Render separate Owned by Me and Shared with Me sections.
- Do not mix owned and shared meetings in one list.
- Add search that searches both owned and shared meetings while preserving separate sections.
- Sort alphabetically inside each section.
- Do not add counts yet.
- Apply the existing archive visibility toggle consistently to both sections.
- Show owner-only lifecycle actions only for Owned by Me cards.
- Show shared editor cards with Open-only meeting discovery/entry behavior for PR 2.

## Proposed implementation path for PR 2

1. Create a dashboard-facing meeting list model, for example:
   - `id`
   - `name`
   - `updated_at`
   - `archived_at`
   - `owner_id`
   - `accessKind: "owned" | "shared"`
   - optional future `membershipRole`
   - derived permissions such as `canOpen`, `canDuplicate`, `canArchive`, `canRestore`, `canSoftDelete`
2. Move the dashboard list query/classification out of `app/dashboard/page.tsx` into a Supabase helper or dashboard access helper so ownership assumptions are centralized.
3. Make the list query lean (`id`, `name`, `owner_id`, `updated_at`, `archived_at`, `deleted_at`) instead of `select=*` for dashboard listing.
4. Leave duplicate's full-data need as a separate owner-only path; if duplicate remains supported for owned meetings, fetch source data only when duplication is confirmed or keep the current helper but ensure it is never called for shared cards.
5. Keep the current `/meeting/[id]` route loading path unchanged for PR 2; membership-aware RLS should already authorize owner/editor direct access.
6. Introduce sectioned UI only after the helper can prevent shared editor cards from rendering owner-only lifecycle actions.
7. Defer Viewer UX/read-only enforcement, invite management, member management, role editing, ownership transfer, multiple owners, realtime collaboration, autosave expansion, and Local Mode changes.

## Review answers

1. Meetings are loaded by `/dashboard` through `supabaseMeetingClient.listWorkspaces(session.accessToken)` after auth is available.
2. Ownership filtering is not centralized as a client-side helper. RLS now controls accessible rows; the dashboard does not classify ownership. The older `MeetingSelector` has its own owner assumption.
3. The current listing query is `meetings?select=*&deleted_at=is.null&order=updated_at.desc`.
4. Archived rows are included in the loaded non-deleted meeting set, hidden locally unless `showArchived` is enabled, restored by clearing `archived_at`, soft-deleted by setting `deleted_at`, duplicated by inserting a new owned row with copied metadata/backup data, and opened through `/meeting/[id]`.
5. Yes. Dashboard card actions currently assume every listed meeting can receive owner-style lifecycle controls.
6. Owner-only PR 2 actions: duplicate, archive, restore, soft-delete, and any access-management or meeting-container settings controls.
7. Safe PR 2 shared-editor actions: display, search, archive-visibility filtering, and Open.
8. Search is not currently implemented; archive visibility is the only dashboard filter.
9. Active vs archived is distinguished by `archived_at`.
10. `/meeting/[id]` renders `MeetingWorkspace`, fetches meeting metadata by ID with `getWorkspace`, then loads `meeting_data` and `meeting_settings`. It should work with PR 1B membership-aware RLS for accepted owners/editors because there is no owner-only client filter.
11. PR 2 should be split into PR 2A query/access abstraction and PR 2B sectioned UI.
12. Recommended path: centralize dashboard meeting access classification first, keep owner-only actions gated, then add sectioned Owned by Me / Shared with Me UI with search and alphabetical sorting.
