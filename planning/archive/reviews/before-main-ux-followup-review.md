# Before Main UX Follow-up Review — Cleanup + Rich Text + Agenda/Decision Scope

## 1. Executive Summary

PR #98, the Before Main UX Sprint, landed safe visual polish on `phase-3-shared-access`: dashboard card hierarchy improvements, sticky meeting header/autosave visibility, Tactical History naming, Manual Save/Backup wording, Local Mode browser-only fallback wording, and a visual-only Agenda/Decision workflow preview.

The user testing notes after PR #98 split cleanly into three implementation lanes:

1. **Simple UI Cleanup Now** — low-risk, before-main polish that removes repetitive helper copy, improves button hierarchy, and renames labels without changing persistence, schema, RLS, autosave behavior, Manual Save, or Local Mode.
2. **Rich Text Editing UX Later** — a broader shared editing-system change. It should be reviewed and designed separately because rich text is used across playbook text, Defining Objectives, SOOs, task details, and meeting/topic notes.
3. **Agenda/Decision Architecture Before Implementation** — a data/workflow change. Agenda Items should be evaluated as the future parent object for discussion notes, Decision/Action outcome state, completion, cascade marker, and promote-to-Strategic-Topic behavior before any structured autosave or removal of the separate Decisions/Actions section.

Recommended sequence:

- **PR UX-2A: Simple UI Cleanup** — before main, if implemented as UI-only cleanup.
- **PR UX-2B: Rich Text Editing UX Review** — after UX-2A; likely post-main unless final validation finds rich text editing to be a blocker.
- **PR UX-3A: Agenda/Decision Architecture Review** — before coding Agenda/Decision persistence.
- **PR UX-3B: Agenda/Decision Implementation + First-Class Autosave** — only after UX-3A resolves data shape, migration/RLS scope, and Cascading Communications placement.

Before-main blocker recommendation: **only UX-2A is a candidate before main**. Rich text redesign and Agenda/Decision architecture/implementation should not block main unless user testing proves the current workflows are unusable.

## 2. User Notes Organized by Category

### Simple UI Cleanup Now

These notes can be implemented as presentation/copy/layout changes if they do not alter data flow or saved shapes:

- Reduce repetitive information and explanatory notes throughout the application.
- Remove helper language where the UI is already clear.
- Keep warnings only where needed for destructive actions, data loss, or permissions.
- Dashboard card action hierarchy:
  - Open button above Access and More.
  - Open should take roughly two-thirds of the card/action area.
- Dashboard / meeting title consistency review:
  - Dashboard meeting title must match the opened meeting title.
  - Cloud, local, and dashboard meeting names should stay consistent.
  - If a meeting title is edited, the change should persist everywhere.
- Access / Members panel cleanup:
  - Invite email at the top, above owner/member list.
  - Remove redundant user role subheading beneath each member name.
  - Remove “Manage access for ‘meeting name’” helper text.
  - Remove “Owners manage access here…” / “Editors…” explanatory language.
  - Simplify similar access-permission copy throughout the app.
- Meeting sticky header / menu cleanup:
  - Dashboard should return to the Meeting Menu.
  - Add Start Meeting, End Meeting, and Test Mode controls to sticky top bar if layout risk is low.
  - Menu wording should be “Edit Playbook.”
- Defining Objectives cleanup:
  - Remove helper text: “Review the objective summary, update task status, or open a task for its full details.”
  - Rename “Workflow” to “Review.”

### Rich Text Editing UX Later

These notes describe a shared editing interaction, not a one-off copy cleanup:

- Editable text boxes should feel smoother.
- Editing should not feel like entering a separate window.
- Preferred future pattern:
  - Inline edit.
  - Show Save / Cancel near the text box.
  - Rich text tools reveal from the bottom of the editable text area.
  - Editing feels seamless and hidden until activated.
- Apply the pattern across rich text areas:
  - Playbook text.
  - Defining Objectives.
  - SOOs.
  - Meeting Notes.
  - Topic Notes where applicable.
- DO description should feel like SOO description:
  - Double click.
  - Edit directly.
  - Avoid heavy UI transition.
- Future/optional: Planning / In Progress / Complete could become an owner-toggleable feature instead of always visible.

### Agenda/Decision Architecture Before Implementation

These notes imply workflow and persistence changes and should not be included in simple cleanup:

- Agenda Items proposed workflow preview is directionally solid.
- Agenda item details should become a Notes button.
- Agenda notes should function similarly to Strategic Topic notes so that if an agenda item is promoted to Strategic Topic, content converts cleanly.
- Decision / Action should live on the agenda card itself.
- Each agenda card should have a selector identifying whether the outcome is Decision or Action.
- Place this selector where Strategic Topics currently show Reviewed / Completed / Archive controls.
- Desired visual flow:
  - Agenda card bottom state: Decision or Action.
  - Promoted Strategic Topic bottom state: Reviewed / Completed / Archive.
- Action items should not have due dates; due dates, ownership, and task tracking belong in Defining Objectives / Tasks.
- Remove the separate Decisions / Actions section.
- Reconsider Cascading Communications display after Decisions / Actions is removed.

## 3. Simple UI Cleanup Now

### What Can Be Implemented Immediately Without Affecting Persistence

Safe UX-2A candidates:

- Remove or reduce obvious helper copy in Dashboard, Access/Members, Defining Objectives, and meeting section labels.
- Keep permission/destructive/data-loss warnings intact.
- Move Invite email above the member list in the Access modal without changing invite RPCs, member RPCs, roles, RLS, or permissions.
- Remove redundant member role subheadings when the surrounding grouping already communicates the role.
- Rename DO “Workflow” to “Review.”
- Remove the DO helper sentence that restates available actions.
- Adjust Dashboard card action layout so Open is visually primary and larger than Access/More.
- Keep the Meeting Menu label “Edit Playbook” where applicable and remove conflicting terminology.
- Move the Dashboard navigation control back into the Meeting Menu if that only changes placement and does not change routing.
- Add Start Meeting, End Meeting, and Test Mode controls to the sticky header only if they reuse existing handlers and do not create duplicate state, new save behavior, or layout breakage.

Title consistency is a **borderline item**:

- If the mismatch is only copy/display caused by the Dashboard card using one known field and the opened meeting using another already-autosaved field, the review can identify the likely fields and propose a future fix.
- If making titles stay consistent requires writing `meetings.name` when `meeting_settings.dashboard_title` changes, or migrating/merging Cloud Meeting names with workspace titles, it is not simple UI cleanup because it changes persistence semantics.
- UX-2A should document the title issue and only implement a fix if it is a no-schema, no-persistence-shape display alignment.

### Likely Files / Components Touched in UX-2A

Likely implementation touch points, to be confirmed in the UX-2A PR:

- `app/dashboard/page.tsx`
  - Dashboard card action layout.
  - Access/Members modal ordering and copy.
  - Role/helper copy simplification.
- `app/components/meeting/MeetingWorkspace.tsx`
  - Sticky header / Meeting Menu placement and labels.
  - Meeting action placement if reused safely.
  - Meeting section helper copy for Agenda/Decision visual preview.
- `app/components/objectives/ObjectiveCard.tsx`
  - DO detail helper text removal.
  - “Workflow” to “Review” label change if the text lives there.
- `app/components/meeting/MeetingSection.tsx`
  - Section-level helper copy if shared between Agenda, Strategic Topics, Decisions/Actions, and Cascading Communication.
- Documentation/planning files only if UX-2A changes project state or leaves explicit follow-up items.

### Validation Required for UX-2A

Programmatic checks if app code changes:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

Manual checks:

- Dashboard active owned card: Open remains primary; Access and More still work.
- Dashboard shared/editor card: Members still opens read-only member view.
- Archived card: Restore/Delete remain available only where previously available.
- Access/Members modal:
  - Owner can invite, revoke pending invites, view members, and remove editors.
  - Editor can view members but cannot invite or remove members.
  - Non-member access remains blocked by existing protections.
- Meeting Menu:
  - Dashboard navigation works.
  - Edit Playbook opens the existing playbook modal.
  - Backup/Restore, Manual Save, Tactical History, and delete/end controls remain available in their intended places.
- Sticky header action placement, if changed:
  - Start Meeting, End Meeting, and Test Mode call the same existing handlers.
  - Meeting Notes read-only behavior remains unchanged for ended/past notes.
- Defining Objectives:
  - Details modal opens.
  - Objective title/description editing still works.
  - Task status workflow still works.
- Confirm no migrations, RLS, schema, persistence, Local Mode, or Manual Save behavior changed.

### What UX-2A Must Exclude

Do not include:

- New migrations, RLS policies, RPCs, tables, or Supabase schema changes.
- Any change to structured autosave behavior.
- Any change to `meetings.meeting_data` backup behavior.
- Manual Save removal, demotion, or relocation that hides it from current users.
- Local Mode removal or functional changes.
- Agenda/Decision first-class autosave.
- Removal of the separate Decisions/Actions section.
- Agenda outcome data model changes.
- Rich text editor architecture changes.
- New ownership/role permissions or Viewer UX changes.
- Converting task workflow to an owner-toggleable feature.

## 4. Rich Text Editing UX Later

### Current Surfaces With Heavier Modal/Draft Behavior

Known heavier or modal/draft rich text surfaces include:

- **Playbook / setup text** — `MeetingSetupModal` and `PlaybookDefinitionsModal` edit mission/playbook fields in full modal flows.
- **SOO description** — the selected SOO opens a larger editor panel/modal with a draft, Save, and Cancel.
- **Strategic Topic Notes** — topic notes open in a modal and use an always-editing rich text editor.
- **Task details** — task details are managed in a modal and include rich text description plus nested details.
- **RichTextEditor itself** — non-always-editing mode currently renders a modal-like editing state with backdrop/dialog behavior, which can feel like entering a separate window.

Defining Objective description is already closer to the preferred direction because it supports double-click activation, but the shared editor behavior can still feel modal-like once editing begins.

### Shared Editing Pattern to Reduce UI Friction

Recommended UX-2B review direction:

- Define a shared inline editing state machine:
  - Resting read view.
  - Activated inline edit view.
  - Local draft state.
  - Save / Cancel near the edited field.
  - Validation/error state near the edited field.
- Reveal rich text tools from the bottom edge of the editable area, not in a separate overlay that obscures the surrounding page.
- Keep double-click or explicit Edit activation where accidental live-meeting edits are risky.
- Use the same Save / Cancel behavior across DO, SOO, playbook fields, task details, meeting notes, and topic notes unless a surface has a clear reason to differ.
- Preserve the current `RichTextValue` / `RichTextDocument` compatibility shape.
- Keep autosave semantics separate from draft semantics: a field may save to local component state first and then rely on the existing surface autosave/manual-save behavior.

### Implementation Risks

- A shared editor change can affect many meeting-critical surfaces at once.
- Toolbar reveal and inline draft behavior can regress keyboard navigation, focus trapping, screen-reader labeling, and drag/drop interactions.
- Existing modals provide clear intentional edit boundaries; removing them too quickly can increase accidental edits during live meetings.
- Some surfaces have different save semantics:
  - Playbook/settings autosave.
  - Objective/task/SOO structured autosave.
  - Meeting notes and Cascading Communications structured autosave.
  - Strategic Topic Notes manual Save Notes behavior.
  - Agenda/Decision still Manual Save-backed.
- Rich text document compatibility must be preserved for localStorage, `meetings.meeting_data`, JSON export/import, and structured table columns.

### Before Main or After Main?

Recommendation: **after main**, unless final before-main validation identifies rich text editing as a launch blocker.

Reasoning:

- The request is a UX-system change rather than isolated polish.
- It touches many surfaces with different persistence timing.
- It can be reviewed safely as UX-2B before implementation, but implementation should not be bundled into UX-2A or Agenda/Decision architecture work.

## 5. Agenda/Decision Architecture Before Implementation

### Current Data Shape Supporting Agenda and Decision Items

Current runtime types model meeting sections as `MeetingRecord` arrays:

- `agendaItems: MeetingItem[]`
- `topicItems: MeetingItem[]`
- `decisionItems: MeetingItem[]`
- `cascadeItems: MeetingItem[]`

`MeetingItem` currently stores common item fields such as `id`, `text`, optional strategic-topic linkage, captured/completed/archive metadata, and status fields. It does not yet represent a first-class agenda outcome object with notes, outcome type, cascade marker, or promoted-topic conversion metadata.

Current section config treats Agenda Items and Decisions/Actions as separate lists. The visual preview copy already points toward future agenda discussion notes, decisions, and action items per agenda item, with Decisions/Actions as a future rollup from agenda items.

Persistence implications:

- Manual Save still backs up the full `MeetingRecord` shape through `meetings.meeting_data` / JSON backup.
- Structured autosave covers other surfaces, but first-class Agenda Items and Decisions/Actions autosave remains deferred pending workflow decisions.
- Meeting Notes and Cascading Communications now share structured persistence because they live in the dated `MeetingRecord` flow; Agenda/Decision outcome modeling was intentionally deferred.

### Future Data Shape Implied by User Notes

The notes imply an `AgendaItem` should become the parent object for:

- Title / prompt text.
- Rich notes, using a structure compatible with Strategic Topic notes.
- Outcome type selector: `decision` or `action`.
- Outcome text/content.
- Completed/reviewed state for agenda handling.
- Cascade-needed marker or cascade summary relationship.
- Promote-to-Strategic-Topic action and conversion mapping.
- Sort order and meeting/date association.

Open design question: whether decisions/actions should be stored as a child object under agenda items, as fields on agenda items, or as generated rollups from agenda outcome fields.

Action-item scope should remain intentionally lightweight:

- No due dates.
- No owner/assignee tracking.
- No task workflow fields.
- If an outcome needs owner, due date, subtasks, comments, or status tracking, it should become a Defining Objective / Task instead.

### Should Agenda Item Become the Parent Object?

Recommendation for UX-3A: **yes, review Agenda Item as the parent object** for notes, outcome type, completed state, cascade marker, and promote-to-Strategic-Topic behavior before implementation.

Rationale:

- It matches the desired live-meeting flow: discuss agenda item → capture notes → record Decision or Action → mark completed/cascade/promote as needed.
- It avoids splitting one discussion across Agenda Items, Decisions/Actions, Strategic Topics, and Cascading Communication sections.
- It gives the future autosave PR a coherent object boundary.
- It allows promoted Strategic Topics to reuse or convert notes cleanly.

### Persistence Changes Needed Later

UX-3B would likely require:

- New or reconciled structured table(s) for first-class agenda items and agenda outcomes.
- Client numeric IDs or stable UUID mapping for localStorage/import/export compatibility, following the compatibility approach used by structured Objectives/Tasks/SOOs.
- Rich note JSON/text fields or a separate notes table compatible with Strategic Topic Notes.
- Outcome type and outcome content fields.
- Sort order and completion/review state fields.
- Cascade marker or cascade relationship field(s).
- Promotion mapping from agenda item to Strategic Topic and migration/conversion behavior for notes.
- Import/export restore logic for the new structured shape.
- RLS policies or RPC boundaries for owner/editor access, matching current meeting access patterns.
- Cloud hydration overlay behavior that keeps existing `meetings.meeting_data` backups usable.

Do not implement these in the follow-up review PR or UX-2A.

### Should This Be Required Before Main?

Recommendation: **not required before main** unless final validation finds Agenda/Decision capture to be a launch blocker.

Reasoning:

- The current Agenda/Decision preview is visual-only and directionally accepted.
- Agenda/Decision persistence changes are structural and need a separate architecture review.
- Manual Save remains the safety net for Agenda Items and Decisions/Actions until first-class structured autosave exists.
- Removing Decisions/Actions before the replacement object exists would create avoidable meeting risk.

### Cascading Communications Direction

UX-3A should decide whether Cascading Communications becomes:

1. A separate section that lists communication items generated or manually added from agenda outcomes.
2. A marker/field on agenda outcome cards that feeds a lightweight communication summary.
3. A rollup view at the end of the meeting showing only agenda outcomes marked for cascade.

Recommendation for review: keep Cascading Communications visible until Agenda outcomes can identify cascade-needed items and generate a clear end-of-meeting communication view. Do not remove or hide it in UX-2A.

## 6. Recommended PR Sequence

### PR UX-2A: Simple UI Cleanup

Purpose: before-main polish with no runtime architecture changes.

Scope:

- Copy reduction.
- Access/Members panel copy and ordering.
- Dashboard card action hierarchy.
- Meeting Menu label/placement cleanup.
- Safe sticky-header action placement only if handlers are reused.
- DO helper copy removal and “Workflow” → “Review.”

Before-main status: **candidate before main**.

### PR UX-2B: Rich Text Editing UX Review

Purpose: design the shared inline rich text editing pattern before implementation.

Scope:

- Inventory all rich text surfaces.
- Define inline edit / Save / Cancel / toolbar reveal behavior.
- Define accessibility and keyboard requirements.
- Define which modal/drawer editors remain vs. convert.
- Define persistence/draft boundaries per surface.

Before-main status: **review can happen anytime; implementation should likely be post-main**.

### PR UX-3A: Agenda/Decision Architecture Review

Purpose: resolve workflow/data model before implementation.

Scope:

- Agenda Item as discussion/outcome container.
- Agenda notes compatibility with Strategic Topic notes.
- Decision/Action selector and outcome model.
- Promote-to-Strategic-Topic conversion.
- Cascading Communications placement.
- Manual Save / structured autosave transition strategy.

Before-main status: **review can happen before or after main; implementation should not be bundled into before-main cleanup**.

### PR UX-3B: Agenda/Decision Implementation + First-Class Autosave

Purpose: implement the accepted Agenda/Decision architecture.

Scope:

- Schema/migration/RLS/RPC or client changes approved by UX-3A.
- Structured autosave/hydration/import/export for agenda outcomes.
- UI conversion from visual preview to real workflow.
- Removal or replacement of separate Decisions/Actions only after rollup/replacement works.

Before-main status: **post-main by default**.

## 7. Validation Plan for Each Future PR

### UX-2A Validation

Programmatic:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

Manual:

- Dashboard Open / Access or Members / More actions for owner, editor, active, and archived cards.
- Access invite, pending invite revoke, member list, editor removal, and editor read-only member view.
- Meeting Menu Dashboard, Edit Playbook, Backup/Restore, Manual Save, Tactical History, Delete Notes, End Meeting.
- Sticky header Start/Edit/View Meeting, End Meeting, and Test Mode if controls move.
- DO detail open/edit, task status changes, task details, drag/drop where applicable.
- Backup export/import and Manual Save smoke test.
- Confirm no app persistence, migrations, RLS, auth, Local Mode, or runtime behavior changes beyond intended UI/copy/layout.

### UX-2B Validation

Review validation:

- Inventory every `RichTextEditor` surface and classify current activation/editing mode.
- Confirm proposed UX for keyboard, focus, screen readers, mouse/touch, and drag/drop.
- Confirm Save / Cancel semantics for each persistence surface.
- Confirm no data shape changes are required for the editor UX alone.

Implementation validation, when later approved:

- Rich text editing across Playbook, DO, SOO, task details, Meeting Notes, and Topic Notes.
- Undo/Cancel does not leak drafts.
- Save writes to the same existing state path as before.
- Autosave/manual-save messages remain accurate.
- JSON export/import preserves rich text documents.

### UX-3A Validation

Review validation:

- Confirm accepted Agenda Item object boundary.
- Confirm whether Decisions/Actions becomes a rollup, child data, or removed/replaced section.
- Confirm cascade marker and Cascading Communications display.
- Confirm promote-to-Strategic-Topic mapping and note conversion.
- Confirm migration/import/export/backward compatibility strategy.
- Confirm before-main vs post-main requirement.

### UX-3B Validation

Programmatic:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- Supabase migration validation in preview environment.

Manual:

- Create/edit/reorder Agenda Items.
- Add agenda notes and refresh to confirm structured autosave.
- Select Decision or Action and refresh to confirm structured autosave.
- Confirm Action outcomes do not expose due date/owner/task tracking fields.
- Promote an agenda item to Strategic Topic and confirm notes/content convert cleanly.
- Mark cascade-needed and confirm Cascading Communications view/rollup behavior.
- Confirm old `meetings.meeting_data` backups load safely.
- Confirm JSON export/import restores agenda outcomes.
- Confirm owner/editor can edit and non-members cannot access or mutate data.
- Confirm Manual Save remains a full-workspace safety net until explicitly retired in a separate decision.

## 8. Risks / Do Not Bundle List

### Risks

- Copy cleanup can accidentally remove necessary permission or data-loss warnings.
- Moving meeting actions into the sticky header can duplicate or obscure existing meeting lifecycle controls on smaller screens.
- Title consistency may require persistence semantics if `meetings.name` and `meeting_settings.dashboard_title` remain separate concepts.
- Rich text editor changes can produce broad regressions across multiple high-value surfaces.
- Agenda/Decision changes can blur the boundary between lightweight outcomes and Defining Objective / Task tracking.
- Removing Decisions/Actions before a first-class Agenda outcome replacement exists can reduce live-meeting capture reliability.
- Cascading Communications can become confusing if it is removed without a clear rollup/review location.

### Do Not Bundle

Do not bundle any of the following into this review PR or UX-2A:

- App code changes in this review PR.
- UI implementation changes in this review PR.
- Migrations.
- RLS changes.
- Persistence changes.
- Agenda/Decision autosave.
- Agenda/Decision data-model implementation.
- Removal of Manual Save.
- Removal or functional change of Local Mode.
- Removal of Decisions/Actions before Agenda outcomes are implemented.
- Rich text editor system refactor.
- Modal/drawer replacement strategy implementation.
- Owner-toggleable task workflow implementation.
- Due dates, assignees, or task-tracking fields for agenda Action outcomes.
