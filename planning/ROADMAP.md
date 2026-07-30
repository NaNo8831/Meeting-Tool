# Roadmap

Produced by an onboarding session on 2026-07-18. Candidate sprints, ranked.
Each is small, reversible, and gated by human review before merge.

## Context that shaped this ranking

The Project Lead's stated goal is **consistency between two local machines and
the git repo**, and bringing the project onto the 120x method for ongoing
maintenance. Nothing is actively painful in the product today.

Constraints that apply to every sprint below:

- `main` is live on Vercel and in real use by 2–3 people. Nobody works on
  `main` directly. All work: feature branch → `dev` → PR → `main`.
- The existing hand-maintained planning set (`STATE.md`, `DECISIONS.md`,
  `DOMAIN.md`, `QUESTIONS.md`, `RISKS.md`, `docs/*`) is real, current, and
  actively used. It is migrated onto the method, never overwritten blind.
- No automated test suite and no CI exist. `npm run lint` is the whole safety
  net. This raises the risk of every sprint and is why Sprint 3 exists.

---

## Sprint 1 — Line-ending normalization

**Why it matters.** This is the stated problem, diagnosed. Every source file is
committed with LF, but the working tree holds CRLF, and there is no
`.gitattributes` and no `core.autocrlf` setting. Git therefore reports 134
files and ~35,000 changed lines that contain no actual change. One real change
(`package-lock.json`) is currently buried in that noise.

Left alone this gets worse: the two machines will keep fighting, every diff
and PR review becomes unreadable, and whoever commits the churn first destroys
`git blame` across the entire codebase.

**Shape of the work.** Add `.gitattributes` pinning the repo to `* text=auto
eol=lf`. Discard the current whitespace-only working tree churn. Land the one
genuine `package-lock.json` change separately so it is reviewable. Then a
single, isolated renormalization commit if any files still differ. Align
editor and git config on **both** machines so it does not recur.

**Size.** Small — under a day. **Risk.** Low to the running app (no runtime
code changes), but the sequencing matters and it touches every file, so it
ships as its own PR with nothing else in it.

**Open question for the Architect.** Which machine produces CRLF, and is it a
Windows checkout or an editor setting? Fixing the repo without fixing the
source of the churn only buys a few days.

---

## Sprint 2 — Consolidate planning onto the 120x method

**Why it matters.** The project already runs a disciplined method by hand —
`STATE.md` is the most-edited file in the repo, ahead of any source file, with
110 commits in three months. The goal is to bring that onto 120x without
losing any of it, so there is one system rather than two overlapping ones.

**Shape of the work.** Map existing files to their method equivalents and
reconcile, rather than regenerate: `STATE.md` and `DECISIONS.md` stay as the
living record; produce `ARCHITECT_BRIEFING.md` as the sprint-to-sprint handoff
that 120x expects. Decide explicitly which of `AGENTS.md`'s operating rules
supersede or are superseded by the method, since both now describe how work
gets done and they must not contradict each other.

**Size.** Small–medium, documentation only, no runtime risk. **Risk.** Low,
but do it deliberately — the value here is *not* losing months of accumulated
decisions.

---

## Sprint 3 — Safety net around the meeting workspace

**Why it matters.** `app/components/meeting/MeetingWorkspace.tsx` is 4,368
lines and took 103 commits in three months. It is simultaneously the largest
and most frequently changed thing in the codebase, with no automated test
covering it, shipping to live users. Every change to it is currently verified
by hand or not at all.

This sprint comes before any refactor, not after.

**Shape of the work.** Add a test runner and a GitHub Actions workflow running
lint, `tsc --noEmit`, and tests on PRs into `dev` and `main`. Then
characterization tests over the meeting-critical flows already listed in
`AGENTS.md`: task workflow, rich text editing, structured autosave, Manual
Save, and export/import backup. The goal is to pin down current behaviour, not
to achieve coverage targets.

**Size.** Medium. **Risk.** Low to production — additive only. The main cost
is deciding on tooling.

---

## Sprint 4 — Decompose the meeting workspace

**Why it matters.** 4,368 lines in one component makes every change slower and
riskier than it needs to be, and it is where nearly all the work happens.

**Depends on Sprint 3.** Do not attempt this without the safety net in place.

**Shape of the work.** Extract cohesive sections into their own components
following the boundaries the existing `components/` structure already implies.
Several PRs, each small and independently revertible — never one big-bang
refactor. `planning/POST_BETA_BACKLOG.md` already records an SOO modal
extraction; fold that in here.

**Size.** Medium–large, spread across several sprints' worth of PRs.
**Risk.** Medium — this is the one that can break live meetings, which is
precisely why it is fourth and gated.

---

## Sprint 5 — Machine and environment parity

**Why it matters.** The line endings are the visible half of "two machines
disagree." The invisible half is everything else: Node version, npm version,
environment variables, and editor config. `package-lock.json` already shows
real drift.

**Shape of the work.** Pin the Node version (`.nvmrc` or `engines`). Document
required environment variables by name in the README — **names and purpose
only, never values**. Add shared editor config so formatting does not drift
again. Write down the setup steps for bringing a fresh machine online.

**Size.** Small. **Risk.** Low.

---

## Not recommended yet

- **Adding features.** Nothing is hurting; the product is in operational beta
  with real users. Stability and consistency first.
- **Schema or RLS changes.** The migration history shows these were done
  carefully and incrementally. No reason to disturb them.
- **Dependency upgrades.** Next 16.2.6 and React 19.2.4 are current. Revisit
  once CI exists to catch regressions.
