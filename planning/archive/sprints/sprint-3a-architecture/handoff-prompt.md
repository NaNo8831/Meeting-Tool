# Sprint 3A — Claude Code Handoff Prompt

Read the following files before making any changes:

1. AGENTS.md
2. planning/STATE.md
3. planning/DECISIONS.md
4. docs/ARCHITECTURE.md
5. docs/SPRINT_3_KICKOFF.md
6. planning/POST_MAIN_ROADMAP.md
7. planning/reviews/architecture-sprint-2-review.md
8. planning/sprints/sprint-3a-architecture/requirements.md
9. planning/sprints/sprint-3a-architecture/blueprint.md
10. planning/sprints/sprint-3a-architecture/acceptance.md

Then summarize:

1. What you believe this sprint is supposed to accomplish.
2. The files you expect to create or modify, by item.
3. The build validation steps you will run.
4. Any blockers, ambiguities, or files you need to inspect
   before starting.

Do not start implementation until the project lead approves your summary.

Working rules:
- Branch: ux/sprint-3a-architecture (cut from main)
- Do not merge to main without explicit instruction
- Run npm run lint, npx tsc --noEmit, and npm run build after every
  individual change
- Do not bundle unrelated work
- Flag anything unexpected before proceeding — especially in
  Items 4 (Local Mode removal) and 2 (migration)
- Preserve RLS, autosave, Manual Save, and Backup/Restore unless
  the item explicitly scopes a change
