# Line-Ending Setup for the Windows/WSL Machine

Written 2026-07-18 as part of Sprint 1 (line-ending normalization).

This document is for the **Project Lead to run by hand** on the Windows/WSL
development machine. The Linux machine is already fixed and needs nothing.

---

## What the problem was

Text files end each line with an invisible marker. Linux and macOS use one
character (`LF`). Windows uses two (`CRLF`). Both are valid — they are just
different conventions.

This repository had no rule telling git which one to use, and no git
configuration on either machine to sort it out. So the Windows/WSL machine
wrote files one way, the Linux machine expected them the other way, and git
concluded that **every line of every file had changed**.

The result: `git status` reported 135 modified files when only **one**
(`package-lock.json`) had actually changed. That one real change was buried
under roughly 35,000 lines of noise that meant nothing.

## Why it is fixed now

A `.gitattributes` file was added at the repository root containing:

```
* text=auto eol=lf
```

This pins the rule to the repository itself rather than to any one machine.
From now on, git stores every text file with `LF` line endings no matter which
machine the commit came from. Whatever your working copy looks like on disk is
your platform's business — git normalizes it on the way in.

Because this rule lives in the repo, it applies to every machine and every
future contributor automatically. Nobody has to remember it.

**Good news about the history:** the files stored inside git were already `LF`
all along. Only the on-disk copies were `CRLF`. So nothing had to be rewritten,
and `git blame` is completely intact.

---

## What to do on the Windows/WSL machine

### Step 1 — Set the git config

Run this once:

```bash
git config --global core.autocrlf input
```

`input` means: convert `CRLF` to `LF` when committing, and leave files alone on
checkout. This is the correct setting when your working copy lives on a **Linux
filesystem**, which is the case for WSL (e.g. a path under `/home/...`).

> **If you are using a native Windows checkout** — not WSL, i.e. a real Windows
> path such as `C:\Users\...` opened by Windows tools — `true` is the better
> choice instead, because it also converts back to `CRLF` on checkout so Windows
> editors behave normally:
>
> ```bash
> git config --global core.autocrlf true
> ```
>
> When in doubt on WSL, use `input`.

With `.gitattributes` in place the repository setting wins regardless, so this
config is a belt-and-braces measure that also protects your *other* repos.

### Step 2 — Re-clone the repository

You confirmed there is no uncommitted work worth keeping on this machine, so
the cleanest fix is a fresh clone. The old copy is renamed rather than deleted,
so nothing is lost if something looks wrong.

```bash
cd <the folder that contains Meeting-Tool>
mv Meeting-Tool Meeting-Tool-old
git clone git@github.com:NaNo8831/Meeting-Tool
cd Meeting-Tool
git switch dev
```

### Step 3 — Verify it worked

Run both of these **on the Windows/WSL machine**, in the new clone:

```bash
git status --short
```

Expected: **empty output.** No modified files.

```bash
git ls-files --eol | grep crlf
```

Expected: **no output.** No file has `CRLF` endings.

A good extra check: open any file, make a small edit, save it, then undo the
edit and save again. `git status` should return to empty. If it instead shows
the file as modified, the line-ending conversion is still wrong — stop and
report it rather than committing.

### Step 4 — Clean up, but only once you are sure

⚠️ **Do not delete `Meeting-Tool-old` until you have confirmed the new clone is
good** — that means Step 3 passed and you have opened the project and seen it
working. The old folder is your safety net. Once you are satisfied:

```bash
rm -rf Meeting-Tool-old
```

---

## If the churn ever comes back

It should not. But if `git status` starts reporting large numbers of modified
files with no real changes again, check in this order:

1. `cat .gitattributes` — confirm the file is still present in the repo root.
2. `git config --get core.autocrlf` — confirm it returns `input` (or `true` on
   a native Windows checkout).
3. `git ls-files --eol | grep crlf` — identify which files disagree.

Check what git actually considers changed, ignoring line endings, with:

```bash
git diff --ignore-cr-at-eol --stat
```

If that reports far fewer files than `git status` does, the problem is line
endings again and not real edits.

---

## Related

- `planning/sprints/sprint-1-line-endings/` — the full sprint record.
- `planning/ROADMAP.md` Sprint 5 (machine and environment parity) — covers the
  remaining drift between the two machines: Node version, npm version, and
  editor configuration. Line endings were only the visible half of that problem.
