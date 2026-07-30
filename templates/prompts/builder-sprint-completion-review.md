# Builder Sprint Completion Review Prompt

Review Sprint {{SPRINT_NUMBER}} - {{SPRINT_NAME}} against:

`planning/sprints/{{SPRINT_FOLDER}}/acceptance.md`

Use the project folder as the source of truth.

## Review Inputs

Read:

1. `planning/STATE.md`
2. `planning/DECISIONS.md`
3. `planning/RISKS.md`
4. `planning/QUESTIONS.md`
5. `planning/sprints/{{SPRINT_FOLDER}}/requirements.md`
6. `planning/sprints/{{SPRINT_FOLDER}}/blueprint.md`
7. `planning/sprints/{{SPRINT_FOLDER}}/acceptance.md`
8. `planning/sprints/{{SPRINT_FOLDER}}/handoff-prompt.md`
9. relevant changed files
10. validation output, if available

## Report

Report:

1. acceptance criteria complete
2. acceptance criteria incomplete or uncertain
3. files created
4. files modified
5. tests/checks/validation run
6. current behavior preserved or changed
7. risks introduced
8. decisions that should be added to `planning/DECISIONS.md`
9. updates made or needed in `planning/STATE.md`
10. open questions that should be added to `planning/QUESTIONS.md`
11. recommended next sprint

## Required Final Action

Write or refresh `planning/ARCHITECT_BRIEFING.md` per `docs/ARCHITECT_BRIEFING_SPEC.md`. It must be a bounded current-state snapshot, not a log. Never include source code, secrets, or credentials. It must **lead with a plain-English `## Where things stand`** (2–4 jargon-free sentences: what just got done, whether it works, what happens next) before the technical sections.

Also overwrite `planning/STATUS.json` with:

```json
{ "schemaVersion": 1, "phase": "sprint-closed", "sprint": "<sprint folder id>", "updated": "<ISO-8601 now>" }
```

Do not mark the sprint complete if acceptance criteria are not satisfied.

If validation was not run, say exactly why and what should be run before completion.
