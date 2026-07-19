# Architect Briefing

Refreshed 2026-07-18 at the close of Sprint 1 (line-ending normalization).

## Where things stand

Your two computers were quietly disagreeing about an invisible character at the
end of every line of every file. That made git report 135 changed files when
really only one had changed — and the one real change was buried in the noise.
That is now fixed: the repository itself carries the rule, so it applies to both
machines and to anyone who joins later, and it will not drift back.

Nothing about the live app changed. No screen, no button, no data — the running
beta on `main` was never touched. The work is sitting on a branch waiting for
you to review and merge it into `dev`.

One thing still needs you: the **Windows/WSL machine has not been fixed yet**.
The repository is protected now, but that machine will keep producing the odd
line endings locally until you run the steps written up for you in
`docs/MACHINE_SETUP_LINE_ENDINGS.md`. It takes about five minutes.

## Current status

- **Sprint:** Sprint 1 — Line-Ending Normalization. Complete, awaiting review.
- **Branch:** `chore/line-ending-normalization`, cut from `dev`, 4 commits.
- **Not yet pushed.** No PR opened — the Builder stopped short of the remote,
  pending your go-ahead.
- **`main` untouched.** This branch never went near production.
- Acceptance criteria §1–§6 verified by the Builder. §7 is yours to confirm.

## Since last sprint

This was the first sprint run under the 120x method on this project.

1. `.gitattributes` added at the repo root, pinning the repository to
   `* text=auto eol=lf` with explicit binary exclusions.
2. The one genuine `package-lock.json` change landed as its own reviewable
   commit — transitive dev dependency patch bumps (Babel 7.29.x) and six added
   transitive helper/binary packages. No direct dependency changed;
   `package.json` is byte-identical. Nothing ships differently to users.
3. `docs/MACHINE_SETUP_LINE_ENDINGS.md` written for the second machine.
4. `STATE.md`, `DECISIONS.md`, and `RISKS.md` updated.

**Key finding that shaped the work:** the blobs already stored in git were
always LF. Only the on-disk copies were CRLF. So no file contents were
rewritten, no renormalization commit was needed, and `git blame` is fully
preserved. No commit in this sprint touched more than three files.

## Deviation from the pack — approved in session

The blueprint sequenced the lockfile commit *before* `.gitattributes`. That
order would have committed 6,818 carriage returns into history, burying the real
change and violating acceptance §2. The Builder verified this with
`git hash-object` rather than assuming it, flagged it at the code gate, and the
Project Lead approved reversing the order. `.gitattributes` landed first; the
lockfile then staged as a clean 685/452 diff.

Acceptance §2 requires only that the two be committed *separately*, not in a
given order, so the criteria are satisfied as written.

## Architecture / file map

No application architecture changed. Files touched:

| File | Nature |
| --- | --- |
| `.gitattributes` | New. Repository-wide line-ending policy. |
| `package-lock.json` | Dev-dependency refresh, committed as found. |
| `docs/MACHINE_SETUP_LINE_ENDINGS.md` | New. Second-machine setup guide. |
| `planning/STATE.md` | Sprint entry under Active Work. |
| `planning/DECISIONS.md` | Durable LF decision. |
| `planning/RISKS.md` | Residual machine-drift risk. |

Zero files under `app/`, `data/`, or `supabase/`.

## Decisions

Recorded in `planning/DECISIONS.md` (2026-07-18): repository line endings are
LF, enforced by `.gitattributes`. Working-tree endings are the platform's
concern. Contributing machines set `core.autocrlf=input` (macOS/Linux/WSL) or
`true` (native Windows).

Corollary worth preserving: **any future plan that involves committing hundreds
of files to "fix" line endings is wrong and must be rejected.** The correct fix
never rewrites file contents.

## Risks / watch-items

- **The Windows/WSL machine is not yet fixed.** Until the Project Lead follows
  `docs/MACHINE_SETUP_LINE_ENDINGS.md`, that machine still writes CRLF locally.
  The repository is protected either way, but the local experience there stays
  untidy.
- **Machine drift beyond line endings** — Node version, npm version, editor
  config — is now recorded in `RISKS.md` and is Sprint 5's scope. The lockfile
  churn was an early symptom.
- **Still no automated test suite and no CI.** `npm run lint` remains the whole
  safety net. This is the largest standing risk on the project and is Sprint 3.

## Open questions for the Architect

1. **Residual CRLF on disk (Linux machine).** `git restore .` cleared the
   phantom churn as git measures it — `git status` is clean and the index is
   100% LF — but the 135 files are still physically CRLF on disk. The restore
   was a no-op for them because, with `.gitattributes` active, git normalizes on
   comparison and sees them as unmodified. Acceptance §2 and §3 are met and the
   stated problem is solved, since git normalizes on staging from here on.
   Physically renormalizing the working tree is a separate, optional step. Worth
   doing for tidiness, or leave it?
2. **The expected `MeetingWorkspace.tsx` lint error did not appear.** The pack
   anticipated it. It is absent on both this branch and `dev`, so it appears to
   have been resolved earlier or the eslint config changed. The Builder did not
   investigate — out of scope. `planning/POST_BETA_BACKLOG.md` still lists it;
   that entry may be stale.
3. **`npm run lint` now reports 5 errors from the untracked 120x `scripts/`
   folder** (`require()`-style imports). Identical on `dev`, so not a
   regression from this sprint — but the 120x tooling is now tripping the
   project's own lint rules. Worth an eslint ignore entry, or leave it?
4. **The untracked 120x scaffolding is still uncommitted** (`.120x/`,
   `.agents/`, `.claude/`, `scripts/`, `templates/`, `planning/ROADMAP.md`,
   `planning/STATUS.json`, `planning/architect-packs/`, `planning/sprints/`).
   Explicitly out of scope for Sprint 1 and still an open decision.

## Validation / test status

| Check | Result |
| --- | --- |
| `npm run lint` | 5 errors, all in untracked 120x `scripts/`. **Identical on `dev`** — no regression. |
| `tsc --noEmit` | Clean, exit 0. |
| `next build` | Succeeds. All 5 routes generated. |
| Index CRLF (`i/crlf`) | 0 |
| Modified tracked files | none |
| 120x directories | all present; `git clean` never run |
| Largest commit | 3 files |
| Files under `app/`/`data/`/`supabase/` | 0 |

Acceptance §7 remains with the Project Lead: confirm clean `git status` on both
machines, confirm edit-then-revert produces no phantom diff on the Windows/WSL
machine, and confirm `main` is untouched.

## Recommended next Architect action

Merge order first: review and merge this branch into `dev`, then run the
Windows/WSL steps and confirm both machines are clean. That closes the problem
that started this whole engagement.

Then **Sprint 3 (safety net) before Sprint 2 (planning consolidation)** would be
the Builder's suggestion, contrary to the roadmap's current ranking. Sprint 2 is
documentation housekeeping with no user-visible payoff, while a 4,368-line
component that takes ~100 commits a quarter is shipping to live users with no
automated test behind it. Sprint 5 (machine parity) is small and directly
continues the work just finished, so it is also a reasonable immediate next
step. The Architect should decide.
