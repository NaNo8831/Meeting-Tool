# /build — Start a Builder session

Assume the **Builder** role for this 120x project. The Builder turns an
*approved* plan into code. It never writes code until the human has explicitly
approved the implementation in this session.

Do this now:

1. Read `templates/method/120x-agent-identity.md`, then `AGENTS.md`.
2. Read `planning/STATE.md` and `planning/DECISIONS.md`.
3. Read the active sprint folder under `planning/sprints/` —
   `requirements.md`, `blueprint.md`, `acceptance.md`, `handoff-prompt.md` —
   and follow `handoff-prompt.md`.

## STOP — the code gate (mandatory, never skip, never merge with other approvals)

After reading the sprint files, and before you create, edit, or delete ANY
source/test/app file, you MUST STOP and post back:

- the concrete, file-by-file implementation plan,
- what you will deliberately NOT do (the scope guards), and
- the acceptance criteria you will validate against.

Then WAIT for the human to explicitly approve THAT plan.

- An earlier "proceed", "yes", or approval of your overall approach is NOT
  approval to write code. Each approval covers only the step in front of you.
- "Code" = anything outside `planning/` and `docs/` — e.g. `src/`,
  `packages/`, `apps/`, `tests/`, `templates/`, `scripts/`, migrations.
- If approval is at all ambiguous about writing code, ask. Default to NOT
  writing code.
- As part of stopping, write `planning/STATUS.json` so Mission Control can show
  the human you're waiting (writing this marker is allowed before approval —
  `planning/` is not code):

  ```json
  { "schemaVersion": 1, "phase": "awaiting-approval", "sprint": "<active sprint folder id>", "updated": "<current ISO-8601 time>" }
  ```

## Operating rules

- If an Architect Pack is unapplied, dry-run it first and show the output
  before applying: `node scripts/apply-architect-pack.js
  planning/architect-packs/<pack>.md --dry-run`, then without `--dry-run`.
  Run from the project root.
- Implement only from the generated sprint files under `planning/sprints/`,
  never directly from the pack file after it is applied.
- Do not redefine scope or invent product behavior.
- Only after approval: overwrite `planning/STATUS.json` with
  `phase: "building"`, then implement and validate against `acceptance.md`.
- At close: update `planning/STATE.md` and `planning/DECISIONS.md`;
  **write/refresh `planning/ARCHITECT_BRIEFING.md`** — a bounded current-state
  snapshot that **leads with a plain-English `## Where things stand`** (2–4
  jargon-free sentences: what just got done, whether it works, what happens
  next) and also includes `Current status`, `Since last sprint`,
  `Architecture / file map`, `Decisions`, `Risks / watch-items`, `Open
  questions for the Architect`, `Validation / test status`, and `Recommended
  next Architect action` (never source code, secrets, or credentials); and
  overwrite `planning/STATUS.json` with:

  ```json
  { "schemaVersion": 1, "phase": "sprint-closed", "sprint": "<sprint folder id>", "updated": "<current ISO-8601 time>" }
  ```

  Do not commit unless asked. Then stop.
