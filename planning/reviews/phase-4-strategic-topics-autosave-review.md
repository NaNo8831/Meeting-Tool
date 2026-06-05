# Phase 4 PR 4B Architecture Review — Strategic Topics + Topic Notes Autosave

This is a planning, documentation, and architecture review only. It does not implement autosave, change application code, change Supabase schema, add migrations, add RLS policies, modify runtime behavior, remove Manual Save, or change Local Mode.

## Files reviewed

- `planning/reviews/phase-4-autosave-audit-review.md`
- `planning/STATE.md`
- `planning/DECISIONS.md`
- `planning/DOMAIN.md`
- `planning/RISKS.md`
- `planning/QUESTIONS.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/PERMISSIONS.md`
- `docs/VALIDATION.md`
- `app/meeting/[id]/page.tsx`
- `app/components/meeting/MeetingWorkspace.tsx`
- `app/components/meeting/MeetingSection.tsx`
- `app/components/ui/RichTextEditor.tsx`
- `app/hooks/useLocalStorage.ts`
- `app/hooks/useObjectives.ts`
- `app/hooks/useSupabaseAuth.ts`
- `app/lib/supabaseClient.ts`
- `app/lib/workspaceBackup.ts`
- Supabase migrations touching `meetings`, `meeting_data`, `meeting_settings`, `strategic_topics`, `strategic_sessions`, `strategic_session_notes`, `tactical_sessions`, `tactical_items`, membership RLS, lifecycle hardening, and admin readability views.

## Executive recommendation

PR 4B implementation should be **Strategic Topics + Topic Notes + Ordering**, but only after one schema-reconciliation migration confirms the active topic-note table. Strategic Topics are the best first autosave expansion because they are persistent cross-meeting leadership work, currently live in browser storage plus Manual Save backup, and are operationally painful to lose across devices.

Recommended scope option: **C. Strategic Topics + Topic Notes + Ordering**.

Do not include additional Strategic Topic metadata beyond the metadata already needed to preserve the current runtime model: title/text, status, completion/archive timestamps, captured meeting/date context, client legacy ID mapping, and sort order. Do not add realtime merge behavior in PR 4B. Continue with Last Save Wins plus clear validation until a later conflict/presence design exists.

## 1. Current Strategic Topic runtime model

### Runtime structure

Strategic Topics use the shared `MeetingItem` client shape:

- `id`: numeric client-generated ID, currently `Date.now()` for new topics.
- `text`: topic title/body shown in the Strategic Topics card.
- `capturedDate`: date of the meeting where the topic was captured.
- `capturedMeetingId`: numeric client meeting record ID where the topic was captured.
- `capturedMeetingIndex`: chronological/index context for meeting visibility.
- `completed`: legacy boolean completion flag.
- `completedDate`: display date for reviewed/completed state.
- `status`: active lifecycle value: `active`, `completed`, or `archived`.
- `completedAt`: ISO timestamp for completion.
- `archivedAt`: ISO timestamp for archive.
- `removedMeetingId`, `removedMeetingIndex`, `removedDate`: legacy/archive context used by visibility/history flows.

### Topic identifiers

Current runtime identifiers are local numeric IDs. New topics are created with `Date.now()`. Existing backup data may also contain legacy numeric IDs from older meeting-section topic arrays. This is not compatible with using the Supabase `strategic_topics.id` UUID directly as the only app identity without a migration/mapping layer.

Implementation implication: PR 4B should either add a durable `client_topic_id`/legacy-ID field in metadata or use a separate mapped column during migration. It should not silently replace numeric IDs in the browser shape unless the whole UI and backup compatibility path are deliberately updated.

### Ordering

Current active ordering is array order in `strategicTopicItems`. New topics append to the end. There is no per-topic drag/reorder control today, but ordering still matters because the array order controls the active Strategic Topics display and should be persisted as `sort_order` when moving to structured rows.

The existing `strategic_topics.sort_order` column is the natural destination for current array order. PR 4B should populate and autosave `sort_order` even if no new reorder UI is introduced.

### Lifecycle and completion state

Topics can be:

- **Active:** visible in the main Strategic Topics section when `status` is `active` and meeting visibility rules pass.
- **Completed:** moved to the Strategic Topic History modal when `status` is `completed`; completion stores `completed`, `completedDate`, and `completedAt`.
- **Archived:** moved to Strategic Topic History when `status` is `archived`; archive stores `archivedAt` plus removed meeting context.
- **Deleted/remove action:** current delete action does not physically remove the topic from the array. It sets removed meeting context without changing `status`; this is legacy behavior and should be reconciled before structured delete semantics are introduced.

Implementation implication: PR 4B should preserve current lifecycle states and avoid hard deletes for migrated local topics unless a separate product decision clarifies deletion vs archive vs hidden legacy removal.

### Ownership relationship

Strategic Topics belong to a Cloud Meeting container through `meeting_id` once structured. Today, the client runtime does not attach an owner to each topic. Access is inherited from the meeting route and Supabase RLS when structured tables are used.

Current owner/editor behavior after Phase 3 Shared Access: owners and active editors can edit meeting content through the app, including Strategic Topics, because content editing is not owner-only. Viewer UX remains deferred.

### Topic note relationship

The UI opens topic notes from each Strategic Topic. The note relationship is currently keyed by:

- Cloud `meeting_id` (`selectedMeetingId`).
- Numeric `strategic_topic_item_id` (`MeetingItem.id`).

This is a client-legacy relationship, not a UUID foreign key to `strategic_topics.id`.

### Runtime storage/load/write paths

Current Strategic Topics list/lifecycle:

- **Stored in runtime:** React state `strategicTopicItems` backed by `useLocalStorage<MeetingItem[]>`.
- **Browser key:** `leadership-strategic-topic-items`, scoped for cloud meetings through `meeting-tool-cloud-workspace:<meeting_id>:leadership-strategic-topic-items`.
- **Loaded from:** localStorage on boot; cloud routes load `meetings.meeting_data`, validate it as a workspace backup, store it back into browser localStorage, and apply the backup to state.
- **Written during editing:** localStorage through `useLocalStorage`; cloud `meeting_data` only when the user clicks Manual Save or migrates Local Workspace to cloud.
- **Manual Save participation:** yes, Strategic Topics list/lifecycle are included in `getCurrentWorkspaceStorage()` and saved in the full backup payload under `leadership-strategic-topic-items`.
- **Current structured table usage:** the live Strategic Topics list is not loaded from or written to `public.strategic_topics` by the reviewed app code.

Answer: Strategic Topics do not exist only in bare localStorage for Cloud Meetings because Manual Save can back them up to `meetings.meeting_data`; however, edits between Manual Saves are browser-local only and unsafe on a new device/editor device.

## 2. Topic Notes model

### What Topic Notes currently are

Topic Notes are topic-attached rich text history/notes opened from the Strategic Topic controls. The editor uses the shared rich text format. On save, the client stores both:

- `content_json`: normalized rich text document.
- `content_text`: plain-text projection.

### Where Topic Notes are stored, loaded, and saved

Current app code attempts to store Topic Notes in a REST table named `strategic_topic_notes`:

- Load: `supabaseMeetingClient.loadStrategicTopicNote({ meeting_id, strategic_topic_item_id })`.
- Save: `supabaseMeetingClient.saveStrategicTopicNote(...)`, which first loads an existing row, then patches by row `id` or posts a new row.
- UI: the modal is disabled unless there is an authenticated cloud meeting. Local Mode does not save topic notes to cloud.
- Manual Save: Topic Notes are **not** included in `getCurrentWorkspaceStorage()` or workspace backup export/import. They are a separate manual per-topic Save Notes path.

### Schema reconciliation findings

References found:

- `strategic_topic_notes` exists in app/client types and REST calls.
- `strategic_session_notes` exists in migrations and RLS policies.
- `strategic_topics.notes` exists as a text column in the structured foundation migration.
- No reviewed repository migration creates `public.strategic_topic_notes` or policies for it.

Answers:

- **Does `strategic_topic_notes` actually exist?** Not in the reviewed repository migrations. It may exist in an environment through an out-of-band/deployment drift change, but the repo cannot recreate it from migrations as reviewed.
- **Is it a missing migration?** Most likely yes if the current UI is intended to work in deployed cloud meetings.
- **Is it legacy code?** It behaves like partially implemented future structured note persistence, not pure dead code, because the UI actively calls it.
- **Is it intended future schema?** Yes, the code shape implies intended topic-attached notes keyed by meeting plus legacy topic item ID.
- **Should topic notes use another existing table?** No for PR 4B. `strategic_session_notes` is session-scoped and requires `strategic_session_id`; it is not a natural fit for persistent topic-attached notes. `strategic_topics.notes` is plain text and could hold a summary, but it cannot safely replace rich topic notes without losing rich text structure and multi-record extensibility. Recommendation: formalize `strategic_topic_notes` in a migration, or remodel notes as `strategic_topic_notes` with a UUID `strategic_topic_id` FK plus a legacy client ID bridge.

## 3. Existing structured tables

| Table | Current purpose | Current app usage | Recommendation |
| --- | --- | --- | --- |
| `strategic_topics` | Future/current structured domain table for persistent Strategic Topics with `title`, `notes`, `status`, lifecycle timestamps, `sort_order`, and `metadata_json`. | No live list load/write path in reviewed app code. | Reuse as the active autosave table for the topic list/lifecycle/order. Keep `notes` either unused or a summary/plain-text compatibility field; do not rely on it as the rich notes source. |
| `strategic_sessions` | Future strategic-session container with date/title/status. | No reviewed live runtime usage. | Leave historical/future strategic-session table; do not use for persistent topic autosave. |
| `strategic_session_notes` | Notes attached to `strategic_sessions`. | No reviewed live runtime usage. | Keep as session/archive notes table; do not repurpose for topic-attached notes. |
| `tactical_sessions` | Explicit End Meeting archive/history snapshot. | Used by Tactical History list/load and End Meeting snapshot save. | Remain archive/history table, not active autosave storage. |
| `tactical_items` | Future tactical-session item rows for agenda/decisions/cascade/history. | No reviewed live runtime usage. | Leave partially implemented/future; do not include in PR 4B Strategic Topic autosave. |

## 4. Shared Access model

Phase 3 shared access separates meeting access from owner-only lifecycle management:

- Owners own the meeting container through `meetings.owner_id`.
- Active `meeting_members` rows grant access roles.
- Active owners/editors can edit meeting-scoped content.
- Viewers are part of the durable role vocabulary but Viewer UI/read-only enforcement remains deferred.
- Pending invitations are not access grants.
- Removed editors lose access after refresh/reload.

Confirmations:

- Owners can edit topics in the current app.
- Editors can edit topics in the current app when they can open the shared meeting.
- Structured topic autosave should be owner/editor writable and member-readable, following the PR 1B content-table pattern.

Existing RLS model:

- `user_can_access_meeting(meeting_id)` allows owners and active members to read meeting-scoped content.
- `user_can_edit_meeting(meeting_id)` allows owners and active editors to insert/update/delete meeting-scoped content.
- `strategic_topics` already has select/insert/update/delete policies using those helpers.
- `strategic_session_notes` has equivalent policies.
- `strategic_topic_notes` has no reviewed repository migration/policies, so it would need matching owner/editor RLS once created.

Do not implement in this PR.

## 5. Autosave scope recommendation

Minimum viable PR 4B implementation should include:

1. Schema reconciliation migration for Topic Notes before app read/write expansion:
   - Create or confirm `strategic_topic_notes` in repo migrations.
   - Add owner/editor RLS and member read policies matching other content tables.
   - Prefer UUID `strategic_topic_id` FK to `strategic_topics(id)` plus a compatibility field for the current numeric `strategic_topic_item_id` during migration.
2. Structured Strategic Topics autosave:
   - Create/update active rows in `strategic_topics` for topic title/text, lifecycle state, timestamps, captured context, and order.
   - Preserve local numeric IDs through metadata or a compatibility column until the client model is migrated.
3. Structured Topic Notes autosave/save compatibility:
   - Keep the existing manual Save Notes button unless/until a later implementation explicitly changes it.
   - If autosave is added for notes, debounce rich text writes separately from topic list writes.
4. Structured hydration:
   - On cloud route load, hydrate structured topics/notes after or alongside `meeting_data`, with a documented precedence rule.
   - Keep `meeting_data` as fallback and backup.

Recommended option: **C. Strategic Topics + Topic Notes + Ordering**.

Not recommended for PR 4B:

- Option A alone, because topic rows without notes would leave the highest schema mismatch unresolved and keep important notes unsafe.
- Option B without ordering, because order is implicit in today’s array model and cheap to preserve with `sort_order`.
- Option D broad metadata expansion, because captured context and lifecycle compatibility are enough for a safe first implementation.

## 6. Refresh and device behavior

### Current behavior

| Scenario | Strategic Topics list/lifecycle | Topic Notes |
| --- | --- | --- |
| Same-browser refresh | Safe after localStorage write; cloud route bootstrap can reload last Manual Save backup and then local scoped storage. | Safe only if `strategic_topic_notes` exists and the user clicked Save Notes; otherwise not persisted. |
| Browser restart, same browser/profile | Same as refresh: browser-local state survives unless storage is cleared; cloud backup only updates on Manual Save. | Same as above. |
| New device/browser | Only safe up to the last Manual Save in `meetings.meeting_data`; unsaved topic edits are lost. | Only safe if the separate table exists, RLS permits access, and Save Notes succeeded. Not covered by Manual Save. |
| Editor device | Editor can load the last cloud backup and can Manual Save over it; unsaved owner/editor topic edits from another browser are not visible. | Editor can load/save notes only through the uncertain `strategic_topic_notes` path. |

### Proposed behavior after PR 4B implementation

| Scenario | Expected behavior |
| --- | --- |
| Same-browser refresh | Cloud topics/order/lifecycle hydrate from structured rows without Manual Save; localStorage remains a fallback/cache. |
| Browser restart | Same as refresh if online/authenticated; local cache remains useful if structured load fails. |
| New device/browser | Owner/editor/member can load structured topics and notes from cloud without relying on Manual Save. |
| Editor device | Active editors can read and write topics/notes through structured tables; changes become visible after reload/manual refresh until realtime is designed. |

## 7. Conflict model

Recommendation: PR 4B should continue using **Last Save Wins** for structured Strategic Topics and Topic Notes.

Expected examples:

- Owner edits a topic, then editor edits the same topic before reloading: the later successful structured update wins.
- Editor edits a topic note, then owner edits the same note before reloading: the later successful note update wins.
- Two editors edit the same topic: the last successful update wins.
- Concurrent edits to different topics should not overwrite the whole list if implementation writes row-level changes rather than replacing all rows blindly.
- Concurrent reordering is still Last Save Wins at the order/sort field level.

Why not more in PR 4B:

- Realtime/presence/merge UI is deferred.
- Existing Manual Save already operates with Last Save Wins risk.
- Row-level structured writes are already safer than full-workspace JSONB overwrites.

Implementation should document conflict limitations in validation notes and avoid claiming collaborative realtime support.

## 8. Migration strategy

Recommended migration path from localStorage + `meeting_data` backup to structured Strategic Topic persistence:

1. **Migration 1: schema reconciliation.**
   - Add/confirm `strategic_topic_notes` in repo migrations.
   - Add RLS using existing `user_can_access_meeting` and `user_can_edit_meeting` helpers.
   - Add indexes/unique constraints that support one note per topic where intended.
   - Decide whether notes key by `strategic_topic_id`, legacy `strategic_topic_item_id`, or both during transition.
2. **Migration 2: non-destructive backfill/dual-read implementation.**
   - On cloud load, read structured topics first if present.
   - If no structured topics exist, read `meeting_data` backup/local scoped storage and create structured rows through a controlled import/backfill path.
   - Preserve `meeting_data` unchanged as rollback/export safety.
3. **Dual-write period.**
   - For PR 4B, write structured rows for topics/notes and continue including Strategic Topics in Manual Save backup.
   - Do not remove Manual Save or localStorage.
   - Avoid full-workspace autosave.
4. **Fallback strategy.**
   - If structured topic load fails, show a clear error and keep the browser-local/Manual Save backup path available.
   - If structured notes load/save fails, do not lose the open draft; allow retry/manual copy.
5. **Rollback strategy.**
   - Because `meeting_data` and export/import remain intact, rollback can disable structured topic hydration/writes and rely on the latest Manual Save backup.
   - During rollout, operators should export a JSON backup before bulk backfill or before enabling structured read precedence for important live beta meetings.

One migration is acceptable only if it is limited to schema reconciliation. Full implementation should be split into schema, write path, read/hydration precedence, and backup-transition changes so each step is reversible.

## 9. Future validation plan

Owner validation:

- Create a Strategic Topic.
- Edit the topic title/text.
- Confirm order persists after append/reorder-equivalent changes.
- Mark topic completed and restore it to active.
- Archive/unarchive a topic.
- Edit Topic Notes rich text.
- Refresh same browser and confirm topic/list/order/lifecycle/note hydration without Manual Save.
- Open the same meeting in a new browser/profile and confirm structured topic/note cloud hydration.
- Use Manual Save and confirm the workspace backup still includes Strategic Topics.
- Export/import backup and confirm fallback behavior remains understandable.

Editor validation:

- Accept shared access and open the meeting.
- Edit a topic.
- Edit Topic Notes.
- Refresh and confirm edits persist.
- Open from a new browser/profile and confirm edits hydrate from structured tables.
- Confirm editor can still use Manual Save while it remains enabled.

Security validation:

- Non-member cannot select, insert, update, or delete topics or notes.
- Pending invitee cannot access topics or notes before accepting.
- Removed editor loses topic/note access after refresh/reload.
- Viewer behavior remains explicitly deferred unless/until Viewer UI enforcement is implemented; database read policies may allow member read based on role vocabulary.

Regression validation:

- Local Mode remains browser-only and does not write topic autosave rows.
- Manual Save remains visible and backs up the full workspace.
- Settings autosave status is not confused with topic autosave status.
- Tactical History snapshots continue to work and remain archive/history, not active autosave.

## 10. Before-main impact

If Strategic Topics plus Topic Notes become structured-autosaved, the highest remaining Manual Save dependency becomes **Meeting Notes / Agenda Items / Decisions & Actions / Cascading Communication** because these are live-meeting records created during operational meetings and currently remain embedded in `leadership-meetings` backup data.

Remaining risk ranking before main/team beta:

1. **Meeting Notes, Agenda Items, Decisions/Actions, Cascading Communication** — highest meeting-loss risk; live meeting output and follow-up actions still depend on Manual Save/new-device backup timing.
2. **Defining Objectives, tasks, task details, subtasks, comments/activity history** — high operational risk; more complex identity/nesting migration than Strategic Topics.
3. **Standard Operating Objectives** — persistent reference data; important but less frequently changed live.
4. **Active meeting/date records and historical meeting-note read-only state** — important for chronology and Tactical History interactions.
5. **Full backup/import-to-cloud semantics** — still needed as fallback and rollback even after structured surfaces expand.
6. **Manual Save privilege model** — editor full-backup overwrite remains a temporary risk until enough structured tables replace broad `meeting_data` writes.

## Closeout confirmation

This PR 4B architecture review is documentation/planning only:

- No app code changes.
- No Supabase schema changes.
- No migrations.
- No RLS changes.
- No runtime behavior changes.
- No Manual Save changes.
- No Local Mode changes.
