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
