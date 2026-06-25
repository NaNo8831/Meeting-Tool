# Sprint 3B-3 — Workspace UX Fixes
## Requirements

Goal: Fix agenda item promotion UX, add Help panel to workspace,
and make FeedbackWidget dismiss on backdrop click.

User stories:
1. As a user promoting an agenda item to a Strategic Topic,
   the card collapses automatically, the promote button
   disappears, and a "Strategic Topic" pill appears in the
   collapsed card row so I can see it was promoted at a glance.
2. As a user in the workspace, I can access a Help panel via
   a "?" button that shows the Feature Glossary.
3. As a user, I can dismiss the Feedback modal by clicking
   the backdrop, consistent with the Help panel behavior.

Scope:
- Agenda item collapses on promote
- Hide "+ Strategic Topic" button after promotion
- Show "Strategic Topic" pill in collapsed card row
  alongside notes pill and outcome text
- Fix card overflow that causes promote button to paint
  over workspace content
- Add "?" Help button to workspace above Feedback button
- Workspace Help panel shows Feature Glossary only
- FeedbackWidget closes on backdrop click

Out of scope:
- Dashboard Help panel changes
- Any changes to Strategic Topic creation behavior
- Any changes to autosave or persistence
- Migrations, RLS, or schema changes

Constraints:
- Collapse behavior must match existing collapse checkbox
  behavior exactly
- No functional changes to promoteAgendaItem handler
- No merge to dev without live test
- No merge to main without explicit approval
