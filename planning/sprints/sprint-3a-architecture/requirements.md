# Sprint 3A — Architecture and Cleanup
## Requirements

**Goal:** Reduce the structural debt that caused Sprint 2 regressions,
migrate Edit Playbook to cloud persistence, remove dead code and Local
Mode entirely, clean up the database migration history, and delete
stale transition docs.

**Why now:** MeetingWorkspace.tsx at ~6200 lines is the root cause of
most Sprint 2 regressions. Local Mode is decommissioned in product but
still present in code. Edit Playbook data is lost on a new device. Dead
code creates ESLint noise on every build.

**User story:** As a developer maintaining Meeting Tool, I can navigate
and modify the workspace codebase without fear of unintended regressions,
because the largest file is split into focused modules and dead code has
been removed.

**Scope:**
1. MeetingWorkspace.tsx split — extract MeetingHeader,
   useWorkspacePersistence, useWorkspaceMembers
2. Edit Playbook cloud persistence — migrate to meeting_settings
3. Dead code removal — four specific dead functions
4. Local Mode hard removal — complete elimination
5. SQL and schema cleanup — document migrations, flag orphans
6. Doc cleanup — delete stale transition docs

**Out of scope:**
- Any functional changes to autosave, Manual Save, Backup/Restore, or RLS
- Sprint 3B UX items
- client_meeting_id Date.now() fix (Sprint 4)
- Ownership transfer, Viewer UI enforcement, realtime collaboration
- Any merge to main

**Constraints:**
- Each MeetingWorkspace extraction must leave behavior 100% identical
- Build must pass after every individual change
- RLS, autosave, Manual Save, and Backup/Restore must be preserved
  unless explicitly in scope
- Do not merge to main without explicit instruction from project lead
