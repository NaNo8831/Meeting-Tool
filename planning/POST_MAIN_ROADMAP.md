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

### UX Beta Review findings for Sprint 2 (from planning/reviews/ux-beta-review-2026-06-10.md)

High-priority copy and affordance fixes identified during Team Beta UX review:

- **Remove "Supabase Auth" badge** from AuthModal — leaks infrastructure detail
  to end users; replace with nothing or "Secure sign-in".
- **Remove developer copy from Account view** — "Workspace data still stays in
  this browser's localStorage. Auth does not sync…" is not user-facing copy;
  replace with "You're signed in. Your meetings are saved to the cloud."
- **Soft-delete honesty** — Delete meeting confirmation says "safely stored for
  recovery" but no recovery path exists in the UI; either surface recovery or
  change copy to "permanently removes the archived meeting from your dashboard."
- **Rename autosave chip "Backup needed" → "Manual Save needed"** — current
  label alarms users into thinking data is at risk; actual meaning is that
  Manual Save has not been run recently.
- **Closed meeting workspace banner** — when a meeting is ended, show a
  top-level banner: "This meeting has been ended. Notes are read-only. Start a
  new meeting for today's session." Currently only per-section notices exist.
- **Editor permission feedback audit** — verify all owner-only actions are
  hidden or show a clear "owner only" message for editors (not a raw RLS
  rejection); confirm whether End Meeting is available to editors and surface
  that consistently.
- **Local Mode legacy label copy** — "Legacy" is a developer term; replace
  badge tooltip or add help text: "Data saved in this browser only. Sign in to
  enable cloud sync." Add a dismissible banner prompting sign-in.
- **Sign Up password hint** — add "Minimum 6 characters." below the password
  field so users do not hit a surprise error on submission.
- **Forgot password confirmation state** — after submitting, replace the form
  with a full confirmation state (icon + message + "Back to Sign In" link)
  rather than an in-form green message only.
- **Terminology cleanup** — standardize across all surfaces: "Test Mode" (not
  "Testing Mode"), "Meeting date" (not "Action date"), "Members" (not
  "Access / Members"), "End Meeting" button consistent with modal copy; see
  full glossary in the review document.

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
