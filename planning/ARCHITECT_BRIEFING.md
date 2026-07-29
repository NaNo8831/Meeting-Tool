# Architect Briefing

Refreshed 2026-07-19 at the close of Sprint 2 (autosave session expiry).

## Where things stand

A beta user lost a whole meeting's worth of notes during a live session. The
cause is now understood and fixed: after about an hour signed in, the app's
security token quietly expired, and nothing was renewing it while the tab stayed
open — so every autosave silently started failing, and the page-refresh people
used to clear the error threw away everything they'd typed since. The fix keeps
that token alive for as long as the tab is open, and quietly retries the one
save that might still slip through. It works: we reproduced the exact failure
and watched the fix catch it and save the data with no error.

Two things still need to happen before this reaches live users. First, a
real-length test on a preview copy of the app (the same test the beta user
cares about — hold a meeting open past the hour and confirm nothing is lost).
Second — and this is the more important message for you — the audit that came
out of this sprint found that **the app has no safety net if a save ever fails
for any reason.** This fix removes the most common cause, but the underlying
fragility (a refresh can still throw away unsaved work, and the "Manual Save"
button people reach for to rescue their work can fail the same way) is a
separate, deeper problem that deserves its own designed sprint. That is the next
thing I'd want you to weigh in on.

## Current status

- **Sprint:** Sprint 2 — Autosave Session Expiry. Code complete, docs written.
- **Branch:** `fix/autosave-session-expiry`, cut from `dev`, 2 code commits
  (Step 1, Step 2) plus this planning commit.
- **Not yet merged, not yet pushed.** About to merge to `dev` per Project Lead
  direction; no GitHub PR (gh CLI unavailable).
- **`main` untouched.** The reported loss happened on `main`, which does not yet
  have this fix.
- Acceptance §1 (diagnosis) and §3 (retry, verified live) confirmed. §2/§5/§6
  (long-meeting + flows) pending on a Vercel preview; §8 preview is the gate
  before `main`.

## Since last sprint

Sprint 1 (line-ending normalization) merged to `dev` (`30a5c88`). This sprint:

1. **Step 1 — session stays fresh** (`app/hooks/useSupabaseAuth.ts`). Renewal
   scheduled from the session's own `expiresAt` minus a 60s buffer, rescheduling
   after each success, cleared on unmount, and re-checked on `visibilitychange`
   for tabs that wake past expiry. Refresh is **single-flight at module scope**
   so the three hook instances (`app/page.tsx`, `app/dashboard/page.tsx`,
   `MeetingWorkspace.tsx`) cannot double-redeem the one refresh token and sign
   the user out. Sign-out only on a genuinely rejected refresh token (4xx); a
   transient 5xx/network failure keeps the session and retries.
2. **Step 2 — no data loss on a rejected write**
   (`app/hooks/useWorkspacePersistence.ts`). One shared `runAutosaveWrite`
   helper retries a write rejected for a stale token once against a fresh token.
   401 only — an RLS denial (403) or validation error still fails fast. Logs
   status, body, and remaining token lifetime on failure so any recurrence is
   diagnosable from the console.
3. **`SupabaseRequestError`** (`app/lib/supabaseClient.ts`) carries the HTTP
   status/body so callers can tell expiry (401) from RLS (403) from transient
   failure. Applied to the refresh/getUser paths and the 13 autosave-write throw
   sites only; the ~33 other error sites and the 6 read/load sites are untouched.

**Key finding that shaped the work:** writes genuinely commit when the token is
valid (2xx from PostgREST = committed; verified live). The loss was not "autosave
never commits" — it was post-expiry edits never committing and the recovery
reload discarding them.

## Architecture / file map

| File | Nature |
| --- | --- |
| `app/hooks/useSupabaseAuth.ts` | Rewritten: module-scope single-flight refresh, timer + visibility renewal, broadcast to all instances, failure policy. |
| `app/hooks/useWorkspacePersistence.ts` | `runAutosaveWrite` retry helper + diagnostics; 5 autosave surfaces routed through it. |
| `app/lib/supabaseClient.ts` | `SupabaseRequestError` + `isExpiredTokenError`/`isRefreshTokenRejected`; refresh/getUser and 13 autosave throw sites converted. |
| `planning/STATE.md`, `DECISIONS.md`, `RISKS.md`, `POST_BETA_BACKLOG.md`, `feedback/2026-07-18-feedback-report.md` | Sprint 3 docs. |

No schema, migration, or RLS change. No `MeetingWorkspace.tsx` refactor. Manual
Save, export/import, autosave debounce, and per-surface status unchanged.

## Decisions

Recorded in `planning/DECISIONS.md` (2026-07-19): Supabase session lifetime is
managed for the whole time a workspace tab is open, not only on mount — timer +
visibility renewal from `expiresAt`, single-flight across instances, sign-out
only on a genuinely rejected refresh token, and a single auth-only retry on a
rejected autosave write.

## Risks / watch-items

- **Resilience gaps A & B (the important ones).** The token fix removes the
  common cause of failure but not the fragility beneath it:
  - *Gap A* — Manual Save (`saveWorkspaceData`) has no stale-token retry, so the
    rescue action fails the same way an autosave does.
  - *Gap B* — a reload rebuilds from the server and discards local edits newer
    than the server; no "local is newer than cloud" guard. This is what made the
    2026-07-15 loss permanent.
  Both are persistence-design changes → an Architect sprint, not a hotfix.
  Recorded in `planning/POST_BETA_BACKLOG.md`.
- **Still no automated test suite and no CI.** Manual validation per
  `acceptance.md` is the whole safety net. This remains the largest standing
  risk (the deferred safety-net sprint).
- **`client_meeting_id` uses `Date.now()`** — already in the backlog as a
  collision risk; relevant because it keys the meeting-notes round-trip. Stable
  within a session, so not implicated in this loss.

## Open questions for the Architect

1. **Prioritize the resilience sprint (Gaps A & B) vs the safety-net (CI/tests)
   sprint next?** Both are now overdue; the resilience work is what would have
   *saved* the lost meeting even without the token fix.
2. **Should Manual Save route through the same auth-aware retry as autosave?**
   Smallest slice of Gap A; arguably belongs with the token fix, but was kept out
   to hold this sprint narrow.
3. **Deferred feedback item — editors and Edit Playbook.** This is a product
   decision reversing the owner-only choice (DECISIONS 2026-06-11), not a bug.
   Needs a Project Lead decision before it can be scoped.

## Validation / test status

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Clean, exit 0. |
| `next build` | Succeeds. All 5 routes generated. |
| `npm run lint` | 5 errors, all in untracked 120x `scripts/`. Identical on `dev` — no regression. None in `app/`. |
| §1 diagnosis | Confirmed (live JWT-expiry error + static proof). |
| §3 retry (Test B) | Confirmed live: `401 PGRST301` rejected → single-flight renew → retry → saved, no data lost. |
| §2 / §5 / §6 | Pending on a Vercel preview (shortened-expiry method). |
| §8 preview | Required gate before `main`. |

## Recommended next Architect action

Let the Builder merge Steps 1 & 2 to `dev` and validate them on a Vercel preview
(shortened JWT expiry makes the hour-long test a few minutes). Once §6 passes on
preview, `dev` → `main` to get real users protected.

Then open an **`/architect` session for the autosave-resilience sprint (Gaps A &
B)** — Manual Save retry and a local-newer-than-cloud safety net. That is the
layer that turns "a save failed" into a recoverable event instead of lost work,
and it is the real lesson of this incident.
