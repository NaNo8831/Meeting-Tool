# Sprint 2 — Blueprint

## Step 0 — Confirm the diagnosis (do this first, write no fix code)

Do not skip this. If the real cause is something else, the fix below is wrong.

Confirm by whichever of these is practical:

- Sign in, then inspect the stored session under the `localStorage` key
  `meeting-tool-supabase-auth-session` and read `expiresAt`. Confirm it is
  roughly one hour after sign-in.
- Reproduce directly: sign in, edit the stored `expiresAt` to a past timestamp
  (or wait out the hour), then trigger an autosave by editing a workspace
  surface. Confirm the write is rejected and the surface shows the autosave
  error, and confirm a page reload clears it.
- Confirm the rejection is an auth failure (401 / invalid or expired JWT) and
  not a network timeout or an RLS denial. **This distinction is the whole
  diagnosis** — report the actual status code and error body.

**Post the findings at the code gate.** If the evidence contradicts the
hypothesis, stop and escalate to the Project Lead rather than proceeding.
Do not implement a fix for a cause you have not confirmed.

## Step 1 — Keep the session fresh while the tab is open

Location: `app/hooks/useSupabaseAuth.ts`.

The hook must renew the access token *before* it expires, for as long as the
tab is open — not only on mount. The existing `sessionRefreshBufferSeconds`
(60) is the right idea and should be reused; the gap is that nothing re-checks
after mount.

Requirements on the implementation, not a prescription of it:

- Renewal is scheduled from the session's own `expiresAt`, not a hardcoded
  interval, so it stays correct if Supabase returns a different `expires_in`.
- Renewal fires with the existing buffer of margin, before expiry, not after.
- Each successful renewal reschedules the next one.
- Timers are cleared on unmount. No timer leaks across navigation.
- A failed renewal must not silently sign the user out mid-meeting if the
  existing token is still valid. Signing out on failure is only correct when
  the refresh token itself is genuinely rejected. Losing a meeting's work to an
  over-eager sign-out would be worse than the bug being fixed.

**Two constraints that are easy to miss:**

1. **`useSupabaseAuth` is called in three separate places** — `app/page.tsx:18`,
   `app/dashboard/page.tsx:84`, and
   `app/components/meeting/MeetingWorkspace.tsx:1144`. Each call is an
   independent hook instance with its own state, all sharing one `localStorage`
   key. The refresh must be **single-flight**: if two instances are ever mounted
   at once, they must not fire concurrent refresh calls with the same refresh
   token. Supabase can invalidate a refresh token that is redeemed twice, which
   would sign the user out — turning this fix into a worse bug than the one it
   replaces. Guard against it.

2. **A tab that was asleep may wake up already expired.** Laptops suspend;
   browsers throttle background timers. Renewing only on a timer is not
   sufficient. Re-check validity when the tab becomes visible again
   (`visibilitychange`) and renew immediately if the token has expired or is
   inside the buffer.

## Step 2 — Do not lose the user's data on a rejected write

Location: `app/hooks/useWorkspacePersistence.ts`.

Even with Step 1, a write can still be rejected — a renewal can fail, or a
write can be in flight at the moment of expiry. Today every `catch` block sets
status `"error"` and stops. Nothing retries.

Minimum requirement: **a write rejected because the token was stale is retried
once against a freshly renewed token.** If the retry succeeds the user never
sees an error and no data is lost. If it fails, the current error behaviour
stands unchanged.

Keep this narrow and deliberate:

- Retry **only** on an auth rejection. Do not add blanket retries — an RLS
  denial or a validation error must still fail fast and visibly.
- Retry **once**. No backoff loops, no retry queues.
- The existing sign-out guard (`isSigningOutRef`, see the comment at
  `useWorkspacePersistence.ts:62-64`) must keep working. A 401 during
  deliberate sign-out is expected and must not surface as an error or trigger a
  retry.
- The same treatment applies consistently across the autosave surfaces, which
  currently repeat this pattern (settings, strategic topics, meeting notes,
  agenda items, objectives). Prefer one shared helper over five near-copies —
  but if the shared helper turns out to require restructuring the hook, stop
  and post that at the code gate rather than expanding the sprint.

If Step 1 alone fully resolves the reproduction and Step 2 proves to require
structural change, **Step 2 may be deferred to its own sprint.** Say so at the
code gate and let the Project Lead decide. Shipping Step 1 quickly is worth
more than shipping both slowly.

## Step 3 — Documentation

- `planning/STATE.md` — record the sprint under Active Work: the reported bug,
  the confirmed cause, what changed, what did not.
- `planning/DECISIONS.md` — record the durable decision about how session
  lifetime is managed while a workspace is open.
- `planning/RISKS.md` — the existing risk table has no entry for session
  expiry during long meetings. Add or update one.
- `planning/POST_BETA_BACKLOG.md` — add the three deferred feedback items
  (editors/Edit Playbook as a product decision for the Project Lead; tactical
  history not capturing cascading communication or agenda item outcomes, and
  wanting DO/SOO colours; rename meeting from the dashboard Actions menu).
- `planning/feedback/2026-07-18-feedback-report.md` — the review folder is
  empty despite a documented weekly routine. Write up this pull: four items,
  what was actioned, what was deferred and why.

## Sequencing

Confirm (Step 0) → **code gate** → fix (Steps 1, 2) → validate → docs (Step 3).

Commit Step 1 and Step 2 separately so either can be reverted alone.

## Risks

| Risk | Mitigation |
| --- | --- |
| Concurrent refresh invalidates the refresh token and signs users out mid-meeting. | Single-flight guard. This is the highest risk in the sprint. |
| An over-eager sign-out on a failed renewal loses meeting work. | Only sign out when the refresh token is genuinely rejected. |
| Blanket retries mask real errors such as RLS denials. | Retry only on auth rejection, once. |
| The diagnosis is wrong and the fix does not help. | Step 0 confirms before any fix is written. |
| No automated tests exist to catch a regression here. | Manual validation per `acceptance.md`. The safety-net sprint follows. |
