# Phase 4 PR 4C Architecture Review — Meeting Notes / Cascading Communications Autosave

This is a planning, documentation, and architecture review only. It does not change runtime behavior, application code, Supabase schema, RLS policies, authentication, Local Mode, Manual Save, autosave coverage, Agenda/Decisions/Actions design, or UI.

## Files reviewed

- `planning/reviews/phase-4-autosave-audit-review.md`
- `planning/reviews/phase-4-strategic-topics-autosave-review.md`
- `planning/STATE.md`
- `planning/DECISIONS.md`
- `planning/QUESTIONS.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/PERMISSIONS.md`
- `docs/VALIDATION.md`
- `app/components/meeting/MeetingWorkspace.tsx`
- `app/components/meeting/MeetingSection.tsx`
- `app/lib/workspaceBackup.ts`
- `app/lib/supabaseClient.ts`
- Supabase migrations related to `meetings`, `meeting_data`, `meeting_settings`, `tactical_sessions`, `tactical_items`, `strategic_sessions`, `strategic_session_notes`, `strategic_topics`, `strategic_topic_notes`, shared-access RLS, and lifecycle hardening.

## Executive finding

Recommend PR 4C implementation scope **C: Meeting Notes + Cascading Communications only**.

The safest next autosave slice is to persist the current meeting-note record container and its `cascadeItems` without redesigning Agenda Items or Decisions/Actions. The runtime model already groups Agenda Items, Decisions/Actions, and Cascading Communications on the active `MeetingRecord`, so the implementation should introduce an active meeting-notes table that can round-trip the full existing meeting-note record while only enabling/editing the Meeting Notes and Cascading Communications fields intended for PR 4C. Agenda and decision fields can remain present for backup/read compatibility, but they should not be treated as the product-approved autosave surface until the later agenda-discussion-decision-action redesign is decided.

## Current Meeting Notes model

- Runtime storage is the `meetings` React state in `MeetingWorkspace`, persisted by `useLocalStorage<MeetingRecord[]>(getStorageKey("leadership-meetings"), initialMeetings)`.
- Each meeting-note record is a `MeetingRecord` keyed by numeric client `id` with `date`, optional `isTestMeeting`, and section arrays: `agendaItems`, `topicItems`, `decisionItems`, and `cascadeItems`.
- The active meeting note is selected by the separate `leadership-active-meeting-id` key and derived as `activeMeeting` from the local `meetings` array.
- Cloud routes scope the localStorage key through `meeting-tool-cloud-workspace:{meetingId}:leadership-meetings`; Local Mode uses unscoped `leadership-meetings`.
- Legacy one-section localStorage keys (`leadership-agenda-items`, `leadership-topic-items`, `leadership-decision-items`, `leadership-cascade-items`) are read only as a migration fallback into a first `MeetingRecord`.
- Manual Save/export includes `leadership-meetings` and `leadership-active-meeting-id` in the full workspace backup saved to `meetings.meeting_data`.
- Meeting Notes are not currently structured persisted. They only survive across browsers/users after explicit Manual Save to `meetings.meeting_data` and later cloud load.
- Meeting Notes are tied to the active meeting/date/session in the client record: users navigate dated records, past/ended meetings become read-only, and `End Meeting` captures the current active meeting as an archival `tactical_sessions.snapshot_json`.

## Current Cascading Communications model

- Runtime storage is `activeMeeting.cascadeItems`, an array of `MeetingItem` records inside the current `MeetingRecord` in the `leadership-meetings` localStorage payload.
- Cloud routes scope the storage through `meeting-tool-cloud-workspace:{meetingId}:leadership-meetings`; legacy fallback reads `leadership-cascade-items` only when constructing a legacy first meeting record.
- Manual Save/export includes Cascading Communications because it includes the full `leadership-meetings` array in `meetings.meeting_data`.
- Cascading Communications are not currently structured persisted and are not independently autosaved.
- Cascading Communications are tied to the active meeting-note record by `MeetingRecord.id` and `MeetingRecord.date`, not to a database session row.

## Existing table review

### Archival/history tables

- `tactical_sessions` is archival. Runtime creates rows only when the user ends a meeting and stores `snapshot_json` for history review. It should not be reused for active autosave.
- `tactical_items` is session-linked by `tactical_session_id` and intended for tactical session/history itemization. It should not be reused for active Meeting Notes or Cascading Communications autosave because doing so would mix mutable live notes with ended-session history.
- `strategic_sessions` is archival/session-scoped for strategic sessions and should not be reused for active tactical meeting notes.
- `strategic_session_notes` is tied to `strategic_session_id`, so it should remain strategic-session history/notes storage and should not become the active meeting notes table.

### Tables that should not be reused for PR 4C active autosave

- `meetings.meeting_data` remains the Manual Save/full-workspace backup safety payload, not an autosave target.
- `meeting_settings` is a one-row settings/playbook table and should not absorb dated Meeting Notes.
- `strategic_topics` and `strategic_topic_notes` are already scoped to Strategic Topics and Topic Notes; reusing either for tactical Meeting Notes or Cascading Communications would blur domains.
- Existing `tactical_sessions`, `tactical_items`, `strategic_sessions`, and `strategic_session_notes` should stay history/session tables.

### Recommended active table shape

A new active, meeting-scoped table is needed. Recommended name: `meeting_notes`.

Recommended shape, to be finalized in the implementation PR schema review:

- `id uuid primary key`
- `meeting_id uuid not null references meetings(id) on delete cascade`
- `client_meeting_id bigint not null` for the current numeric `MeetingRecord.id`
- `meeting_date date not null`
- `is_test_meeting boolean not null default false`
- `agenda_items jsonb not null default '[]'::jsonb` for compatibility/deferred redesign only
- `decision_items jsonb not null default '[]'::jsonb` for compatibility/deferred redesign only
- `cascade_items jsonb not null default '[]'::jsonb` as the PR 4C autosave surface
- `metadata_json jsonb null` for narrow compatibility flags if needed
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- unique index on `(meeting_id, client_meeting_id)`
- index on `(meeting_id, meeting_date)`

Meeting Notes and Cascading Communications should **share this active table** because the current runtime and backup format store them on the same dated `MeetingRecord`, and sharing avoids cross-table consistency problems for active meeting selection/date navigation. Separate tables would add coordination without solving a current product need. The table name should not imply Tactical History; it represents mutable active note records.

## Scope recommendation

Recommend **C. Meeting Notes + Cascading Communications only**.

Do not include Agenda/Decision autosave as a product surface in PR 4C. Agenda and Decisions/Actions may later move into a combined agenda-discussion-decision-action workflow. Persisting them as first-class structured autosave now would risk locking in a soon-to-change design. If the active `meeting_notes` table carries `agenda_items` and `decision_items`, treat those columns as compatibility/pass-through fields only so current backups can round-trip without redesign commitment.

Do not recommend:

- A. Meeting Notes only, because Cascading Communications are part of the same dated `MeetingRecord` and are a low-complexity, meeting-critical field.
- B. Cascading Communications only, because it would split the active note container awkwardly.
- D. Meeting Notes + Cascading Communications + Agenda/Decision fields as an autosave product scope, because Agenda/Decisions/Actions are redesign-dependent.

## Shared access expectations

Use existing meeting-scoped RLS helper expectations:

- Owners can edit.
- Active editors can edit.
- Non-members cannot access.
- Removed editors lose access once `removed_at` excludes them from access/edit helper functions.
- Viewer/read-only behavior remains deferred unless a later PR implements Viewer UI/enforcement; PR 4C should not expand Viewer behavior.

## Backup / import compatibility

- Manual Save/export must continue to include `leadership-meetings` and `leadership-active-meeting-id` so Meeting Notes and Cascading Communications stay backup-compatible.
- Structured autosave should keep writing backup-compatible browser state through the existing `useLocalStorage` state path. Do not replace local state with cloud-only state.
- Cloud import/restore should restore `leadership-meetings` into local state and, when running in a valid Cloud Meeting route with auth, upsert active `meeting_notes` rows by `(meeting_id, client_meeting_id)`.
- Import should preserve numeric client meeting IDs where possible so existing active-meeting selection and note navigation continue to work.
- `meetings.meeting_data` remains the full-workspace rollback/safety snapshot while structured autosave coverage is incomplete.

## Conflict model

Use **Last Save Wins**.

Do not add realtime, merge, presence, locking, CRDTs, or per-field conflict UI. This matches the Phase 4 autosave direction and keeps the implementation small and reversible. Any stale-state caveats should be handled with copy/status and validation, not collaboration infrastructure.

## Validation plan for the implementation PR

Owner validation:

- Owner edits Meeting Notes, refreshes, and sees the notes restored without Manual Save.
- Owner edits Cascading Communications, refreshes, and sees the items restored without Manual Save.
- Owner opens the same Cloud Meeting in a new browser/profile/private window and sees Meeting Notes and Cascading Communications.
- Owner uses Manual Save, exports a backup, imports/restores it into a Cloud Meeting, and confirms Meeting Notes and Cascading Communications are restored locally and upserted to structured rows when applicable.

Editor validation:

- Editor edits Meeting Notes and Cascading Communications in a shared Cloud Meeting.
- Owner refreshes and sees the editor changes.
- Editor refreshes and opens a new browser/profile/private window and sees the shared changes.
- Editor can still use Manual Save while structured autosave remains incomplete.

Security validation:

- Non-member cannot open/read/write the meeting notes rows.
- Removed editor loses access after refresh/reload and cannot read/write the structured rows.
- Pending invitation alone does not grant access.

Regression validation:

- Local Mode remains browser-only and does not call structured cloud autosave.
- Manual Save remains visible and functional.
- Agenda Items and Decisions/Actions runtime behavior is unchanged.
- Tactical History snapshots still capture current workspace state through `snapshot_json` and are not mutated by active autosave.

## Before-main impact and remaining Manual Save dependencies

After Meeting Notes + Cascading Communications autosave, the remaining Manual Save dependencies should be ranked by risk:

1. **Defining Objectives** — high operational value and many nested details/tasks depend on them.
2. **Tasks** — high operational value, includes workflow/status and task details that users expect to survive across collaborators/devices.
3. **Standard Operating Objectives** — important but less volatile than tasks/DOs.
4. **Agenda/Decision redesign-dependent surfaces** — should wait for the combined agenda-discussion-decision-action design decision before first-class structured autosave.

Manual Save should remain required and visible before main/team beta until these dependencies are either structured autosaved or explicitly accepted as Manual Save-backed beta limitations.

## Deferred items

- Autosave implementation, schema migration, RLS changes, and client changes.
- Agenda/Decisions/Actions redesign.
- Realtime collaboration, merge/presence/locking, and conflict UI.
- Manual Save removal/demotion.
- Local Mode retirement or behavior changes.
