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
