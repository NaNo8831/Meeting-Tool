# Architecture

This document describes the current system architecture for Meeting Tool as of the Documentation Refresh sprint on `phase-3-shared-access`. It is the canonical reference for developers and AI agents entering the project cold.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), TypeScript |
| Styling | Tailwind CSS 4 |
| Auth and database | Supabase (email/password auth, PostgreSQL, RLS, PostgREST REST API) |
| Deployment | Vercel |
| Local persistence (fallback) | Browser `localStorage` |

---

## Application Routes

| Route | Description |
|-------|-------------|
| `/` | Landing / auth entry. Shows `AuthModal` for sign-in/sign-up. Authenticated users are redirected to `/dashboard`. Signed-out users can proceed to Local Mode. |
| `/dashboard` | Authenticated dashboard. Lists cloud meetings in Owned by Me and Shared with Me sections. Create, search, archive, restore, soft-delete, duplicate, and manage members. |
| `/meeting/[id]` | Cloud meeting workspace. Loads the meeting by URL `id` from Supabase. Requires authenticated session and active meeting membership. |
| `/meeting/local` | Browser-only local workspace. Served by the `[id]` dynamic route with `id="local"`. Detected in `MeetingWorkspace` as `isLocalRoute = routeMeetingId === "local"`. No cloud reads or writes. |

---

## Key File Structure

```
app/
  page.tsx                        — Landing/auth entry
  layout.tsx                      — Root layout
  dashboard/
    page.tsx                      — Authenticated dashboard
  meeting/
    [id]/
      page.tsx                    — Meeting route shell (renders MeetingWorkspace)
  components/
    auth/
      AuthModal.tsx               — Sign-in/sign-up form
    dashboard/
      BackupRestoreModal.tsx      — JSON workspace backup/restore UI
      MeetingSetupModal.tsx       — Meeting setup form
      PlaybookDefinitionsModal.tsx
    meeting/
      MeetingWorkspace.tsx        — Primary meeting workspace (all meeting logic)
      MeetingSection.tsx          — Individual section renderer
    objectives/
      ObjectiveCard.tsx           — Compact objective scan card
      TaskDetailsModal.tsx        — Full task detail modal
      TaskList.tsx                — Task list within an objective
    ui/
      ColorSquareSelect.tsx       — Color picker
      EditableField.tsx           — Double-click-to-edit field
      RichTextEditor.tsx          — Rich text editor and display
    feedback/
      FeedbackWidget.tsx          — Tester feedback collection
  hooks/
    useSupabaseAuth.ts            — Auth session management
    useLocalStorage.ts            — Browser localStorage utilities
    useObjectives.ts              — Objective CRUD operations
    useBodyScrollLock.ts          — Scroll lock for modals/overlays
  lib/
    supabaseClient.ts             — All Supabase REST calls, types, RPC wrappers
    dashboardMeetings.ts          — DashboardMeeting type and listing helpers
    workspaceBackup.ts            — JSON backup/restore serialization
    objectiveOptions.ts           — Objective status/priority/color enums
  types/
    objective.ts                  — Objective, Task, Subtask, TaskComment, TaskActivity
    dashboard.ts                  — DashboardWorkspace, MeetingRecord, MeetingItem, SOO, etc.
    richText.ts                   — RichTextDocument, RichTextValue

supabase/
  migrations/                     — All migrations, applied in timestamp order
```

---

## Supabase Integration

Meeting Tool calls Supabase through its PostgREST REST API using `fetch`, not the Supabase JS client library. All Supabase calls are in `app/lib/supabaseClient.ts`.

**Required environment variables:**

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

### Auth flow

- **Sign-up:** `POST /auth/v1/signup` — creates a Supabase auth user and returns a session. A `profiles` row is bootstrapped by the app at sign-in for legacy users or by trigger for new users.
- **Sign-in:** `POST /auth/v1/token?grant_type=password` — returns access and refresh tokens.
- **Sign-out:** `POST /auth/v1/logout` — invalidates the session.
- **Session storage:** Sessions persist in `localStorage` under `meeting-tool-supabase-auth-session` and are refreshed automatically (60-second expiry buffer).
- **Forgot Password:** Not yet implemented in the codebase. Planned via Supabase password reset (PR #110 scope, pending implementation and merge). See `docs/AUTH_EMAIL_SETUP.md` for the planned redirect URL setup.

### Meeting creation

Meeting creation uses the `create_owned_meeting(meeting_name text)` SECURITY DEFINER RPC instead of a direct `INSERT` into `meetings`. The function sets `owner_id = auth.uid()` server-side, preventing the client from supplying a forged owner. Defined in `supabase/migrations/20260604150000_add_owned_meeting_create_rpc.sql`.

---

## Cloud Persistence Architecture

### Hydration order (Cloud Meeting load)

Cloud routes hydrate data in this order on load:

1. `meetings.meeting_data` — full-workspace backup JSON (fallback for all surfaces).
2. `meeting_settings` row — overlays settings fields when a row exists.
3. `strategic_topics` + `strategic_topic_notes` rows — overlay topic data when rows exist.
4. `meeting_notes` rows — overlay meeting notes and cascade items when rows exist.
5. `objectives`, `tasks`, `standard_operating_objectives` rows — overlay when rows exist.
6. `agenda_items` rows — overlay when rows exist.

If no structured rows exist for a surface, data from `meetings.meeting_data` is used. This ensures backward compatibility for meetings created before structured autosave was added.

### Structured autosave

Autosave runs on `/meeting/[id]` cloud routes after bootstrap. Properties:

- **Per-surface:** Settings, topics, notes, objectives, and agenda items each have their own debounced save path.
- **Debounced:** Writes fire after a quiet period following the last change.
- **Last Save Wins:** No conflict detection, merging, or realtime synchronization. Concurrent editors can overwrite each other.
- **Not active in Local Mode:** `/meeting/local` never reads or writes cloud tables.

### Manual Save

Manual Save writes the complete workspace backup JSON to `meetings.meeting_data`. It:

- Captures everything, including surfaces not yet covered by structured autosave.
- Is available to both owners and editors.
- Is the source for JSON export and the import target.
- Remains mandatory as the cloud rollback and backup/import path.

### JSON export/import

Export serializes the full runtime workspace to a downloadable JSON file. Import reads that JSON and restores `meetings.meeting_data` plus structured rows (objectives, tasks, SOOs, topics, notes, agenda items where applicable). This is the primary user-facing backup and recovery mechanism.

---

## Local Mode

`/meeting/local` is a browser-only fallback served by the `[id]` dynamic route with `id="local"`. It:

- Persists everything in `localStorage`.
- Never reads or writes any Supabase table.
- Does not require authentication.
- Cannot be shared.

Local Mode exists for signed-out users and as a fallback during cloud stabilization. It is planned for future demotion or decommission after cloud main readiness is confirmed; that decision is deferred.

---

## Authentication Model

### Session management

`useSupabaseAuth` hook exposes:

- `session` — current `SupabaseAuthSession | null`.
- `signIn(email, password)` — signs in and saves the session.
- `signUp(email, password)` — creates a new account and saves the session.
- `signOut()` — clears the session.
- `isConfigured` — true when Supabase env vars are present.
- `isLoading` — true while an auth request is in flight.

Unauthenticated access to `/meeting/[id]` routes (non-local) shows a "sign in required" message.

### Identity in RLS

- `auth.uid()` is the sole identity authority for all RLS policies.
- `profiles` table provides display names — it is not used for authorization.
- Pending invitation email text is never used for runtime access checks.

---

## RLS Authorization Model

All cloud data access is enforced at the database layer through Supabase RLS. The application cannot bypass it.

Key RLS helper functions:

| Function | Condition |
|----------|-----------|
| `user_owns_meeting(target_meeting_id)` | `meetings.owner_id = auth.uid()` |
| `user_is_active_meeting_member(target_meeting_id)` | Active `meeting_members` row with `removed_at is null` |
| `user_can_access_meeting(target_meeting_id)` | Owner OR any active member (read) |
| `user_can_edit_meeting(target_meeting_id)` | Owner OR active owner/editor member (write) |
| `user_can_manage_meeting_access(target_meeting_id)` | Owner only (invite, remove, revoke) |

See `docs/PERMISSIONS.md` for the full role matrix and table-level policy summary.

---

## Meeting Lifecycle

| State | Description |
|-------|-------------|
| Open | A dated meeting record for today exists and has not been ended. Editable. |
| Closed | A dated meeting record was ended. The record is read-only. |
| Past | A dated record from a prior date. Always read-only. |
| Test Mode | A test date override is active (preview/development only, requires `NEXT_PUBLIC_ENABLE_TESTING_TOOLS=true`). |

**End Meeting:** Creates a `tactical_sessions` archival snapshot (`snapshot_json`). Does not reset or advance the workspace. Autosave and Manual Save continue to work after End Meeting.

**Cloud refresh preference:** The workspace prefers today's open dated record, then the newest real dated record, then falls back to legacy data when no dated records exist.

---

## Dashboard UX

- **Owned by Me:** Cards for meetings where `meetings.owner_id = auth.uid()`. Owner actions: Open, Duplicate, Archive; archived owner cards: Open, Restore, Delete.
- **Shared with Me:** Cards for meetings returned by RLS where the user is an active editor. Shared cards: Open only.
- **Search:** Single search field across both sections, results rendered under the correct section heading.
- **Member count:** Owner plus active editors. Excludes pending invitations, removed members, and viewers.
- **Archive visibility:** A dashboard-level toggle. Archived cards respect the same toggle for both owned and shared sections.

---

## Deferred (Post-Main)

- Forgot Password / account recovery.
- Custom SMTP (Resend recommended) for reliable auth email delivery.
- Realtime collaboration, presence, locks, CRDTs, conflict resolution.
- Ownership transfer.
- Full Viewer read-only UX enforcement.
- Local Mode decommission.
- Organizations and multi-owner models.
- Transactional Promote to Strategic Topic RPC.
- Legacy `decisionItems` migration tooling.
