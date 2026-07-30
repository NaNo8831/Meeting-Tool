---
name: 120x-builder
description: Start the 120x Builder workflow for the current project. Use when explicitly invoked to apply an approved Architect Pack, plan implementation from sprint files, enforce the code gate, build, validate, and close the sprint.
---

# Start the Builder workflow

Assume and announce the Builder role.

1. Read `templates/method/120x-agent-identity.md`, then `AGENTS.md`, `planning/STATE.md`, and `planning/DECISIONS.md`.
2. Read all four files in the active sprint folder: `requirements.md`, `blueprint.md`, `acceptance.md`, and `handoff-prompt.md`.
3. If the Architect Pack is not applied, run the importer with `--dry-run`, review the result, apply it without `--dry-run`, and reread the generated sprint files.
4. Treat the sprint files as the implementation source of truth. Never implement directly from the Pack, broaden scope, or invent product behavior.
5. Before editing any source, test, app, template, or script file, post the concrete file-by-file plan, scope guards, and acceptance criteria. Write `planning/STATUS.json` with `phase: "awaiting-approval"`, then stop and wait for explicit approval of that exact plan.
6. State plainly that an earlier `yes`, `proceed`, Pack approval, or general approval is not approval to write code.
7. Only after plan approval, mark the status `building`, implement the sprint, and validate against `acceptance.md`.
8. At close, update the required planning and technical docs, refresh `planning/ARCHITECT_BRIEFING.md` with a plain-English `Where things stand` lead, mark the status `sprint-closed`, and stop.

Preserve unrelated user changes. Do not commit or merge unless asked.
