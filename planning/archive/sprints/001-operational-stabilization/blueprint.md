# Sprint 001 Blueprint

## File-by-File Plan
| File | Plan |
| --- | --- |
| `AGENTS.md` | Make canonical repo instructions covering product vision, operating rules, branch strategy, architecture, testing, and do-not-overbuild guidance. |
| `CODEX.md` | Point Codex to `AGENTS.md`, planning files, active sprint files, and branch-context warning. |
| `planning/STATE.md` | Capture current status, production state, active/parked work, and next actions. |
| `planning/DECISIONS.md` | Record durable decisions only. |
| `planning/DOMAIN.md` | Define business context, key terms, meeting flow, and intended roles. |
| `planning/RISKS.md` | Track concise risk table with mitigation notes. |
| `planning/QUESTIONS.md` | Track unresolved questions without answering uncertain items. |
| `planning/FILE_INVENTORY.md` | Track important repo files and external references. |
| `planning/sprints/001-operational-stabilization/*.md` | Capture requirements, implementation plan, acceptance criteria, and future builder handoff. |
| `docs/ARCHITECTURE.md` | Document current architecture and Phase 2 boundary. |
| `docs/DATA_MODEL.md` | Document current logical entities and unresolved cloud schema. |
| `docs/VALIDATION.md` | Document manual and command-based validation approach. |
| `docs/PERMISSIONS.md` | Document current no-auth state and future role planning. |

## Constraints
- No app-code changes.
- No behavior changes.
- No new project folder or source tree restructuring.
- Preserve existing project guidance when updating instructions.

## Validation Steps
1. Review `git diff --stat` and `git diff --name-only` to confirm documentation/planning-only changes.
2. Confirm all requested files exist.
3. Confirm no forbidden directories were created.
4. Skip lint/type/build unless implementation files changed.
