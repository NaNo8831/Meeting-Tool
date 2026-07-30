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
