# Architecture

## Current Stable Architecture
- Next.js + TypeScript + Tailwind app deployed on Vercel.
- Local Workspace remains browser `localStorage` based.
- Cloud Meeting full-workspace persistence uses manual save/load to `meetings.meeting_data` JSONB.
- Valid `/meeting/[id]` cloud routes also run one narrow structured-write pilot: debounced `meeting_settings` autosave after the selected cloud meeting finishes loading. `/meeting/local` never writes this pilot to cloud.
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
- Do not reintroduce full-workspace JSONB autosave. The `meeting_settings` pilot writes only dashboard/playbook-level settings and leaves runtime reads on the existing workspace path.
- Keep structured clients keyed by `meeting_id` and let database RLS enforce access so later `meeting_members` owner/editor/viewer expansion does not require owner-only assumptions in feature code.
- Keep `meetings.name` as the cloud container/dashboard name and `meeting_settings.dashboard_title` as the distinct in-workspace/playbook title; they may initially match but should not be collapsed during this pilot.
- Report settings autosave status separately from the Manual Save full-workspace backup state so non-pilot edits are never presented as autosaved.


## Strategic Topic lifecycle (current runtime behavior)
- Lifecycle state is managed in existing Strategic Topic runtime items with `active`, `completed`, and `archived`.
- Archive behavior is confirmation-gated and non-destructive; it does not hard delete topic rows/items.
- Topic-attached Notes remain queryable via `strategic_topic_notes` because topic identity is preserved.
- No realtime/collaborative editing was introduced in this lifecycle slice.
