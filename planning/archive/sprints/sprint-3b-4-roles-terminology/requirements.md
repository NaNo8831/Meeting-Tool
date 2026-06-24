# Sprint 3B-4 — Terminology, Audit, and Roles Foundation
## Requirements

Goal: Clean up inconsistent terminology, verify owner-only
action gates are correct, document the roles model, and add
viewer as an invitable role in the invitation UI.

User stories:
1. As a user I see consistent terminology throughout the app —
   Test Mode, Meeting Date, Members, and Cascade Needed are
   used everywhere without variation.
2. As an owner I can invite someone as either an editor or
   a viewer when sending a meeting invitation.
3. As a developer the roles model is documented and the
   existing permission gates are verified correct.

Scope:
- Terminology: Test Mode, Meeting Date, Members, Cascade Needed
- Owner-only action audit — verify all gates are correct
- Add viewer role option to invitation UI in workspace and
  dashboard
- Document roles model in planning/DECISIONS.md

Out of scope:
- Viewer UI enforcement in workspace (Sprint 4B)
- Invitation emails via Resend (Sprint 4B)
- Role elevation/demotion UI (Sprint 4B)
- Any changes to RLS policies
- Any changes to autosave or persistence
- Migrations unless required for viewer invite role

Constraints:
- Terminology changes are copy/label only — no logic changes
- Invitation flow change must not break existing editor invites
- No merge to dev without live test
- No merge to main without explicit approval
