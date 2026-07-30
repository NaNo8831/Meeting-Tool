# Architect Pack — Sprint 1: Line-Ending Normalization

Produced 2026-07-18. Apply with:

```bash
node scripts/apply-architect-pack.js planning/architect-packs/sprint-1-line-endings.md --dry-run
node scripts/apply-architect-pack.js planning/architect-packs/sprint-1-line-endings.md
```

============================================================
FILE: planning/sprints/sprint-1-line-endings/requirements.md
============================================================

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

============================================================
FILE: planning/sprints/sprint-1-line-endings/blueprint.md
============================================================

# Blueprint — Sprint 1: Line-Ending Normalization

Execute in order. Each step is independently verifiable. Stop and escalate if
any verification does not match.

## Step 0 — Confirm the starting state

Before changing anything, confirm the diagnosis still holds:

```bash
git rev-parse --abbrev-ref HEAD          # expect: dev
git status -sb | head -1                 # expect: ## dev...origin/dev (in sync)
git diff --name-only | wc -l             # expect: ~135
git diff --ignore-cr-at-eol --stat | tail -3   # expect: 1 file changed, package-lock.json
```

**If the second command shows more than `package-lock.json` has real content
changes, STOP.** Someone has done work in the tree since this pack was written.
Report what you found and wait for direction.

## Step 1 — Create the branch

```bash
git switch -c chore/line-ending-normalization
```

Cut from `dev`. All work lands here and merges back to `dev` via PR.

## Step 2 — Commit the package-lock change alone

Stage only `package-lock.json`. Nothing else.

```bash
git add package-lock.json
git status --short          # verify: exactly one staged file
```

Commit message:

```
Update package-lock.json — transitive dev dependency refresh

Patch bumps to transitive dev dependencies (Babel 7.29.x) plus six
added transitive helper/binary packages. No direct dependency changed;
package.json is unchanged. No runtime or user-facing impact.
```

Verify the commit contains exactly one file:

```bash
git show --stat HEAD
```

## Step 3 — Add .gitattributes

Create `.gitattributes` at the repository root with this content:

```
# Normalize all text files to LF in the repository.
# Git converts on commit; working-tree endings are the platform's business.
# Added 2026-07-18 to stop CRLF/LF churn between Linux and Windows/WSL
# development machines. See planning/sprints/sprint-1-line-endings/.
* text=auto eol=lf

# Explicitly binary — never touch these.
*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.ico binary
*.webp binary
*.woff binary
*.woff2 binary
*.ttf binary
*.eot binary
*.pdf binary
```

Commit it on its own:

```bash
git add .gitattributes
git commit -m "Add .gitattributes pinning repository to LF line endings

The repo had no .gitattributes and no core.autocrlf config, so a
Windows/WSL machine and a Linux machine disagreed about line endings on
every file, producing ~35,000 lines of phantom diff across 134 files.

Committed blobs are already LF, so no renormalization commit is needed
and git blame is fully preserved."
```

## Step 4 — Clear the phantom churn

**Do not use `git clean`.** It would delete the untracked 120x installation
(`.120x/`, `.claude/`, `scripts/`, `templates/`, `planning/ROADMAP.md`,
`planning/STATUS.json`) including the pack-apply script.

Restore tracked files only:

```bash
git restore .
```

Then verify:

```bash
git status --short | grep -v '^??'      # expect: no output
git status --short | grep '^??'          # expect: the 120x files, still present
ls .120x .claude scripts templates       # expect: all still there
```

**If any 120x directory is missing, STOP immediately and report.**

## Step 5 — Verify the fix holds

Confirm git now normalizes correctly:

```bash
git ls-files --eol | grep -v 'i/lf' | head    # expect: no text files with i/crlf
git status --short | grep -v '^??' | wc -l    # expect: 0
```

Then confirm the app is unaffected. No source file changed, so this is a
sanity check rather than a real risk:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Note the pre-existing lint error in `MeetingWorkspace.tsx` recorded in
`planning/POST_BETA_BACKLOG.md` — it is expected and is **not** in scope here.
Do not fix it.

## Step 6 — Write the Windows/WSL instructions

Create `docs/MACHINE_SETUP_LINE_ENDINGS.md` with the content specified in
`acceptance.md` §4. These are instructions for the Project Lead to run by hand
on the other machine; the Builder cannot reach it.

Commit:

```bash
git add docs/MACHINE_SETUP_LINE_ENDINGS.md
git commit -m "Document line-ending setup for the Windows/WSL machine"
```

## Step 7 — Update planning docs

Per `AGENTS.md`, docs update in the same PR.

- `planning/STATE.md` — add a short entry recording this sprint under Active
  Work, and note that `.gitattributes` now governs line endings.
- `planning/DECISIONS.md` — add one durable decision entry:
  *"Repository line endings are LF, enforced by `.gitattributes`. Working-tree
  endings are the platform's concern. Contributing machines set
  `core.autocrlf=input` (macOS/Linux/WSL) or `true` (native Windows)."*
- `planning/RISKS.md` — add a row: *"Development machines drift in Node/npm
  version and editor config. The line-ending fix addresses only one symptom.
  Mitigation: Sprint 5 (machine parity) on `planning/ROADMAP.md`."*

Do **not** edit `planning/ROADMAP.md`, `AGENTS.md`, or `CODEX.md` in this sprint.

## Step 8 — Open the PR

Push and open a PR into `dev`. The PR body must state: what changed, what was
deliberately not changed, and the verification performed. Per `AGENTS.md`,
merge only after the Project Lead validates.

## The code gate

Under the method, "code" is anything outside `planning/` and `docs/`.
`.gitattributes` qualifies; `docs/MACHINE_SETUP_LINE_ENDINGS.md` does not.

**Before creating `.gitattributes`, STOP and post your concrete file-by-file
plan, scope guards, and acceptance criteria to the Project Lead, then wait for
explicit approval.** Approval of this pack is not approval to write files.

============================================================
FILE: planning/sprints/sprint-1-line-endings/acceptance.md
============================================================

# Acceptance — Sprint 1: Line-Ending Normalization

The sprint is done when every item below is true and verified.

## 1. The package-lock change is landed cleanly

- [ ] A commit exists containing **exactly one file**, `package-lock.json`.
- [ ] `git show --stat <that commit>` shows `1 file changed`.
- [ ] No `npm install` / `npm update` was run. The committed lockfile is
      byte-identical to what was in the working tree at sprint start.

## 2. The repository enforces LF

- [ ] `.gitattributes` exists at the repository root containing
      `* text=auto eol=lf` plus the binary exclusions.
- [ ] It was committed **separately** from the lockfile change.
- [ ] `git ls-files --eol` reports no tracked text file with `i/crlf`.

## 3. The working tree is clean and nothing was destroyed

- [ ] `git status --short` shows **no modified tracked files**.
- [ ] All of `.120x/`, `.agents/`, `.claude/`, `scripts/`, `templates/`,
      `planning/ROADMAP.md`, `planning/STATUS.json` are **still present**.
- [ ] `git clean` was never run.
- [ ] **No commit in this sprint touches more than 3 files.** A commit
      touching 134 files means the wrong approach was taken — revert it.

## 4. The Windows/WSL machine has written instructions

`docs/MACHINE_SETUP_LINE_ENDINGS.md` exists and contains, at minimum:

- [ ] An explanation in plain English of what the problem was and why
      `.gitattributes` fixes it going forward.
- [ ] The git config command to run on the Windows/WSL machine:

      git config --global core.autocrlf input

  with a note that native-Windows checkouts (not WSL) may prefer `true`, and
  that `input` is correct when the working copy lives on a Linux filesystem.

- [ ] The re-clone procedure, since the Project Lead confirmed nothing on
      that machine needs saving:

      cd <parent directory>
      mv Meeting-Tool Meeting-Tool-old
      git clone git@github.com:NaNo8831/Meeting-Tool
      cd Meeting-Tool
      git switch dev

- [ ] A verification step to run **on that machine** after re-cloning:

      git status --short        # expect: empty
      git ls-files --eol | grep crlf   # expect: no output

- [ ] An explicit warning that `Meeting-Tool-old` should be deleted only
      after the Project Lead has confirmed the new clone is good.

## 5. Nothing user-facing changed

- [ ] `git diff dev...HEAD --stat` shows changes limited to:
      `package-lock.json`, `.gitattributes`,
      `docs/MACHINE_SETUP_LINE_ENDINGS.md`, and files under `planning/`.
- [ ] **Zero** files under `app/`, `data/`, or `supabase/` appear in the diff.
- [ ] `npm run lint`, `npx tsc --noEmit`, and `npm run build` behave exactly
      as they did before the sprint (the known pre-existing
      `MeetingWorkspace.tsx` lint error may still appear and is expected).

## 6. Docs are current

- [ ] `planning/STATE.md` records the sprint.
- [ ] `planning/DECISIONS.md` records the LF decision.
- [ ] `planning/RISKS.md` records the residual machine-drift risk.

## 7. Human verification (Project Lead, not the Builder)

These cannot be verified by the Builder and are the Project Lead's to confirm
before merge:

- [ ] On the **Linux** machine: `git status` is clean.
- [ ] On the **Windows/WSL** machine, after following the doc: `git status`
      is clean, and editing then reverting a file produces no phantom diff.
- [ ] The live app on `main` is untouched — this branch never went near it.

## Rollback

Every step is a separate commit and independently revertible. If
`.gitattributes` causes an unexpected problem, `git revert` that single commit;
no file contents were rewritten, so there is nothing else to undo.

============================================================
FILE: planning/sprints/sprint-1-line-endings/handoff-prompt.md
============================================================

# Builder Handoff — Sprint 1: Line-Ending Normalization

You are the Builder. Read these in order before doing anything:

1. `templates/method/120x-agent-identity.md`
2. `AGENTS.md`
3. `planning/sprints/sprint-1-line-endings/requirements.md`
4. `planning/sprints/sprint-1-line-endings/blueprint.md`
5. `planning/sprints/sprint-1-line-endings/acceptance.md`

## What this sprint is

The repo has no `.gitattributes`, and one of the two development machines is
Windows/WSL. Result: 135 files show as modified when only `package-lock.json`
actually changed. Fix the cause, clear the noise, preserve everything else.

## What makes this sprint unusual

**The committed blobs are already LF.** Only the on-disk copies are CRLF. So
this is *not* a renormalization job. No file contents get rewritten and
`git blame` stays fully intact.

**If you find yourself about to commit 134 files, you have taken the wrong
approach. Stop and escalate.** No commit in this sprint should touch more
than three files.

## The two ways to get this badly wrong

1. **Running `git clean -fd`.** The 120x method installation (`.120x/`,
   `.claude/`, `scripts/`, `templates/`, `planning/ROADMAP.md`,
   `planning/STATUS.json`) is currently **untracked**. `git clean` deletes all
   of it, including the script that applied this pack. Use `git restore`.
   Never `git clean`.

2. **Committing the churn.** Destroys `git blame` across the whole codebase,
   irreversibly. See above.

## The code gate — mandatory

`.gitattributes` lives outside `planning/` and `docs/`, so it is "code" under
the method's definition. **Before creating it, stop and post your concrete
file-by-file plan, your scope guards, and the acceptance criteria to the
Project Lead, then wait for explicit approval.** Approval of this pack is not
approval to write files.

## Scope guards — what you will NOT do

- No application code. Zero files under `app/`, `data/`, or `supabase/`.
- No schema, migration, RLS, auth, or persistence changes.
- No UI changes.
- No `npm install`, `npm update`, or `npm audit fix`. Commit the lockfile
  exactly as you found it.
- No `.nvmrc`, no `engines` field, no editor config, no CI. That is Sprint 5
  and Sprint 3 respectively — do not pull them forward.
- No fixing the known pre-existing `MeetingWorkspace.tsx` lint error.
- No decision about committing the untracked 120x scaffolding.
- No touching `main`.

## Definition of done

Every checkbox in `acceptance.md` §1–6 verified by you, with §7 handed to the
Project Lead. PR opened into `dev` — never `main` — with a body stating what
changed, what deliberately did not, and what you verified.

Then update `planning/STATUS.json` to `sprint-closed` and refresh
`planning/ARCHITECT_BRIEFING.md`, leading with a plain-English
"Where things stand".
