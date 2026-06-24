# Sprint 3B-2 — Dashboard Polish
## Requirements

Goal: Improve the dashboard experience for new users and
make key actions more visible and consistent across card types.

User stories:
1. As a user viewing archived meetings, I can see Restore and
   Delete as visible buttons without hunting through a menu.
2. As a new user with no meetings, I see a welcoming empty state
   that explains what the app does and how to get started.
3. As any user, I can access a Help panel from the dashboard
   that explains key features and terminology.
4. As any user, I can submit feedback from the dashboard the
   same way I can from the workspace.

Scope:
- Surface Restore and Delete as visible buttons on archived cards
- Enhance empty state for new users with zero owned meetings
- Add "?" Help button (bottom right, above Feedback) that opens
  a help panel with quick start guide and feature glossary
- Render existing FeedbackWidget on the dashboard

Out of scope:
- Account view copy (no issues found — descoped)
- Feedback button redesign
- Any changes to FeedbackWidget behavior
- Any changes to active meeting card layout
- Any changes to shared meeting card layout
- Migrations, RLS, or schema changes

Constraints:
- Archived card changes must not affect active card layout
- FeedbackWidget must behave identically on dashboard as
  it does in the workspace
- Help panel is static content — no backend needed
- No merge to dev without live test
- No merge to main without explicit approval
