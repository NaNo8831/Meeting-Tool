# Sprint 1 — Line-Ending Normalization

## Problem

`git status` on the Linux machine reports 135 modified files. Only **one**
contains an actual content change (`package-lock.json`). The other 134 differ
solely by a carriage return at the end of every line.

Verified 2026-07-18 on branch `dev`:

```
git diff --name-only            → 135 files
git diff --ignore-cr-at-eol --stat → 1 file changed (package-lock.json)
```

Root cause: the repository has **no `.gitattributes`** and **no
`core.autocrlf` / `core.eol` git config** on either machine. One of the two
development machines is Windows/WSL (confirmed by the Project Lead), which
writes CRLF line endings. Nothing in the repo tells git to normalize them, so
the two machines silently disagree about every line of every file.

## Why this matters now

1. **A real change is buried.** The `package-lock.json` update is invisible
   inside 35,000 lines of phantom diff. Nobody would spot it in review.
2. **It compounds.** Every future diff and PR on this repo is unreadable
   until it is fixed.
3. **It threatens history.** If the CRLF churn is ever committed wholesale,
   `git blame` is destroyed across the entire codebase and is not recoverable.

## Important finding — history is NOT at risk if this is done correctly

The blobs stored in git are **already LF**. Only the on-disk working copies
are CRLF. This means:

- **No renormalization commit is required.** The repository content is
  already correct.
- **`git blame` is fully preserved.** No file contents are being rewritten.
- The work is: pin the rule going forward, discard the local churn, and stop
  the Windows/WSL machine from re-creating it.

Any plan that involves committing all 134 files is **wrong** and must be
rejected. If the Builder finds itself about to commit hundreds of files, stop
and escalate.

## Goals

1. Land the one genuine `package-lock.json` change as its own reviewable commit.
2. Add `.gitattributes` pinning the repository to LF, so the repo enforces
   its own line endings regardless of contributing machine.
3. Clear the phantom working-tree churn on the Linux machine.
4. Give the Project Lead exact, copy-pasteable instructions to fix the
   Windows/WSL machine so the churn does not return.
5. Verify a clean `git status` on both machines.

## Non-goals — explicitly out of scope

- **No application code changes.** No component, hook, route, or style edits.
- **No schema, migration, RLS, auth, or persistence changes.**
- **No UI changes.** Nothing a live user can perceive.
- **No dependency upgrades.** The `package-lock.json` change is committed
  *as it already exists* in the working tree. Do not run `npm install`,
  `npm update`, or `npm audit fix`.
- **No renormalization commit.** See the finding above.
- **No Node/npm version pinning, no `.nvmrc`, no editor config.** That is
  Sprint 5 (Machine and environment parity) on `planning/ROADMAP.md`. This
  sprint fixes line endings only. Do not let it grow.
- **No commit of the untracked 120x scaffolding.** See the hazard below.

## Context the Builder must know

### Hazard — untracked 120x files must survive

The following are currently **untracked** and are the live 120x method
installation:

```
.120x/  .agents/  .claude/  scripts/  templates/
planning/ROADMAP.md  planning/STATUS.json
```

`git clean -fd` would **delete all of it**, including the apply script the
Builder itself runs. Do not use `git clean` at any point in this sprint.
Restoring the working tree must be done with `git restore` / `git checkout --`,
which do not touch untracked files.

Whether to commit the 120x scaffolding is a separate decision and is **not**
part of this sprint.

### The `package-lock.json` change — reviewed and approved

Reviewed by the Architect on 2026-07-18. Contents:

- Patch bumps to transitive **dev** dependencies (Babel 7.29.0/7.29.3 → 7.29.7
  and similar).
- Six added packages, all transitive helpers or platform-specific binaries:
  `@unrs/resolver-binding-linux-loong64-gnu`,
  `@unrs/resolver-binding-linux-loong64-musl`,
  `@unrs/resolver-binding-openharmony-arm64`, `@emnapi/runtime`,
  `es-abstract-get`, `is-document.all`.
- Zero packages removed.
- `package.json` content is **byte-identical** — no direct dependency changed.
  It appears in `git status` only because of the CRLF churn.

Nothing that ships to end users changed. The Project Lead has approved
committing it as-is.

### Environment

- Branch: `dev` (integration branch), currently in sync with `origin/dev`.
- Remote: `origin` → `git@github.com:NaNo8831/Meeting-Tool`.
- `main` is production, live on Vercel, in real use. Not touched by this sprint.
- The Windows/WSL machine holds **no uncommitted work worth keeping**
  (confirmed by the Project Lead), so a fresh clone there is acceptable.
