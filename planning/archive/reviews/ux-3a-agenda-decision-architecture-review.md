# UX-3A Agenda / Decision Architecture Review

## 1. Executive Summary

UX-3A is a documentation/planning review only. It does not implement UI changes, app-code changes, migrations, RLS changes, persistence changes, Manual Save changes, Local Mode changes, or Agenda/Decision autosave.

Agenda Items and Decisions/Actions are currently not first-class stable cloud persistence surfaces. They are still represented as `MeetingItem[]` arrays inside each runtime `MeetingRecord`, saved in browser/local backup state, included in Manual Save/export/import through `leadership-meetings`, and carried through the `meeting_notes.notes_json` compatibility payload. Cascading Communications is more advanced: it uses the same runtime `MeetingRecord` shape and backup key, but cloud autosave stores it in the structured `meeting_notes.cascade_items` column.

Recommendation: **Agenda Item should become the parent object for meeting discussion and captured outcomes.** Each Agenda Item should support a title, discussion notes, one primary outcome type selector (`Decision`, `Action`, or empty/no outcome), outcome text, covered/completed state, cascade-needed marker, and a promote-to-Strategic-Topic action. Agenda outcomes should not become task-management records: **Agenda Actions must not have due dates**, and ownership/status/due-date tracking should remain in Defining Objectives / Tasks.

The current separate Decisions/Actions capture section should eventually be removed as a competing input area and replaced by a rollup/summary generated from Agenda Item outcomes. A temporary read-only rollup is safer than deleting the section in the same PR that introduces new autosave. Optional standalone entries should remain deferred unless user testing proves teams need outcomes that do not belong to an agenda item.

Before-main recommendation: **Agenda/Decision first-class autosave is required before main if the main release is expected to present the agenda/outcome area as part of the stable meeting workspace.** Manual Save coverage is acceptable as a safety backup, but it is not enough long-term because the rest of the main operational surfaces already autosave. The next implementation PR should be **Option B: Agenda Items + outcome selector + notes + completed + cascade marker, with a read-only Decisions/Actions rollup kept temporarily**. Option C can follow once the workflow is validated; Option D should be avoided because it preserves the confusing split without solving the product model.

## 2. Current Model

### Runtime Agenda Items

- Runtime Agenda Items are `MeetingItem[]` stored as `agendaItems` on each `MeetingRecord`.
- Current `MeetingItem` supports numeric `id`, optional `strategicTopicId`, text, captured meeting/date metadata, completion fields, status, archive/remove fields, and no agenda-specific notes/outcome/cascade fields.
- In the meeting UI, Agenda Items use the generic `MeetingSection` add/edit/delete path. PR #98 added a **visual-only** agenda outcome workflow preview, but the preview is not connected to runtime data or persistence.
- Current Agenda Items do not have structured autosave tables.

### Runtime Decisions/Actions

- Runtime Decisions/Actions are `MeetingItem[]` stored as `decisionItems` on each `MeetingRecord`.
- The current shape is the same generic text item shape as agenda items. There is no structured decision/action discriminator, no outcome parent linkage, and no action-specific task fields.
- PR #98 added a visual rollup preview for this section, but the existing editable list remains the real runtime capture surface.
- Current Decisions/Actions do not have structured autosave tables.

### Runtime Cascading Communications

- Runtime Cascading Communications are `MeetingItem[]` stored as `cascadeItems` on each `MeetingRecord`.
- The current shape is the same generic text item shape as agenda/decision items.
- Unlike Agenda Items and Decisions/Actions, Cascading Communications has structured cloud autosave via `meeting_notes.cascade_items`.

### localStorage / Backup Keys

Current meeting-section data is primarily stored under:

- `leadership-meetings` — array of `MeetingRecord` objects, including `agendaItems`, `topicItems`, `decisionItems`, and `cascadeItems`.
- `leadership-active-meeting-id` — current meeting-note record pointer; included in workspace backup state but not considered meaningful content by backup significance checks.
- `leadership-meeting-section-order` — persisted meeting section ordering.
- Legacy one-off keys still read during migration/initialization: `leadership-agenda-items`, `leadership-topic-items`, `leadership-decision-items`, and `leadership-cascade-items`.

Manual Save/export/import operate on the workspace backup shape and therefore include Agenda Items, Decisions/Actions, and Cascading Communications through `leadership-meetings`.

### Manual Save / Export / Import Coverage

- Manual Save writes the full workspace backup to `meetings.meeting_data` for Cloud Meetings.
- Export/import backup includes all `leadership-*` keys, including `leadership-meetings`.
- Cloud import currently restores structured Strategic Topic Notes, Meeting Notes/Cascading Communications, Objectives, Tasks, and SOOs; it still relies on full-workspace backup compatibility for the current Agenda/Decision runtime arrays.
- Local Mode remains browser-only and uses the same localStorage/backup shape.

### Structured Tables Today

Current structured cloud persistence tables relevant to this review:

- `meeting_notes`: active dated meeting notes rows. It stores `client_meeting_id`, `meeting_date`, `is_test_meeting`, compatibility `notes_json`, and first-class `cascade_items`.
- `strategic_topics`: active structured Strategic Topic list/lifecycle/order rows.
- `strategic_topic_notes`: topic-attached notes, keyed by meeting and legacy numeric topic item ID with optional structured topic UUID linkage.
- `tactical_sessions` / `tactical_items`: archival End Meeting history, not mutable active agenda persistence.
- `meetings.meeting_data`: full workspace backup JSON, still required as safety net.

There is no active `agenda_items`, `agenda_item_notes`, or `agenda_item_outcomes` table.

### Interaction With `meeting_notes.notes_json`

The PR 4C meeting notes mapper intentionally carries Agenda Items, Strategic Topics-in-meeting-record compatibility items, and Decisions/Actions through `meeting_notes.notes_json`. Cascading Communications is written to `meeting_notes.cascade_items` and falls back to `notes_json.cascadeItems` only if `cascade_items` is unavailable. This makes Agenda and Decisions/Actions **pass-through compatible**, not first-class autosaved surfaces.

## 3. Recommended Agenda Workflow

### Parent Object

Yes. Agenda Item should become the parent object for meeting discussion and outcomes. This keeps the live-meeting workflow anchored on the thing being discussed and prevents Decisions/Actions from becoming a second, competing capture location.

Recommended future Agenda Item fields:

- `client_agenda_item_id`: numeric client ID preserved from the current `MeetingItem.id` style.
- `meeting_id`: cloud meeting UUID.
- `client_meeting_id`: numeric dated meeting-note/session ID for current backup/import compatibility.
- `title`: agenda item title.
- `discussion_notes_json` and `discussion_notes_text`: rich notes for the agenda item.
- `outcome_type`: `decision`, `action`, or `none`/null.
- `outcome_text`: concise captured decision/action wording.
- `is_covered`: covered/completed state for the meeting.
- `cascade_needed`: marker for Cascading Communications.
- `promoted_strategic_topic_id`: nullable structured Strategic Topic UUID if promoted.
- `source_strategic_topic_item_id` or promotion metadata where needed for legacy linkage.
- `sort_order`, `created_at`, `updated_at`.

### Discussion Notes Placement

Discussion Notes should live with the Agenda Item, not as standalone meeting notes. The safest implementation is either:

1. A nullable rich-text pair directly on `agenda_items` (`discussion_notes_json`, `discussion_notes_text`), or
2. A one-to-one `agenda_item_notes` table if the rich text editor needs independent save status/history.

Recommendation: start with notes on `agenda_items` unless implementation finds clear reasons to isolate notes. A separate table can be added later, but a first implementation should minimize moving parts.

### Outcome Selector

Yes. Decision/Action should be a selector on each Agenda Item.

Recommended selector behavior:

- Empty/no outcome by default.
- `Decision` for decisions made during the discussion.
- `Action` for meeting-level captured outcomes that do **not** have due dates, owners, or task status.
- If a captured outcome needs ownership, due dates, or status tracking, the user should create/use Defining Objectives / Tasks instead.

### One Outcome or Multiple Outcomes

Use **one primary outcome type per Agenda Item** for the before-main implementation. This keeps the model understandable and reduces UI/persistence risk.

If user testing later shows that one agenda discussion often produces multiple decisions/actions, add `agenda_item_outcomes` as a child table after the first autosave model is stable. Do not start with multi-outcome complexity unless it becomes necessary.

### Covered / Completed Checkbox

Yes. Agenda Items should have a covered/completed checkbox. The label should be meeting-friendly, such as `Covered`, rather than project-management language.

### Cascade-needed Marker

Yes. Agenda Items should include a cascade-needed marker. This marker should be the primary bridge between agenda outcomes and Cascading Communications.

### Promote to Strategic Topic

Yes. Agenda Items should be promotable to Strategic Topics when discussion reveals a topic needing recurring or deeper leadership attention.

Promoted Strategic Topics should inherit useful context from the agenda item while preserving the original Agenda Item as the source record.

## 4. Decisions/Actions Recommendation

### Remove or Roll Up?

The current separate Decisions/Actions capture section should eventually be removed as an editable competing section.

Recommended transition:

1. Add first-class Agenda Item workflow + autosave.
2. Convert Decisions/Actions to a read-only rollup from Agenda Item outcomes.
3. Keep the old section available only as a temporary compatibility view if existing backup data contains legacy `decisionItems` not yet migrated.
4. After migration/validation, remove the old editable capture path.

### Optional Standalone Entries

Do not include standalone decision/action entries in the before-main implementation. They may be considered later only if user testing shows a real meeting use case that cannot be tied to an Agenda Item.

If standalone entries are later added, they should use the same `agenda_item_outcomes`/outcome model with a nullable `agenda_item_id`, not resurrect a separate generic `decisionItems` list.

### Safest Transition Path

- Preserve legacy `decisionItems` in backup/import and `notes_json` pass-through.
- During hydration/migration, show legacy decisions/actions in a compatibility area or rollup subsection labeled as imported/legacy if needed.
- Do not delete or rewrite old `decisionItems` until export/import, Manual Save, private-window, and editor validation prove the new Agenda Item outcomes are durable.

## 5. Cascading Communications Recommendation

Cascading Communications should remain a separate meeting section in the near term because it is a distinct leadership meeting ritual: deciding what must be communicated outward.

Recommended future behavior:

- Display Agenda Item outcomes marked `cascade_needed` as the default source list.
- Keep a small manually editable communications note/body area so the team can translate raw outcomes into communication-ready wording.
- Avoid duplicating a second independent decision/action capture list.
- Preserve existing `meeting_notes.cascade_items` during transition for backup and legacy compatibility.

Safest before-main implementation: **filtered rollup plus editable notes**. The rollup should come from agenda outcomes marked cascade-needed; the editable area can remain backed by the existing Cascading Communications persistence path until a later PR decides whether to normalize it further.

## 6. Promote-to-Strategic-Topic Recommendation

### Current Strategic Topic Model Reviewed

Strategic Topics currently use:

- `MeetingItem` runtime fields including numeric `id`, `text`, captured meeting/date/index, completion fields, active/completed/archived status, and removed/archive metadata.
- Structured `strategic_topics` rows keyed by meeting plus legacy numeric `client_item_id`, including text/title, lifecycle state, captured and removed meeting context, timestamps, and `sort_order`.
- `strategic_topic_notes` rows keyed by meeting and numeric `strategic_topic_item_id`, with optional structured `strategic_topic_id`, rich text JSON, plain text, and updated timestamp.
- Ordering through `sort_order` in structured storage and `leadership-strategic-topic-items` order in backup/local state.

### Fields to Carry From Agenda Item

When promoting Agenda Item to Strategic Topic:

- Strategic Topic `text` / title should default from Agenda Item `title`.
- Captured date/meeting context should use the active meeting date and current `client_meeting_id`.
- New Strategic Topic status should be `active`.
- New Strategic Topic order should append to the active Strategic Topics list unless user testing prefers immediate placement.
- Agenda discussion notes and outcome text should become initial Topic Notes content.
- The Agenda Item should record `promoted_strategic_topic_id` and/or legacy promoted topic client ID so the source relationship is visible and duplicate promotion can be prevented.

### Notes Conversion

Agenda notes should become Topic Notes on promotion. Recommended Topic Notes seed content:

- Agenda Item title.
- Discussion notes.
- Outcome type and outcome text if present.
- Optional source date label.

Do not remove notes from the original Agenda Item. Promotion should **duplicate into Strategic Topic and link back**, not convert/delete the Agenda Item. The meeting record remains a historical source of what happened during that meeting.

### Validation Required

- Agenda title is required before promotion.
- Duplicate promotion from the same Agenda Item should be blocked or route to the existing promoted topic.
- Promotion must create a Strategic Topic row and associated Topic Notes row consistently under Last Save Wins.
- Editor promotion should follow the same owner/editor edit permissions as Strategic Topics unless a separate permission decision narrows it.
- Non-members and removed editors must be blocked by existing meeting-scoped RLS helpers.

## 7. Structured Persistence Recommendation

### Recommended Tables

Recommended before-main structured model:

#### `agenda_items`

Required fields:

- `id uuid primary key default gen_random_uuid()`
- `meeting_id uuid not null references public.meetings(id) on delete cascade`
- `client_agenda_item_id bigint not null`
- `client_meeting_id bigint not null`
- `title text not null default ''`
- `discussion_notes_json jsonb null`
- `discussion_notes_text text null`
- `outcome_type text null` with allowed values `decision`, `action`, or null
- `outcome_text text null`
- `is_covered boolean not null default false`
- `cascade_needed boolean not null default false`
- `promoted_strategic_topic_id uuid null references public.strategic_topics(id) on delete set null`
- `sort_order integer not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- unique `(meeting_id, client_agenda_item_id)`
- index `(meeting_id, client_meeting_id, sort_order)`

This table is enough for Option B and keeps one outcome per agenda item.

#### Future `agenda_item_outcomes` only if needed

Add only if user testing confirms multiple outcomes per agenda item. If added later:

- `agenda_item_id uuid not null references public.agenda_items(id) on delete cascade`
- `client_outcome_id bigint not null`
- `outcome_type text not null`
- `outcome_text text not null default ''`
- `cascade_needed boolean not null default false`
- `sort_order integer not null default 0`
- unique `(meeting_id, client_outcome_id)` or `(agenda_item_id, client_outcome_id)` depending on import strategy.

#### Avoid embedding new agenda source of truth in `meeting_notes.notes_json`

`notes_json` should remain a compatibility pass-through and migration input, not the future source of truth for Agenda Items and outcomes. Embedding the new model there would repeat the full-workspace JSONB problem in a smaller column and make permissions/reporting harder.

### Numeric Client IDs

Preserve numeric client IDs because the app, localStorage, Manual Save, export/import, and existing meeting-note records already use numeric `MeetingItem.id` and `MeetingRecord.id` values.

Recommended mapping:

- Current `MeetingItem.id` -> `agenda_items.client_agenda_item_id`.
- Current `MeetingRecord.id` -> `agenda_items.client_meeting_id`.
- Structured UUID `agenda_items.id` is database identity only.

On import, upsert by `(meeting_id, client_agenda_item_id)` and delete missing agenda rows for the restored backup scope only after successful import parsing.

### Ordering

Store order with `sort_order` scoped to `meeting_id` + `client_meeting_id`. Keep array order in `leadership-meetings` backup for export/import compatibility.

### Last Save Wins

Keep the current Last Save Wins model for owner/editor agenda autosave. Use debounced upsert/delete-missing helpers similar to Strategic Topics, Meeting Notes, Objectives, Tasks, and SOOs. Do not introduce realtime, locks, presence, CRDTs, or merge UI in this slice.

## 8. RLS / Permissions Recommendation

Agenda Items should use the existing meeting-scoped helper model:

- Active members can select through `public.user_can_access_meeting(meeting_id)`.
- Owners and active editors can insert/update/delete through `public.user_can_edit_meeting(meeting_id)`.
- Non-members, pending invitees, and removed editors cannot read or write rows.
- Removed editors lose access after refresh/reload because helper functions exclude `removed_at` membership rows.
- Viewer read-only UX remains deferred; do not introduce Viewer behavior in this PR.

Promotion to Strategic Topic should use the same write boundary as Strategic Topics and Topic Notes. If implemented as multiple writes, the client should handle partial failures clearly; a future RPC may be justified if promotion needs transactional guarantees across `agenda_items`, `strategic_topics`, and `strategic_topic_notes`.

## 9. Backup / Import Compatibility

Backup/import compatibility must remain intact.

Required compatibility rules:

- Continue exporting/importing `leadership-meetings` with `agendaItems`, `decisionItems`, and `cascadeItems` during migration.
- Continue Manual Save to `meetings.meeting_data` as full-workspace backup until structured autosave covers all valuable meeting data and a later decision demotes it.
- Continue Local Mode browser-only behavior.
- Keep `meeting_notes.notes_json` pass-through for existing Agenda/Decision data while structured `agenda_items` rolls out.
- Import should restore structured Agenda Items from the backup shape when available, preserving numeric client IDs.
- Legacy `decisionItems` should remain readable and exportable until the compatibility migration/UX is complete.

## 10. Before-Main Recommendation

Agenda/Decision first-class autosave should happen before main if the release is expected to claim the main meeting workspace is stable and autosaved. The user expectation is reasonable: Agenda/Decision capture is part of live meeting operation, and the rest of the main stable surfaces now autosave.

Before main should include:

- First-class Agenda Item structured autosave.
- Agenda notes/outcome/completed/cascade-needed model.
- Read-only Decisions/Actions rollup from agenda outcomes.
- Backup/import compatibility with existing `leadership-meetings` and legacy `decisionItems`.
- RLS with owner/editor writes and member reads.
- Manual Save unchanged and still visible.
- Local Mode unchanged.

Can wait until post-main:

- Multiple outcomes per agenda item.
- Optional standalone decision/action entries.
- Removing all legacy Decisions/Actions compatibility UI/data handling.
- Transactional promotion RPC unless partial-failure validation requires it.
- Realtime collaboration, conflict merge UI, locks, presence, audit history, and Viewer UX.

Never bundle with the next implementation PR:

- Manual Save removal/demotion.
- Local Mode removal/change.
- Full-workspace JSONB autosave.
- Broad RLS rewrites unrelated to agenda rows.
- DO/task workflow changes or action due dates.
- Tactical History redesign.
- Rich text editor system redesign outside agenda notes.

## 11. Proposed Implementation PR Scope

Recommended next PR: **Option B — Agenda Items + outcome selector + notes + completed + cascade marker, keep rollup view read-only.**

Why Option B:

- Solves the unacceptable autosave gap for the user-facing agenda/outcome workflow.
- Avoids preserving the confusing current split as the long-term model.
- Avoids the risk of removing the old Decisions/Actions section before compatibility data is proven safe.
- Keeps the implementation scoped enough for before-main validation.

Option C can follow after Option B validation if the rollup and migration are stable. Option A is too small because it autosaves titles without solving outcomes. Option D should not be chosen unless final review finds the workflow redesign impossible before main.

## 12. Validation Plan

### Owner

- Create an agenda item.
- Edit agenda title.
- Add discussion notes.
- Choose `Decision` outcome and enter outcome text.
- Choose `Action` outcome and enter outcome text; confirm no due date field exists.
- Mark agenda item covered/completed.
- Mark cascade-needed.
- Promote to Strategic Topic.
- Refresh and confirm agenda item, notes, outcome, covered state, cascade marker, and promoted topic persist.
- Open a private window or separate browser session as the owner and confirm hydration.
- Export backup, import into a Cloud Meeting, and confirm Agenda Items/outcomes restore.
- Confirm Manual Save still writes full workspace backup.

### Editor

- Open shared meeting as active editor.
- Edit agenda item title.
- Edit discussion notes.
- Choose/change outcome.
- Mark cascade-needed.
- Promote to Strategic Topic if owner/editor promotion remains allowed.
- Confirm owner refresh sees editor changes under Last Save Wins.

### Security

- Non-member cannot open/read agenda rows.
- Non-member cannot write agenda rows through direct API attempts.
- Removed editor loses agenda read/write access after refresh/reload.
- Pending invitee without accepted membership cannot access agenda rows.

### Regression

- Strategic Topics autosave still works.
- Topic Notes autosave still works.
- Meeting Notes autosave still works.
- Cascading Communications behavior still works through the transition.
- Manual Save still works.
- Local Mode still works and remains browser-only.
- Backup/export/import still works.
- Legacy Decisions/Actions backup data remains readable/exportable until removal is explicitly implemented.

## 13. Do Not Bundle List

Do not bundle the next Agenda/Decision implementation with:

- UI redesign outside the Agenda/Decision/Cascade area.
- App-wide rich text editing redesign.
- Manual Save removal, copy demotion, or behavior changes.
- Local Mode changes.
- Full-workspace autosave.
- Tactical History schema or behavior changes.
- DO/task due-date/status/owner changes for agenda actions.
- Broad member-management, ownership-transfer, Viewer UX, or realtime collaboration changes.
- Deleting legacy Decisions/Actions data before backup/import compatibility is validated.
