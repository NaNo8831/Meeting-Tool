# Feedback Report — 2026-07-18

First report written into this folder despite the documented weekly
routine, so it captures the pull that triggered Sprint 2. Four items:
one actioned, three deferred.

## Summary

| # | Severity | Type | Item | Disposition |
| --- | --- | --- | --- | --- |
| 1 | Blocking | Bug | Autosave times out mid-meeting, causing data loss | **Actioned — Sprint 2** |
| 2 | — | Feature | Editors should have Edit Playbook access | Deferred — product decision |
| 3 | — | Feature | Tactical History misses Cascading Communication + Agenda outcomes; want DO/SOO colours | Deferred — Architect scope |
| 4 | — | Feature | Rename a meeting from the dashboard Actions menu | Deferred — backlog |

## Item 1 — Autosave timeout / data loss (Blocking) — ACTIONED

Reported 2026-07-15 from `/meeting/f23be6a6-0fd7-4559-8e7b-a366ed143a07`:

> "System keeps timing out, breaking auto save. Causing users to have to
> reenter data or refresh the page to clear the auto save error."

**Confirmed cause.** The Supabase access token expires after ~1 hour and
nothing renewed it while the tab stayed open (the refresh check ran once,
on mount). Past the hour every autosave write was rejected with a JWT
error; uncommitted edits lived only in browser state, and the reload used
to clear the error rebuilt the workspace from the server and discarded
them. A live reproduction confirmed the exact error
(`401 PGRST301`, "JWT ... expired") and the retry recovering the write.

**Actioned in Sprint 2 (`fix/autosave-session-expiry`):**
- Step 1 — renew the token from its own `expiresAt` while the tab is open,
  on a timer and on tab-wake, single-flight across the three auth-hook
  instances, signing out only on a genuinely rejected refresh token.
- Step 2 — retry a write rejected for a stale token once against a fresh
  token; log status, body, and remaining token lifetime on failure.

An audit during the sprint also found two resilience gaps (Manual Save has
no retry; a reload discards local-newer edits) that turned the transient
failure into permanent loss. These are recorded for an Architect-designed
resilience sprint in `planning/POST_BETA_BACKLOG.md`, not fixed here.

## Item 2 — Editors and Edit Playbook — DEFERRED (product decision)

Requesting that editors, not just owners, can edit the Playbook. This is
**not a bug**: it reverses the deliberate owner-only Edit Playbook decision
(DECISIONS.md, 2026-06-11). It is a roles/permissions product decision that
belongs to the Project Lead, and was explicitly out of scope for an urgent
data-loss fix.

## Item 3 — Tactical History coverage + colours — DEFERRED (Architect)

Two wishes: Tactical History snapshots should capture Cascading
Communication and Agenda Item outcomes (currently not fully represented),
and Defining Objective / SOO colours should carry into the snapshot.
Feature scope that intersects the deferred Agenda/Decision snapshot model —
for the Architect to design, not a hotfix.

## Item 4 — Rename meeting from dashboard — DEFERRED (backlog)

Small, self-contained feature. The owner-only
`rename_owned_meeting(target_meeting_id, meeting_name)` RPC already exists
(Phase 3 PR 3D); only the dashboard Actions-menu UI is unwired. Backlog.
