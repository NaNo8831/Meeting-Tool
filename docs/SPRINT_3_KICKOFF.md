# Sprint 3 Kickoff

**Date:** 2026-06-11
**Branch:** main (cut new branch per task below)
**Status:** Sprint 2 merged to main. Sprint 3 is next.

---

## Project Context

Meeting Tool is a lightweight leadership meeting application built on:
- Next.js 14 (App Router)
- Supabase (auth, RLS, structured persistence)
- Tailwind CSS
- Vercel (deployment)

Production URL: https://meeting-tool.ypsicatholic.org
Repo: https://github.com/NaNo8831/Meeting-Tool

The app has just completed Sprint 2 (UX simplification) and is in
Team Beta. All Phase 3 and Phase 4 foundational work is on main.

---

## Working Style — Read This First

- Do not create new branches unless explicitly instructed
- Always commit with the existing repo git author identity
- Do not bundle unrelated work
- Before any major implementation write a planning note or review
- Preserve RLS, autosave, Manual Save, and Backup/Restore compatibility
  unless a task explicitly scopes a change
- Run npm run lint, npx tsc --noEmit, and npm run build after every
  code change
- Flag anything significant before implementing
- Do not merge to main without explicit instruction

---

## Key Docs to Read Before Starting

- planning/POST_MAIN_ROADMAP.md — full backlog source of truth
- planning/STATE.md — current project state
- planning/DECISIONS.md — all major decisions made
- docs/ARCHITECTURE.md — system architecture
- docs/DATA_MODEL.md — Supabase tables and persistence model
- docs/PERMISSIONS.md — RLS and role model
- planning/reviews/architecture-sprint-2-review.md — architectural
  findings from Sprint 2 that drive Sprint 3A scope
- planning/reviews/ux-sprint-2-post-implementation-review.md — UX
  findings that drive Sprint 3B scope

---

## Sprint 3A — Architecture and Cleanup

Branch: ux/sprint-3a-architecture
Cut off main before starting.

### Item 1 — MeetingWorkspace.tsx Split (HIGH PRIORITY — do first)
MeetingWorkspace.tsx is ~6200 lines and is the root cause of most
Sprint 2 regressions. Extract the following into separate files:
- MeetingHeader.tsx — sticky header, autosave chip, menu trigger,
  meeting name display, status badges
- useWorkspacePersistence.ts — all autosave effects and cloud API
  calls for structured persistence
- useWorkspaceMembers.ts — member loading, invitations, isMeetingOwner

Do not attempt a full refactor in one PR. Extract one slice at a time.
Each extraction must leave behavior 100% identical — no functional changes.
Run full build validation after each extraction.

### Item 2 — Edit Playbook Cloud Persistence
Edit Playbook currently writes to getWorkspaceScopedStorageKey(
"leadership-organization-info") which is localStorage-scoped per
workspace but not cloud-persisted. This means playbook data is lost
on a new device or browser.

Migrate Edit Playbook data to meeting_settings in Supabase:
- Add organization_info column to meeting_settings table (migration)
- Write Edit Playbook saves to meeting_settings.organization_info
- Read from meeting_settings on workspace load
- Keep localStorage as fallback for offline/transition
- Fix the inaccurate code comment in MeetingWorkspace.tsx

### Item 3 — Dead Code Removal
Remove the following dead code:
- handleOpenMembersModal function in MeetingWorkspace.tsx
  (ESLint warning on every build — function is never called)
- handleImportWorkspaceBackup in MeetingWorkspace.tsx
  (workspace import intentionally removed from UI in Sprint 2)
- collectLocalWorkspaceStorage function
  (dashboard export removed in Sprint 2, function no longer needed)
- handleImportBackupPlaceholder stub in dashboard/page.tsx

Document each removal with a one-line comment explaining why
it was removed before deleting.

### Item 4 — Local Mode Hard Removal
Remove Local Mode entirely from the application. This is a hard
remove — no migration path, no prompts, no fallback.

Scope of removal:
- /meeting/local route and page — delete entirely
- All Local Mode detection logic (isLocalMode, localModeRef, etc.)
- All localStorage fallback paths in MeetingWorkspace.tsx that
  exist solely for Local Mode
- Local Mode UI elements (labels, badges, menu items)
- onContinueLocally handler in AuthModal and landing page
- Any localStorage keys written exclusively for Local Mode
- Update docs to remove all Local Mode references

Do NOT remove:
- getWorkspaceScopedStorageKey — still used for cloud workspace
  localStorage scoping
- Manual Save / Backup / Restore — these remain
- Any localStorage reads/writes that serve cloud workspace sessions

Run full build validation after removal. This will likely touch
many files — proceed carefully and flag anything unexpected.

### Item 5 — SQL and Schema Cleanup
Review all files in supabase/migrations/:
- Identify any redundant, superseded, or legacy migrations
- Document what each migration does if not already clear
- Do not delete migration files — Supabase requires the full
  history to be present
- Flag any orphaned tables or columns for review
- Update docs/DATA_MODEL.md with any findings

### Item 6 — Doc Cleanup
Delete the following transition-specific docs that are no longer
needed post-main:
- docs/CLAUDE_CODE_START_HERE.md
- docs/CURRENT_PROJECT_STATUS.md
- docs/HANDOFF_TO_CLAUDE_CODE.md
- docs/CLAUDE_CHAT_HANDOFF.md
- docs/AUTH_EMAIL_SETUP.md

Consolidate docs/AI_AGENT_WORKFLOW.md useful content into
docs/CONTRIBUTING.md or docs/DEVELOPMENT.md, then delete
AI_AGENT_WORKFLOW.md.

---

## End of Sprint 3A — Review Pass

After all Sprint 3A items are complete:
1. Run a full UX and architecture review
2. Save findings to planning/reviews/architecture-sprint-3a-review.md
3. Update planning/POST_MAIN_ROADMAP.md Sprint 3B scope based on findings
4. Report back before any Sprint 3B work begins

---

## Sprint 3B — UX Refinements (scope to be confirmed after 3A review)

Seed items (subject to revision after 3A review):
- Auto-expand newly created agenda item
- Agenda item reorder (drag or up/down arrows)
- Delete button in expanded agenda item card
- Cascade label → "Cascade needed"
- Owner-only action audit
- Export Backup — confirm owner-only or editor-accessible
- Tactical History — confirm view-only for editors

---

## Known Architectural Debt (for reference)

- client_meeting_id uses Date.now() — collision risk across sessions
  (documented, Sprint 4 candidate)
- MeetingWorkspace.tsx split is Sprint 3A item 1
- Edit Playbook localStorage scoping is Sprint 3A item 2
- Last Save Wins concurrency — deferred post-beta
- Viewer UI enforcement — deferred post-beta
- Ownership transfer — deferred post-beta

---

## Post-Main Backlog (do not scope into Sprint 3)

See planning/POST_MAIN_ROADMAP.md for full list. Do not pull
post-main items into Sprint 3 without explicit instruction.
