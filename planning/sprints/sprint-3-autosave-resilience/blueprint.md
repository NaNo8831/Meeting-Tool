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
