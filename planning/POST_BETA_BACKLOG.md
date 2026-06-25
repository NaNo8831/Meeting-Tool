# Post-Beta Backlog

Intentionally deferred work, parked before beta launch.
These are conscious decisions, not open bugs. Revisit and
prioritize based on beta feedback.

## Roles & Access
- Viewer UI enforcement in the workspace. Viewers can be
  invited and appear in the member list, but read-only
  enforcement is not yet built into the workspace UI.
  Deferred until user demand justifies the work.
- Role elevation/demotion by owner (promote viewer to
  editor, demote editor to viewer) — not yet built.
- Invitation emails via Resend. Invite flow works in-app;
  email notification to invited users is not yet wired.

## Data Model & Cleanup
- Drop three orphaned legacy tables confirmed safe to remove:
  tactical_items, strategic_sessions, strategic_session_notes.
- client_meeting_id uses Date.now() — collision risk across
  sessions. Replace with UUID.
- getWorkspaceScopedStorageKey should become a shared utility
  (currently duplicated logic in dashboard/page.tsx).

## Persistence
- Manual Save decommission revisit. Manual Save is kept as
  the rollback path while structured autosave proves reliable
  in real use. Revisit removing it once beta feedback confirms
  autosave is trusted.
- Meeting navigation race condition pattern. The specific
  stale-tacticalSessions issue was fixed (synchronous reset
  on meeting change), but the broader pattern of state
  bleeding between meeting switches is worth watching.

## Known Quirks (documented, accepted)
- Test Mode may allow more than one open meeting at a time
  across different test dates. Documented in the Test Mode
  help popover, gated to preview builds only. Accepted
  behavior, not fixed.
- Sign-out autosave cosmetic flash. On sign-out an "Autosave
  issue" message can briefly flash. No data is lost. Deferred
  to a focused hotfix.

## Code Health
- Pre-existing lint error in MeetingWorkspace.tsx
  (getCurrentWorkspaceStorageRef.current accessed during
  render, ~line 2596). Has ridden along as "pre-existing,
  unrelated" through multiple sprints. Schedule a proper fix.
- Extract the SOO (Standard Operating Objective) editor modal
  from MeetingWorkspace.tsx into its own component, matching
  the pattern of ObjectiveCard (DO) and TaskDetailsModal
  (Task). The SOO modal currently lives inline in
  MeetingWorkspace.tsx while its DO and Task siblings are
  dedicated components. This asymmetry made recent SOO fixes
  land in MeetingWorkspace.tsx rather than a clean dedicated
  file. Extraction is a behavior-preserving refactor —
  defer until post-beta, treat with the same care as the
  Sprint 3A MeetingWorkspace splits.

## Future / Larger
- Editing closed meetings — deferred entirely. Immutable
  historical record is preserved by design. If real users
  request it, the path forward is an amend-with-audit-trail
  feature, not direct editing. No decision needed until
  user demand surfaces.
- Larger items tracked in planning/POST_MAIN_ROADMAP.md
  (realtime collaboration, mobile pass, organizations model,
  ownership transfer, Last-Write-Wins concurrency).
