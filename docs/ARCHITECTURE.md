# Architecture

This document describes the current system architecture for Meeting Tool as of Sprint 2 (`ux/sprint-2-simplification`). It is the canonical reference for developers and AI agents entering the project cold.

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
| `/` | Landing / auth entry. Shows `AuthModal` for sign-in/sign-up. Modal is always open and cannot be dismissed — it is the sole entry point. Authenticated users are redirected to `/dashboard`. |
| `/dashboard` | Authenticated dashboard. Lists cloud meetings in Owned by Me and Shared with Me sections. Create, search, archive, restore, soft-delete, duplicate, and manage members. Dashboard menu: Restore from Backup (import-only), Change Password. |
| `/meeting/[id]` | Cloud meeting workspace. Loads the meeting by URL `id` from Supabase. Requires authenticated session and active meeting membership. Workspace menu: Export Backup (export-only), Edit Playbook (owner only), Tactical History, Change Password. |

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
      EditableField.tsx           — Single-click inline plain-text editor (blur-save, change-guarded)
      RichTextEditor.tsx          — Rich text editor with toolbar (blur-save; always-visible or discoverable toolbar mode)
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
- **Forgot Password:** Implemented on PR #110 (`codex/add-forgot-password-implementation`). Includes the `/reset-password` route, `ForgotPassword` component, and password-reset helpers in `supabaseClient.ts` and `useSupabaseAuth.ts`. A recovery token session-exchange bug was found and fixed. PR #110 is merge-ready and pending final email-link validation (Resend/DNS in progress); it has not yet been merged to `phase-3-shared-access`. See `docs/AUTH_EMAIL_SETUP.md`.

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
### Manual Save

Manual Save writes the complete workspace backup JSON to `meetings.meeting_data`. It:

- Captures everything, including surfaces not yet covered by structured autosave.
- Is available to both owners and editors.
- Is the source for JSON export and the import target.
- Remains mandatory as the cloud rollback and backup/import path.

### JSON export/import — Backup/Restore split (Sprint 2)

**Export Backup** is available only in the meeting workspace menu and serializes the full runtime workspace to a downloadable JSON file.

**Restore from Backup** is available only in the dashboard menu. It:
1. Prompts the user for a meeting name (blank name disables the file picker).
2. Validates the JSON backup file.
3. Creates a new cloud meeting with the entered name (unique suffix appended if name exists).
4. Restores backup data to `localStorage` via `restoreWorkspaceBackup`.
5. Marks the new meeting's setup as complete via the scoped localStorage key.
6. Navigates directly into the new meeting workspace.
7. Does not overwrite existing meetings.

Import/Restore code (`handleImportWorkspaceBackup`) is preserved in `MeetingWorkspace.tsx` but intentionally removed from the workspace UI pending Sprint 3 decision (keep and re-expose, or delete).

**`BackupRestoreModal`** accepts a `mode` prop (`'both' | 'export-only' | 'import-only'`) that controls which actions and copy are rendered. Dashboard uses `'import-only'`; workspace uses `'export-only'`.

---

## localStorage Key Scoping Contract

All runtime workspace state in `MeetingWorkspace.tsx` is stored via `getStorageKey()`, which calls `getWorkspaceScopedStorageKey(baseKey, selectedMeetingId)`:

- **Cloud mode** (`selectedMeetingId` is set): produces `meeting-tool-cloud-workspace:{id}:{baseKey}` — fully isolated per cloud workspace.

All `leadership-*` keys (objectives, meetings, organization info, settings, section order, strategic topics, SOOs, etc.) are routed through this helper. This means each cloud workspace has independent state in `localStorage`.

**Important:** Code or utilities that construct scoped keys as raw strings must stay in sync with this format. The `getWorkspaceScopedStorageKey` function is the single source of truth for the key format — do not duplicate the string pattern elsewhere.

---

## Authentication Model

### Landing page and entry point (Sprint 2)

The landing page (`app/page.tsx`) shows only the `AuthModal`. The modal is always open (`isOpen={true}`) and `onClose` is a no-op — there is no way to dismiss it. Authenticated users are redirected to `/dashboard` via `useEffect`. There is no unauthenticated path from the landing page.

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

| Chip | Description |
|------|-------------|
| Open | A real dated meeting that has not been ended. Editable. |
| Closed | A meeting that was explicitly ended. Read-only. Captured in Tactical History. |
| Test Mode | A test-dated meeting (preview/development only, `NEXT_PUBLIC_ENABLE_TESTING_TOOLS=true`). Shows open/closed sub-state. |

**End Meeting:** Creates a `tactical_sessions` archival snapshot (`snapshot_json`). Does not reset, advance, or change the date. Autosave and Manual Save continue to work after End Meeting.

**One-meeting-per-date:** Only one real meeting may exist per date. The reference date is the real system date in normal use, or the Test Mode selected date when Test Mode is active. Test Mode may allow multiple open meetings across different test dates — this is a known limitation documented in the lifecycle help popover.

**Cloud refresh preference:** The workspace prefers the current open dated record, then the newest real dated record, then falls back to legacy data.

---

## MeetingHeader — Five-Zone Structure

`MeetingHeader.tsx` is a pure renderer. All display logic is pre-computed in `MeetingWorkspace.tsx` and passed as props.

| Zone | Contents |
|------|----------|
| Zone 1 — Identity | Meeting title (`stickyMeetingTitle`) |
| Zone 2 — Primary Action | Primary action button (End Meeting / View / Start Meeting) + lifecycle chip (Open / Closed / Test Mode) + `?` help popover |
| Zone 3 — Autosave | Autosave status pill (expandable detail panel) |
| Zone 4 — Manual Save | Manual Save button with inline status (Save / Saving... / Saved / Up to date / Save failed) |
| Zone 5 — Settings | Settings/menu trigger |

**Pre-computed props pattern:** `MeetingWorkspace` derives `primaryActionLabel`, `chipLabel`, `chipTestModeStatus`, `chipTestModeHelpNote`, `primaryActionDisabled`, `computedManualSaveLabel`, and related values before rendering. `MeetingHeader` renders them without re-deriving meeting state. This ensures a single source of truth for all lifecycle display decisions.

---

## Dashboard UX

- **Owned by Me:** Cards for meetings where `meetings.owner_id = auth.uid()`. Owner actions: Open, Duplicate, Archive; archived owner cards: Open, Restore, Delete.
- **Shared with Me:** Cards for meetings returned by RLS where the user is an active editor. Shared cards: Open only.
- **Search:** Single search field across both sections, results rendered under the correct section heading.
- **Member count:** Owner plus active editors. Excludes pending invitations, removed members, and viewers.
- **Archive visibility:** A dashboard-level toggle. Archived cards respect the same toggle for both owned and shared sections.

---

## File Size Note — MeetingWorkspace.tsx

`MeetingWorkspace.tsx` is approximately 4000+ lines and contains workspace layout, all autosave logic, all cloud API calls, all modal state, backup/restore handlers, members management, playbook modal trigger, and meeting lifecycle handlers. Partial extractions completed:

- `MeetingHeader.tsx` — **extracted**. Sticky header, five-zone structure, renders pre-computed props only.
- `useWorkspacePersistence.ts` — **extracted**. All autosave effects and cloud API calls.
- `useWorkspaceMembers.ts` — deferred to a future sprint.

Until further splitting is complete, be cautious about adjacent changes — the file is large enough that edits in one area can inadvertently affect another.

---

## Members Auto-Load (Sprint 2)

`isMeetingOwner` is derived from `workspaceMeetingMembers`. As of Sprint 2, a `useEffect` in `MeetingWorkspace.tsx` auto-loads meeting members on workspace mount (triggered by `authSession` and `selectedMeetingId`). This ensures owner-only menu items (e.g., Edit Playbook) resolve correctly without requiring the members modal to open.

---

## Edit Playbook — Scoping Note (Sprint 2)

Edit Playbook is owner-only in the workspace settings menu. It reads/writes the `leadership-organization-info` localStorage key, which is scoped per cloud workspace via `getWorkspaceScopedStorageKey`. However, this data is not yet persisted to `meeting_settings` in Supabase — it lives only in `localStorage` and is not cross-device or cross-session consistent. Sprint 3 will migrate Edit Playbook data to `meeting_settings.organization_info` for cloud persistence.

---

## Shared Editing Components (Sprint 5)

All editable content in the workspace uses one of two shared components. Create/add inputs are outside this system.

### `EditableField.tsx`

Plain-text inline editor (single-line or multi-line textarea). Behaviour:
- Activates on single click. No double-click-to-edit anywhere in the product.
- Saves on blur, change-guarded (parent `onSave` is only called when the value has changed).
- Keyboard: `Enter` saves (single-line), `Ctrl/Cmd+Enter` saves (multi-line), `Escape` cancels without saving.
- Viewer element shows `hover:bg-yellow-50` to signal editability.

### `RichTextEditor.tsx`

Rich text editor with a formatting toolbar (bold, italic, underline, bullet list, numbered list). Behaviour:
- Saves on blur, change-guarded.
- Toolbar active-state is scoped to the focused editor instance — checked via `anchorNode` containment in the instance's editor refs before calling `document.queryCommandState`. This prevents shared active-state bleed when multiple toolbars are visible at once.
- Two visibility modes:
  - **Always-visible** (`editingMode="always"`): toolbar is always rendered. Used in dedicated editing contexts — Playbook definitions, Defining Objective description, Task description, SOO description, Setup modal fields.
  - **Discoverable** (`activationMode="click"`, `manualPresentation="inline"`): viewer shows `hover:bg-yellow-50`; toolbar appears on click activation. Used in dense workspace fields — agenda item discussion notes, Strategic Topic notes.

---

## Deferred (Post-Sprint-2)

- `MeetingWorkspace.tsx` split into smaller files (Sprint 3)
- Edit Playbook cloud persistence migration to `meeting_settings` (Sprint 3)
- Workspace import re-enable or deletion (Sprint 3)
- Realtime collaboration, presence, locks, CRDTs, conflict resolution.
- Ownership transfer.
- Full Viewer read-only UX enforcement.
- Organizations and multi-owner models.
- Transactional Promote to Strategic Topic RPC.
- Legacy `decisionItems` migration tooling.
