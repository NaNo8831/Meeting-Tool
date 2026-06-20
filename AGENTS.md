# Meeting Tool Operating Instructions

## Product Context
- Product: Meeting Tool by LyArk.
- Repository: Meeting-Tool.
- Purpose: lightweight operational leadership meeting tool for structured weekly leadership meetings.
- Primary use: help leadership teams track the current top priority, defining objectives, tasks, standard operating objectives, strategic topics, meeting items, decisions/actions, and cascading communication.
- Status: live/deployed operational beta on Vercel.
- Current persistence: browser `localStorage` with JSON export/import workspace backup.
- Phase 2 direction: Supabase is the likely cloud/auth/persistence platform, but schema and migration details are unresolved.

## First Files to Read
Before changing implementation, read:
1. `planning/STATE.md` for the current project snapshot.
2. `planning/DECISIONS.md` for durable operating decisions.
3. `planning/DOMAIN.md` for terminology and meeting model.
4. `planning/RISKS.md` and `planning/QUESTIONS.md` for known risks and unresolved items.
5. The active sprint files under `planning/sprints/` when the task is sprint-related.
6. Relevant docs under `docs/` for architecture, data model, validation, and permissions.

## Operating Rules
- Do not overbuild. Keep Phase 1 focused on operational usability, stability, and meeting-friendly UX.
- Avoid turning the product into a heavy project management system.
- Do not make broad product decisions without documenting assumptions and open questions.
- Preserve export/import backup capability even after cloud persistence is introduced.
- Meeting Setup is part of the current `main` baseline after PR #23; when working from other branches, verify branch contents before assuming it is present.
- Update `planning/STATE.md` when work changes current project state, active work, parked work, or next actions.
- Update `planning/DECISIONS.md` only when a durable product, architecture, branch, or operating decision is made.
- Keep planning and documentation concise, specific, and operational; remove generic AI advice.

## Branch Strategy
- `main` is production/stable and deploys to Vercel.
- `main` is the base for production UX stabilization and operational fixes.
- `phase-2-cloud` is the long-running branch for future cloud/auth/storage work.
- UX fixes should branch from `main`.
- Cloud/auth/storage work should branch from `phase-2-cloud`.
- Periodically merge `main` into `phase-2-cloud` to reduce drift.
- Confirm branch context before implementing; multiple Codex PRs can drift if branch purpose is unclear.

## Current Architecture
- Next.js app using TypeScript and Tailwind CSS.
- Vercel deployment.
- Browser `localStorage` persistence through app hooks and workspace backup utilities.
- JSON export/import backs up workspace data and should remain available.
- Major product areas include Meeting Setup, Playbook Definitions, Top Priority, Defining Objectives, Tasks, task details, comments, activity history, subtasks, Standard Operating Objectives, Strategic Topics, meeting sections, agenda items, decisions/actions, cascading communication, Backup/Restore, and lightweight RichTextEditor formatting.
- Supabase cloud/auth/persistence is planned for Phase 2; do not implement it unless the task explicitly targets Phase 2 cloud work on the correct branch.

## Testing Expectations
- For documentation-only changes, confirm the diff is docs/planning only; lint, typecheck, and build are not required unless implementation files changed.
- For app-code changes, run the relevant checks when practical:
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`
- Manually test meeting-critical flows after UI/data changes, including task workflow, task details, rich text editing, drag/drop interactions, meeting sections, and Backup/Restore.
- Use Vercel preview testing before merging user-facing changes.

## Do Not Overbuild
- Prefer small, reversible changes.
- Keep UI lightweight and usable during live meetings.
- Protect existing local workspace data.
- Flag assumptions rather than encoding uncertain Phase 2 behavior.
- Do not add production code, new frameworks, database schema, auth, or migrations as part of planning-only work.

---

## Docs Update With Every Merge to Dev

Any PR that changes behavior, data model, architecture, or user-facing functionality must update the relevant docs in the same PR. The definition of done includes:
- `STATE.md` reflects current status
- `DECISIONS.md` records any decisions made
- `ARCHITECTURE.md` and `DATA_MODEL.md` reflect structural or schema changes

A PR that changes how the app works but leaves docs stale is not complete.

---

## Working Process

Use this process for meaningful product, architecture, persistence, permission, or UX work:

1. **Review current state** — Read planning and handoff docs before proposing changes. Confirm the current branch, active roadmap, known risks, unresolved questions, and relevant architecture/permission notes. Identify whether the request is review/planning, implementation, hardening, documentation, or readiness work.

2. **Architecture Review PR** — For changes that affect schema, RLS, persistence, auth, ownership semantics, shared access, meeting lifecycle, or major UX patterns, create a documentation/planning review before implementation. State the recommendation, alternatives considered, risks, validation plan, and what remains out of scope. Do not change runtime behavior in the review PR.

3. **Implementation PR** — Implement the approved scope on a small branch. Stay aligned with the review decision and avoid adding adjacent feature work. Preserve compatibility and recovery paths unless the approved scope explicitly changes them.

4. **Manual Testing** — Test the meeting-critical flows affected by the change. For cloud/shared-access changes, test owner/editor behavior, refresh/reload behavior, and permission boundaries. For persistence changes, test hydration, structured autosave, Manual Save, and export/import backup.

5. **Merge** — Merge only after scope is validated and the PR body clearly reports what changed, what did not change, and what validation was performed. Prefer small, complete changes over large mixed branches.

6. **Update documentation/state** — Update `planning/STATE.md` when current focus, active work, parked work, or next actions change. Update `planning/DECISIONS.md` only for durable decisions. Update `planning/QUESTIONS.md` for unresolved questions.

## Do Not Bundle Unrelated Change Types

Do not bundle architecture changes, schema changes, RLS changes, persistence changes, UX redesign, and unrelated feature work into one PR. A PR should be easy to classify, review, test, and revert. If the work needs both an architecture decision and code changes, prefer a review/planning PR first, then a focused implementation PR.

## Recommended PR Types

- **Review/planning PR** — documents a recommendation, options, risks, and validation plan without runtime changes.
- **Implementation PR** — implements an approved, bounded product or architecture change.
- **Hardening PR** — tightens an existing feature (permission boundaries, error states, lifecycle edge cases, recovery paths).
- **Documentation PR** — updates handoff, state, architecture, validation, README, or planning docs without app-code changes.
- **Readiness Review PR** — evaluates whether a branch or feature set is ready for main, preview validation, or a broader merge.

## UI/UX Changes — Design Brief Required

Before implementing any change to layout, visual hierarchy,
or user interaction patterns:

1. Do not write any code
2. Read the design brief in the sprint artifacts
3. If no design brief exists, stop and ask the Architect
   to produce one before proceeding
4. A design brief must answer:
   - Every visual state the component can be in
   - What each element's single responsibility is
   - What is removed vs added vs changed
   - Responsive behavior on small screens
5. Implementation begins only after the Project Lead
   has approved the design brief

This rule exists because patching UI without a complete
picture produces compounding regressions. See the
sprint-pre-beta-header branch as the reference case.

## Red Flags

- Implementing schema and UI redesign in one PR.
- Changing RLS without a permissions review.
- Removing Manual Save.
- Replacing structured autosave with full JSON autosave.
- Changing ownership semantics.
- Deleting compatibility paths before backup/import validation.
- Treating Agenda Actions as project-management tasks with due dates.

## Preferred Prompt Pattern

```text
Context:
- Product/phase/branch background.
- Relevant prior PRs or decisions.

Goal:
- The specific outcome this PR should produce.

Read first:
- planning/STATE.md
- planning/DECISIONS.md
- planning/QUESTIONS.md
- Relevant docs/reviews/files for this task.

Scope:
- Files or product areas the agent may change.
- Whether this is review/planning, implementation, hardening, documentation, or readiness work.

Do not change:
- Explicit exclusions (app code, runtime behavior, schema, migrations, RLS, auth, persistence, UI, unrelated features).

Validation:
- Required commands or manual checks.
- For docs-only work, verify changed files are docs/planning only.
- For app-code work, run lint/typecheck/build when practical.

PR body should report:
- What was created or changed.
- What was intentionally not changed.
- Validation performed.
- Known follow-ups or unresolved questions.
```
