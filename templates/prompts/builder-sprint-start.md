# Builder Sprint Start Prompt

You are executing Sprint {{SPRINT_NUMBER}} - {{SPRINT_NAME}}.

Planning folder:

`{{PLANNING_FOLDER}}`

Implementation repo:

`{{IMPLEMENTATION_REPO}}`

Active sprint folder:

`planning/sprints/{{SPRINT_FOLDER}}/`

Architect Pack location:

`planning/architect-packs/`

---

## Architect Pack Rule

Use `planning/architect-packs/` to find, dry-run, and apply Architect Packs from the project root.

Example dry-run:

`node scripts/apply-architect-pack.js planning/architect-packs/architect-pack-###-{sprint-name}.md --dry-run`

Example apply:

`node scripts/apply-architect-pack.js planning/architect-packs/architect-pack-###-{sprint-name}.md`

After the pack is applied, implement from the generated sprint files under `planning/sprints/`, not directly from the Architect Pack.

## Read These Files First

1. `AGENTS.md`
2. `README.md`
3. `planning/STATE.md`
4. `planning/DECISIONS.md`
5. `planning/DOMAIN.md`
6. `planning/RISKS.md`
7. `planning/QUESTIONS.md`
8. `planning/sprints/{{SPRINT_FOLDER}}/requirements.md`
9. `planning/sprints/{{SPRINT_FOLDER}}/blueprint.md`
10. `planning/sprints/{{SPRINT_FOLDER}}/acceptance.md`
11. `planning/sprints/{{SPRINT_FOLDER}}/handoff-prompt.md`
12. Relevant docs under `docs/`

---

## Before Making Changes

Summarize:

1. what this sprint is supposed to accomplish
2. files you expect to modify
3. implementation approach
4. validation you will run
5. blockers or ambiguities

Do not start implementation until I approve your summary.

---

## Execution Rules

- Build only the approved sprint.
- Do not redefine scope.
- Do not invent business rules.
- Do not skip acceptance criteria.
- Preserve existing user changes.
- Do not delete user files.
- Do not store secrets, API keys, passwords, tokens, or private credentials.
- Update `planning/STATE.md` at the end of meaningful work.
- Record durable decisions in `planning/DECISIONS.md`.
- Update `planning/RISKS.md` and `planning/QUESTIONS.md` when new risks or open questions appear.
- Update docs and validation notes when behavior changes.

---

## Completion Report

When finished, report:

1. files created
2. files modified
3. tests/checks/validation run
4. whether current behavior is preserved
5. acceptance criteria complete/incomplete
6. risks or open questions
7. recommended next sprint, if clear

As the final close-out step, write or refresh `planning/ARCHITECT_BRIEFING.md` per `docs/ARCHITECT_BRIEFING_SPEC.md` — a bounded current-state snapshot (not a log) the Architect reads at the next sprint start. Never include source code, secrets, or credentials.
