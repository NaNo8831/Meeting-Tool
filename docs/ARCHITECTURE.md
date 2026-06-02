# Architecture

## Current Stable Architecture
- Next.js + TypeScript + Tailwind app deployed on Vercel.
- Local Workspace remains browser `localStorage` based.
- Cloud Meeting full-workspace persistence uses manual save/load to `meetings.meeting_data` JSONB.
- Valid `/meeting/[id]` cloud routes run one narrow structured persistence pilot: hydrate `meeting_settings` after the full-workspace backup loads, then debounce settings-only autosave. `/meeting/local` never reads or writes this cloud pilot.
- Backup/Restore JSON export/import remains operational and must stay intact.
- Feedback remains separate from meeting persistence.
- Auth sign out returns to `/`.
- Tactical session history capture is available as an archival flow via `tactical_sessions` + `snapshot_json`, separate from runtime operational persistence.

## Persistence Direction Decision
Stop treating full-workspace JSONB autosave as the long-term architecture.

Reason:
- It is operationally fragile (change detection, race conditions, and large write payloads).
- It is a poor foundation for members, permissions, and realtime collaboration.

New direction:
- Structured persistence by section/item, with incremental rollout and strict backward safety via `meeting_data` backup.

## Manual Save During Autosave Migration
- Manual Save remains visible, available, and required during the structured autosave migration.
- PR #72 autosaves only `meeting_settings`; it does **not** autosave objectives, tasks, agenda items, Strategic Topics, meeting notes, Standard Operating Objectives, Defining Objectives, or other operational runtime state.
- Manual Save writes the full workspace backup to `meetings.meeting_data` and remains the cloud safety net until structured autosave reliably covers all important meeting data.
- Full-workspace JSONB autosave remains out of scope. Future structured autosave expansion should proceed surface-by-surface in separate PRs.
- Once structured autosave handles the core operational workspace reliably, evaluate retiring Manual Save from the primary workflow or moving it into a secondary backup/export utility role. Do not remove or demote Manual Save in PR #72.

## Local Workspace Support and Future Evaluation
- Local Workspace remains supported and browser-only during the current cloud persistence stabilization work.
- Do not remove Local Workspace in PR #72. It remains a fallback path while cloud persistence is being stabilized.
- After structured autosave covers all important meeting data and Phase 3 shared meeting access is stable, evaluate removing Local Workspace or demoting it to a developer/testing-only mode.
- Maintaining local and cloud as parallel meeting systems creates code duplication, testing burden, and user confusion. Shared meeting access will make cloud the primary product path, but that transition is a future decision rather than PR #72 scope.

## Target Persistence Architecture
### Data ownership layers
1. **Meeting container layer** (`meetings`)
2. **Membership/authorization layer** (`meeting_members`)
3. **Domain section/item layer** (`objectives`, `tasks`, `strategic_topics`, etc.)
4. **Session/history/rich text layer** (`tactical_sessions`, `strategic_topic_notes`, notes records)
5. **Safety snapshot layer** (`meetings.meeting_data` backup/export format)

### Recommended PR sequence (structured persistence)
1. **Planning + schema design PRs (docs only).**
2. **Table introduction PR(s) (non-breaking, no app read switch).**
3. **Scoped write-path PRs by feature area** (`meeting_settings` is the first narrow pilot; later surfaces remain separate).
4. **Scoped read-path hydration PRs by feature area** with regression validation.
5. **Backup-mode transition PR** where `meeting_data` becomes snapshot/export safety only.
6. **Permissions + member expansion PRs** after structured model is stable.

## Guardrails During Migration
- Do not break manual Save/Load behavior.
- Do not break export/import backup behavior.
- Do not remove `meeting_data` yet.
- Keep rollouts reversible and feature-scoped.
- Keep tactical history snapshots archival-first; do not couple them to realtime or full runtime persistence migration.
- Do not reintroduce full-workspace JSONB autosave. The `meeting_settings` pilot reads and writes only dashboard/playbook-level settings; all other runtime reads remain on the existing workspace backup path.
- Keep structured clients keyed by `meeting_id` and let database RLS enforce access so later `meeting_members` owner/editor/viewer expansion does not require owner-only assumptions in feature code.
- Keep `meetings.name` as the cloud container/dashboard name and `meeting_settings.dashboard_title` as the distinct in-workspace/playbook title; they may initially match but should not be collapsed during this pilot.
- Report settings autosave status separately from the Manual Save full-workspace backup state so non-pilot edits are never presented as autosaved.


## Strategic Topic lifecycle (current runtime behavior)
- Lifecycle state is managed in existing Strategic Topic runtime items with `active`, `completed`, and `archived`.
- Archive behavior is confirmation-gated and non-destructive; it does not hard delete topic rows/items.
- Topic-attached Notes remain queryable via `strategic_topic_notes` because topic identity is preserved.
- No realtime/collaborative editing was introduced in this lifecycle slice.
