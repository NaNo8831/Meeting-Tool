# Meeting State Review

## 1. Executive Summary

This is a review/documentation/planning-only PR for before-main readiness. It changes no app code, runtime behavior, schema, migrations, RLS, auth, persistence, or UI.

Finding: **Meeting state is currently split across route state, localStorage/workspace backup, structured Supabase rows, Tactical History snapshots, dashboard container metadata, and environment-gated Test Mode.** The architecture is mostly coherent for Team Beta, but the current lifecycle language creates a before-main risk: **End Meeting captures a Tactical History snapshot and makes the dated meeting record read-only, but it does not create an explicit mutable `open/closed` field on `meetings` or reset/advance the active meeting record.**

The known concern — **“After refresh, needed Test Mode to continue editing”** — is consistent with current implementation. Editing meeting notes/agenda/cascade is allowed only when the active dated meeting is today, or when testing tools are enabled and Test Mode is active for a test meeting. If a cloud meeting hydrates to a past `leadership-active-meeting-id`, or if the active dated meeting has already been captured in Tactical History, the meeting-specific surfaces become read-only. This is defensible as a data-safety default, but it is confusing before main because Test Mode appears to act as an editing workaround rather than a testing-only tool.

Before-main recommendation: **add one focused implementation PR to make meeting lifecycle state explicit in the UX without schema changes unless a durable product decision requires it.** The minimum should clarify Start/Edit/View/End/Test Mode copy, refresh behavior, and the intended path for continuing/reopening a meeting. A broader schema-backed meeting-session state model can wait until after main unless validation proves current behavior blocks live operations.

## 2. Current Meeting State Sources

### 2.1 Cloud meeting container

Source: `meetings` Supabase table and dashboard mapping.

Fields used today:

- `meetings.id`: cloud meeting/workspace UUID and route identifier.
- `meetings.name`: dashboard card/opened Cloud Meeting title.
- `meetings.owner_id`: authoritative owner.
- `meetings.metadata_json`: metadata/fallback owner display values and owner-only container metadata.
- `meetings.meeting_data`: full workspace backup JSON written by Manual Save and migration.
- `meetings.archived_at` / `meetings.deleted_at`: dashboard lifecycle visibility and soft-delete state.

There is **no current `meetings.status`, `current_meeting_id`, `active_meeting_id`, `ended_at`, or `is_open` field** for live meeting lifecycle. Meeting open/closed state is derived from dated local/structured meeting records and Tactical History, not the cloud meeting container.

### 2.2 Local workspace / cloud-scoped localStorage

Primary state keys in workspace backup/localStorage:

- `leadership-meetings`: array of dated `MeetingRecord` objects.
- `leadership-active-meeting-id`: active dated meeting record pointer.
- `leadership-dashboard-title`: meeting workspace/dashboard title used inside the workspace.
- `leadership-organization-info`: playbook/organization setup data.
- `leadership-meeting-setup-completed`: setup completion flag.
- `leadership-meeting-section-order`: workspace meeting section ordering.
- `leadership-strategic-topic-items`: durable Strategic Topics.
- `leadership-strategic-topic-notes`: topic notes.
- `leadership-objectives`: Defining Objectives and embedded Tasks.
- `leadership-standard-operating-objectives`: SOOs.

Cloud routes scope these keys by cloud meeting id in the browser. Local Mode uses the unscoped browser-local keys.

### 2.3 `MeetingRecord` shape

Runtime `MeetingRecord` is the dated meeting-note/session-like record inside `leadership-meetings`:

```ts
interface MeetingRecord {
  id: number;
  date: string;
  isTestMeeting?: boolean;
  agendaItems: MeetingItem[];
  topicItems: MeetingItem[];
  decisionItems: MeetingItem[];
  cascadeItems: MeetingItem[];
}
```

Important interpretation:

- `id` is a client-generated number, currently `Date.now()` for newly created records.
- `date` is a date string used for Start/Edit/View selection and read-only calculation.
- `isTestMeeting` marks records created while Test Mode is active.
- `agendaItems` now carry first-class Agenda fields in `MeetingItem` and structured `agenda_items` rows.
- `topicItems` is retained as compatibility/pass-through meeting-note data; current Strategic Topics are primarily `leadership-strategic-topic-items` / `strategic_topics`.
- `decisionItems` is legacy/read-only compatibility after Agenda Item outcomes became the live outcome surface.
- `cascadeItems` is the dated meeting’s Cascading Communication list and is structured through `meeting_notes.cascade_items`.
- No `ended`, `endedAt`, `status`, `openedAt`, `closedAt`, or `lastSelectedAt` field exists on `MeetingRecord`.

### 2.4 Structured cloud rows

Structured rows now overlay or backfill full-workspace backup state:

- `meeting_settings`: dashboard title, organization info, section order, setup completion.
- `meeting_notes`: dated meeting records with `client_meeting_id`, `meeting_date`, `is_test_meeting`, compatibility `notes_json`, and first-class `cascade_items`.
- `agenda_items`: Agenda Item title, discussion notes, Decision/Action flags/text, covered state, cascade-needed flag, promotion linkage, and sort order.
- `strategic_topics` / `strategic_topic_notes`: strategic list, lifecycle, notes, order, and capture/remove metadata.
- `objectives`, `tasks`, `standard_operating_objectives`: operational follow-up data.
- `tactical_sessions`: End Meeting snapshots.

### 2.5 Titles and dates

Current title sources can disagree by design:

- Dashboard card/opened cloud route title: `meetings.name`.
- Workspace/dashboard title inside saved settings: `meeting_settings.dashboard_title` or `leadership-dashboard-title`.
- Local default title: `Meeting Tool by LyArk` / configured default.

Current date sources:

- Today/current date: generated client-side from `new Date().toISOString().slice(0, 10)`.
- Test date: UI date field available only when `NEXT_PUBLIC_ENABLE_TESTING_TOOLS=true` and Test Mode is active.
- Dated meeting rows: `MeetingRecord.date` and `meeting_notes.meeting_date`.
- Tactical History session date: `tactical_sessions.session_date`.

## 3. Route/Hydration Flow

### 3.1 Local Workspace route

Route: `/meeting/local`.

Behavior:

1. The route is recognized as Local Mode.
2. `selectedMeetingId` and `selectedMeetingName` are cleared.
3. Persistence uses unscoped `leadership-*` browser localStorage keys.
4. Cloud Manual Save is unavailable; JSON export/import remains the recovery path.
5. No cloud route bootstrap, structured Supabase load, membership check, or cloud autosave runs.

Local Mode therefore chooses the active dated meeting entirely from `leadership-active-meeting-id` if present, with fallback to the first local `MeetingRecord`.

### 3.2 Cloud Meeting route

Route: `/meeting/[cloudMeetingId]`.

Behavior:

1. The route id is treated as a Cloud Meeting id.
2. The app requires an auth session; unauthenticated users get an error message for the cloud route.
3. The route hydrates container metadata with `getWorkspace`, which selects the non-deleted accessible `meetings` row.
4. `selectedMeetingId` and `selectedMeetingName` are set from the route meeting.
5. A route autoload effect calls `handleLoadCloudMeeting` once for the route id.
6. `handleLoadCloudMeeting` loads full backup `meetings.meeting_data` plus structured rows in parallel.
7. If no full backup exists, the app applies structured rows directly and marks cloud ready.
8. If a full backup exists, the app validates/stores/applies it first, then overlays structured settings, topics, notes, agenda, objectives/tasks, and SOOs.

### 3.3 Dashboard open behavior

- Creating a meeting calls the owner-only create RPC and routes directly to `/meeting/{meeting.id}`.
- Opening an existing dashboard card links to `/meeting/{meeting.id}`.
- Dashboard meeting order is based on `meetings.updated_at` from the workspace list, not on dated meeting record recency.
- Dashboard cards distinguish owned/shared access and owner-only lifecycle controls, but they do not represent open/closed live meeting state.

### 3.4 How selected/current/last meeting is chosen

Inside the Meeting Workspace:

- `selectedMeetingId` is the cloud container id from route hydration.
- `activeMeetingId` is the dated `MeetingRecord.id` from `leadership-active-meeting-id`.
- The active meeting is `meetings.find(meeting.id === activeMeetingId)` or index `0` fallback.
- Chronological previous/next navigation sorts by `MeetingRecord.date`, then numeric id.
- Start/Edit/View uses the action date: today in normal mode, or the chosen test date when Test Mode is active.
- If a record for the action date exists, the action selects it; otherwise Start Meeting creates a new `MeetingRecord` for that date.

There is no persisted “last selected cloud meeting route” apart from the URL. There is a persisted last active dated meeting id inside each workspace backup/scope.

### 3.5 Structured overlay behavior

Structured row overlays can replace backup/local arrays after the full backup loads:

- `meeting_settings` overwrites settings/title/order/setup fields when rows exist.
- `meeting_notes` maps rows into `MeetingRecord` objects by `client_meeting_id` and appends rows not present in backup.
- `agenda_items` then replaces `agendaItems` for matching `client_meeting_id` records.
- Objectives/tasks/SOOs similarly overlay their structured surfaces.

This means structured rows are becoming the source of truth for covered surfaces, while `meetings.meeting_data` remains a full-workspace safety backup. Temporary disagreement between structured rows and `meeting_data` is possible until Manual Save refreshes the backup.

### 3.6 Refresh behavior

On refresh of a Cloud Meeting route:

1. Route id remains the cloud meeting id.
2. Cloud metadata is fetched again.
3. Full backup and structured rows hydrate again.
4. The active dated meeting returns from the persisted `leadership-active-meeting-id` inside the backup/local cloud scope, not necessarily from “today.”
5. If the active dated meeting is past or has already been captured into Tactical History, meeting-specific editing is read-only unless Test Mode makes the active test meeting editable.

This explains the known concern: a refresh can return the user to a past/ended active dated meeting, and Test Mode can appear necessary to keep editing because the normal editable condition is “today and not historical.”

## 4. Lifecycle Behavior

### 4.1 Start Meeting

Displayed when no `MeetingRecord` exists for the action date.

Current behavior:

- Normal mode action date is today.
- Test Mode action date is the selected test date.
- Start Meeting creates a blank `MeetingRecord` and sets it active.
- Test-created records receive `isTestMeeting: true`.
- Start Meeting does not create a Supabase meeting-session row, set `meetings.status`, or clear prior active records.

Allows:

- Editing Agenda Items, meeting notes/cascade, and related meeting-specific surfaces when the new record is not read-only.
- Autosave for structured surfaces on Cloud Meeting routes after bootstrap.

Blocks:

- Local Mode cloud save.
- End Meeting in Local Mode because End Meeting currently requires cloud/auth/route context.

### 4.2 Edit Meeting

Displayed when a `MeetingRecord` exists for the action date and has not been captured in Tactical History.

Current behavior:

- Selects the existing dated record for today or the active test date.
- Editing is available if the selected record passes the read-only guard.
- Does not explicitly mark a meeting as “open.”

### 4.3 View Meeting

Displayed when the action-date record exists and has a Tactical History snapshot.

Current behavior:

- Selects the existing dated record.
- Meeting-specific surfaces are read-only.
- Strategic Topics/Objectives/SOOs may still be editable because the read-only guard is scoped mainly to dated meeting notes/agenda/cascade.

### 4.4 End Meeting

Current behavior:

- Cloud-only: requires auth, selected cloud meeting id, current route matching the selected id, and editable current/test meeting state.
- Creates a `tactical_sessions` row with `status: "ended"`, `session_date`, title, `snapshot_json`, and `ended_at`.
- Snapshot JSON is current workspace storage, not a purpose-built normalized archive.
- Adds the created session to local Tactical History state and selects it.
- Leaves the current meeting workspace active.
- Does not reset meeting data, create tomorrow’s meeting, update `meetings.meeting_data`, or write an explicit ended flag onto `MeetingRecord`.

Operational result:

- The ended state is inferred by matching Tactical History snapshots back to a captured `MeetingRecord.id` inside `snapshot_json`.
- After End Meeting, the dated record becomes read-only because `historicalMeetingIds` includes the active meeting id.

### 4.5 Test Mode

Current behavior:

- Only available when `NEXT_PUBLIC_ENABLE_TESTING_TOOLS=true`.
- Changes the action date from today to the selected test date.
- New records created in Test Mode are flagged `isTestMeeting: true`.
- A test record is editable only while Test Mode is active and the active record is a test meeting.

Concern:

- Test Mode is intended as a test utility, but it currently doubles as the only way to edit a non-today test dated meeting after refresh. This is acceptable for test-only workflows, but confusing if operators expect “continue/edit meeting” semantics for real meetings.

## 5. Open/Closed/Test Mode Behavior

### 5.1 Should users be able to edit an ended meeting?

Recommendation: **ended meetings should be read-only by default before main.** Editing historical snapshots undermines trust in Tactical History unless the product explicitly supports corrections/amendments.

If edits are allowed later, they should be explicit and auditable: reopen/continue, amendment notes, or create a revised snapshot. Silent editing of ended meeting records should not be the default.

### 5.2 Should owners/editors be able to reopen or continue a meeting?

Recommendation: **yes, but only through an explicit before-main product decision.** There are two viable paths:

- **Before-main lightweight path:** keep ended records read-only, but add clear copy/action guidance: “Start today’s meeting,” “View ended meeting,” and “Ended meetings are read-only.” Do not implement reopen yet.
- **Before-main if testing proves blocking:** add a small “Continue/Reopen Meeting” UX that makes the current dated record editable again and clearly documents whether the existing Tactical History snapshot remains a snapshot or is superseded. This likely needs a durable state decision and may need schema support.

### 5.3 Should Test Mode be only for testing or also a workaround?

Recommendation: **Test Mode should be testing-only.** It should not be positioned as the normal path to continue editing. If real users need to continue a past/ended meeting, that should become a named lifecycle action rather than a Test Mode workaround.

### 5.4 Should refresh return to active/current meeting or last selected meeting?

Recommendation: **Cloud route refresh should prioritize an understandable current meeting.** Before main, define and validate one of these behaviors:

1. Keep current behavior but make it explicit: refresh returns to the workspace’s last active dated meeting record, and read-only state is expected for past/ended records.
2. Prefer today’s editable record on refresh when one exists, falling back to last active only when there is no today record.
3. Add explicit “last selected dated meeting” versus “current/today meeting” copy and navigation.

The current behavior is technically consistent but not obvious.

### 5.5 Should ended meetings be read-only by default?

Recommendation: **yes.** This matches the current implementation and preserves snapshot integrity. The missing piece is explicit UX language and validation around how users continue work after ending or refreshing.

## 6. Autosave / Manual Save Interaction

### 6.1 Structured autosave surfaces

Cloud structured autosave currently covers:

- Meeting settings: dashboard title, organization info, section order, setup completion.
- Strategic Topics and Strategic Topic notes.
- Meeting Notes/Cascading Communications through `meeting_notes`.
- Agenda Items through `agenda_items`.
- Defining Objectives, Tasks, and SOOs.

These autosaves are debounced and gated by Cloud Meeting route/auth/bootstrap state.

### 6.2 Manual Save surfaces

Manual Save writes a full workspace backup to `meetings.meeting_data`. It remains the safety net for:

- Full workspace backup parity.
- Backup/import compatibility.
- Recovery when structured autosave fails or partial structured rows disagree.
- Transitional surfaces and complete localStorage state.

Manual Save is available only on valid Cloud Meeting routes for owners/editors with edit access. Local Mode remains browser-only and uses JSON export/import instead.

### 6.3 Does End Meeting trigger a full backup?

No. End Meeting creates a `tactical_sessions` snapshot from current workspace storage. It does **not** call Manual Save or update `meetings.meeting_data`. If the user ends a meeting with recent unsaved local/full-backup changes, the Tactical History snapshot can include the current browser state while the full cloud backup remains older. Structured autosave may still have covered major surfaces separately.

### 6.4 Are opening/closing/test mode changes persisted consistently?

- Opening/selecting a dated meeting updates `leadership-active-meeting-id` and therefore can be included in localStorage/full backup.
- Start Meeting creates a `MeetingRecord` in localStorage/backup and structured meeting notes/agenda rows after autosave runs.
- End Meeting persists a Tactical History snapshot but not an explicit ended flag.
- Test Mode UI toggle itself is React state and not persisted; test-created records persist `isTestMeeting`.

### 6.5 Can structured rows and `meeting_data` disagree?

Yes. This is expected during the transition from full backup to structured persistence. On cloud load, structured rows overlay backup data for covered surfaces. Manual Save refreshes the backup but is not automatically triggered by every structured autosave or End Meeting action.

Before-main risk is not the existence of disagreement; it is whether users understand Manual Save as a safety backup while structured autosave is the active source for many surfaces.

## 7. Tactical History Relationship

### 7.1 How End Meeting creates Tactical History

End Meeting posts to `tactical_sessions` with:

- `meeting_id`: cloud meeting id.
- `session_date`: active dated meeting date.
- `title`: `Tactical Session {date}`.
- `status`: `ended`.
- `snapshot_json`: current workspace storage.
- `ended_at`: current timestamp.

### 7.2 Is active meeting data archived or duplicated?

It is duplicated into a snapshot. The active workspace remains intact and is not reset. Tactical History is a historical copy of the workspace state at the time End Meeting was clicked.

### 7.3 Do edited ended meetings affect history?

Current intended behavior blocks edits to the dated ended record because the record id is detected in Tactical History. If a future path allows editing ended records, those edits would not automatically alter already-created `tactical_sessions.snapshot_json` unless explicit update/re-snapshot logic is added.

### 7.4 Is Tactical History source of truth or snapshot?

Tactical History is a **snapshot** source for historical review, not the active mutable source of truth. Active/current operational state remains the workspace state plus structured cloud rows.

## 8. Local Mode Differences

Local Mode:

- Uses browser-local unscoped `leadership-*` keys.
- Has no cloud meeting container, shared members, route membership checks, or structured Supabase autosave.
- Can Start/Edit/View dated meeting records using the same local read-only rules.
- Cannot End Meeting into Tactical History because current End Meeting requires cloud/auth/selected route context.
- Cannot Manual Save to cloud; JSON export/import remains the backup path.

Before-main stance: these differences are acceptable if Local Mode is positioned as a browser-only fallback and not as the primary collaborative workflow. The main before-main issue is copy/validation, not feature parity.

## 9. Shared Access Effects

### 9.1 Owners

Owners can manage cloud meeting containers and access: create, duplicate, archive, restore, soft-delete archived meetings, invite/revoke, remove editors, and open/edit content. Owners can also End Meeting when the current dated record is editable.

### 9.2 Editors

Editors can open shared meetings, edit content, structured-autosave surfaces, use Manual Save, view members read-only, and view Tactical History where RLS allows active member access. Editors cannot manage owner-only container lifecycle or access operations.

Lifecycle implication: editors are subject to the same dated meeting read-only calculation as owners in the workspace. There is no separate editor-only closed/open behavior.

### 9.3 Removed editors

Removed editors should lose access after refresh/reload because access helpers exclude removed membership rows. The current review found no separate meeting-state exception that should let removed editors keep access to open/closed/test states after route hydration.

### 9.4 Before-main permission question

If “reopen/continue ended meeting” is added later, the product must decide whether editors can do it or whether it is owner-only. Current permissions suggest content editing is owner/editor, while container lifecycle is owner-only. Reopening an ended dated record sits between those categories and needs a durable decision before implementation.

## 10. Risks

### 10.1 Required before-main blockers

1. **Refresh/read-only confusion:** refresh can return to a past or ended active dated record, making meeting-specific surfaces read-only; users may think data is locked or broken.
2. **Test Mode as workaround:** Test Mode can appear required to continue editing non-today test records after refresh, blurring testing versus real lifecycle semantics.
3. **No explicit open/closed field:** open/closed is inferred from date + Tactical History snapshots, which is fragile for UX explanation and future collaboration behavior.
4. **End Meeting does not full-backup:** End Meeting creates history but does not update `meetings.meeting_data`; this can surprise users who equate End Meeting with “save everything.”

### 10.2 Confusing but acceptable before main with clear copy/validation

- Separate `meetings.name` and `meeting_settings.dashboard_title` can disagree.
- Structured rows can be newer than `meeting_data` until Manual Save runs.
- Local Mode lacks Tactical History/End Meeting cloud behavior.
- Legacy `decisionItems` remain compatibility data while Agenda Item outcomes are primary.

### 10.3 Post-main improvements

- Schema-backed active session/open/closed state.
- Explicit reopen/continue/end-state transitions with audit/snapshot semantics.
- Automatic full backup after End Meeting if product wants End Meeting to mean “snapshot + full backup.”
- Last-selected-vs-current meeting preference model.
- Clearer meeting title synchronization or intentional separation UX.

## 11. Before-Main Recommendations

### Required Before Main

1. **Lifecycle UX/copy clarification PR:** make Start/Edit/View/End/Test Mode semantics explicit, especially that ended meetings are read-only by default and Test Mode is for test records only.
2. **Refresh behavior validation:** manually validate refresh from an open today meeting, ended today meeting, past non-test meeting, and test meeting with Test Mode on/off.
3. **End Meeting save expectation copy:** clarify that End Meeting captures Tactical History and leaves Manual Save/autosave behavior unchanged.
4. **Document current source-of-truth model:** keep this review linked from project state and validation docs.

### Recommended Before Main

1. Decide whether refresh should prefer today’s meeting when available or retain last active dated meeting.
2. Add a visible path from a read-only ended/past meeting to the current/today meeting.
3. Add validation cases for owner/editor parity in open/read-only states.
4. Consider owner/editor permission decision for any future “reopen/continue” action before implementation.

### Post Main

1. Consider schema-backed meeting-session lifecycle only after the before-main UX is validated.
2. Consider automatic full backup after End Meeting if Manual Save confusion persists.
3. Consider explicit historical amendment/re-snapshot workflows.
4. Consider title synchronization rules between `meetings.name` and workspace/dashboard title.

## 12. Validation Plan

Documentation-only PR validation:

- Confirm the diff is limited to `planning/` and `docs/`.
- Confirm no `app/` code changes.
- Confirm no `supabase/migrations/` changes.
- Confirm no RLS, schema, auth, persistence, UI, or runtime behavior changes.

Recommended before-main manual validation for the next implementation/UX PR:

1. Owner creates a cloud meeting, starts today’s meeting, edits Agenda Items/notes/cascade, refreshes, and remains on an understandable editable current meeting state.
2. Owner ends today’s meeting, refreshes, sees read-only ended meeting copy, can navigate to/start the next current meeting path, and can view Tactical History.
3. Editor repeats open/edit/end/read-only validation where permissions allow, and cannot use owner-only container lifecycle actions.
4. Removed editor loses access after owner removal plus refresh/reload.
5. Test Mode creates/edits a test-dated meeting only when enabled; after refresh, behavior is clear and not presented as normal continuation.
6. Manual Save before and after End Meeting behaves as documented; End Meeting alone creates a Tactical History snapshot but does not claim to refresh the full backup.
7. Local Mode Start/Edit/View read-only behavior is understandable and cloud-only actions are not presented as available.

## 13. Proposed Next PRs

1. **Meeting Lifecycle UX Clarification** — copy-only/light UI PR if possible: clarify Start/Edit/View/End/Test Mode states, read-only reasons, refresh expectations, and Manual Save relationship. Avoid schema/RLS changes unless a decision is made.
2. **Meeting State Validation Pass** — execute the manual validation matrix above with owner/editor/removed-editor/test-mode accounts and record results in `docs/VALIDATION.md`.
3. **Refresh Current Meeting Behavior PR** — if validation confirms confusion, implement the smallest agreed behavior change: either prefer today’s meeting on refresh or add a clear “Go to current meeting” action.
4. **Reopen/Continue Decision Review** — only if teams need to edit ended meetings; decide owner/editor permissions, snapshot integrity, and whether schema-backed lifecycle state is required.
5. **Main Readiness Review** — final docs/planning review after lifecycle behavior is validated.
