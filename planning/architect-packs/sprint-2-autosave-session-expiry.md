# Architect Pack — Sprint 2: Autosave Session Expiry

Produced 2026-07-18. Apply with:

```bash
node scripts/apply-architect-pack.js planning/architect-packs/sprint-2-autosave-session-expiry.md --dry-run
node scripts/apply-architect-pack.js planning/architect-packs/sprint-2-autosave-session-expiry.md
```

============================================================
FILE: planning/sprints/sprint-2-autosave-session-expiry/requirements.md
============================================================

# Sprint 2 — Autosave Session Expiry

## Problem

A beta user reported this on 2026-07-15, severity **Blocking**, from
`/meeting/f23be6a6-0fd7-4559-8e7b-a366ed143a07`:

> "System keeps timing out, breaking auto save. Causing users to have to
> reenter data or refresh the page to clear the auto save error."

This is data loss during a live leadership meeting. It is the worst failure
mode this product has: the app fails at precisely the moment it must work,
in front of the room, and the user's recovery is to re-type what they lost.

## Diagnosis — hypothesis, not yet proven

The reported "timing out" is very likely **Supabase access token expiry**, not
a network timeout.

Evidence from the code, read 2026-07-18:

1. `app/lib/supabaseClient.ts:422-424` — a session's `expiresAt` is set from
   the Supabase `expires_in` value, defaulting to `3600` (one hour).
2. `app/hooks/useSupabaseAuth.ts:48-81` — the session refresh check
   (`shouldRefresh`, then `supabaseAuthClient.refreshSession`) lives inside a
   `useEffect` whose dependency array is `[saveSession]`. `saveSession` is a
   `useCallback` with an empty dependency array, so it is stable. **The effect
   therefore runs exactly once, on mount.**
3. There is **no timer, no interval, and no pre-request expiry check** anywhere
   that renews the token while the tab remains open.
4. `app/hooks/useWorkspacePersistence.ts` passes `authSession.accessToken`
   directly into every autosave write (e.g. line 285, 414, 583, 710). It reads
   whatever token is in state; nothing revalidates it.
5. Every autosave `catch` block sets status `"error"` and surfaces the raw
   error message (e.g. lines 300-307). A rejected write is reported to the
   user, but nothing retries it and nothing attempts recovery.

**The resulting sequence.** User signs in. Token is valid for one hour. A
weekly leadership meeting runs past the one-hour mark. The token expires. Every
subsequent autosave write is rejected by Supabase. The workspace shows an
autosave error. The user reloads the page, the mount effect runs, the token is
refreshed, and everything works again — which is exactly the workaround the
user described.

This hypothesis fits both the code and the reported symptom, including the
detail that a page refresh clears it. **It has not been reproduced.** Confirming
it is the first task of this sprint, before any fix is written.

## Why this sprint, now

`planning/ROADMAP.md` ranks a CI and test-suite sprint ("safety net") next, and
before this feedback surfaced that was the correct call. It no longer is. Test
infrastructure protects future changes; this protects the meeting happening next
week. A real user is losing work now.

The safety-net sprint moves to next. It is not cancelled.

## Goals

1. Confirm or refute the token-expiry diagnosis before changing any code.
2. Keep the session valid for as long as the tab is open, so autosave does not
   fail mid-meeting.
3. Ensure that if a write is rejected because the token was stale, the user's
   data is not lost.
4. Change nothing else.

## Non-goals — explicitly out of scope

- **No test tooling, no CI, no Vitest.** That is the next sprint. Do not drag
  it into an urgent fix.
- **No refactor of `MeetingWorkspace.tsx`.** It is 4,368 lines and it is not
  this sprint's problem.
- **No redesign of autosave.** Debounce intervals, per-surface status states,
  and the Manual Save safety net all stay exactly as they are.
- **No change to Manual Save**, export/import, or any recovery path.
- **No schema, migration, or RLS changes.**
- **No UI redesign.** A changed status or error message is acceptable if the
  fix requires it; a redesigned autosave indicator is not.
- **The other three feedback items are out of scope** (see
  `planning/POST_BETA_BACKLOG.md`). In particular, "Editors should have edit
  playbook access" is a *product decision* reversing an earlier owner-only
  choice, not a bug, and belongs to the Project Lead — not to this sprint.

## Constraints

- `main` is live on Vercel and in real use. All work: feature branch cut from
  `dev` → merge to `dev`. Never work on `main`.
- There is still no automated test suite. `npm run lint`, `npx tsc --noEmit`,
  and `npm run build` are the whole safety net, plus manual testing.
- Per `AGENTS.md`, meeting-critical flows must be manually tested after any
  persistence change.

## Interim mitigation for users — communicate, do not code

Until this ships, users can reload the page at the start of a meeting to buy a
fresh hour, and Manual Save continues to write reliably. This is a stopgap the
Project Lead communicates to the beta group. **Do not build an in-app notice
for it.**

============================================================
FILE: planning/sprints/sprint-2-autosave-session-expiry/blueprint.md
============================================================

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

============================================================
FILE: planning/sprints/sprint-2-autosave-session-expiry/acceptance.md
============================================================

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

============================================================
FILE: planning/sprints/sprint-2-autosave-session-expiry/handoff-prompt.md
============================================================

# Builder Handoff — Sprint 2: Autosave Session Expiry

You are the Builder. Read `templates/method/120x-agent-identity.md`, then
`AGENTS.md`, then the three sprint files in this folder: `requirements.md`,
`blueprint.md`, `acceptance.md`.

Implement **only** from these files. Do not implement from the Architect Pack.

## What this is

A beta user is losing work during live meetings. Autosave fails partway through
and they have to re-type data or reload the page. The Architect's diagnosis —
**not yet proven** — is that the Supabase access token expires after an hour and
nothing renews it while the tab is open.

## Branch

Cut from `dev`. Suggested name: `fix/autosave-session-expiry`.
Never work on `main`. `main` is live and in real use.

## Do this first, before writing any fix

Step 0 in `blueprint.md`: confirm the cause. Report the actual status code and
error body. If the evidence contradicts the hypothesis, **stop and escalate** —
do not fix a cause you have not confirmed. This is a real instruction, not a
formality.

## The code gate — mandatory

Before creating, editing, or deleting any file outside `planning/` and `docs/`,
**stop**. Post:

- your Step 0 findings and whether they confirm or refute the diagnosis,
- your concrete file-by-file plan,
- the scope guards — what you will not do,
- the acceptance criteria you are working to.

Then wait for the Project Lead to explicitly approve *that plan*. Approval of
the overall approach is not approval to write code.

## Two things most likely to go wrong

1. **Concurrent token refresh.** `useSupabaseAuth` is called in three places.
   Two instances redeeming the same refresh token can invalidate it and sign the
   user out — a worse bug than the one you are fixing. Make refresh
   single-flight.
2. **Over-eager sign-out.** If a renewal fails but the current token is still
   valid, do not sign the user out. Losing a meeting's work to the fix would be
   a bad outcome.

## Scope discipline

This is an urgent fix for live users. Ship it narrow.

No test tooling. No CI. No Vitest. No `MeetingWorkspace.tsx` refactor. No
autosave redesign. No schema or RLS changes. The other three feedback items get
recorded in the backlog, not implemented — especially "editors should have edit
playbook access," which reverses a deliberate earlier decision and is the
Project Lead's call, not yours.

If Step 2 (retry on rejected write) turns out to need structural change, say so
at the code gate and let the Project Lead decide whether to defer it. Shipping
Step 1 quickly beats shipping both slowly.

## Validation

`npm run lint`, `npx tsc --noEmit`, `npm run build`, plus the manual
meeting-critical flows in `AGENTS.md`. Then acceptance §6 — hold a workspace
open past the full token lifetime, edit after the original expiry point, reload,
and confirm the data persisted. That is the criterion that matters.

Validate on a Vercel preview before merge.

## Status markers

Write `planning/STATUS.json` as you go: `awaiting-approval` when you stop at the
code gate, `building` after approval, `sprint-closed` at close. Refresh
`planning/ARCHITECT_BRIEFING.md` at close, leading with a plain-English
"Where things stand".
