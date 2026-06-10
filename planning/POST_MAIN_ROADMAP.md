# Post-Main Roadmap

This document tracks all known post-main work organized by priority and sprint.
It is the source of truth for backlog sequencing. Update it as sprints complete
and new items are identified.

Last updated: 2026-06-10

---

## Sprint 1 — UX Polish (active)

Branch: ux/polish-sprint-1

### In Scope
- Access/Members menu accessible from the meeting workspace dropdown menu
  (currently only available outside the meeting — gap identified during beta launch)
- Sticky top bar / autosave status visibility improvements
- Local Mode labeled as legacy/decommission-pending in UI

### Out of Scope for Sprint 1
- Remove Save Notes button (deferred until autosave fully trusted by users)
- Move Close button to bottom-right (pair with Save Notes removal)
- Session concurrency / two sessions open simultaneously (known debt, needs
  architecture discussion before touching)
- Refresh hydration preference (known debt, needs investigation)
- Test Mode date preference with multiple real users (needs real-data validation)

---

## Sprint 2 — Housekeeping

- SQL and schema cleanup: review and remove redundant/legacy migrations,
  tidy schema to reflect production state
- Doc cleanup:
  - Delete: docs/CLAUDE_CODE_START_HERE.md, docs/CURRENT_PROJECT_STATUS.md,
    docs/HANDOFF_TO_CLAUDE_CODE.md, docs/CLAUDE_CHAT_HANDOFF.md,
    docs/AUTH_EMAIL_SETUP.md
  - Consolidate: docs/AI_AGENT_WORKFLOW.md → fold into docs/CONTRIBUTING.md
    or docs/DEVELOPMENT.md
- Change Password UX: add Change Password option in user settings/profile
  for logged-in users (uses updatePassword helper already built in PR #110)

---

## Sprint 3 — UX Polish Continued

- Remove Save Notes button once autosave is fully trusted by beta users
- Move Close button to bottom-right where Save Notes currently lives
  (pair with above — do together)
- Sticky header refinements based on beta feedback

---

## Sprint 4 — Session and Hydration

- Refresh hydration: opening a meeting should prefer the currently
  open/newly started meeting record rather than the last meeting
- Session concurrency: meeting open in two sessions simultaneously
  should surface a warning or force-close the older session
- Client meeting record ID divergence: date-dedup pass in
  mergeStructuredMeetingNotes to prevent duplicate records across
  browser sessions (root cause: Date.now() client IDs are
  session-unique; merge key is ID not date)
- Test Mode date preference: validate with multiple real users and
  real dated meetings before implementing any changes

---

## Sprint 5 — UX Architecture (Agenda/Decision)

- UX-2B: Rich text editing UX review — identify which surfaces should
  convert to inline Save/Cancel vs keep modal/draft boundaries
- UX-3A: Agenda/Decision architecture review — Agenda Item as parent
  object for discussion notes, one primary Decision/Action outcome,
  covered/completed state, cascade-needed marker, promote-to-Strategic-Topic
- UX-3B: Agenda/Decision implementation + first-class autosave

---

## Deferred / Future Phases

These items are acknowledged and intentionally deferred until beta
feedback justifies prioritization:

- Viewer UI enforcement (RLS supports viewer reads; polished read-only
  UI not yet implemented)
- Last Save Wins concurrency / conflict UI
- Local Mode full decommission (currently labeled legacy)
- Ownership transfer
- Realtime collaboration, presence, locks, CRDTs
- Multiple outcomes/actions per Agenda Item
- Legacy decisionItems one-time migration tooling
- Transactional Promote to Strategic Topic RPC
- Organizations / workspace administration model
- Mobile-first responsive pass

---

## Completed

- Phase 3: Shared Access (owner/editor model, invite flow, member
  management, RLS hardening, profiles)
- Phase 4: Structured Persistence (autosave for Settings, Strategic
  Topics, Topic Notes, Meeting Notes, Cascading Communications,
  Defining Objectives, Tasks, SOOs, Agenda Items)
- Forgot Password / reset-password route (PR #110)
- Documentation Refresh (PR #113)
- Meeting State follow-up UX (PR #109)
- Main Readiness Review
- Merge phase-3-shared-access → main (Team Beta launch 2026-06-10)
