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
