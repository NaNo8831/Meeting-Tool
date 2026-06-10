# Agenda Item UX Polish Review

## 1. Executive Summary

This is a planning/review/documentation-only PR. It does not change app code, persistence, migrations, autosave, permissions, Manual Save, Local Mode, RLS, or runtime behavior.

PR #102 made Agenda Items the first-class meeting-outcome surface by adding Agenda persistence, Discussion Notes, Decision support, Action support, Covered state, Cascade Needed, and Strategic Topic promotion. Follow-up testing shows the underlying product model is sound, but the card interaction now feels heavier than the newer Strategic Topic card pattern.

Recommendation: **do a small before-main Agenda Item card polish pass.** The polish should keep the current data model and autosave behavior, but improve the operational meeting UX by aligning note controls with Strategic Topics, converting Discussion Notes to a lighter double-click/inline pattern, collapsing covered Agenda Items to title-only by default, improving Decision/Action readability, and removing or hiding the noisy Decisions/Actions rollup once Agenda Item outcomes are visible enough.

Before-main recommendation: **the minimum before-main polish should include Notes placement, covered-card collapse, and Decisions/Actions rollup removal or hiding.** Double-click Discussion Notes editing and Decision/Action layout refinements are strong before-main candidates if scoped as small UI changes, but they can follow after main if schedule risk is high.

## 2. Scope and Non-goals

### In Scope

- Review the current Agenda Item card UX after PR #102.
- Recommend card behavior, note control placement, editing behavior, covered-state behavior, Decision/Action presentation, Strategic Topic consistency, and Decisions/Actions rollup handling.
- Classify what should happen before main versus after main.
- Update planning state and open questions only.

### Out of Scope

- No app-code edits.
- No persistence changes.
- No migration changes.
- No autosave changes.
- No permission or RLS changes.
- No Manual Save, Local Mode, Backup/Restore, or cloud behavior changes.

## 3. Current UX Findings

### 3.1 Notes Button Placement

Current finding:

- Strategic Topic cards place the `Notes` action at the far right of the lower control row, visually separated from lifecycle actions.
- Agenda Item cards place `Notes` as the first action in a generic wrapped control row alongside `Covered`, `Cascade Needed`, and `Promote to Strategic Topic`.
- User feedback says the Agenda Item notes control does not match the Strategic Topic card pattern and should appear on the far left of the card.

Recommendation:

- Move the Agenda Item `Notes` button into a consistent left-side card rail or left-leading action position.
- Use the same visual weight as Strategic Topic `Notes`: small, secondary, blue, and immediately discoverable.
- Keep the note state indicator, but prefer concise copy such as `Notes` plus a small filled dot/check only when notes exist.
- Do not make notes look like a primary workflow action; the primary live-meeting flow remains title, outcome, covered, and cascade.

Rationale:

- Notes are a supporting detail, not the core outcome.
- Left placement makes the notes affordance stable as Decision/Action controls expand or collapse.
- A shared note placement pattern reduces the cognitive switch between Agenda Items and Strategic Topics during the meeting.

### 3.2 Discussion Notes Editing Behavior

Current finding:

- Agenda Item titles already use newer double-click editing behavior.
- Discussion Notes still feel like a separate expanded editor region: the user opens Notes, sees an editor, and interacts with it like a dedicated edit area.
- This creates a modal/edit-mode feeling even though the notes are inline.

Recommendation:

- Keep notes inline, not modal.
- Display saved Discussion Notes in read mode using the rich text renderer.
- Enter editing on double-click of the rendered notes area, matching newer title-editing behavior.
- Provide a clear empty read-state target such as `Double-click to add discussion notes`.
- Autosave behavior should remain unchanged; this recommendation is only about interaction and presentation.

Implementation guardrails for a future code PR:

- Do not change note storage shape.
- Do not introduce a draft modal.
- Do not require explicit Save/Cancel unless existing rich text editor mechanics already require it.
- Keep keyboard accessibility: include a visible `Edit notes` button or focusable affordance if double-click is not sufficient for keyboard users.

### 3.3 Covered Behavior

Current finding:

- Marking an Agenda Item covered/completed updates state but leaves the full card expanded.
- During a live meeting, this keeps completed discussion details, Decision/Action textareas, and controls visible, adding visual noise after the item is done.

Recommendation:

- When an Agenda Item is marked `Covered`, collapse it by default.
- The collapsed covered card should show title only, plus a subtle covered indicator such as `Covered` or a check chip.
- The user should be able to re-expand the card to review or edit notes/outcomes.
- Re-expansion should not clear `Covered`; it should only reveal details.
- If the user unchecks `Covered`, the card should return to the expanded working state.

Rationale:

- Covered items are done for the current meeting and should stop competing for attention.
- Title-only collapse keeps meeting history visible without forcing the facilitator to scroll through completed detail.
- Re-expand protects accidental collapse and supports late edits.

### 3.4 Decision / Action Presentation

Current finding:

- Decision and Action blocks are side-by-side on medium screens and larger, with checkboxes embedded in colored panels.
- The pattern is functional, but it can read as two independent forms rather than a concise meeting outcome area.
- The checkbox is doing two jobs: declaring whether the outcome exists and revealing a textarea.

Recommendation:

- Keep one Agenda Item capable of holding both a Decision and an Action for now; do not add multiple outcomes in this polish pass.
- Improve hierarchy by grouping outcomes under a single `Outcome` area with two compact rows/cards: `Decision` and `Action`.
- Place each checkbox at the left edge of its row, then label, then concise body text/rendered preview.
- In read mode, show filled Decision/Action text as readable summary text, not always as textarea-like forms.
- In edit mode, use textarea/editor controls only for the active field.
- Prefer stronger labels and lighter backgrounds over large saturated colored panels.

Recommended layout:

1. Card title row.
2. Left-side Notes control.
3. Small state/action row: Covered, Cascade Needed, Promote.
4. Outcome area:
   - `Decision` checkbox + summary/edit target.
   - `Action` checkbox + summary/edit target.
5. Discussion Notes preview/editor only when opened or focused.

### 3.5 Strategic Topic Consistency

Current finding:

- Strategic Topics and Agenda Items are now adjacent meeting surfaces with overlapping behavior: title editing, notes, status/lifecycle state, and promotion linkage.
- Agenda Items are short-lived current-meeting work; Strategic Topics are durable follow-up work. They should feel related but not identical.

Recommendation:

Agenda Items and Strategic Topics should share:

- Double-click title editing.
- Consistent note button placement and visual treatment.
- Similar compact control rows.
- Read-first cards that only expose editors when the user intentionally edits.
- Lightweight chips for state rather than large form controls where possible.

Agenda Items and Strategic Topics should differ:

- Agenda Items should emphasize current-meeting flow: uncovered → discuss → capture outcome → mark covered.
- Strategic Topics should emphasize long-term lifecycle: active → reviewed/completed/archived/history.
- Agenda Item covered state should collapse in-place; Strategic Topic completed/archived state should move to history or lifecycle views.
- Agenda Item Decision/Action controls should not appear on Strategic Topic cards.

## 4. Decisions / Actions Rollup Review

Current finding:

- The Decisions/Actions section now acts as a generated read-only rollup from Agenda Item outcomes plus legacy entries.
- User feedback says the rollup creates duplicate information, adds page noise, and may no longer provide enough value now that outcomes live directly on Agenda Items.

Options reviewed:

### Option A — Remove the rollup entirely

Pros:

- Removes duplicate information.
- Simplifies the page.
- Reinforces Agenda Items as the source of truth.

Cons:

- Legacy `decisionItems` need a safe display path until old data is either migrated or intentionally hidden.
- Teams lose a quick outcomes-only summary on the same page.

### Option B — Keep temporarily as a transition section

Pros:

- Safest for old workspaces with legacy Decisions/Actions.
- Matches the UX-3A transition recommendation.

Cons:

- Keeps the exact page noise the user reported.
- Prolongs ambiguity over whether facilitators should edit/read outcomes in Agenda Items or the rollup.

### Option C — Replace with optional summary

Pros:

- Keeps outcome-summary value without adding default noise.
- Can be collapsed by default, hidden behind `Show decisions/actions summary`, or moved into a meeting summary area.
- Supports before-main simplicity while preserving a future path for exports or end-meeting review.

Cons:

- Requires a small UI behavior decision in a future implementation PR.
- Legacy entries still need handling.

### Option D — Move elsewhere

Pros:

- Could make sense in End Meeting, Meeting History, or a future Summary/Output panel.
- Keeps live Agenda workspace focused.

Cons:

- Defers the duplicate-information problem unless the current section is also removed or hidden.
- Risks creating another navigation destination for a lightweight meeting tool.

Recommendation:

- **Use Option C before main if feasible: replace the always-visible rollup with an optional collapsed summary.**
- If schedule is tight, **remove/hide the rollup from the live workspace before main** and document that legacy `decisionItems` remain preserved in backup/import data until a later migration or legacy-data display decision.
- Do not keep the always-visible read-only rollup as the default long-term pattern.
- Do not reintroduce the old editable Decisions/Actions section.

## 5. Recommended Card Behavior

Future Agenda Item card behavior should be:

- **Default uncovered item:** expanded enough to show title, notes affordance, covered/cascade/promote actions, and concise Decision/Action controls.
- **Notes closed:** show a small note indicator if notes exist; do not reserve large vertical space.
- **Notes open/read mode:** show rendered notes; double-click enters editing.
- **Notes edit mode:** show the existing rich text editor behavior without changing autosave/persistence.
- **Covered item:** collapse to title-only plus covered indicator, with a clear expand affordance.
- **Re-expanded covered item:** show full details while preserving covered state.
- **Promoted item:** show `Promoted` as a disabled/complete state rather than a repeated primary action.
- **Cascade-needed item:** keep the marker visible on collapsed cards if it affects the communication workflow.

## 6. Before-Main Classification

### Must happen before main

- Collapse covered Agenda Items to title-only by default with re-expand support.
- Move Agenda Item `Notes` to a stable left-side/left-leading position aligned with the Strategic Topic note-control pattern.
- Remove, hide, or collapse the always-visible Decisions/Actions rollup so it no longer duplicates Agenda Item outcomes by default.
- Preserve all existing Agenda Item data, legacy Decisions/Actions data, backup/import coverage, and autosave behavior while making these UX changes.

### Strong before-main candidates if scoped small

- Convert Discussion Notes to read-first, double-click-to-edit behavior while keeping keyboard-accessible edit affordances.
- Tighten Decision/Action layout into a clearer outcome area with left-aligned checkbox rows and read-first summaries.
- Show compact chips for `Covered`, `Cascade Needed`, and `Promoted` on collapsed or read-first cards.

### Can happen after main

- Broader card-system refactor shared across Agenda Items and Strategic Topics.
- Multiple decisions/actions per Agenda Item.
- Legacy `decisionItems` migration tooling.
- Moving outcome summaries into End Meeting, Meeting History, export summaries, or future reporting.
- Any rich text editor system-wide redesign beyond Agenda Item Discussion Notes.

## 7. Open Questions for Future Implementation

- Should the optional Decisions/Actions summary be collapsed by default inside the Agenda workspace, moved to End Meeting, or omitted entirely from the live workspace?
- When a covered card is collapsed, should `Cascade Needed` and `Promoted` chips remain visible next to the title?
- Should double-click-to-edit Discussion Notes reuse the exact `EditableField` activation contract, or should RichTextEditor introduce its own accessible read/edit wrapper?
- Should Strategic Topic `Notes` also move to the far-left card position if Agenda Items adopt a left note rail, or should Strategic Topics keep the current far-right lower-row placement?
- How should legacy standalone `decisionItems` be surfaced after the live rollup is hidden: hidden but preserved, shown in a collapsed legacy drawer, or included only in Backup/Restore data?
