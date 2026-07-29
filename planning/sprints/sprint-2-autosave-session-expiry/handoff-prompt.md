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
