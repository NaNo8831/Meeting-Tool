# Builder Handoff — Sprint 3: Autosave Resilience (Rescue Paths)

You are the Builder. Read `templates/method/120x-agent-identity.md`, then
`AGENTS.md`, then the three sprint files in this folder: `requirements.md`,
`blueprint.md`, `acceptance.md`.

Implement **only** from these files. Do not implement from the Architect Pack.

## What this is

Sprint 2 fixed the confirmed cause of a real data-loss incident (Supabase
token expiry with no renewal). This sprint hardens the two rescue paths the
Sprint 2 audit found unprotected against *any* future write failure, not just
that one:

- **Gap A:** Manual Save has no retry and doesn't even distinguish an expired
  token from any other failure — unlike the five autosave surfaces, which got
  that treatment in Sprint 2.
- **Gap B:** a page reload overwrites the browser's cached copy of the
  workspace from the server with zero check for whether that cache holds
  content the server never received. This is the exact mechanism that made
  the 2026-07-15 loss permanent.

Both diagnoses were confirmed by reading the code during planning (2026-07-29)
— see `requirements.md` for exact file/line references. This is not a
hypothesis sprint like Sprint 2's Step 0; go straight to the code gate.

## Branch

Cut from `dev`. Suggested name: `fix/autosave-resilience`.
Never work on `main`. `main` is live and in real use.

## The code gate — mandatory

Before creating, editing, or deleting any file outside `planning/` and
`docs/`, **stop**. Post:

- your concrete file-by-file plan for both Step 1 and Step 2,
- the scope guards — what you will not do,
- the acceptance criteria you are working to.

Then wait for the Project Lead to explicitly approve *that plan*. Approval of
the overall approach is not approval to write code.

## The one thing that will be tempting and must not happen

**Do not make Gap B "smarter" by comparing timestamps or auto-preferring
whichever copy looks newer.** This was seriously considered during planning
and explicitly rejected: Meeting Tool is shared, and a stale tab left open on
another device could silently overwrite a teammate's current, deliberately
saved work if "newer" wins automatically. The fix in this sprint is strictly
**never silently discard, always ask** — not **guess correctly**. If partway
through implementation a timestamp comparison starts looking necessary to make
the banner behave well, stop and raise it at the code gate rather than adding
it. The real "which copy should win when more than one person is editing"
question is deliberately out of scope — it's logged in
`planning/POST_MAIN_ROADMAP.md` under "Stale-tab / long-idle reconnection
check" for a future Architect session.

## Two things most likely to go wrong

1. **Reusing the retry logic instead of copying it a sixth time.**
   `runAutosaveWrite` (`app/hooks/useWorkspacePersistence.ts:76`) isn't
   exported, and Manual Save's call site is in a different file
   (`MeetingWorkspace.tsx`). Export it or extract it to one shared location —
   don't write a near-duplicate. If that reuse turns out to require real
   restructuring, say so at the code gate rather than expanding the sprint.
2. **The Gap B banner firing constantly and getting ignored.** It's expected
   to appear in ordinary multi-device use, not just failure cases — that's
   fine and by design (see `blueprint.md`). Don't try to suppress it for that
   case; that's the deferred reconciliation work, not this sprint.

## Scope discipline

No timestamp-based "newer wins" logic. No realtime collaboration, presence,
or conflict resolution. No `MeetingWorkspace.tsx` refactor. No schema,
migration, or RLS changes. No change to the five already-hardened autosave
surfaces, Backup/Restore, export/import, or the Manual Save button's visible
states — only its internal failure handling changes.

## Validation

`npm run lint`, `npx tsc --noEmit`, `npm run build`, plus the manual
meeting-critical flows in `AGENTS.md`. Then acceptance §6 — force a write to
fail, reload without letting it recover, and confirm the recovery banner gets
the edit back. That is the scenario that matters; it is the same shape as the
2026-07-15 incident.

Validate on a Vercel preview before merge.

## Status markers

Write `planning/STATUS.json` as you go: `awaiting-approval` when you stop at
the code gate, `building` after approval, `sprint-closed` at close. Refresh
`planning/ARCHITECT_BRIEFING.md` at close, leading with a plain-English
`Where things stand` section, per `templates/method/120x-agent-identity.md`.
