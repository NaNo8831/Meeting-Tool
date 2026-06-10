# Phase 4 PR 4D Architecture Review — Defining Objectives / Tasks / SOOs Autosave

This is a planning, documentation, and architecture review only. It does not implement autosave, change application code, add migrations, change RLS, change runtime behavior, remove Manual Save, change Local Mode, or redesign the Defining Objectives, Tasks, or Standard Operating Objectives UI.

## Files reviewed

- `planning/reviews/phase-4-autosave-audit-review.md`
- `planning/reviews/phase-4-strategic-topics-autosave-review.md`
- `planning/reviews/phase-4-meeting-notes-cascading-comms-autosave-review.md`
- `planning/STATE.md`
- `planning/DECISIONS.md`
- `planning/QUESTIONS.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/PERMISSIONS.md`
- `docs/VALIDATION.md`
- `app/components/meeting/MeetingWorkspace.tsx`
- `app/components/objectives/ObjectiveCard.tsx`
- `app/components/objectives/TaskList.tsx`
- `app/components/objectives/TaskDetailsModal.tsx`
- `app/hooks/useObjectives.ts`
- `app/hooks/useLocalStorage.ts`
- `app/lib/objectiveOptions.ts`
- `app/lib/workspaceBackup.ts`
- `app/lib/supabaseClient.ts`
- `app/types/dashboard.ts`
- `app/types/objective.ts`
- `data/objectives.ts`
- Supabase migrations, especially:
  - `20260523000000_add_structured_persistence_foundation.sql`
  - `20260603090000_align_shared_access_schema.sql`
  - `20260604090000_add_membership_rls_foundation.sql`
  - `20260605150000_add_strategic_topic_autosave.sql`
  - `20260605160000_add_meeting_notes_autosave.sql`

## Executive recommendation

PR 4D implementation should cover **D. Defining Objectives + Tasks + Standard Operating Objectives**.

Reasoning:

- Defining Objectives and Tasks are one runtime state tree today. Tasks are embedded under each Defining Objective in `leadership-objectives`, so autosaving only Defining Objectives would leave the highest-risk edits in the same UI still dependent on Manual Save.
- Standard Operating Objectives live beside Defining Objectives in the same top-priority review area and are explicitly before-main beta critical.
- Existing first-pass structured tables already exist for all three surfaces, but they need schema reconciliation before being treated as active/current tables.
- The safest implementation is still narrow: hydrate/autosave only the `leadership-objectives` and `leadership-standard-operating-objectives` equivalents into structured rows, keep Local Mode unchanged, keep Manual Save/export/import intact, and keep Last Save Wins.

## Terminology boundary

- **Defining Objectives** are the temporary qualitative components of the current Top Priority / Thematic Goal. They should not be renamed or collapsed into Standard Operating Objectives.
- **Standard Operating Objectives** are ongoing priorities and operating standards of the organization. They should not share a table with Defining Objectives because their lifecycle and meaning are different even though both appear as objective cards in the UI.
- **Tasks** are actionable child records under Defining Objectives in the current app. They are not independent meeting agenda items and should remain distinct from Meeting Notes agenda/decision/action records.

## 1. Defining Objectives current model

### Runtime storage

- Defining Objectives are managed by `useObjectives`, which defaults to the `leadership-objectives` storage key and stores an `Objective[]` through `useLocalStorage`.
- `MeetingWorkspace` renders Defining Objectives from that hook and writes changes through hook actions such as title, description, color, drag/reorder, add, delete, and task updates.
- In Cloud Meeting routes, the same logical key is browser-scoped with `meeting-tool-cloud-workspace:{meetingId}:leadership-objectives` during route loading/storage, but the backup payload itself still uses the unscoped `leadership-objectives` key.

### Current data shape

Current `Objective` shape:

- `id: number` — current client-side identity, usually seeded or `Date.now()`.
- `title: string`
- `description: RichTextValue` — legacy string or structured rich-text document.
- `status: 'planning' | 'in-progress' | 'completed'`
- `priority: 'high' | 'medium' | 'low'`
- `dueDate: string`
- `color: 'dark-green' | 'green' | 'yellow' | 'orange' | 'red'`
- `tasks: Task[]`

Default seed data currently creates one card titled `Add Defining Objective` with a plain string description and no tasks.

### Manual Save / export / import

- Defining Objectives are part of Manual Save because `getCurrentWorkspaceStorage` includes `"leadership-objectives": objectives` before creating the workspace backup.
- Export/import includes the same key through `workspaceBackup` validation and restore.
- `applyWorkspaceBackupToState` restores the key by calling `replaceObjectives(readBackupEntry(...))`.
- Existing Cloud Meetings without structured objective rows should keep falling back to `meetings.meeting_data.localStorage["leadership-objectives"]` and then same-browser localStorage.

### Structured table status

- `public.objectives` already exists from the structured persistence foundation migration.
- It is not currently an active runtime table for Defining Objectives. `supabaseClient.ts` has no objective list/upsert/delete client types or methods, and `MeetingWorkspace` does not load or save objective rows.
- The existing table should be treated as a legacy/foundation table requiring schema reconciliation before implementation.

### Relationship to meeting state

- Defining Objectives are currently independent workspace state under the meeting workspace backup/localStorage model.
- They are not stored inside `meeting_settings`; `meeting_settings.organization_info.rallyCry` stores the Top Priority / Thematic Goal text, but DOs remain separate.
- They are meeting-scoped in the recommended structured model through `objectives.meeting_id`; they are not dated `meetings` / Meeting Notes records.

## 2. Tasks current model

### Runtime storage

- Tasks live embedded inside each Defining Objective under `Objective.tasks` in `leadership-objectives`.
- Tasks are children of Defining Objectives in the current UI and persistence model.
- The `TaskList` and `TaskDetailsModal` edit task fields by calling `useObjectives.updateTask`, `updateTaskStatus`, and related helpers, which rewrite the parent objective array.

### Current data shape

Current `Task` shape:

- `id: number` — current client-side identity, usually `Date.now()`.
- `title: string`
- `description: RichTextValue`
- `dueDate: string`
- `subtasks: Subtask[]`
- `comments: TaskComment[]`
- `activityHistory: TaskActivity[]`
- `assignedTo: string`
- `status: 'planning' | 'in-progress' | 'completed'`

Nested task details:

- `Subtask`: `id`, `title`, `completed`.
- `TaskComment`: `id`, `text`, `createdAt`.
- `TaskActivity`: `id`, `message`, `createdAt`, optional activity metadata for subtask completion/deletion or due-date changes.

### Status, completion, order, color, and metadata

- Task status exists as `planning`, `in-progress`, or `completed`; a legacy `waiting` status is normalized to `in-progress`.
- Completion is represented by `status === 'completed'`, not a separate task-level `completed` boolean.
- Task ordering is the array order inside each objective's `tasks` array. The current UI does not expose first-class task drag/reorder in the reviewed code, but array order should still be preserved.
- Task color does not exist independently today; card color belongs to the parent Defining Objective.
- Task metadata exists mainly as rich description, assignee, due date, subtasks, comments, and activity history.

### Manual Save / export / import

- Tasks are included in Manual Save/export/import because they are embedded in `leadership-objectives`.
- Restoring objectives also restores tasks, subtasks, comments, and activity history.
- Existing meetings should fall back to embedded tasks in `meetings.meeting_data.localStorage["leadership-objectives"]` when no structured `tasks` rows exist.

### Structured table status

- `public.tasks` already exists from the structured persistence foundation migration.
- It is not currently active runtime storage. `supabaseClient.ts` has no task-specific structured client methods, and the app does not hydrate or persist tasks to `public.tasks`.
- The table has a nullable `objective_id`, which is useful for orphan-safe migration but should be reconciled with explicit client identity and richer nested task detail storage.

## 3. Standard Operating Objectives current model

### Runtime storage

- Standard Operating Objectives are managed directly in `MeetingWorkspace` through `useLocalStorage<StandardOperatingObjective[]>("leadership-standard-operating-objectives", defaultStandardOperatingObjectives)`.
- The UI supports add, edit, delete, color change, and drag/reorder.
- They are a separate workspace list and are not stored under Defining Objectives.

### Current data shape

Current `StandardOperatingObjective` shape:

- `id: number`
- `title: string`
- `description: RichTextValue`
- `color?: ObjectiveColor`

Default SOOs are `Identify`, `Document`, `Assign`, and `Review`, each with a description and color.

### Status, color, notes, and order

- SOOs currently have color via optional `color`.
- SOO ordering is array order in `leadership-standard-operating-objectives` and is changed through drag/drop.
- SOOs currently do not have a runtime `status` field.
- SOOs currently do not have a separate notes field; `description` is the detail/rich-text field.

### Manual Save / export / import

- SOOs are part of Manual Save because `getCurrentWorkspaceStorage` includes `"leadership-standard-operating-objectives": standardOperatingObjectives`.
- Export/import includes and restores the same key through `workspaceBackup` and `applyWorkspaceBackupToState`.
- Existing Cloud Meetings without structured SOO rows should fall back to `meetings.meeting_data.localStorage["leadership-standard-operating-objectives"]` and same-browser localStorage.

### Structured table status

- `public.standard_operating_objectives` already exists from the structured persistence foundation migration.
- It is not currently active runtime storage. `supabaseClient.ts` has no SOO-specific structured client methods, and the app does not hydrate or persist SOO rows.
- The existing table needs schema reconciliation because it lacks explicit client identity, color, and first-class rich-text description fields.

## 4. Existing table findings

| Table / storage | Exists? | Active/current? | Finding |
| --- | --- | --- | --- |
| `public.objectives` | Yes | Not active for runtime DOs | Foundation table exists with `meeting_id`, text `description`, `status`, `sort_order`, and `metadata_json`; needs reconciliation before use. |
| `public.tasks` | Yes | Not active for runtime tasks | Foundation table exists with optional `objective_id`, `status`, `assignee`, `due_date`, `sort_order`, and `metadata_json`; needs client identity and nested detail strategy. |
| `public.standard_operating_objectives` | Yes | Not active for runtime SOOs | Foundation table exists with `status`, `sort_order`, and `metadata_json`; needs client identity, color, and rich description strategy. |
| `public.meeting_settings` | Yes | Active for setup/playbook/settings only | Should not absorb DOs/tasks/SOOs; it stores dashboard title, organization info/Top Priority, meeting section order, and setup completion. |
| `public.meeting_notes` | Yes | Active for Meeting Notes and Cascading Communications | Should not absorb DOs/tasks/SOOs; it is dated Meeting Notes/Cascade storage with agenda/decision pass-through JSON. |
| `meetings.meeting_data` | Yes | Active Manual Save/full backup | Should remain backup/fallback and import/export safety, not the autosave target for these surfaces. |
| `public.tactical_sessions` / `public.tactical_items` | Yes | Tactical history/archive only | Do not use for mutable active DO/task/SOO autosave. |

### Schema reconciliation needed before implementation

Recommended adjustments for a future implementation migration:

- `objectives`
  - Add/confirm `client_objective_id bigint not null` for current numeric IDs.
  - Add unique key `(meeting_id, client_objective_id)`.
  - Preserve `sort_order`.
  - Store rich `description` as `description_json jsonb` plus optional `description_text text`, or consistently use `metadata_json` only if docs/client code make that explicit.
  - Preserve `status`, `priority`, `due_date`, and `color` either as columns or documented metadata. Column storage is safer for status/order/color because the UI filters and visually depends on them.
- `tasks`
  - Add/confirm `client_task_id bigint not null` and unique key `(meeting_id, client_task_id)` or `(meeting_id, client_objective_id, client_task_id)`.
  - Prefer a UUID `objective_id` relationship plus `client_objective_id` compatibility during import/hydration.
  - Preserve `sort_order`, `status`, `assignee`, `due_date`, rich `description_json`/`description_text`, and nested `subtasks_json`, `comments_json`, and `activity_history_json` unless separate nested tables are intentionally introduced later.
- `standard_operating_objectives`
  - Add/confirm `client_standard_operating_objective_id bigint not null` and unique key `(meeting_id, client_standard_operating_objective_id)`.
  - Preserve `sort_order`, `color`, rich `description_json`/`description_text`, and optional `status` only if future UI uses it. Do not invent status behavior for the current UI.

### Tasks: separate table or embedded under objectives?

Use the existing `tasks` table rather than embedding tasks under `objectives` in a JSONB column.

Reasons:

- A separate table already exists and aligns with the domain model.
- Task status, assignee, due date, and detail records are likely to need targeted writes and future reporting.
- Embedding all tasks in an objective row would recreate a smaller version of full-workspace JSONB overwrite risk.

Keep nested task details (`subtasks`, `comments`, `activityHistory`) as JSONB fields in `tasks` for PR 4D implementation unless a later product decision requires first-class subtask/comment/activity tables. Splitting those nested records now would overbuild.

### SOOs: share objectives table or own table?

Use `standard_operating_objectives`, not `objectives`.

Reasons:

- Defining Objectives and SOOs have different product meaning and lifecycle.
- SOOs are ongoing operating priorities, not temporary Top Priority components.
- A dedicated table already exists and avoids overloading objective status/priority semantics.

## 5. Implementation scope recommendation

Recommended future implementation scope: **D. Defining Objectives + Tasks + SOOs**.

Minimum safe PR 4D implementation boundaries:

1. Add schema reconciliation migration for `objectives`, `tasks`, and `standard_operating_objectives` only.
2. Add structured client methods for list/upsert/delete by `meeting_id` and client IDs.
3. On Cloud Meeting load, hydrate `meeting_data`/localStorage first, then overlay structured DO/task/SOO rows when rows exist.
4. Autosave only after cloud route bootstrap completes and only for authenticated valid Cloud Meeting routes.
5. Keep `/meeting/local` browser-only and unchanged.
6. Continue writing backup-compatible state into local React state/localStorage so Manual Save/export/import remain complete.
7. Use Last Save Wins, debounced writes, and clear status copy; do not add realtime, merge, presence, locks, or conflict resolution.

Do not include:

- Agenda Items / Decisions/Actions first-class autosave.
- UI redesign of objective cards, task details, or SOO editor.
- Manual Save removal/demotion.
- Local Mode behavior changes.
- Viewer/read-only UX expansion.
- Nested subtask/comment/activity first-class tables unless separately approved.

## 6. Shared access expectations

The future implementation should use the existing membership-aware helper boundaries:

- Owners can select, insert, update, and delete DO/task/SOO rows.
- Active editors can select, insert, update, and delete DO/task/SOO rows.
- Viewers may be selected by `user_can_access_meeting`, but Viewer read-only UX remains deferred; if Viewer UI is not active, do not introduce new Viewer behavior in this slice.
- Non-members cannot access rows because RLS policies should remain scoped to `user_can_access_meeting` / `user_can_edit_meeting`.
- Removed editors lose access because the helper functions exclude `meeting_members.removed_at is not null`.

No new access-management behavior should be designed in the implementation PR.

## 7. Backup / import compatibility recommendation

Manual Save/export/import must continue to include:

- `leadership-objectives`, including embedded tasks and all nested task details.
- `leadership-standard-operating-objectives`.

Structured autosave should also keep backup-compatible runtime state updated:

- Hydrated structured rows should be converted back into the current `Objective[]` and `StandardOperatingObjective[]` shapes and written into the existing state path.
- Manual Save should continue to create a full backup payload containing those keys.
- JSON export should remain valid for local restore and cloud import.

Cloud import recommendation:

- Import should restore the backup into browser/state as it does today.
- On authenticated valid Cloud Meeting routes, import should upsert structured `objectives`, `tasks`, and `standard_operating_objectives` rows from the restored backup using preserved numeric client IDs.
- Existing meetings should fall back in this order: structured rows if present; else `meetings.meeting_data.localStorage` backup; else scoped same-browser localStorage; else defaults.
- Deletions need explicit reconciliation. The safest pattern is to replace the meeting's structured rows for these surfaces from the imported backup within the implementation's scoped transaction/sequence, rather than only upserting and leaving stale rows.

## 8. Conflict model

Use **Last Save Wins**.

Do not add realtime, merge, presence, locking, CRDTs, operational transforms, or conflict-resolution UI in the DO/task/SOO implementation. These are broader collaboration features and should stay deferred while Team Beta validates the structured persistence baseline.

## 9. Future validation plan

### Owner validation

- Edit Top Priority / Thematic Goal if applicable and confirm it remains `meeting_settings.organization_info`, not DO storage.
- Create, edit, reorder, complete, color, and delete Defining Objectives.
- Create, edit, complete, and delete tasks.
- Edit task details: rich description, assignee, due date, subtasks, comments, and activity history.
- Create, edit, reorder, recolor, and delete SOOs.
- Refresh the same browser and confirm all structured DO/task/SOO edits remain.
- Open a private window or second browser as the owner and confirm the same DO/task/SOO state hydrates from cloud.
- Manual Save, export, import, and confirm DO/task/SOO state and nested task details survive.

### Editor validation

- Active editor can edit DOs, tasks, nested task details, and SOOs.
- Editor refresh preserves changes.
- Owner sees editor changes after refresh/load.
- Editor in a private window/new browser sees cloud-hydrated DO/task/SOO state.

### Security validation

- Non-member cannot open the meeting and cannot directly select or mutate DO/task/SOO rows.
- Removed editor loses meeting access after refresh/reload and cannot directly select or mutate DO/task/SOO rows.

### Regression validation

- `meeting_settings` autosave still works.
- Strategic Topics autosave still works.
- Topic Notes autosave still works.
- Strategic Topic ordering autosave still works.
- Meeting Notes autosave still works.
- Cascading Communications autosave still works.
- Local Mode still works and does not call cloud autosave.
- Manual Save still works as the full workspace backup.
- Backup/Restore remains valid for Local Workspace and Cloud Meeting import.

## 10. Before-main impact

After Defining Objectives, Tasks, and SOOs autosave is implemented, the largest remaining before-main Manual Save dependencies should be reduced to:

- Agenda Items / Decisions/Actions are still compatibility/pass-through only until the future agenda-discussion-decision-action workflow is decided.
- Manual Save remains the full workspace backup/export safety net and should not be removed.
- Sticky status/header UX remains deferred.
- Forgot Password remains before-main.
- Documentation Refresh remains before-main.

Defining Objectives, Tasks, and SOOs are high-value operational surfaces and should be completed before main/team beta because they are central to the leadership meeting review flow and currently remain browser-local between Manual Saves.

## Deferred items

- No autosave implementation in this PR.
- No schema migration in this PR.
- No RLS changes in this PR.
- No app-code changes in this PR.
- No UI redesign in this PR.
- No Local Mode changes in this PR.
- No Manual Save removal or demotion in this PR.
- No realtime, merge, presence, locking, or conflict-resolution features.
