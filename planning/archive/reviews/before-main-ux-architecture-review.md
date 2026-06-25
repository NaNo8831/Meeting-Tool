# Before Main UX Architecture Review

This is a review, documentation, and planning PR only. It does not implement UI changes, change app code, change runtime behavior, add migrations, change RLS, change persistence, remove Local Mode, or remove Manual Save.

## Files and areas reviewed

- `planning/STATE.md`
- `planning/DECISIONS.md`
- `planning/DOMAIN.md`
- `planning/RISKS.md`
- `planning/QUESTIONS.md`
- `planning/reviews/phase-4-before-main-readiness-review.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/VALIDATION.md`
- `docs/PERMISSIONS.md`
- `app/dashboard/page.tsx` for dashboard structure, card actions, owner/member display, profile title, invitations, and member management entry points.
- `app/components/meeting/MeetingWorkspace.tsx` for meeting header/status, workspace order, Manual Save/Load copy, Local Mode copy, meeting menu, Tactical History, notes, objectives, SOOs, and section rendering.
- `app/components/meeting/MeetingSection.tsx` for Agenda Items, Strategic Topics, Decisions/Actions, Cascading Communication, strategic topic controls, and section card behavior.
- `app/types/dashboard.ts` for current meeting item and section data shapes.
- `app/lib/workspaceBackup.ts` for full-workspace backup compatibility and meeting item backup coverage.
- `app/components/objectives/ObjectiveCard.tsx`, `app/components/objectives/TaskList.tsx`, and `app/components/objectives/TaskDetailsModal.tsx` for Objectives/Tasks workflow and task-detail density.

## 1. Executive Summary

Meeting Tool is ready for a focused before-main UX sprint, but the sprint should stay narrow and avoid implementation decisions that belong to persistence/schema work. Recent architecture and persistence work materially changed the user promise: most operational surfaces now autosave in Cloud Meetings, while Agenda Items and Decisions/Actions remain backup/pass-through compatible only. The UX now needs to make that reality understandable during live meetings.

Recommended before-main UX sprint theme:

1. **Make the Dashboard easier to scan and act on.** Meeting cards should prioritize the meeting title, owner name, privacy-preserving member count, and one dominant `Open` action. Access/Members should be secondary. Duplicate/Archive/Delete should move behind an overflow menu.
2. **Make save confidence persistent.** Replace the current non-sticky top status area with a sticky meeting header/status bar that keeps meeting name, cloud/local state, autosave summary, Manual Save, and profile/menu access visible without forcing users to scroll.
3. **Clarify the meeting workspace path.** Preserve the major sections, but add lightweight section navigation and use grouping/collapsible behavior carefully so the tool remains meeting-friendly rather than becoming a project-management app.
4. **Resolve Agenda/Decision workflow before persistence.** Agenda Items should become first-class discussion containers. Decisions/Actions should remain available as a meeting summary/rollup, not as a fully separate competing capture surface. First-class structured autosave for agenda outcomes should be before-main unless the product intentionally accepts a major data-loss/confidence risk.
5. **Demote, do not remove, Manual Save.** Manual Save should read as full-workspace backup/safety snapshot while structured autosave is the default trust signal for supported cloud surfaces.
6. **Keep Local Mode, but label it clearly.** Local Mode should remain supported as browser-only fallback, with cloud migration/export guidance. Do not call it legacy before the cloud-first onboarding and migration story is complete.

This review does not make schema, RLS, persistence, or runtime changes. It creates a repo-aware blueprint for Cursor visual refinement and subsequent small implementation PRs.

## 2. Dashboard Recommendations

### Current findings

- Dashboard cards already show meeting name, owner, member count, updated timestamp, Access/Members, lifecycle buttons, and Open.
- The card action cluster is crowded because Access/Members, Duplicate, Archive/Restore/Delete, and Open compete at the same visual level.
- Open is currently last and visually primary, but it is not structurally dominant because secondary/destructive actions sit next to it.
- Owned and shared sections are already separated, which is useful and should remain.
- Owner display should continue using profile display name where available, falling back to email only when display name is unavailable.
- Member count should remain a count only. Do not expose member emails or names on cards.

### Recommended card layout

Use a two-zone card:

- **Content zone**
  - Meeting title as the dominant text.
  - Metadata row: `Owner: {display name}` and `Members: {count}`.
  - Secondary metadata: `Updated {relative time}`.
  - Optional compact pill for `Owned by me`, `Shared with me`, or `Archived` only if the section heading alone is not enough.
- **Action zone**
  - Large primary `Open` button.
  - Secondary `Members` button for shared/editable meetings; label `Access` only when the user can manage invites/members.
  - Overflow menu (`More`) containing Duplicate, Archive, Restore, Delete. Keep destructive actions separated visually inside the menu.

### Button hierarchy

1. **Primary:** `Open`.
2. **Secondary:** `Members` or `Access`.
3. **Tertiary/overflow:** Duplicate, Archive, Restore, Delete.
4. **Destructive:** Delete stays behind confirmation and should never be adjacent to Open.

### Mobile layout guidance

- Stack title/metadata above actions.
- Make `Open` full-width and first in the action group.
- Put `Members/Access` and `More` on a second row, each half-width.
- Avoid tiny action buttons on mobile; the current small text buttons are usable but too easy to mis-tap in meeting conditions.
- Keep member count as a short label, not a list.

### Implementation notes for later PRs

- This can be a UI-only refactor of `renderMeetingCard` in `app/dashboard/page.tsx`.
- Reuse existing state handlers and confirmation modals; do not change lifecycle behavior.
- Overflow menu should preserve current owner/editor permissions. Editors/shared users should not see owner-only lifecycle actions.
- Use the existing profile/member-count data paths; do not add new profile reads or broad member exposure.

### Before-main vs post-main

- **Before main:** Card action hierarchy, Open dominance, secondary Members/Access, overflow menu, mobile stacking, cleaner dashboard header spacing.
- **Post main:** Avatars, richer activity indicators, owner profile photos, dashboard analytics, bulk actions, advanced filters.

## 3. Sticky Header / Autosave Recommendations

### Current findings

- The meeting title is large and easy to see only at the top of the page.
- Autosave labels are shown in the meeting actions/status cards, but users can miss transitions once they scroll into notes, sections, objectives, or SOOs.
- Cloud/Local state, structured autosave, Manual Save, and profile/menu access are split across top cards and the menu.
- Manual Save is currently visually similar to important primary actions because the cloud card uses `Load` and `Save` buttons near autosave status.

### Recommended sticky header structure

Use a sticky top bar below the browser top edge:

- **Left:** meeting name, with a smaller `Cloud Meeting` or `Local Workspace` badge.
- **Center:** autosave summary chip.
  - Default: `Autosaved` when all structured cloud autosave groups are saved/idle and no structured error exists.
  - Active: `Saving…` when any structured autosave group is saving.
  - Attention: `Backup needed` when full-workspace Manual Save has unsaved backup changes but structured autosave is otherwise healthy.
  - Error: `Autosave issue` when any structured autosave group errors.
- **Right:** `Manual Save` secondary button, profile/menu trigger, and optional `Dashboard` link.

Keep the existing detailed status language available in a popover, tooltip, or expanded status panel:

- Settings autosave.
- Strategic Topics / Topic Notes autosave.
- Meeting Notes / Cascading Communication autosave.
- Objectives / Tasks / SOOs autosave.
- Full workspace backup / Manual Save state.

### Status grouping recommendation

Group statuses by user mental model instead of implementation table names:

1. **Meeting setup and playbook** — settings, dashboard title, organization/playbook values, setup completion, section order.
2. **Topics and topic notes** — Strategic Topics, ordering, completed/archive state, Topic Notes.
3. **Meeting notes and communications** — Meeting Notes and Cascading Communications.
4. **Objectives and execution** — Defining Objectives, Tasks, nested task details, SOOs.
5. **Full workspace backup** — Manual Save snapshot/backup, including surfaces not yet first-class autosaved.

### Error state recommendation

- Show `Autosave issue` as a visible sticky error chip with an accessible label.
- Clicking/tapping should reveal which group failed and preserve Manual Save as the immediate safety action.
- Copy should avoid implying all data is lost. Suggested copy: `Some cloud autosave changes may not have saved. Use Manual Save now, then retry or refresh after confirming status.`
- Do not hide errors inside the Meeting Menu.

### Mobile behavior

- Sticky header should condense to two rows:
  - Row 1: meeting name + cloud/local badge + menu.
  - Row 2: autosave chip + Manual Save button.
- Keep the header compact and allow horizontal truncation of long meeting names.
- Avoid sticky height that consumes too much vertical space; live meetings need content room.

### Before-main vs post-main

- **Before main:** Sticky header/status bar with grouped autosave summary, Manual Save secondary placement, visible error chip, compact mobile behavior.
- **Post main:** Detailed save history, per-user edit attribution, realtime presence, conflict indicators, granular sync diagnostics.

## 4. Meeting Workspace Recommendations

### Current findings

- Current order is broadly operational: playbook/context, Top Priority, Defining Objectives, SOOs, Meeting Notes, then the four meeting sections.
- The page is long, especially after Objectives/Tasks, SOOs, and meeting sections have content.
- Agenda, Strategic Topics, Decisions/Actions, and Cascading Communication are rendered in a two-column grid after Meeting Notes.
- Strategic Topics have more behavior than the other meeting sections, including completion, archive, history, notes, and ordering.
- Section cards are draggable, but section navigation is not obvious during a live meeting.

### Recommended separation and grouping

Keep these as separate primary sections:

- Top Priority.
- Defining Objectives.
- Standard Operating Objectives.
- Meeting Notes.
- Agenda / Meeting Flow.
- Strategic Topics.
- Cascading Communication.

Group these more intentionally:

- **Playbook context group:** Why / How Behave / What / How Succeed can remain visible but should be visually demoted behind the Top Priority during active meetings.
- **Execution group:** Defining Objectives + Tasks should remain one group because task workflow is tied to objectives.
- **Operating cadence group:** SOOs can remain separate but should be visually closer to execution/scoreboard context.
- **Meeting outcomes group:** Agenda, Decisions/Actions summary, and Cascading Communication should be adjacent and navigable as one meeting-closeout flow.

### Collapsible cards

Collapsible cards are helpful if used sparingly:

- **Before main:** Make playbook/context collapsible or visually compact by default after setup completion. Consider collapsible Strategic Topic history only if it reduces noise without hiding active topics.
- **Do not collapse by default:** Top Priority, Agenda, active Meeting Notes, and Decision/Action capture during the meeting.
- **Post main:** User-specific remembered collapses or meeting templates.

### Section navigation

Add lightweight section navigation before main:

- Sticky or near-sticky jump links: `Top Priority`, `Objectives`, `SOOs`, `Notes`, `Agenda`, `Topics`, `Comms`.
- On mobile, use a horizontal scroll nav under the sticky header.
- Do not implement heavy routing or nested pages before main.

### Before-main vs post-main

- **Before main:** Sticky section nav/jump links, playbook context compaction, outcome flow adjacency, clearer card hierarchy.
- **Post main:** Custom meeting layouts, saved section preferences, sidebar navigation, keyboard-driven facilitation mode.

## 5. Agenda / Decision Workflow Recommendation

### Current findings

- Agenda Items and Decisions/Actions currently share the simple `MeetingItem` shape: id, text, dates/status metadata used mostly by Strategic Topics, and section placement.
- Agenda Items, Decisions/Actions, and Cascading Communication are stored inside `MeetingRecord` arrays for active meeting notes and backup compatibility.
- Meeting Notes and Cascading Communications have structured autosave coverage, but Agenda Items and Decisions/Actions remain backup/pass-through compatible only.
- The current UI treats Agenda Items and Decisions/Actions as separate free-text lists. This is fast but does not model the natural meeting flow from topic → discussion → decision → action → communication.

### Recommended workflow

Agenda Items should become the first-class meeting outcome container.

Each Agenda Item should support:

- **Title / prompt** — the agenda item itself.
- **Discussion Notes** — rich or plain structured notes specific to that agenda item.
- **Decision** — optional final decision text.
- **Action Items** — one or more assigned follow-up items, with optional owner and due date.
- **Completed checkbox** — marks the agenda item covered in the meeting.
- **Promote to Strategic Topic** — creates/links a Strategic Topic when the issue should carry across meetings.
- **Cascade flag / communication draft** — marks an outcome as needing Cascading Communication.

Decisions/Actions should not disappear. They should become a **summary/rollup area**:

- Display decisions and actions generated from agenda items.
- Allow quick add for standalone decisions/actions only if the meeting needs to capture something outside an agenda item.
- Make the summary useful for end-of-meeting review and historical snapshots.
- Avoid maintaining two unrelated lists that users must reconcile manually.

Cascading Communications should relate to agenda outcomes this way:

- Agenda decisions/actions can be marked `Needs cascade`.
- Cascading Communication remains the final staff-facing message list.
- Users can draft communication from selected agenda outcomes, but before main this can be manual copy/rollup rather than automated generation.

### Recommended data model direction

This review does not design migrations or persistence, but the future model should move toward:

- `agenda_items` as meeting-scoped, ordered rows.
- Agenda item fields for title, discussion notes, decision text, completed state, sort order, and optional linked strategic topic.
- Child action rows or embedded action array depending on implementation complexity. For before-main, keep it simple and avoid over-normalizing unless action ownership/reporting needs are immediate.
- A derived or lightly stored decisions/actions summary that can preserve standalone decisions without becoming the primary capture model.
- Backup/import compatibility that can read legacy `MeetingRecord.agendaItems` and `decisionItems` into the new model without data loss.

### Recommended before-main implementation scope

If product accepts this workflow direction, before-main should include:

1. Design the UI workflow in Cursor first.
2. Implement first-class autosave for the chosen Agenda/Decision outcome model after the workflow is accepted.
3. Preserve legacy backup/import pass-through and Manual Save compatibility.
4. Keep the initial action model lightweight: action text, optional owner, optional due date, optional completed state.
5. Keep Strategic Topic promotion as a simple explicit action; do not add complex linking/reporting before main unless required.

### What should be autosaved before main

Before main, autosave should cover at minimum:

- Agenda item title/order/completed state.
- Per-agenda discussion notes.
- Per-agenda decision text.
- Per-agenda action items.
- Standalone decisions/actions summary if retained.
- Cascade-needed markers or resulting Cascading Communication drafts.

### Risks of keeping Agenda/Decisions Manual Save dependent

- Users may reasonably assume agenda outcomes autosave because nearby Meeting Notes, Cascading Communications, Objectives, Tasks, SOOs, and Strategic Topics already do.
- Decisions/actions are high-value meeting outputs; losing them undermines trust more than losing lower-stakes setup data.
- Manual Save dependency creates inconsistent collaboration expectations for shared editors.
- The UX would need prominent warnings, which conflicts with the goal of autosave confidence.
- Historical snapshots could preserve incomplete outcomes if users forget Manual Save.

### Proposed validation list

- Create, reorder, complete, and edit agenda items in a Cloud Meeting; refresh and confirm persistence.
- Add discussion notes to agenda items; refresh and confirm persistence.
- Add decisions and action items; refresh and confirm persistence.
- Mark an agenda item as needing cascade; confirm the closeout communication flow is understandable.
- Promote an agenda item to Strategic Topic; confirm topic appears in active Strategic Topics and retains notes/history expectations.
- Confirm owner/editor permissions and non-member denial.
- Confirm Local Mode still works browser-only.
- Confirm Manual Save/export/import preserves both legacy and new agenda/outcome payloads.
- Confirm historical Tactical History snapshot displays meaningful agenda outcomes.

### Before-main vs post-main

- **Before main:** Decide the workflow, implement the minimum first-class autosaved agenda/outcome model, keep Decisions/Actions as summary/rollup, preserve backups.
- **Post main:** Rich action assignment workflows, notifications, action dashboards, decision registers, agenda templates, automatic cascading communication generation.

## 6. Strategic Topics UX Recommendations

### Current findings

- Strategic Topics have the richest meeting-section behavior today: active list, completed checkbox, archive/unarchive, restore to active, history modal, Topic Notes modal, ordering, and autosave.
- The controls are powerful but dense inside each topic item.
- `Reviewed / completed` may read like a meeting checklist, while Strategic Topics are longer-lived strategic issues.
- Topic Notes are useful but modal-only; long-term users may expect notes to feel more connected to the topic lifecycle.

### Recommendations

- Clarify the lifecycle labels:
  - `Active` for ongoing strategic topics.
  - `Reviewed this meeting` or `Covered` only if it is a per-meeting action.
  - `Completed` for closed strategic topics.
  - `Archived` for parked/hidden topics.
- Keep active Strategic Topics visible in the meeting workspace.
- Move less-common actions (`Archive`, `Mark active`, perhaps `Unarchive`) into a topic overflow menu if the card remains dense.
- Keep `Notes` visible because it is meeting-critical context.
- Add a future `Promoted from Agenda` indicator if agenda promotion is implemented.
- Do not redesign Strategic Topic persistence before main; the structured autosave is already in place.

### Before-main vs post-main

- **Before main:** Label cleanup, control hierarchy, notes action prominence, optional compact history entry point.
- **Post main:** Drawer-based Topic Notes, linked agenda history, topic ownership, richer topic status reporting, strategic topic templates.

## 7. Objectives / Tasks / SOOs UX Recommendations

### Current findings

- Defining Objectives are visually strong and task status counts are useful.
- Objective details open in a large modal that supports title, rich description, and task list workflow.
- Task details support status, description, assignee, due date, subtasks, comments, and activity history, which is already near the upper bound of acceptable complexity for this lightweight product.
- SOOs are visually similar to objectives but serve a different operating purpose; they can feel like another task/objective board unless labels and grouping remain clear.
- The scoreboard/readability concern is mainly about scanability, not data model.

### Recommendations

- Keep Defining Objectives and Tasks together; do not create a separate task board before main.
- Improve card hierarchy before main by making objective title and status count easier to scan, but avoid adding new task dimensions.
- Keep task details as a modal for now; a drawer can wait.
- Keep SOOs separate from Defining Objectives. Use a lighter visual style or explanatory subheader so SOOs read as operating standards, not another priority list.
- Add simple empty states and helper copy where needed, especially if a team has no objectives or no SOOs.
- Scoreboard readability should focus on counts, completion/progress labels, and consistent typography.

### What should wait until after main

- Full task board/kanban.
- Cross-meeting task reporting.
- Per-user assignment dashboards.
- Notifications/reminders.
- Rich audit trails beyond current task activity history.
- Heavy analytics or performance scoring.

### Before-main vs post-main

- **Before main:** Visual hierarchy, labels, scanability, responsive polish, no new behavior.
- **Post main:** Drawer workflow, task dashboards, notifications, richer reporting, deeper ownership/assignment models.

## 8. Tactical History Recommendation

### Current findings

- The Meeting Menu entry still says `Meeting History`, while the modal heading says `Tactical History`.
- The modal itself is aligned with the desired label and explains that ended tactical sessions can be reviewed without raw snapshot exposure.
- Existing planning decisions say Tactical History remains visible to owners and editors.

### Recommendation

- Rename the menu entry from `Meeting History` to `Tactical History` before main for label consistency.
- Keep Tactical History inside the Meeting Menu unless section navigation creates a better `History`/`Review` group.
- Keep owner/editor visibility as-is for main unless a separate permissions review changes viewer/read-only strategy.
- Avoid adding editing or restore-from-history behavior before main.

### Before-main vs post-main

- **Before main:** Label consistency and concise explanatory copy.
- **Post main:** Filters, full history list, compare snapshots, export historical summary, viewer-specific history behavior.

## 9. Manual Save / Backup UX Recommendation

### Current findings

- Manual Save remains necessary as full-workspace backup while not every meeting outcome surface has first-class structured autosave.
- Current copy says full workspace backup saved or Manual Save needed, which is accurate but easy to miss and can compete with structured autosave messages.
- Backup/Restore is correctly kept in the Meeting Menu.

### Recommended wording

Use consistent language:

- Sticky header button: `Manual Save`.
- Status copy: `Autosave protects supported cloud sections. Manual Save creates a full-workspace backup.`
- Attention copy: `Manual Save recommended for full-workspace backup.`
- Backup/Restore modal copy: `Export/import a workspace backup. This is separate from cloud autosave and remains a safety net.`

Avoid wording that implies Manual Save is obsolete before Agenda/Decisions are first-class autosaved.

### Recommended placement

- Keep `Manual Save` visible in the sticky header as a secondary action.
- Keep `Backup / Restore` inside the Meeting Menu.
- Move `Load` out of the primary header path if possible; loading cloud data should be rare and potentially risky during a live meeting.
- Do not remove Manual Save before main.

### Whether Manual Save should move/demote after main

- **Before main:** Keep visible but secondary.
- **After main:** If Agenda/Decision outcomes are structured-autosaved and validation is strong, demote Manual Save into Backup/Restore as `Create backup snapshot`.
- **Do not remove:** Export/import backup remains a product safety feature even after autosave coverage is complete.

## 10. Local Mode UX Recommendation

### Current findings

- Local Mode is correctly described as browser-only, and current copy warns that local changes are stored only in this browser.
- Local-to-cloud migration prompts exist and should remain.
- Local Mode is still useful as fallback, demo, recovery, or browser-only operation, but it can confuse users if Cloud Meetings are positioned as the primary collaboration model.

### Recommended wording

- Label: `Local Workspace`.
- Badge/copy: `Browser-only fallback`.
- Explanation: `Saved in this browser only. Not shared with members and not cloud autosaved.`
- Migration CTA: `Move Local Workspace to Cloud Meeting` or `Save local workspace into cloud meeting`.

Do not use `legacy` before main. It implies deprecation/removal, which is not a decided product change.

### Before-main vs post-main

- **Before main:** Clarify browser-only/fallback wording, keep migration guidance, preserve Local Mode behavior.
- **Post main:** Cloud-first onboarding, explicit local-to-cloud migration wizard, possible demotion to advanced/fallback mode after durable product decision.

## 11. Responsive Design Notes

### Desktop

- Top issue: too much top-area status/action spread before users reach meeting content.
- Before-main fix: sticky header and section navigation.
- Post-main improvement: optional sidebar navigation/facilitation mode.

### Laptop

- Top issue: vertical scrolling burden from playbook, objectives, SOOs, notes, and sections.
- Before-main fix: compact playbook context, clear jump links, tighter card spacing.
- Post-main improvement: user-saved collapsed state and layout presets.

### Tablet

- Top issue: two-column grids may become cramped with dense meeting-section cards and strategic topic controls.
- Before-main fix: test breakpoints so meeting sections collapse before controls become crowded.
- Post-main improvement: drawer-based details for topics/tasks and touch-first drag alternatives.

### Mobile

- Top issue: small buttons and long scroll path make live meeting use hard.
- Before-main fix: full-width primary buttons, compact sticky header, horizontal section nav, larger tap targets, dashboard card stacking.
- Post-main improvement: mobile facilitation mode with one active section at a time.

## 12. Before-Main UX Priority List

1. **Dashboard card action hierarchy.** Make Open dominant, Members/Access secondary, move Duplicate/Archive/Delete into More.
2. **Sticky meeting header/status bar.** Keep meeting name, cloud/local state, autosave summary, Manual Save, and menu visible.
3. **Autosave status grouping/copy.** Replace multiple separated technical labels with a concise summary and expandable detail.
4. **Agenda/Decision workflow decision.** Approve Agenda-as-outcome-container model before any persistence implementation.
5. **Agenda/Decision first-class autosave implementation after workflow approval.** This is the one UX-adjacent persistence concern likely too risky to leave Manual Save dependent for main.
6. **Meeting workspace navigation.** Add jump links and compact playbook context.
7. **Strategic Topics control hierarchy.** Keep Notes prominent, demote archive/restore controls, clarify labels.
8. **Tactical History label consistency.** Use `Tactical History` in the menu and modal.
9. **Manual Save wording and placement.** Keep visible but secondary, explain it as full-workspace backup.
10. **Local Mode wording.** Browser-only fallback, not legacy.
11. **Responsive polish.** Dashboard mobile cards, sticky header mobile behavior, meeting section breakpoints.

## 13. Post-Main UX Backlog

- Dashboard avatars/profile photos and richer activity metadata.
- Advanced dashboard filters and bulk actions.
- Sidebar or facilitation-mode navigation.
- Saved section collapse/layout preferences.
- Drawer-based Topic Notes and Task Details.
- Agenda templates and automated carry-forward.
- Decision register/reporting.
- Action assignment dashboards, reminders, and notifications.
- Rich cascading communication generation from selected agenda outcomes.
- Viewer-specific read-only UX.
- Realtime collaboration, presence, conflict resolution, and audit trails.
- Cloud-first onboarding and Local Mode demotion/migration wizard.
- Full Tactical History filtering, comparison, export, and snapshot review tools.

## 14. Cursor Handoff Notes

### Design constraints

- Do not implement UI changes in this PR.
- Keep the product lightweight and operational for live leadership meetings.
- Do not turn Objectives/Tasks into a heavy project-management system.
- Preserve Local Mode and Manual Save.
- Preserve JSON export/import backup.
- Do not add migrations, change RLS, or change persistence until the Agenda/Decision workflow is visually accepted.

### Suggested Cursor refinement sequence

1. Mock dashboard card variants with `Open` as the dominant action and overflow menu for lifecycle/destructive actions.
2. Mock sticky meeting header variants for desktop and mobile with concise autosave summary plus expandable detail.
3. Mock section navigation under the sticky header.
4. Mock Agenda-as-outcome-container cards:
   - agenda title;
   - discussion notes;
   - decision;
   - action items;
   - completed checkbox;
   - promote to Strategic Topic;
   - cascade-needed marker.
5. Mock Decisions/Actions summary as a rollup from agenda outcomes with optional standalone add.
6. Mock Strategic Topic cards with prominent Notes and quieter lifecycle controls.
7. Check mobile tap targets and sticky header height before implementation.

### Acceptance guardrails for implementation PRs after Cursor refinement

- Dashboard changes must not alter meeting access/lifecycle permissions.
- Sticky header must not hide autosave errors.
- Manual Save must remain available.
- Local Mode must remain available and browser-only.
- Agenda/Decision persistence must not be implemented until the workflow is approved.
- Backup/import compatibility must be preserved when Agenda/Decision model changes.
- No broad schema, RLS, or runtime behavior changes should be bundled with visual polish PRs.
