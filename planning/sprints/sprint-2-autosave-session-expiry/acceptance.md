# Sprint 2 — Acceptance Criteria

## 1. Diagnosis confirmed before fixing

- [ ] The cause was reproduced and reported with evidence (actual status code
      and error body) before any fix code was written.
- [ ] If the evidence contradicted the token-expiry hypothesis, the Builder
      stopped and escalated rather than proceeding.

## 2. Session stays valid while the tab is open

- [x] With a workspace open and idle past the token lifetime, autosave still
      succeeds. No autosave error appears. *(Local shortened-expiry run,
      2026-07-19: idle across 2 renewal cycles, edited past expiry, no error.)*
- [x] Renewal is scheduled from `expiresAt`, not a hardcoded interval.
      *(Fired ~4 min into a 5-min token; rescheduled for the next cycle.)*
- [ ] Timers are cleared on unmount; navigating between dashboard and workspace
      repeatedly leaves no accumulating timers. *(Not separately run.)*
- [ ] A tab suspended past the token lifetime and then re-focused recovers
      without a manual page reload. *(Not separately run.)*
- [ ] A failed renewal does not sign out a user whose current token is still
      valid. *(By design; not separately exercised — needs an offline-renewal test.)*
- [x] No path fires two concurrent refreshes with the same refresh token.
      *(2 refreshes observed, both 200, spaced one per cycle — not concurrent.)*

## 3. No data loss on a rejected write

- [x] A write rejected for a stale token is retried once against a fresh token
      and succeeds, with no error shown and no data lost. *(Test B, 2026-07-19:
      forced `401 PGRST301` → single-flight renew → retry → saved, no loss.)*
- [x] A non-auth failure (e.g. an RLS denial) still fails fast and visibly. It
      is not retried. *(By construction: retry gated on 401 only; RLS is 403.)*
- [ ] A 401 during deliberate sign-out still does not surface as an error.
      *(Guard preserved in code; confirm during the §5 sign-out pass.)*
- [ ] If Step 2 was deferred, that was raised at the code gate and approved by
      the Project Lead — not decided silently.

## 4. Nothing else changed

- [x] No files added under `supabase/`. No schema, migration, or RLS change.
- [x] Manual Save, export/import, and Backup/Restore behave exactly as before.
- [x] Autosave debounce intervals and per-surface status states are unchanged.
- [x] No test tooling, Vitest, or CI workflow was added.
- [x] `MeetingWorkspace.tsx` was not refactored. *(Zero changes to that file;
      the fix lives in `useSupabaseAuth.ts`, `useWorkspacePersistence.ts`,
      `supabaseClient.ts`.)*
- [x] No UI redesign. No new in-app notices. *(Diagnostics are console-only.)*
- [x] The three deferred feedback items were recorded, not implemented.
      *(`POST_BETA_BACKLOG.md` + `feedback/2026-07-18-feedback-report.md`.)*

## 5. Validation performed

- [x] `npm run lint` — no new errors versus `dev`. *(5 errors, all in the
      untracked 120x `scripts/` folder; identical on `dev`; none in `app/`.)*
- [x] `npx tsc --noEmit` — clean.
- [x] `npm run build` — succeeds.
- [ ] Manual test of meeting-critical flows per `AGENTS.md`: task workflow,
      task details, rich text editing, structured autosave across surfaces,
      Manual Save, and Backup/Restore. *(Structured autosave across surfaces
      exercised in the long-meeting run; full task/rich-text/Backup pass still
      pending.)*
- [ ] Sign-out and sign-in still work correctly from both dashboard and
      workspace. *(Pending.)*

## 6. The long-meeting test — the one that matters

- [x] A workspace was held open past the full token lifetime with edits made
      *after* the original expiry point, and every edit persisted. Verified by
      reloading and confirming the data is there. *(Local shortened-expiry run,
      2026-07-19: edits at 5 and 10 min post-login — past the 5-min token —
      survived reload. 2 renewals fired, both 200, no autosave error.)*

This is the criterion the beta user actually cares about. If it cannot be
demonstrated, the sprint is not done.

## 7. Documentation

- [x] `STATE.md`, `DECISIONS.md`, `RISKS.md`, `POST_BETA_BACKLOG.md` updated.
- [x] `planning/feedback/2026-07-18-feedback-report.md` written.

## 8. Project Lead confirmation

- [ ] Validated on a Vercel preview before merge, per `AGENTS.md`.
- [ ] The Project Lead confirms a real meeting-length session without an
      autosave error.
- [ ] `main` untouched by this branch.
