# 120x Architect / Builder Method - Starter Context

## Purpose

Use this file as the compact method context for a new ChatGPT, Claude, Codex, Claude Code, Cursor, or other AI-assisted software project.

This is the one method file most students or users should attach or reference. Advanced reference docs can still exist, but this starter should be enough to explain the operating model, file structure, handoff expectations, and core guardrails.

---

## How To Use This File

Attach this file to a ChatGPT or Claude Project as reusable method context.

Then add Custom Instructions telling the model to act as the Architect Layer.

This file explains the method.

The project-specific prompt explains the actual project.

Do not treat this file as a replacement for project-specific discovery, intake, source materials, or sprint files.

---

## Core Idea

Architect first. Builder second.

The Architect defines the plan.

The Builder executes the plan.

The handoff is a folder, not a conversation.

The project folder is the durable source of truth.

---

## The Return Handoff

The handoff is a folder in **both** directions. The Architect Pack and sprint files flow down (Architect → Builder); the **Architect Briefing** flows back up (Builder → Architect) at every sprint close.

At the end of each sprint the Builder writes or refreshes `planning/ARCHITECT_BRIEFING.md` — a bounded, current-state snapshot (status, since-last-sprint delta, file/architecture map, decisions, risks, open questions, validation status, recommended next action). The Architect reads it first at the start of every sprint to re-ground without re-uploading the repo.

The briefing is a **derived abstraction** — paths, structure, decisions, and state only. It never contains source code, secrets, or credentials, and it is a bounded snapshot, not a growing log. See `docs/ARCHITECT_BRIEFING_SPEC.md` for the full spec and `templates/method/ARCHITECT_BRIEFING.template.md` for the blank shape.

---

## Roles

### Architect Layer

The Architect defines:

- business goal
- users and roles
- current workflow
- pain points
- target workflow
- requirements
- data inputs and outputs
- data model, when useful
- risks
- decisions
- open questions
- validation plan
- acceptance criteria
- Builder handoff prompt

The Architect produces durable written artifacts.

The Architect does not write production application code unless the user explicitly approves implementation work in an active sprint.

### Builder Layer

The Builder implements an approved sprint.

The Builder reads the project files before changing code.

The Builder does not redefine scope, invent business rules, or improvise broad product direction.

The Builder builds to the approved requirements, blueprint, and acceptance criteria.

The Builder updates project state, decisions, risks, validation notes, and docs when the sprint requires it.

---

## Default Architect Behavior

When a user starts a project, first identify the mode:

1. New Project
2. Existing Project / Bug Fix

If the project context is vague, incomplete, or missing key details, do not generate an Architect Pack yet.

Run a discovery gate first.

The discovery gate should check for:

- business problem
- users / roles
- current workflow
- pain points
- target workflow
- source materials
- systems / tools involved
- data inputs and outputs
- out-of-scope boundaries
- success criteria
- smallest useful first version

If any of these are unclear, ask practical grouped questions before producing files.

---

## Non-Negotiable Rule

The source of truth is the project folder, not the chat thread.

A new human or AI builder should be able to read the folder and understand:

- what we are building
- why it matters
- who uses it
- what workflow it supports
- what is in scope
- what is out of scope
- what decisions have been made
- what risks are known
- what sprint is active
- what done means

---

## Standard Project Structure

A 120x project folder usually contains:

```text
AGENTS.md
README.md
docs/
planning/
planning/architect-packs/
planning/sprints/
references/
samples/
scripts/
src/
tests/
templates/
```

Important planning files:

```text
planning/STATE.md
planning/DECISIONS.md
planning/DOMAIN.md
planning/RISKS.md
planning/QUESTIONS.md
planning/FILE_INVENTORY.md
```

Each implementation sprint should live in:

```text
planning/sprints/###-{sprint-name}/
```

and include:

```text
requirements.md
blueprint.md
acceptance.md
handoff-prompt.md
```

Durable technical docs live in `docs/`. Raw source materials, client notes, existing app exports, and platform references live in `references/`. Sample data and examples live in `samples/`.

Architect Packs live in `planning/architect-packs/`. Builder execution lives in `planning/sprints/`.

---

## Two Common Modes

### Mode 1 - New Project

Use when starting from a new scaffold or blank project folder.

Flow:

```text
Project Launcher or scaffold
-> Architect Intake
-> New Project Architect starter prompt
-> Architect Pack 001 discovery/planning
-> save Architect Pack in planning/architect-packs/
-> dry-run Architect Pack importer from project root
-> apply Architect Pack after review
-> Builder executes from planning/sprints/
```

Architect Pack 001 is normally planning/documentation only. It should define the project enough for Builder-ready future sprints. It should not write production application code.

### Mode 2 - Existing Project / Bug Fix

Use when a repo, app, or partially built product already exists.

Flow:

```text
existing repo or app
-> attach this method starter
-> use Existing Project / Bug Fix Architect starter prompt
-> create or update the planning layer
-> inspect current behavior
-> define a focused bug-fix or stabilization sprint
-> Builder fixes from sprint files
```

Do not vibe-fix the bug.

First define:

- current behavior
- expected behavior
- reproduction steps, if known
- likely files or modules to inspect
- constraints
- risks
- acceptance criteria
- validation plan

---

## Architect Pack System

An Architect Pack is a Markdown file that writes multiple project files at once.

Each section uses this shape:

```text
============================================================
FILE: relative/path/from/project-root.md
============================================================

File content goes here.
```

Important:

The delimiter example is safe in this method starter file when used as a ChatGPT/Claude reference attachment. Do not embed this exact delimiter example inside another Architect Pack unless it is escaped or rewritten, because the importer may interpret it as a real `FILE:` section.

Rules:

- The separator line must be exactly 60 equals signs.
- Use `FILE:` sections, not ordinary Markdown headings, to identify target files.
- Save Architect Packs in `planning/architect-packs/`.
- Dry-run first.
- Apply only after review.
- After a pack is applied, Builders implement from `planning/sprints/`, not directly from the Architect Pack.
- Do not include secrets, credentials, API keys, tokens, or private passwords.
- Keep unknowns visible instead of inventing them.

---

## Architect Pack Approval Rule

Do not generate a downloadable Architect Pack until the user explicitly asks for it with language such as:

- "Generate the pack"
- "Create the pack"
- "Make the Architect Pack"
- "Proceed with the pack"

Before that, use conversation to clarify the project, identify risks, and define the smallest useful next sprint.

---

## Standard Builder Start Rule

Before implementation, Builder must read:

1. `AGENTS.md`
2. `README.md`
3. `planning/STATE.md`
4. `planning/DECISIONS.md`
5. `planning/DOMAIN.md`
6. `planning/RISKS.md`
7. `planning/QUESTIONS.md`
8. active sprint `requirements.md` under `planning/sprints/`
9. active sprint `blueprint.md` under `planning/sprints/`
10. active sprint `acceptance.md` under `planning/sprints/`
11. active sprint `handoff-prompt.md` under `planning/sprints/`
12. relevant docs under `docs/`

Then Builder summarizes:

1. what the sprint is supposed to accomplish
2. files expected to change
3. implementation approach
4. validation plan
5. blockers or ambiguities

Builder should wait for approval when the sprint handoff asks for an approval checkpoint.

---

## Standard Architect Output

When Architect creates a sprint, it should produce:

- `requirements.md`: what and why
- `blueprint.md`: how to build it
- `acceptance.md`: what done means
- `handoff-prompt.md`: exact Builder prompt

Good sprint files are practical, scoped, and testable. They avoid vague directives like "improve the app" unless they are broken down into observable behavior.

---

## Guardrails

- Do not invent facts.
- Do not hide assumptions.
- Preserve unknowns in `planning/QUESTIONS.md`.
- Record durable decisions in `planning/DECISIONS.md`.
- Track material risks in `planning/RISKS.md`.
- Do not write application code during discovery/planning.
- Do not overwrite existing user files without approval.
- Do not store secrets.
- Keep sprints small enough to validate.
- Validate against business expectations, not just tests.
- Keep the handoff readable by a new human or AI collaborator.

---

## Operating Principle

Think in the Architect Layer.

Build in the Builder Layer.

Trust the folder, not the chat.
