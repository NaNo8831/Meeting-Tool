# Architecture

## Current Stable Architecture (No Behavior Change in This PR)
- Next.js + TypeScript + Tailwind app deployed on Vercel.
- Local Workspace remains browser `localStorage` based.
- Cloud Meeting persistence currently uses manual save/load to `meetings.meeting_data` JSONB.
- Backup/Restore JSON export/import remains operational and must stay intact.
- Feedback remains separate from meeting persistence.
- Auth sign out returns to `/`.

## Persistence Direction Decision
Stop treating full-workspace JSONB autosave as the long-term architecture.

Reason:
- It is operationally fragile (change detection, race conditions, and large write payloads).
- It is a poor foundation for members, permissions, and realtime collaboration.

New direction:
- Structured persistence by section/item, with incremental rollout and strict backward safety via `meeting_data` backup.

## Target Persistence Architecture
### Data ownership layers
1. **Meeting container layer** (`meetings`)
2. **Membership/authorization layer** (`meeting_members`)
3. **Domain section/item layer** (`objectives`, `tasks`, `strategic_topics`, etc.)
4. **Session/history/rich text layer** (`tactical_sessions`, `strategic_sessions`, notes records)
5. **Safety snapshot layer** (`meetings.meeting_data` backup/export format)

### Recommended PR sequence (structured persistence)
1. **Planning + schema design PRs (docs only).**
2. **Table introduction PR(s) (non-breaking, no app read switch).**
3. **Scoped write-path PRs by feature area** (e.g., tasks first, then strategic topics).
4. **Scoped read-path hydration PRs by feature area** with regression validation.
5. **Backup-mode transition PR** where `meeting_data` becomes snapshot/export safety only.
6. **Permissions + member expansion PRs** after structured model is stable.

## Guardrails During Migration
- Do not break manual Save/Load behavior.
- Do not break export/import backup behavior.
- Do not remove `meeting_data` yet.
- Keep rollouts reversible and feature-scoped.
