# AI Agent Workflow

This repository works best when AI agents treat the product as a live operational beta and use small, reviewable branches. Phase 3 shared access and Phase 4 structured persistence stabilized because architecture review, implementation, hardening, manual testing, merge, and documentation updates were kept separate instead of bundled into one large change.

## Working Process

Use this process for meaningful product, architecture, persistence, permission, or UX work:

1. **Review current state**
   - Read the planning and handoff docs before proposing changes.
   - Confirm the current branch, active roadmap, known risks, unresolved questions, and relevant architecture/permission notes.
   - Identify whether the request is review/planning, implementation, hardening, documentation, or readiness work.

2. **Architecture Review PR**
   - For changes that affect schema, RLS, persistence, auth, ownership semantics, shared access, meeting lifecycle, or major UX patterns, create a documentation/planning review before implementation.
   - State the recommendation, alternatives considered, risks, validation plan, and what should remain out of scope.
   - Do not change runtime behavior in the review PR.

3. **Implementation PR**
   - Implement the approved scope on a small branch.
   - Keep the implementation aligned with the review decision and avoid adding adjacent feature work.
   - Preserve compatibility and recovery paths unless the approved scope explicitly changes them.

4. **Manual Testing**
   - Test the meeting-critical flows affected by the change.
   - For cloud/shared-access changes, test owner/editor behavior, refresh/reload behavior, and permission boundaries.
   - For persistence changes, test hydration, structured autosave, Manual Save, export/import backup, and Local Mode behavior where relevant.

5. **Merge**
   - Merge only after the scope is validated and the PR body clearly reports what changed, what did not change, and what validation was performed.
   - Prefer merging small, complete changes instead of carrying a large mixed branch across multiple product areas.

6. **Update documentation/state**
   - Update `planning/STATE.md` when current focus, active work, parked work, next actions, or project state changes.
   - Update `planning/DECISIONS.md` only when a durable product, architecture, branch, or operating decision is made.
   - Update `planning/QUESTIONS.md` when unresolved questions are discovered, clarified, or retired.

## Do Not Bundle Unrelated Change Types

Do not bundle architecture changes, schema changes, RLS changes, persistence changes, UX redesign, and unrelated feature work into one PR.

A PR should be easy to classify, review, test, and revert. If the work needs both an architecture decision and code changes, prefer a review/planning PR first, then a focused implementation PR.

## Recommended PR Types

- **Review/planning PR** — documents a recommendation, options, risks, and validation plan without runtime changes.
- **Implementation PR** — implements an approved, bounded product or architecture change.
- **Hardening PR** — tightens an existing feature after initial implementation, such as permission boundaries, error states, lifecycle edge cases, or recovery paths.
- **Documentation PR** — updates handoff, state, architecture, validation, README, or planning docs without app-code changes.
- **Readiness Review PR** — evaluates whether a branch or feature set is ready for main, Vercel preview validation, or a broader merge.

## Expectations

- Read planning docs first: `planning/STATE.md`, `planning/DECISIONS.md`, `planning/DOMAIN.md`, `planning/RISKS.md`, and `planning/QUESTIONS.md`.
- Use small branches with a clear base branch and a clear PR type.
- Prefer review before implementation for architecture, schema, RLS, persistence, auth, ownership, or major UX changes.
- Preserve Manual Save and backup/import compatibility unless the user explicitly approves replacing those safety paths.
- Preserve RLS helper patterns such as meeting-scoped access/edit helper functions and role-aware policy separation.
- Preserve Local Mode unless the task explicitly changes Local Mode.
- Run `npm run lint`, `npx tsc --noEmit`, and `npm run build` for app-code PRs when practical.
- For docs-only PRs, verify changed files are docs/planning only.
- Update `planning/STATE.md` when current focus changes.
- Update `planning/DECISIONS.md` only for durable decisions.
- Update `planning/QUESTIONS.md` for unresolved questions.

## Red Flags

- Implementing schema and UI redesign in one PR.
- Changing RLS without a permissions review.
- Removing Manual Save.
- Removing Local Mode.
- Replacing structured autosave with full JSON autosave.
- Changing ownership semantics.
- Deleting compatibility paths before backup/import validation.
- Treating Agenda Actions as project-management tasks with due dates.

## Preferred Prompt Pattern

Use this skeleton when asking an AI agent to work in this repository:

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
- Explicit exclusions such as app code, runtime behavior, schema, migrations, RLS, auth, persistence, UI, or unrelated features.

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
