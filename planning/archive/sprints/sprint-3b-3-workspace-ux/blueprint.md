# Sprint 3B-3 — Blueprint

Branch: sprint-3b-3-workspace-ux cut from dev.

## Item 1 — Agenda Item Promotion UX

File to modify:
- app/components/meeting/MeetingSection.tsx

### 1A — Collapse on promote
When promoteAgendaItem is called, the agenda item should
collapse immediately. Find where isExpanded is managed for
each agenda item. After a successful promote call, set
isExpanded to false for that item.
The collapse must match the existing collapse checkbox
behavior exactly — same visual result.

### 1B — Hide promote button after promotion
When item.promotedStrategicTopicId is truthy, do not render
the "+ Strategic Topic" button at all.
Remove the disabled "In Topics" state entirely.

### 1C — Strategic Topic pill in collapsed card
In the collapsed card row, alongside the existing notes pill
and outcome text, add a pill that shows when
item.promotedStrategicTopicId is truthy.
Pill style: match the existing notes pill pattern.
Pill label: "Strategic Topic"
Pill color: purple to match the existing promote button color
  (border-purple-200 bg-purple-50 text-purple-700)

### 1D — Fix card overflow
Add overflow-hidden to the agenda item card container so the
button row cannot paint over workspace content below the card.

Steps:
1. Implement 1A — collapse on promote
2. Implement 1B — hide button after promotion
3. Implement 1C — Strategic Topic pill in collapsed row
4. Implement 1D — overflow fix
5. Run: npm run lint && npx tsc --noEmit && npm run build
6. Commit: "Agenda item — collapse on promote, pill badge,
   hide button, fix overflow"

## Item 2 — Workspace Help Panel

Files to modify:
- app/components/meeting/MeetingWorkspace.tsx (or MeetingHeader.tsx)

Reuse existing HelpPanel component from Sprint 3B-2
(app/components/help/HelpPanel.tsx).

Changes needed:
- HelpPanel needs a prop to control which content shows:
  "dashboard" (Quick Start only) or "workspace"
  (Feature Glossary only)
- Add "?" button to workspace, fixed bottom-right above
  Feedback button, same position pattern as dashboard
- Wire "?" button to open HelpPanel in workspace mode

Steps:
1. Update HelpPanel.tsx to accept a mode prop:
   mode: "dashboard" | "workspace"
   Dashboard mode: shows Quick Start only
   Workspace mode: shows Feature Glossary only
2. Update dashboard to pass mode="dashboard" to HelpPanel
3. Add "?" button and HelpPanel in workspace mode
4. Run: npm run lint && npx tsc --noEmit && npm run build
5. Commit: "Add Help panel to workspace with glossary content"

## Item 3 — FeedbackWidget Backdrop Click

File to modify:
- app/components/feedback/FeedbackWidget.tsx

Add onClick handler to the backdrop div that calls the
close/cancel handler (sets isOpen to false).
Match the same pattern used in HelpPanel backdrop dismiss.

Steps:
1. Find the backdrop div in FeedbackWidget.tsx
2. Add onClick={() => setIsOpen(false)} to the backdrop
3. Confirm the form content div has e.stopPropagation()
   so clicks inside the modal do not close it
4. Run: npm run lint && npx tsc --noEmit && npm run build
5. Commit: "FeedbackWidget — close on backdrop click"
