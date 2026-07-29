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
