# Current Project Status

This snapshot summarizes the current pre-main transition state for Meeting Tool. It is intended as a quick orientation document for Claude Code, Claude Chat, future developers, and AI agents before they inspect the detailed handoff, planning, architecture, and validation docs.

---

## Current Project Status

**Documentation Refresh complete. Main Readiness Review is the next step.**

- Phase 3 Shared Access: complete.
- Phase 4 Structured Persistence: complete.
- Agenda/Decision first-class autosave: complete.
- Agenda Workspace UX polish: complete.
- Dashboard UX polish: complete.
- AI-agent transition handoff docs (PR #107): complete.
- Meeting State Review (PR #108): complete.
- Meeting State follow-up implementation (PR #109): complete.
- Transition docs update for Claude (PR #111): complete.
- Documentation Refresh sprint: **complete** (this PR).
- **Forgot Password (PR #110): implementation complete, pending merge and email validation.** PR #110 (`codex/add-forgot-password-implementation`) contains the full implementation: `/reset-password` route, `ForgotPassword` component, and password-reset helpers in `supabaseClient.ts` and `useSupabaseAuth.ts`. A recovery token session-exchange bug was found and fixed. The implementation is structurally complete and merge-ready. Final email-link validation is pending Resend/DNS setup (IT request submitted). PR #110 has not yet been merged to `phase-3-shared-access`, which is why the code does not appear on this branch directly.

---

## Current Branch

`phase-3-shared-access`

This is the pre-main integration branch. All before-main work targets this branch. Do not merge to `main` until the Main Readiness Review gate passes.

---

## Current Before-Main Roadmap

1. **Merge Forgot Password (PR #110)** — implementation is complete and merge-ready. Merge to `phase-3-shared-access` after Resend/DNS is confirmed and email-link validation passes.
2. **Complete email-link validation** — Resend/DNS setup is in progress (IT request submitted). Once confirmed: send a fresh reset email, verify the link opens the deployed `/reset-password` route (not localhost), complete the password update, and confirm re-login.
3. **Fix/confirm Supabase Auth URL Configuration** — production Site URL and production/preview/local Redirect URLs must be correct before auth email validation is trusted.
4. **Set up custom SMTP (Resend)** — required before main to avoid Supabase default email limits.
5. ~~**Documentation Refresh**~~ — **complete** (this sprint).
5. **Main Readiness Review** — run the full validation checklist in `docs/VALIDATION.md` on a Vercel/Supabase preview with dedicated test accounts.
6. **Merge to `main`** — only after the Main Readiness Review gate passes.

### Known merge concern for step 6

PR #112 hotfix on `main` (`fix/meetings-create-permission`) is superseded by a more robust equivalent already on `phase-3-shared-access`. At merge time:
- Remove `supabase/migrations/20260609000000_add_create_owned_meeting_rpc.sql` from the merge (the phase-3 version `20260604150000_add_owned_meeting_create_rpc.sql` is more robust; running both would silently downgrade the database function).
- Resolve the `app/lib/supabaseClient.ts` conflict in favor of the phase-3 version.

---

## Completed Major Systems

| System | Status |
|--------|--------|
| Supabase Auth (sign-up, sign-in, sign-out, profiles) | Complete |
| Forgot Password / reset-password route | Implementation complete on PR #110 — pending merge and email-link validation |
| Cloud Meetings (container CRUD, dashboard listing) | Complete |
| Shared Access (owner/editor model, invite flow, member management) | Complete |
| Meeting Lifecycle (Start, End, Test Mode, open/closed/past states) | Complete |
| Structured Autosave — Meeting Settings | Complete |
| Structured Autosave — Strategic Topics + Topic Notes | Complete |
| Structured Autosave — Meeting Notes + Cascading Communications | Complete |
| Structured Autosave — Defining Objectives + Tasks + SOOs | Complete |
| Structured Autosave — Agenda Items | Complete |
| Manual Save / Backup / Restore | Complete (remains mandatory) |
| Dashboard UX (Owned by Me / Shared with Me, search, lifecycle actions) | Complete |
| Meeting Workspace UX (Agenda Items primary, secondary surfaces) | Complete |
| Tactical History | Complete |
| Local Mode (browser-only fallback) | Complete (decommission deferred) |

---

## Known Before-Main Risks

- **Forgot Password PR #110 not yet merged.** The implementation is complete and structurally correct (PR #110 on `codex/add-forgot-password-implementation`). Final email-link validation is blocked pending Resend/DNS setup. Merge after email validation passes.
- **Supabase Auth URL Configuration unconfirmed.** Reset and confirmation links may still point to localhost until Site URL and Redirect URLs are corrected and retested with fresh emails.
- **Default Supabase auth email delivery unsuitable for main.** Configuring custom SMTP (Resend) before main is required to avoid rate limits in testing and production.
- **Main merge conflict risk.** The PR #112 duplicate migration must be removed at merge time to avoid silently downgrading the `create_owned_meeting` database function. See merge concern above.
- **Local Mode remains browser-only fallback.** No cloud sync; decommission deferred.
- **Manual Save remains the safety net.** Structured autosave is stable but Manual Save is still required as the full-workspace backup path.
- **Last Save Wins concurrency.** Concurrent editors can overwrite each other. Realtime conflict resolution is deferred.
- **Viewer UX deferred.** RLS supports viewer reads at the database level, but polished read-only workspace UI is not implemented.
