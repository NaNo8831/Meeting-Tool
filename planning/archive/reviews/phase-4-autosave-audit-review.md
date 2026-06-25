# Phase 4 PR 4A Architecture Review — Autosave Audit

This is a planning, documentation, and architecture review only. It does not change runtime behavior, application code, Supabase schema, RLS policies, authentication, Local Mode, Manual Save, autosave coverage, or UI.

## Files reviewed

- `planning/STATE.md`
- `planning/DECISIONS.md`
- `planning/QUESTIONS.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/PERMISSIONS.md`
- `docs/VALIDATION.md`
- `app/meeting/[id]/page.tsx`
- `app/components/meeting/MeetingWorkspace.tsx`
- `app/hooks/useLocalStorage.ts`
- `app/hooks/useObjectives.ts`
- `app/hooks/useSupabaseAuth.ts`
- `app/lib/supabaseClient.ts`
- `app/lib/dashboardMeetings.ts`
- `app/lib/workspaceBackup.ts`
- Supabase migrations from `20260516000000_create_workspaces.sql` through `20260605120000_harden_meeting_lifecycle_mutations.sql`, with focus on `meetings`, `meeting_settings`, `meeting_data`, structured content tables, tactical history, membership RLS, and lifecycle mutation hardening.

## Executive finding

Structured autosave is intentionally narrow. The only confirmed automatic cloud persistence for live workspace editing is the `meeting_settings` pilot:

- dashboard/playbook title (`meeting_settings.dashboard_title`)
- organization/playbook setup info (`meeting_settings.organization_info`)
- meeting section order (`meeting_settings.meeting_section_order`)
- setup completed state (`meeting_settings.setup_completed`)

Everything else that makes up the live meeting workspace still depends on browser-local `localStorage` during editing and on explicit Manual Save to `meetings.meeting_data` for a full cloud backup. Tactical History is separately persisted only when the user explicitly ends a meeting. Strategic Topic history notes have separate load/save client methods, but they are manual per-topic saves and the repository migrations do not create the referenced `strategic_topic_notes` table.

## Current persistence layers

1. **Browser-local workspace state**
   - `useLocalStorage` reads/writes `leadership-*` keys in `window.localStorage`.
   - Cloud meetings scope these keys as `meeting-tool-cloud-workspace:{meetingId}:{leadership-key}` after route selection.
   - This is refresh-safe in the same browser but not team-safe or device-safe.

2. **Full workspace cloud backup**
   - Manual Save writes a `WorkspaceBackupFile` object to `meetings.meeting_data`.
   - The backup contains the current `leadership-*` workspace snapshot under `localStorage`.
   - Owners and active editors can write `meeting_data`; PR 3D narrows direct `meetings` updates to this field while owner-only RPCs handle container/lifecycle mutations.

3. **Structured settings pilot**
   - `meeting_settings` is loaded alongside `meetings.meeting_data` and applied after the backup load.
   - After route bootstrap, a debounced autosave upserts the `meeting_settings` payload when the payload changes.
   - This covers setup/playbook-level settings only; it does not cover objectives, tasks, meeting notes, strategic topics, SOOs, or DOs.

4. **Explicit tactical history snapshots**
   - Ending a meeting inserts a `tactical_sessions` row with `snapshot_json` built from the current workspace storage.
   - This is not continuous autosave and does not replace Manual Save for the active workspace.

5. **Strategic Topic history notes**
   - The UI manually loads/saves notes through `strategic_topic_notes` client calls keyed by `meeting_id` and `strategic_topic_item_id`.
   - The app code references `strategic_topic_notes`, but repo migrations reviewed here do not create that table or its RLS policies. Treat this as deployment-dependent/uncertain until schema is reconciled.

## Autosave matrix

| Surface | Current storage | Autosaved? | Manual Save required? | Refresh-safe? | Shared-editor-safe? | Notes/Risks |
| --- | --- | --- | --- | --- | --- | --- |
| Dashboard cloud card title / meeting container name | `meetings.name` | On create only; owner-only rename RPC exists but no broad autosave from workspace | No for creation; not part of Manual Save semantics | Safe once meeting row exists | Owner-safe for lifecycle/container; editor cannot mutate after PR 3D | Workspace header can use `dashboardTitle`, but dashboard card name comes from `meetings.name`; possible naming mismatch. |
| Workspace/dashboard title | `localStorage` key `leadership-dashboard-title`; structured `meeting_settings.dashboard_title`; included in `meeting_data` backup | Yes, to `meeting_settings` after cloud route bootstrap | Required for full backup parity and rollback | Safe after settings autosave; safe only in same browser before autosave | Owner/editor can autosave via `meeting_settings` RLS | Last Save Wins; structured value overlays backup on load. |
| Setup/playbook organization info / Top Priority | `leadership-organization-info`; `meeting_settings.organization_info`; `meeting_data` backup | Yes, to `meeting_settings` | Required for full backup | Safe after settings autosave; browser-local before autosave | Owner/editor can autosave | Last Save Wins; rich/nested payload is saved as JSONB. |
| Meeting section order | `leadership-meeting-section-order`; `meeting_settings.meeting_section_order`; `meeting_data` backup | Yes, to `meeting_settings` | Required for full backup | Safe after settings autosave; browser-local before autosave | Owner/editor can autosave | Narrow structured pilot surface. |
| Setup completed state | `leadership-meeting-setup-completed`; `meeting_settings.setup_completed`; `meeting_data` backup | Yes, to `meeting_settings` | Required for full backup | Safe after settings autosave; browser-local before autosave | Owner/editor can autosave | Controls setup modal behavior. |
| Defining Objectives / DOs | `leadership-objectives`; `meetings.meeting_data` backup | No structured cloud autosave | Yes | Safe in same browser localStorage; cloud-refresh/team-safe only after Manual Save | Editor Manual Save can preserve, but concurrent saves can overwrite | High data-loss/overwrite risk before team beta if users assume autosave covers DOs. |
| Tasks, task status, task details, subtasks, comments, activity history | Nested under `leadership-objectives`; `meetings.meeting_data` backup | No structured cloud autosave | Yes | Safe in same browser localStorage; cloud-refresh/team-safe only after Manual Save | Editor Manual Save can preserve, but concurrent saves can overwrite | High-risk operational content; task history is not tactical history. |
| Standard Operating Objectives / SOOs | `leadership-standard-operating-objectives`; `meetings.meeting_data` backup | No structured cloud autosave | Yes | Safe in same browser localStorage; cloud-refresh/team-safe only after Manual Save | Editor Manual Save can preserve, but concurrent saves can overwrite | Structured table exists but runtime does not use it. |
| Strategic Topics list/lifecycle | `leadership-strategic-topic-items`; `meetings.meeting_data` backup | No structured cloud autosave | Yes | Safe in same browser localStorage; cloud-refresh/team-safe only after Manual Save | Editor Manual Save can preserve, but concurrent saves can overwrite | High risk because completed/archived topic lifecycle looks cloud-like but is local/full-backup only. |
| Strategic Topic history notes | Client calls `strategic_topic_notes` separately; not included in workspace backup | No autosave; manual per-topic Save Notes only | Manual Save does not cover these notes unless separately duplicated elsewhere, which current code does not do | Uncertain: safe only if deployed table/RLS exists and Save Notes succeeds | Uncertain: app attempts owner/editor save via authenticated REST; repo lacks table migration/policies | Schema drift risk: docs/code mention a table not created by repo migrations. This should be reconciled before expanding topic autosave. |
| Meeting Notes date records | `leadership-meetings`; `meetings.meeting_data` backup | No structured cloud autosave | Yes | Safe in same browser localStorage; cloud-refresh/team-safe only after Manual Save | Editor Manual Save can preserve, but concurrent saves can overwrite | Meeting dates and per-date note records are part of this key. |
| Agenda Items | Nested in `leadership-meetings[].agendaItems`; `meeting_data` backup | No structured cloud autosave | Yes | Safe in same browser localStorage; cloud-refresh/team-safe only after Manual Save | Editor Manual Save can preserve, but concurrent saves can overwrite | High live-meeting risk. |
| Decisions / Actions | Nested in `leadership-meetings[].decisionItems`; `meeting_data` backup | No structured cloud autosave | Yes | Safe in same browser localStorage; cloud-refresh/team-safe only after Manual Save | Editor Manual Save can preserve, but concurrent saves can overwrite | High live-meeting risk. |
| Cascading Communications | Nested in `leadership-meetings[].cascadeItems`; `meeting_data` backup | No structured cloud autosave | Yes | Safe in same browser localStorage; cloud-refresh/team-safe only after Manual Save | Editor Manual Save can preserve, but concurrent saves can overwrite | High live-meeting risk because it is often captured at the end of meetings. |
| Active meeting id / selected date record | `leadership-active-meeting-id`; `meeting_data` backup | No structured cloud autosave | Yes | Safe in same browser localStorage; cloud-refresh/team-safe only after Manual Save | Editor Manual Save can preserve, but concurrent saves can overwrite | Controls which notes record opens. |
| Tactical History snapshots | `tactical_sessions.snapshot_json` on End Meeting | No continuous autosave; explicit End Meeting insert | No for created history snapshot; yes for active workspace backup | Safe after End Meeting succeeds | Owner/editor can create if RLS allows edit access | Snapshot is archival and read-focused; it does not restore/merge active workspace automatically. |
| Dashboard lifecycle state | `meetings.archived_at`, `meetings.deleted_at` | Persisted by explicit owner-only dashboard RPCs | No | Safe after RPC succeeds | Owner-only; editors blocked | Not an autosave surface; direct editor update risk was hardened in PR 3D. |
| Auth session | Browser `localStorage` key `meeting-tool-supabase-auth-session` | Stored on sign-in/refresh | N/A | Refresh attempts token refresh or `getUser`; failure signs out locally | Same user/session only | Expired token can cause autosave/manual save failures until refresh/sign-in succeeds. |
| UI/modal/draft-only state | React component state | No | Not backed up | Not persisted | Not shared | Draft input fields, open modals, selected task/modal state, and transient messages can be lost on refresh. |

## Manual Save dependencies

Manual Save remains required for cloud backup of the live workspace payload that users care about during meetings:

- DOs / Defining Objectives.
- Tasks, task workflow status, task details, subtasks, comments, and task activity history.
- SOOs / Standard Operating Objectives.
- Strategic Topics list, active/completed/archived state, ordering, and lifecycle metadata.
- Meeting date records and active meeting id.
- Agenda Items.
- Decisions / Actions.
- Cascading Communications.
- Full backup parity for settings surfaces even though the narrow `meeting_settings` pilot also autosaves them.

Strategic Topic history notes are not covered by Manual Save in the current reviewed code path; they rely on their own Save Notes call to `strategic_topic_notes` and should be treated as a separate persistence boundary.

## Local-only persistence

- Local Mode is intentionally browser-only through unscoped `leadership-*` `localStorage` keys plus JSON export/import.
- Cloud Meeting runtime also keeps a browser-scoped copy under `meeting-tool-cloud-workspace:{meetingId}:{leadership-key}`. This supports same-browser refresh and editing, but it is not a team-safe cloud save until Manual Save or a structured save succeeds.
- Migration prompt bookkeeping and auth session state are browser-local operational state, not workspace content.
- Transient UI state and unsaved text drafts are not persisted.

## Refresh safety classification

- **Safe after refresh without Manual Save:** surfaces already saved to `meeting_settings`; dashboard lifecycle fields after owner RPC success; Tactical History snapshots after End Meeting success; browser-local workspace state in the same browser.
- **Safe only after Manual Save for cloud/team/device continuity:** objectives, tasks, SOOs, Strategic Topics list/lifecycle, meeting date records, active meeting id, Agenda Items, Decisions/Actions, Cascading Communications, and full backup parity for settings.
- **Uncertain:** Strategic Topic history notes because the client references `strategic_topic_notes`, but repo migrations reviewed here do not create the table/RLS.
- **Not persisted:** transient UI state, modal state, unsaved draft input fields, selected details/modal state, and status messages.

## Shared editor safety

- Owners can create meetings, manage invitations/members, duplicate owned meetings, archive/restore/soft-delete owned meetings, open/edit content, Manual Save full workspace backup, autosave settings, create tactical history snapshots, and view Tactical History.
- Editors can open shared meetings, edit content in the current UI, Manual Save full workspace backup to `meetings.meeting_data`, autosave the current `meeting_settings` pilot surfaces, create tactical history snapshots if allowed by current content RLS, and view Tactical History.
- Editors cannot manage invitations/members and cannot mutate protected meeting container/lifecycle fields after PR 3D hardening.
- Editor Manual Save does preserve shared meeting changes when it succeeds because owners and active editors may update `meetings.meeting_data`.
- Overwrite risk remains: Manual Save is full-payload Last Save Wins. An editor can overwrite an owner's newer unsaved or differently saved workspace backup if the editor saves from stale local state. Structured settings autosave is also Last Save Wins at the field payload level.

## Session/JWT behavior

- Auth sessions are stored in browser `localStorage` and refreshed on app load when close to expiry. If refresh or `getUser` fails, the app clears the stored session.
- Settings autosave failures surface as `Settings save failed` / error message state. They do not block localStorage writes, but cloud structured settings are not guaranteed saved.
- Manual Save failures surface as `Cloud action failed` / error message state. The browser-local workspace copy remains, but cloud `meeting_data` is not updated.
- Refresh can restore the session if the stored refresh token is still valid; if not, cloud routes redirect/sign-out behavior can make unsaved cloud-only changes depend on browser-local scoped `localStorage` until the user signs in again.
- Unsaved changes are at risk when the browser local copy is unavailable, another collaborator overwrites the cloud backup, or users assume settings autosave covers full workspace content.

## Full workspace backup

`meetings.meeting_data` contains a `WorkspaceBackupFile` object:

- `app: "meeting-tool-workspace-backup"`
- `backupVersion: 1`
- `exportedAt`
- `localStorage`, containing validated `leadership-*` workspace keys

It is written by:

- Manual Save from a valid Cloud Meeting route.
- Explicit Local Workspace migration into a selected Cloud Meeting.
- Owned meeting duplication copies the source row's `meeting_data` to the duplicate.

It can be written by owners and active editors through the narrowed `meeting_data` update grant and membership-aware RLS. Import/restore applies the backup to the current browser view and localStorage; in Cloud Mode it does not write cloud data until the user clicks Manual Save. This is why Manual Save remains the safety net until structured autosave covers all critical surfaces.

## Recommended structured autosave expansion order

1. **PR 4B — Strategic Topics structured persistence reconciliation and autosave**
   - First reconcile the schema mismatch around `strategic_topic_notes` versus existing migrations.
   - Then autosave Strategic Topics list/lifecycle and topic-attached notes together enough that completed/archived topics and their notes remain coherent after refresh and across collaborators.

2. **PR 4C — Meeting Notes structured persistence**
   - Autosave meeting date records, active/current date record, Agenda Items, Decisions/Actions, and Cascading Communications.
   - These are the highest live-meeting capture surfaces and should not depend on someone remembering Manual Save at meeting close.

3. **PR 4D — DO/SOO objectives and tasks structured persistence**
   - Autosave Defining Objectives, task workflow/status/details/subtasks/comments/activity history, and Standard Operating Objectives.
   - This slice is larger and should include mapping/identity rules before implementation to avoid accidental duplication or destructive rewrites.

4. **PR 4E — Remaining runtime/setup parity and backup validation**
   - Backfill any remaining runtime surfaces, verify hydration precedence, and keep Manual Save/export/import as rollback and cross-surface backup until structured persistence is proven.

5. **Follow-up validation PR**
   - Run owner/editor/non-member refresh, concurrent-edit, stale-save, session-expiry, import/restore, and direct REST/RPC negative validation against a linked Supabase project.

## Risks

- **Data loss risk:** users can edit high-value content that is only in browser-local scoped storage until Manual Save.
- **Overwrite risk:** Manual Save writes the whole backup object and can overwrite another collaborator's newer cloud backup.
- **Last Save Wins risk:** both Manual Save and the settings autosave pilot lack merge/conflict resolution.
- **Editor/owner conflict risk:** editor Manual Save is necessary now, but stale editor state can overwrite owner state.
- **Stale state risk:** cloud route hydration loads `meeting_data`, overlays `meeting_settings`, then local edits proceed independently until Manual Save or structured autosave; another user's changes are not live-merged.
- **Misleading UI language risk:** “settings saved” can be mistaken for “workspace saved” unless Manual Save dependency remains explicit.
- **Manual Save dependency risk:** current team beta usage relies on humans remembering to Manual Save before switching devices, after major meeting edits, or before collaborators reload from cloud.
- **Schema drift risk:** `strategic_topic_notes` is referenced by app code/docs but not created by reviewed repo migrations.

## Before-main / team beta recommendation

Current autosave coverage is not sufficient for an unrestricted main/team beta if users are expected to collaborate in shared cloud meetings without explicit Manual Save discipline. Minimum before-main expansion should cover the highest live-meeting capture surfaces:

1. Strategic Topics plus topic notes/lifecycle, after schema reconciliation.
2. Meeting Notes: Agenda Items, Decisions/Actions, Cascading Communications, and meeting date records.

DO/SOO objectives and tasks can remain Manual Save for a short controlled beta only if the product clearly labels Manual Save as required and beta testers are trained to save before refresh/device switching. For broader team beta confidence, DO/SOO/task autosave should follow immediately after meeting notes because those surfaces also carry operational commitments.
