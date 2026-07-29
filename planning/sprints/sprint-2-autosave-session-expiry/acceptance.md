# Sprint 2 — Acceptance Criteria

## 1. Diagnosis confirmed before fixing

- [ ] The cause was reproduced and reported with evidence (actual status code
      and error body) before any fix code was written.
- [ ] If the evidence contradicted the token-expiry hypothesis, the Builder
      stopped and escalated rather than proceeding.

## 2. Session stays valid while the tab is open

- [ ] With a workspace open and idle past the token lifetime, autosave still
      succeeds. No autosave error appears.
- [ ] Renewal is scheduled from `expiresAt`, not a hardcoded interval.
- [ ] Timers are cleared on unmount; navigating between dashboard and workspace
      repeatedly leaves no accumulating timers.
- [ ] A tab suspended past the token lifetime and then re-focused recovers
      without a manual page reload.
- [ ] A failed renewal does not sign out a user whose current token is still
      valid.
- [ ] No path fires two concurrent refreshes with the same refresh token.

## 3. No data loss on a rejected write

- [ ] A write rejected for a stale token is retried once against a fresh token
      and succeeds, with no error shown and no data lost.
- [ ] A non-auth failure (e.g. an RLS denial) still fails fast and visibly. It
      is not retried.
- [ ] A 401 during deliberate sign-out still does not surface as an error.
- [ ] If Step 2 was deferred, that was raised at the code gate and approved by
      the Project Lead — not decided silently.

## 4. Nothing else changed

- [ ] No files added under `supabase/`. No schema, migration, or RLS change.
- [ ] Manual Save, export/import, and Backup/Restore behave exactly as before.
- [ ] Autosave debounce intervals and per-surface status states are unchanged.
- [ ] No test tooling, Vitest, or CI workflow was added.
- [ ] `MeetingWorkspace.tsx` was not refactored. Any change to it is incidental
      to the fix and small enough to read in one sitting.
- [ ] No UI redesign. No new in-app notices.
- [ ] The three deferred feedback items were recorded, not implemented.

## 5. Validation performed

- [ ] `npm run lint` — no new errors versus `dev`. (Pre-existing errors from the
      untracked 120x `scripts/` folder do not count; report the comparison.)
- [ ] `npx tsc --noEmit` — clean.
- [ ] `npm run build` — succeeds.
- [ ] Manual test of meeting-critical flows per `AGENTS.md`: task workflow,
      task details, rich text editing, structured autosave across surfaces,
      Manual Save, and Backup/Restore.
- [ ] Sign-out and sign-in still work correctly from both dashboard and
      workspace.

## 6. The long-meeting test — the one that matters

- [ ] A workspace was held open past the full token lifetime with edits made
      *after* the original expiry point, and every edit persisted. Verified by
      reloading and confirming the data is there.

This is the criterion the beta user actually cares about. If it cannot be
demonstrated, the sprint is not done.

## 7. Documentation

- [ ] `STATE.md`, `DECISIONS.md`, `RISKS.md`, `POST_BETA_BACKLOG.md` updated.
- [ ] `planning/feedback/2026-07-18-feedback-report.md` written.

## 8. Project Lead confirmation

- [ ] Validated on a Vercel preview before merge, per `AGENTS.md`.
- [ ] The Project Lead confirms a real meeting-length session without an
      autosave error.
- [ ] `main` untouched by this branch.
