# Post-Main Roadmap

This document tracks all known post-main work organized by priority and sprint.
It is the source of truth for backlog sequencing. Update it as sprints complete
and new items are identified.

Last updated: 2026-07-29

---

## Sprint 1 — UX Polish ✅ Complete

Branch: ux/polish-sprint-1

### Completed
- Access/Members menu accessible from the meeting workspace dropdown menu
- Sticky top bar / autosave status visibility improvements
- Local Mode labeled as legacy/decommission-pending in UI

### Deferred out of Sprint 1
- Remove Save Notes button (deferred to Sprint 3 — pair with Close button move)
- Move Close button to bottom-right (pair with Save Notes removal)
- Session concurrency / two sessions open simultaneously
- Refresh hydration preference
- Test Mode date preference with multiple real users

---

## Sprint 2 — Simplification and UX Fixes ✅ Complete

Branch: ux/sprint-2-simplification (PR #119)

### Completed

**Agenda Item card redesign**
- Collapsed/expanded toggle with caret (▶/▼) on every card
- Default collapsed state for all items
- 2×2 grid layout in expanded state (title + right-justified controls / outcome + notes)
- `isCovered` auto-collapses via useEffect; unchecking does not auto-expand
- `key={item.id}` only — removed forbidden key-remount pattern
- Inline outcome preview and × delete button in collapsed state
- Card border/shadow in both collapsed and expanded states so both feel like one object
- Title bold in both states

**Backup/Restore split**
- Export Backup: workspace menu only (owner and editor accessible)
- Restore from Backup: dashboard menu only
- Restore creates a new cloud meeting, restores backup to localStorage, marks setup
  complete, and navigates directly into the new meeting
- Meeting name field with validation (blank disables file picker; unique name suffix
  logic appends `(2)`, `(3)`, etc. if name already exists)
- `BackupRestoreModal` gains `mode` prop (`both | export-only | import-only`)
  for context-specific copy and controls
- Import/Restore code preserved in workspace with comment; removed from workspace UI

**Edit Playbook**
- Removed from dashboard menu
- Added to workspace settings dropdown, owner-only (`isMeetingOwner` gate)
- Code comment added noting global localStorage scoping and Sprint 3 cloud migration plan

**Members auto-load**
- `useEffect` added to auto-load meeting members on workspace mount so `isMeetingOwner`
  resolves correctly without requiring the members modal to open

**Landing page**
- "Meeting Tool by LyArk" card and "Use without an account" link removed
- Auth modal is always open (`isOpen={true}`, `onClose` is a no-op)
- Modal is the sole entry point; no unauthenticated path via the landing page

**UX copy and auth**
- Supabase Auth badge removed from AuthModal
- "Minimum 6 characters." hint added to Sign Up password field
- Forgot password full confirmation state (icon + message + Back to Sign In)
- Delete meeting copy fixed: "permanently removes the archived meeting"
- "Backup needed" chip renamed to "Manual Save needed"
- Closed meeting workspace top-level banner added
- Local Mode demoted: banner prompting sign-in, "browser only" label

**BackupRestoreModal copy cleanup**
- Export modal: "Save a copy of this meeting to your device"
- Restore modal: "Create a new meeting from a saved backup file"
- Nested amber section header removed, padding reduced

**Create New Meeting**
- `getNextUniqueCreationName` applied to all meeting creation paths

**Reviews added**
- `planning/reviews/ux-sprint-2-post-implementation-review.md`
- `planning/reviews/architecture-sprint-2-review.md`

---

## Sprint 3 — Code Health, UX Polish, and Cloud Scoping

Informed by: `planning/reviews/architecture-sprint-2-review.md` and
`planning/reviews/ux-sprint-2-post-implementation-review.md`.

### High Priority — Code Health

- **MeetingWorkspace.tsx split** (High risk — ~6200 lines, regressions from adjacent
  changes are the biggest near-term delivery risk): Extract at minimum
  `MeetingHeader.tsx` (sticky header, autosave chip, menu trigger),
  `useWorkspacePersistence.ts` (all autosave effects and cloud API calls),
  `useWorkspaceMembers.ts` (member loading, invitations, ownership checks).
  Do not attempt a full refactor in one PR.

- **Edit Playbook cloud persistence migration**: The `leadership-organization-info`
  localStorage key is already per-workspace-scoped via `getWorkspaceScopedStorageKey`
  but is not cloud-persisted. Sprint 3 task: add `organization_info` column to
  `meeting_settings` (or confirm it exists), write through from the PlaybookDefinitionsModal,
  and load from cloud on workspace bootstrap. Update the code comment in
  `MeetingWorkspace.tsx` line 5247 to reflect actual scoping behavior.

- **Dashboard raw string localStorage key → shared utility**: `dashboard/page.tsx`
  constructs the scoped setup key manually:
  `` `meeting-tool-cloud-workspace:${meeting.id}:leadership-meeting-setup-completed` ``.
  Export `getWorkspaceScopedStorageKey` (or equivalent) and use it here instead.

- **`handleOpenMembersModal` dead code removal**: ESLint warning on every build.
  Remove or fold into the auto-load effect added in Sprint 2.

- **Workspace import function decision**: `handleImportWorkspaceBackup` preserved in
  `MeetingWorkspace.tsx` but not exposed in UI. Sprint 3: decide keep (and re-expose
  for disaster recovery inside a meeting) or delete entirely. If deleted, also remove
  the five associated cloud-restore helpers.

- **`collectLocalWorkspaceStorage` removal**: Dashboard export was removed in Sprint 2.
  This function is now dead code. Delete in Sprint 3 cleanup.

### High Priority — UX

- **`/meeting/local` route — gate or document**: Local Mode can still be reached by
  typing the URL directly even though the landing page no longer links to it. Either
  redirect unauthenticated access to sign-in, or document Local Mode as an intentional
  legacy path. Decide and implement before main merge.

- **Owner-only action audit**: Confirm all owner-only actions (End Meeting, rename,
  archive, delete, Edit Playbook, manage members) are either hidden or show a clear
  "owner only" message for editors. No raw RLS rejections visible to users.

- **Export Backup access — confirm owner-only or editor-accessible**: Currently
  accessible to all authenticated users in the workspace. Decide and enforce.

- **Tactical History — confirm view-only for editors**: Audit the Tactical History modal
  for owner-only vs. editor-safe actions. Gate End Meeting if it surfaces there.

- **Export Backup modal copy**: Currently says "Save a copy of this meeting to your
  device" — inaccurate, it exports the full workspace including all meetings and
  objectives. Change to "Save a full workspace backup to your device."

### Medium Priority — UX

- **Local Mode sign-in banner**: Confirm dismissible sign-in prompt is shown when
  in Local Mode with "Data saved in this browser only. Sign in to enable cloud sync."

- **Auto-expand newly created agenda item**: When a new agenda item is created, it
  should auto-expand so the user can immediately fill in details without an extra click.

- **Covered-state visual indicator on collapsed card**: A covered item looks identical
  to an uncovered collapsed item. Add a visual cue (checkmark badge, muted color,
  strikethrough title) when `isCovered` is true.

- **Delete button in expanded agenda item card**: Currently no delete affordance in
  expanded state — user must collapse first to see the × button.

- **Agenda item reorder**: Items are fixed-order with no drag-to-reorder or up/down
  controls. Add reorder support.

- **Cascade label → "Cascade needed"**: Current "Cascade" label is domain jargon.
  Rename for clarity.

### Lower Priority — UX

- **`+ Strategic Topic` button after promotion**: Disabled state shows "In Topics"
  with no click affordance. Consider hiding after promotion.

- **`handleImportBackupPlaceholder` stub removal**: Dead code in `dashboard/page.tsx`
  with a hidden file input and no UI trigger. Delete in Sprint 3.

- **Remove Save Notes button** (from Sprint 1 backlog): Pair with Close button move
  to bottom-right. Only when autosave is confirmed trusted by beta users.

- **Move Close button to bottom-right**: Pair with Save Notes removal.

- **Sticky header refinements** based on beta feedback.

---

## Sprint 4 — Session and Hydration

- Refresh hydration: opening a meeting should prefer the currently
  open/newly started meeting record rather than the last meeting
- Session concurrency: meeting open in two sessions simultaneously
  should surface a warning or force-close the older session
- Client meeting record ID divergence: date-dedup pass in
  mergeStructuredMeetingNotes to prevent duplicate records across
  browser sessions (root cause: Date.now() client IDs are
  session-unique; merge key is ID not date). Consider changing
  `createBlankMeeting()` to UUID or monotonic counter.
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
feedback justifies prioritization. Do not pull into active sprints
without a scoped requirement and explicit prioritization.

**Permissions and access:**
- Viewer UI enforcement (RLS supports viewer reads; polished read-only UI not yet implemented)
- Fine-grained per-surface Viewer permissions (define before Viewer is broadly exposed)
- Behavior when permissions change while a user is active in the workspace
- Auditable role change events before broad rollout
- Ownership transfer
- Organizations / workspace administration model (org container above meetings, org-level settings, org-scoped invitations)

**Collaboration and concurrency:**
- **Stale-tab / long-idle reconnection check — ESCALATED, next Architect
  session (flagged by Project Lead 2026-07-29).** Surfaced during Sprint 3
  autosave-resilience planning (2026-07-29) as a deferred design question:
  when a tab has been backgrounded or idle well beyond normal session
  length, or when a meeting has more than one active editor, the app has no
  mechanism to detect that the server has moved on and reconcile before the
  user keeps editing against a stale view. Sprint 3 shipped the safe-but-
  ambiguous version of this — a reload never silently discards a locally
  cached copy that differs from the server, but the recovery banner it shows
  has no timestamp and no way to tell the user which copy is actually
  correct, only that they differ. This was a deliberate scope boundary, not
  an oversight: comparing timestamps was considered and rejected during
  planning, because a displayed "newer" timestamp gets read as evidence of
  correctness even though it isn't — a stale, forgotten tab's clock is not
  evidence its content is right, and a teammate's deliberate save on another
  device can legitimately be "older" by the clock while being the correct
  copy.
  **Project Lead live-tested the banner on 2026-07-29 and flagged the
  resulting ambiguity as a trust/reliability risk to the product, not a
  cosmetic gap** — "users can not be questioning their data / saved work, it
  makes the tool unreliable and a risk not an asset." This moves the item
  from general backlog to the explicit next `/architect` session: design a
  real reconciliation mechanism (presence/concurrent-editor awareness,
  detect-and-refresh on wake, warn-and-reconcile, or equivalent) before Last
  Save Wins can be trusted at real multi-editor scale. Do not patch this as
  a quick timestamp addition to the existing banner without that design
  pass — see `planning/DECISIONS.md` (2026-07-29 Sprint 3 entry) for why a
  bare timestamp was rejected as worse than the current ambiguity.
- Last Save Wins concurrency / conflict UI
- Realtime collaboration, presence, locks, CRDTs
- Session concurrency: two sessions open simultaneously — warning or force-close
- Strategic topic note conflict resolution (local vs. cloud timestamp divergence)

**Invitations:**
- Invitation expiration (pending/accepted/revoked lifecycle is stable; expiry is post-beta)
- Auditable invitation events if Team Beta usage shows a need

**Autosave and persistence:**
- Remove Manual Save only after structured autosave coverage is complete and validated
- Refresh hydration to prefer the currently open/active meeting record
- Local Mode full decommission (currently labeled legacy)

**Agenda and meeting model:**
- Multiple outcomes/actions per Agenda Item
- Transactional Promote to Strategic Topic RPC (client-side sequential write is acceptable through beta)
- Legacy decisionItems one-time migration tooling

**UX and product:**
- Refine dense screens for faster in-meeting scanning (task and meeting sections)
- Improve microcopy consistency across setup, tasks, and cloud meeting actions
- Revisit drag/drop affordances and empty states after additional user testing
- Non-invasive keyboard/accessibility polish for live meeting speed
- Investigate and address dashboard/action button INP warnings
- Investigate Manual Save INP warnings (performance/autosave hardening pass)
- Meeting recap email summaries (decisions/actions and cascading communication; post-beta)
- Reusable workspace templates (recurring meeting structures and playbooks)

**Mobile:**
- Mobile-first responsive pass (navigation, editing, dense list patterns, touch ergonomics)

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
- Sprint 1 — UX Polish (ux/polish-sprint-1)
- Sprint 2 — Simplification and UX Fixes (ux/sprint-2-simplification, PR #119)
