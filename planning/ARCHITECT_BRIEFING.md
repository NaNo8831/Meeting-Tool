# Architect Briefing

Refreshed 2026-07-29 at the close of Sprint 3 (autosave resilience).

## Where things stand

Sprint 2 fixed the confirmed cause of the 2026-07-15 data-loss report (a
Supabase token that quietly expired mid-meeting). This sprint finished the
job the Sprint 2 audit called out: the app still had no safety net if a save
ever failed *for any reason*, and two specific rescue paths were unprotected.
Both are now fixed. Manual Save — the button people reach for specifically to
rescue their work — now retries a stale-token rejection once, the same way
the five autosave surfaces already did. And a page reload, which used to
silently overwrite the browser's cached copy of a meeting with whatever the
server had (even if that cache held edits the server never received), now
checks first: if the two differ in a way that matters, it saves the local
copy somewhere safe and offers it back through a small banner — without
slowing down or blocking the reload. Nothing is ever thrown away silently
anymore, and nothing is ever auto-restored either; a person always decides.

The code is written, and the automated checks (typecheck, build, lint) are
clean. What's left is the manual, hands-on-the-keyboard part: signing in and
actually clicking through Manual Save, forcing a save to fail, reloading, and
confirming the recovery banner gets the edit back. I don't have sign-in
credentials and I'm not able to enter a password even when offered one — so
that pass, plus the usual pre-merge Vercel preview check, is the one thing
still waiting on you before this reaches `dev`.

## Current status

- **Sprint:** Sprint 3 — Autosave Resilience (Rescue Paths). Code complete,
  docs written, not yet manually validated by a human.
- **Branch:** `fix/autosave-resilience`, cut from `dev`. Not yet committed,
  not yet pushed, not yet merged.
- **`dev` and `main` untouched.**
- Acceptance §1 (diagnosis, confirmed by re-reading the code during planning)
  holds. §5 (lint/tsc/build) passed. §2, §3, §6 (the sign-in-gated
  behavioral checks) and §8 (Vercel preview, Project Lead confirmation) are
  pending — see Validation / test status below.

## Since last sprint

Sprint 2 (autosave session expiry) is complete and sitting on `dev`,
validated, pending merge to `main` alongside Sprint 1. This sprint:

1. **Gap A — Manual Save retry** (`app/lib/supabaseClient.ts`,
   `app/hooks/useWorkspacePersistence.ts`,
   `app/components/meeting/MeetingWorkspace.tsx`). `saveWorkspaceData` now
   throws `SupabaseRequestError` instead of a plain `Error`, matching the
   five autosave write functions. `runAutosaveWrite` — the shared
   retry-once-on-expired-token helper Sprint 2 built — is now exported and
   reused (not duplicated) by Manual Save's call site. A 401 retries once
   against a renewed token; a 403 or anything else fails fast; a 401 during
   deliberate sign-out neither retries nor surfaces an error, matching the
   guard the five autosave surfaces already had.
2. **Gap B — reload recovery banner**
   (`app/components/meeting/MeetingWorkspace.tsx`). Before a cloud-meeting
   load overwrites the browser's cached copy, the nine
   `useLocalStorage`/`useObjectives`-mirrored keys are read straight from
   scoped `localStorage` (not React state, which can lag on first mount) and
   compared against the incoming server copy's signature, gated by a
   meaningful-difference check. A real difference is preserved in a new,
   distinctly-named per-workspace `recovery-snapshot` key the overwrite
   never touches, and a small dismissible banner offers to restore it —
   reusing the existing `applyWorkspaceBackupToState` restore path rather
   than building a new one. The load itself is never delayed or blocked.
3. **No "newer wins" anywhere.** This was the one thing explicitly forbidden
   during planning: no timestamp comparison, no automatic preference for
   "local" or "server," no suppressing the banner because it will fire
   often in ordinary multi-device use. The banner offers; a person decides.

## Architecture / file map

| File | Nature |
| --- | --- |
| `app/lib/supabaseClient.ts` | `saveWorkspaceData` converted to throw `SupabaseRequestError` (one line). |
| `app/hooks/useWorkspacePersistence.ts` | `runAutosaveWrite` exported for reuse; no behavior change. |
| `app/components/meeting/MeetingWorkspace.tsx` | Manual Save's write wrapped in `runAutosaveWrite`; sign-out guard added to its catch. New `readLocalMirroredWorkspaceSnapshot` helper, pre-overwrite diff check in `handleLoadCloudMeeting`, `recovery-snapshot` storage slot, restore/dismiss handlers, and the recovery banner in the render tree. |
| `planning/STATE.md`, `DECISIONS.md`, `RISKS.md`, `POST_BETA_BACKLOG.md` | Sprint 3 docs. |

No schema, migration, or RLS change. No `MeetingWorkspace.tsx` refactor
beyond these two call sites. No change to the five already-hardened autosave
surfaces, Backup/Restore, export/import, or the Manual Save button's visible
states.

## Decisions

Recorded in `planning/DECISIONS.md` (2026-07-29): Manual Save shares the
autosave retry pattern; a reload never silently discards a locally cached
copy that differs from the server, but neither rescue path decides which
copy is correct — no timestamps, no auto-restore, no suppressing the banner
for the expected multi-device case. That was considered and explicitly
rejected: Meeting Tool is shared, and "newer wins" would let a stale,
forgotten tab silently overwrite a teammate's current, deliberately saved
work — a new way to lose data, not a fix for this one.

## Risks / watch-items

- **Stale-tab / long-idle reconnection is still open.** The recovery banner
  will legitimately fire any time someone else saved this meeting since this
  browser last loaded it — that's expected, not a bug, but it means the
  banner could get noisy enough in ordinary multi-device use that people
  start ignoring it. That is evidence for the deferred reconciliation
  design (presence, or a smarter "worth showing" heuristic), not a reason to
  add "newer wins" logic now. Tracked in `planning/POST_MAIN_ROADMAP.md`,
  "Stale-tab / long-idle reconnection check," for a future Architect
  session.
- **Still no automated test suite and no CI.** Manual validation per
  `acceptance.md` is the whole safety net for both gaps closed this sprint.
- **The recovery-snapshot slot itself could go stale if a future change
  touches the same keys without going through this path.** It's scoped and
  cleared on both restore and dismiss, and recomputed fresh on every load,
  so it shouldn't drift — but it's a new piece of state to remember when
  touching `handleLoadCloudMeeting` again.

## Open questions for the Architect

1. **Is the recovery banner's frequency in ordinary multi-device use
   acceptable for the Team Beta, or does it need the smarter
   "worth-showing" heuristic sooner than expected?** Real usage data after
   this ships will answer this better than more design work would now.
2. **When should the stale-tab / long-idle reconciliation design happen?**
   This sprint made the failure mode safe (nothing is silently lost) but
   deliberately did not solve which copy should win when multiple editors
   are legitimately active. That's the deeper design work still ahead.

## Validation / test status

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Clean, exit 0. |
| `npm run build` | Succeeds. All 5 routes generated. |
| `npm run lint` | 5 errors, all in the untracked 120x `scripts/` folder — identical to Sprint 2, no regression, none in `app/`. |
| §1 diagnosis | Confirmed by re-reading the code during planning (2026-07-29); all file/line references verified current. |
| §2 Gap B reload/recovery reproduction | **Not run.** Requires Supabase sign-in; handed to the Project Lead. |
| §3 Gap A retry-on-401 | **Not run.** Requires Supabase sign-in; handed to the Project Lead. |
| §4 "nothing else changed" | Confirmed by diff review during implementation. |
| §5 flows (task/rich-text/Backup + sign-out/in) | **Not run.** Requires Supabase sign-in; handed to the Project Lead. |
| §6 end-to-end reproduction (the scenario that matters) | **Not run.** Requires Supabase sign-in; handed to the Project Lead. |
| §7 documentation | Confirmed — `STATE.md`, `DECISIONS.md`, `RISKS.md`, `POST_BETA_BACKLOG.md` all updated this sprint. |
| §8 Vercel preview / Project Lead confirmation | **Pending** — required gate before merge to `dev`. |

## Recommended next Architect action

None needed yet — this is a Project Lead action, not an Architect one: sign
in (locally at `http://localhost:3000`, already running, or on a Vercel
preview once pushed) and run through Manual Save, a forced-failure-then-
reload to see the recovery banner, and sign-out/in. Once that passes, merge
`fix/autosave-resilience` to `dev` alongside Sprint 1 and Sprint 2, which are
already validated and waiting.

After that, the open design question from this sprint — stale-tab /
long-idle reconciliation, i.e. which copy should win when multiple editors
are legitimately active — is the next thing worth an `/architect` session,
whenever real Team Beta usage makes it worth prioritizing over other
backlog items.
