# Sprint 3B-2 — Blueprint

Branch: sprint-3b-2-dashboard cut from dev.

## Item 1 — Archived Card Button Layout

File to modify:
- app/dashboard/page.tsx (renderMeetingCard function)

Current behavior:
- Active cards: Members button + Actions menu
- Archived cards: invisible spacer + Actions menu
  (Restore, Delete hidden in overflow)

Target behavior:
- Archived cards: Restore (emerald) and Delete (red) visible
  inline where Members button appears on active cards
- Remove Restore and Delete from archived Actions overflow menu
- Active card layout unchanged

Steps:
1. In renderMeetingCard find the conditional that hides Members
   on archived cards (showMembersAccess = !meeting.archived_at)
2. Replace the invisible spacer with visible Restore and Delete
   buttons styled to match existing emerald/red colors
3. Remove Restore and Delete from the archived overflow menu
4. Confirm canManageMeetingLifecycle guard still applies
5. Run: npm run lint && npx tsc --noEmit && npm run build
6. Commit: "Surface Restore and Delete as visible buttons
   on archived meeting cards"

## Item 2 — Empty State Enhancement

File to modify:
- app/dashboard/page.tsx

Target: owned zero meetings empty state only.
Current: "Create your first meeting to get started."
Replace with:
- Heading: "Welcome to Meeting Tool"
- Description: "Run focused leadership meetings, track
  strategic topics, and follow up on outcomes — all in one place."
- CTA button: "Create your first meeting"
  (triggers existing create meeting flow)
- 3 numbered steps:
  1. Create a meeting
  2. Run it with your team
  3. Review outcomes and follow up

All other empty state messages unchanged.

Steps:
1. Locate the zero owned meetings empty state render
2. Replace with the richer block described above
3. Wire CTA to existing create meeting handler
4. Run: npm run lint && npx tsc --noEmit && npm run build
5. Commit: "Enhance empty state for new users with zero meetings"

## Item 3 — Help Panel and Feedback on Dashboard

Files to create:
- app/components/help/HelpPanel.tsx

Files to modify:
- app/dashboard/page.tsx

HelpPanel.tsx content:
- Heading: "Quick Start"
- 3 steps:
  1. Create a meeting
  2. Run it with your team
  3. Review outcomes and follow up
- Heading: "Feature Glossary"
- Terms:
  Strategic Topics: "Longer-term themes your team tracks
    across multiple meetings."
  Cascading Communications: "Key messages to share with
    your broader organization after the meeting."
  Defining Objectives (DOs): "The critical outcomes your
    team is committed to achieving."
  Standard Operating Objectives (SOOs): "Ongoing metrics
    and targets your team monitors each meeting."
  Tactical History: "A record of all past meetings and
    their outcomes."
- Close button — dismissible

Dashboard layout changes:
- Import and render FeedbackWidget in dashboard/page.tsx
- Add "?" button fixed bottom-right above FeedbackWidget
- "?" button opens HelpPanel

Steps:
1. Create HelpPanel.tsx with static content above
2. Add "?" button to dashboard above FeedbackWidget
3. Import and render FeedbackWidget on dashboard
4. Run: npm run lint && npx tsc --noEmit && npm run build
5. Commit: "Add Help panel and Feedback button to dashboard"
