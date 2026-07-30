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
