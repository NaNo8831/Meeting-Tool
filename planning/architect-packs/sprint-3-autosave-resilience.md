# Architect Pack — Sprint 3: Autosave Resilience (Rescue Paths)

Produced 2026-07-29. Apply with:

```bash
node scripts/apply-architect-pack.js planning/architect-packs/sprint-3-autosave-resilience.md --dry-run
node scripts/apply-architect-pack.js planning/architect-packs/sprint-3-autosave-resilience.md
```

============================================================
FILE: planning/sprints/sprint-3-autosave-resilience/requirements.md
============================================================

# Sprint 3 — Autosave Resilience (Rescue Paths)

## Problem

Sprint 2 (`fix/autosave-session-expiry`, merged to `dev`) fixed the confirmed
cause of the 2026-07-15 data-loss report: the Supabase access token expired
after about an hour with nothing renewing it, so every autosave write silently
failed and the reload people used to clear the error discarded what they'd
typed. That fix is real and it removes the most common way a write can fail.

But the Sprint 2 audit (recorded in `planning/POST_BETA_BACKLOG.md` and
`planning/ARCHITECT_BRIEFING.md`) found that the app still has **no safety net
if a write ever fails, for any reason** — token expiry was just the first way
that happened to manifest. Two specific rescue paths are unprotected:

- **Gap A.** Manual Save — the action a user reaches for specifically to
  rescue their work — fails the same silent way an autosave write does.
- **Gap B.** A page reload rebuilds the workspace from the server and
  overwrites the browser's cached copy, with no check for whether that cached
  copy holds content the server never received. This is the exact mechanism
  that turned the 2026-07-15 failure into a *permanent* loss.

This sprint hardens both. It does not revisit Sprint 2's fix, and it does not
attempt to solve what happens when more than one person is editing the same
meeting at once — that is a separate, larger question this sprint surfaces
but explicitly defers (see Non-Goals and `planning/POST_MAIN_ROADMAP.md`,
"Stale-tab / long-idle reconnection check").

## Diagnosis — confirmed by reading the code on 2026-07-29, not a hypothesis

**Gap A — Manual Save has no retry and no failure detail.**

- `app/lib/supabaseClient.ts:1164-1196` (`saveWorkspaceData`, the REST call
  Manual Save makes) throws a plain `Error` built from `getRestErrorMessage`.
  This is the *old* error path. The five structured-autosave write functions
  (`saveMeetingSettings`, `saveAgendaItems`, `saveMeetingNotes`,
  `saveObjectives`/`saveTasks`, `saveStandardOperatingObjectives`,
  `saveStrategicTopics` — see the `createRequestError` call sites at lines
  1250, 1315, 1403, 1489, 1575, 1666, 1820) were converted in Sprint 2 to throw
  `SupabaseRequestError`, which carries the HTTP status so a caller can tell an
  expired token (401) apart from an RLS denial (403) apart from something
  else. `saveWorkspaceData` was never converted.
- `saveWorkspaceBackupToCloud` (`app/components/meeting/MeetingWorkspace.tsx:3147-3177`,
  the Manual Save call site) calls `supabaseMeetingClient.saveWorkspaceData(...)`
  directly with no retry wrapper of any kind. Compare this to the five autosave
  surfaces in `app/hooks/useWorkspacePersistence.ts`, which all route through
  `runAutosaveWrite` (lines 76-129): retry once on an expired token, fail fast
  and visibly on anything else.
- `isSigningOutRef` (`MeetingWorkspace.tsx:1288`) already exists in the same
  file Manual Save's call site lives in, so the retry helper's sign-out guard
  needs no new plumbing.

**Gap B — a reload silently destroys locally cached content the server never received.**

- Eight pieces of live workspace state — `meetings` (this is where Meeting
  Notes / dated meeting records live — the exact surface implicated in the
  2026-07-15 report), `activeMeetingId`, `dashboardTitle`, `organizationInfo`,
  `hasCompletedMeetingSetup`, `meetingSectionOrder`, `strategicTopicItems`, and
  `standardOperatingObjectives` — are all declared through `useLocalStorage`
  (`app/hooks/useLocalStorage.ts`, used at `MeetingWorkspace.tsx:1195-1241`;
  `objectives` gets the same treatment through `useObjectives` at line 1191).
  `useLocalStorage`'s second effect (`useLocalStorage.ts:41-44`) writes the
  current value to a workspace-scoped `localStorage` key on **every change** —
  this happens continuously as the user types, independently of and faster
  than the debounced Supabase autosave writes.
- `handleLoadCloudMeeting` (`MeetingWorkspace.tsx:2988-3106`), which runs on
  mount and whenever the route's meeting id changes, unconditionally calls
  `storeWorkspaceBackupInBrowser(backup, selectedMeetingId)` (line 3082) and
  then `applyWorkspaceBackupToState(backup, ...)` (line 3084) — both of which
  overwrite every one of those same keys with whatever the server returned.
  There is no comparison against what was already cached.
- Put together: **any edit that reached `localStorage` — which is every edit,
  since the mirror is continuous — but had not yet been successfully written
  to Supabase (still inside the debounce window, or rejected for any reason)
  is destroyed the instant the workspace reloads.** This is exactly what
  happened on 2026-07-15, and Sprint 2 only removed the token-expiry trigger
  for it. Any other write failure — a network blip, a future bug, a dropped
  connection — still ends the same way today.
- The reusable pieces already exist: `getWorkspaceStorageSignature` and
  `hasMeaningfulWorkspaceStorage` (`app/lib/workspaceBackup.ts:190-199`) for
  detecting a meaningful difference, and `applyWorkspaceBackupToState`
  (`MeetingWorkspace.tsx:2707+`) for re-applying a saved snapshot the same way
  Backup/Restore already does.

## Why this sprint, now

This is the recommended next Architect action from
`planning/ARCHITECT_BRIEFING.md`, written at the close of Sprint 2: the token
fix addressed the trigger, but the audit's real finding was that the
underlying fragility — no safety net when *any* write fails — is a separate,
deeper problem. The Project Lead confirmed hardening both rescue paths as the
priority over other backlog items (2026-07-29 planning session).

## Goals

1. Manual Save gets the same failure-awareness and retry-once behavior the
   five structured-autosave surfaces already have.
2. Before a cloud meeting load ever overwrites the browser's cached copy of a
   workspace, capture what was cached; if it differs meaningfully from what's
   about to load, preserve it somewhere the overwrite cannot reach and offer
   it back to the user — visibly, non-destructively, without blocking the load.
3. Change nothing else.

## Non-Goals — explicitly out of scope

- **No "local is newer, so prefer it automatically" logic.** This was
  seriously considered during planning and rejected. Meeting Tool is a shared
  tool — a teammate can open the same meeting from a different device or a
  tab left open for hours. Automatically preferring "newer" local content
  would let a stale, forgotten tab silently overwrite a teammate's current,
  deliberately saved work. That is a *new* way to lose data, not a fix for
  the one this sprint addresses. The safety net in this sprint never chooses
  for the user — it only guarantees nothing is silently thrown away.
- **No timestamp-based staleness detection, no presence, no realtime
  collaboration, no CRDTs, no change to Last Save Wins.** These remain the
  right long-term direction once multiple simultaneous editors are common, but
  they are a separate design problem — logged in
  `planning/POST_MAIN_ROADMAP.md` under "Stale-tab / long-idle reconnection
  check" for a future Architect session, not this one.
- **No `MeetingWorkspace.tsx` refactor.** Any touch to it stays small enough
  to read in one sitting.
- **No schema, migration, or RLS change.** This is a client-side change plus
  one function's error handling in `supabaseClient.ts`. No new tables.
- **No change to the five already-hardened autosave surfaces**, their
  debounce timing, or their per-surface status states.
- **No change to Backup/Restore, JSON export/import, or the existing Manual
  Save button UI** (Save / Saving... / Saved / Save failed). Only Manual
  Save's internal failure handling changes.
- **No UI redesign.** The one addition — a small recovery banner for Gap B —
  is narrow and dismissible, not a redesign of the load or save experience.

## Constraints

- `main` is live on Vercel and in real use. Feature branch cut from `dev` →
  merge to `dev`. Never work on `main`.
- Still no automated test suite. `npm run lint`, `npx tsc --noEmit`, and
  `npm run build`, plus manual testing, are the whole safety net.
- Per `AGENTS.md`, meeting-critical flows must be manually tested after any
  persistence change, including Manual Save and refresh/reload behavior
  specifically.

============================================================
FILE: planning/sprints/sprint-3-autosave-resilience/blueprint.md
============================================================

# Sprint 3 — Blueprint

## Step 1 — Manual Save: failure-aware and retried once (Gap A)

**Location:** `app/lib/supabaseClient.ts` (`saveWorkspaceData`, ~line
1164-1196) and `app/components/meeting/MeetingWorkspace.tsx`
(`saveWorkspaceBackupToCloud`, ~line 3147-3177).

1. Convert `saveWorkspaceData`'s failure path from
   `throw new Error(await getRestErrorMessage(response, "Workspace save"))` to
   `throw await createRequestError(response, "Workspace save")` — the same
   conversion already applied to the five autosave write functions. This is
   the whole change in `supabaseClient.ts`; do not touch `loadWorkspaceData`
   or any other function while you're in this file.
2. Wrap the `supabaseMeetingClient.saveWorkspaceData(...)` call inside
   `saveWorkspaceBackupToCloud` with the same retry-once-on-expired-token
   behavior `runAutosaveWrite` already provides
   (`app/hooks/useWorkspacePersistence.ts:76-129`). `runAutosaveWrite` is not
   currently exported and Manual Save's call site lives in a different file —
   export it (or extract the retry logic to one shared location both files
   import) rather than writing a sixth copy of the same retry pattern. Reuse
   the existing `isSigningOutRef` (`MeetingWorkspace.tsx:1288`) for the retry
   helper's sign-out guard, exactly as the five autosave surfaces do.

Requirements on the behavior, not a prescription of the code:

- Retry **only** on an expired-token rejection (401). An RLS denial (403) or
  any other failure still fails fast and visibly, exactly as today.
- Retry **exactly once**. No backoff loop, no retry queue.
- Respect deliberate sign-out: a 401 while `isSigningOutRef.current` is true
  is expected and must not retry or surface as an error.
- Log status, body, and remaining token lifetime on failure (reuse the
  existing `describeAutosaveFailure`-style diagnostics, or an equivalent) so
  any recurrence is diagnosable from the console, matching the autosave
  surfaces.
- The Manual Save button's visible states (Save / Saving... / Saved / Save
  failed, per `DECISIONS.md` 2026-06-19) do not change. Only what happens
  internally on a stale-token rejection changes.

## Step 2 — Reload safety net for cached-but-uncommitted local edits (Gap B)

**Location:** `app/components/meeting/MeetingWorkspace.tsx` —
`handleLoadCloudMeeting` (~line 2988-3106), the `useLocalStorage`-backed state
block (~line 1195-1241), and `storeWorkspaceBackupInBrowser` (~line 2693-2705).

**The mechanism, confirmed above:** eight pieces of workspace state mirror to
`localStorage` on every change via `useLocalStorage`. `handleLoadCloudMeeting`
overwrites those same keys from the server with no comparison. Fix the
overwrite, not the mirroring — the continuous local mirror is working as
intended and is exactly what makes a safety net possible.

Required behavior:

1. **Immediately before** `handleLoadCloudMeeting` calls
   `storeWorkspaceBackupInBrowser` / `applyWorkspaceBackupToState`, read what
   is currently cached in `localStorage` for this workspace (the same scoped
   keys those functions are about to overwrite).
2. Compare it to the incoming server backup using
   `getWorkspaceStorageSignature` (`app/lib/workspaceBackup.ts:197-199`).
   Use `hasMeaningfulWorkspaceStorage` (same file, line 190) as the bar for
   "worth caring about" — do not fire on a trivial or empty difference.
3. If they differ meaningfully, **preserve the pre-load local snapshot** in a
   distinct, clearly-named slot the overwrite does not touch (not the primary
   keys `storeWorkspaceBackupInBrowser` is about to write). Then let the load
   proceed exactly as it does today — the server copy still becomes the
   active state. **Do not block or delay the load.**
4. Surface a small, dismissible recovery banner (not a blocking modal) when a
   preserved snapshot exists, offering to review/restore it. Restoring
   re-applies that snapshot the same way Backup/Restore already does — reuse
   `applyWorkspaceBackupToState` or the existing restore path rather than
   building a second one. Dismissing clears the preserved snapshot without
   changing anything that already loaded.

**Explicitly forbidden shortcuts** (see Non-Goals — these were considered and
rejected during planning, not overlooked):

- Do not compare timestamps or infer which copy is "newer." A signature
  mismatch tells you the two differ — it does not tell you which one is
  right. Comparing timestamps has silent multi-editor failure modes (clock
  drift, and a stale tab's own clock is not evidence its content is correct).
- Do not auto-restore. The banner offers; the user decides.
- Do not suppress the banner in the multi-editor case. It will legitimately
  fire in ordinary multi-device use — any time someone else saved this
  meeting since this browser last loaded it, this browser's cache will differ
  from the server. That is expected and acceptable here, because the banner
  never blocks or loses anything; it is strictly a non-destructive offer.
  Making it smarter about *when* it's worth showing is the deferred
  reconciliation work in `planning/POST_MAIN_ROADMAP.md`.

## Step 3 — Documentation

- `planning/STATE.md` — record this sprint under Active Work: what Gap A/B
  were, what changed, what did not, validation performed.
- `planning/DECISIONS.md` — record the durable decision: Manual Save now
  shares the autosave retry pattern; a reload never silently discards a
  locally cached copy that differs from the server, but the two rescue paths
  do not attempt to determine which copy is correct — see Non-Goals.
- `planning/RISKS.md` — update or close the Gap A/B risk entry recorded at
  Sprint 2's close.
- `planning/POST_BETA_BACKLOG.md` — remove/close the "Autosave resilience
  sprint (Architect) — Gaps A & B" item under Persistence; it is this sprint.
- `planning/POST_MAIN_ROADMAP.md` already has the "Stale-tab / long-idle
  reconnection check" item under Collaboration and concurrency (added
  2026-07-29 during this sprint's planning) — no action needed unless this
  sprint's implementation surfaces something to add to it.

## Sequencing

Step 1 and Step 2 are independent — different files, different failure modes.
Commit them separately, as Sprint 2 did with its two steps, so either can be
reverted alone. Code gate before either.

## Risks

| Risk | Mitigation |
| --- | --- |
| The Gap B recovery banner fires constantly in normal multi-device use, training users to ignore it. | Acceptable for this sprint (see Non-Goals) — it is non-blocking and non-destructive. If beta usage shows it firing too often to be useful, that is evidence for the deferred reconciliation design, not a reason to add "newer wins" logic now. |
| Exporting/relocating `runAutosaveWrite` for reuse in Manual Save accidentally changes behavior for the five existing autosave surfaces. | Keep the extraction mechanical — same function, same signature, just made reachable from both files. If it turns out to need real restructuring, stop and raise it at the code gate rather than expanding the sprint. |
| The preserved-snapshot recovery slot itself could grow stale or leak across meetings if not scoped and cleared correctly. | Scope it per-workspace like every other cached key, and clear it on both restore and dismiss. |
| No automated tests exist to catch a regression in either path. | Manual validation per `acceptance.md`, including a real reproduction of the reload-after-failed-write scenario. |

============================================================
FILE: planning/sprints/sprint-3-autosave-resilience/acceptance.md
============================================================

# Sprint 3 — Acceptance Criteria

## 1. Manual Save retries a stale-token rejection (Gap A)

- [ ] `saveWorkspaceData` throws `SupabaseRequestError` (carrying HTTP status)
      instead of a plain `Error`, matching the five autosave write functions.
- [ ] A Manual Save rejected for an expired token (401) is retried once
      against a freshly renewed token and succeeds, with no error shown and
      no data lost.
- [ ] A Manual Save rejected for any other reason (RLS 403, validation error)
      still fails fast and visibly, exactly as before. It is not retried.
- [ ] A 401 during deliberate sign-out does not retry or surface as an error.
- [ ] The Manual Save button's visible states (Save / Saving... / Saved /
      Save failed) are unchanged.

## 2. A reload never silently discards a locally cached copy (Gap B)

- [ ] Reproduce the loss scenario directly: make an edit to a surface backed
      by `useLocalStorage` (e.g. Meeting Notes), prevent it from reaching
      Supabase (block the write, or simulate a rejection), then reload the
      page. Before this sprint, the edit is gone with no trace. After this
      sprint: the recovery banner appears, and restoring it recovers the
      edit.
- [ ] The comparison uses a meaningful-difference check
      (`hasMeaningfulWorkspaceStorage` / `getWorkspaceStorageSignature`) — a
      trivial or empty difference does not trigger the banner.
- [ ] When the cached copy and the server copy match, no banner appears and
      nothing about the load is different from today.
- [ ] The load itself is never blocked or delayed by this check — the server
      copy loads and becomes active exactly as fast as before, banner or not.
- [ ] Restoring the preserved snapshot re-applies it correctly and clears the
      recovery slot afterward.
- [ ] Dismissing the banner clears the recovery slot without altering the
      state that already loaded from the server.
- [ ] The recovery slot is scoped per workspace, the same way every other
      cached key is, and does not leak into a different meeting's load.

## 3. No "newer wins" behavior was introduced

- [ ] No code path compares timestamps to decide which copy to keep
      automatically. Confirm by reading the diff, not just by testing — this
      is a design constraint, not just a behavior to spot-check.
- [ ] The banner never restores automatically; it always requires an explicit
      user action.

## 4. Nothing else changed

- [ ] No files added under `supabase/`. No schema, migration, or RLS change.
- [ ] The five already-hardened autosave surfaces, their debounce timing, and
      their per-surface status states are unchanged.
- [ ] Backup/Restore and JSON export/import behave exactly as before.
- [ ] `MeetingWorkspace.tsx` was not refactored. Any change to it is
      incidental to the fix and small enough to read in one sitting.
- [ ] No test tooling, Vitest, or CI workflow was added.

## 5. Validation performed

- [ ] `npm run lint` — no new errors versus `dev`.
- [ ] `npx tsc --noEmit` — clean.
- [ ] `npm run build` — succeeds.
- [ ] Manual test of meeting-critical flows per `AGENTS.md`: task workflow,
      task details, rich text editing, Manual Save, Backup/Restore, and
      structured autosave across surfaces.
- [ ] Sign-out and sign-in still work correctly from both dashboard and
      workspace.

## 6. The scenario that matters

- [ ] With a workspace open, make an edit, force the underlying write to fail
      (any mechanism — simulate a rejected token, block the request, or
      reuse whatever method Sprint 2's validation used), then reload without
      waiting for a retry to succeed. Confirm the recovery banner appears and
      that restoring it recovers the edit with no data loss. This is the
      2026-07-15 failure, reproduced end-to-end with the safety net in place.

## 7. Documentation

- [ ] `STATE.md`, `DECISIONS.md`, `RISKS.md`, `POST_BETA_BACKLOG.md` updated
      per `blueprint.md` Step 3.

## 8. Project Lead confirmation

- [ ] Validated on a Vercel preview before merge, per `AGENTS.md`.
- [ ] `main` untouched by this branch.

============================================================
FILE: planning/sprints/sprint-3-autosave-resilience/handoff-prompt.md
============================================================

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
