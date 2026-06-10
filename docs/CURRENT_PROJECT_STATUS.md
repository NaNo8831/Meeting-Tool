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
- **Forgot Password (PR #110): pending.** Implementation is not yet present in this branch. The scope is defined in `docs/AUTH_EMAIL_SETUP.md` and `docs/VALIDATION.md`. Supabase Auth URL Configuration and custom SMTP (Resend) must be set up before final validation.

---

## Current Branch

`phase-3-shared-access`

This is the pre-main integration branch. All before-main work targets this branch. Do not merge to `main` until the Main Readiness Review gate passes.

---

## Current Before-Main Roadmap

1. **Implement Forgot Password (PR #110 scope)** — account recovery is not yet in the codebase. Requires Supabase Auth URL Configuration and custom SMTP before validation.
2. **Fix/confirm Supabase Auth URL Configuration** — production Site URL and production/preview/local Redirect URLs must be correct before auth email validation is trusted.
3. **Set up custom SMTP (recommended: Resend)** — avoid Supabase default email limits in testing and production.
4. ~~**Documentation Refresh**~~ — **complete** (this sprint).
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
| Forgot Password / reset-password route | Pending implementation |
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

- **Forgot Password not implemented.** Account recovery is missing from the codebase. Must be added before main.
- **Supabase Auth URL Configuration unconfirmed.** Reset and confirmation links may still point to localhost until Site URL and Redirect URLs are corrected and retested with fresh emails.
- **Default Supabase auth email delivery unsuitable for main.** Configuring custom SMTP (Resend) before main is required to avoid rate limits in testing and production.
- **Main merge conflict risk.** The PR #112 duplicate migration must be removed at merge time to avoid silently downgrading the `create_owned_meeting` database function. See merge concern above.
- **Local Mode remains browser-only fallback.** No cloud sync; decommission deferred.
- **Manual Save remains the safety net.** Structured autosave is stable but Manual Save is still required as the full-workspace backup path.
- **Last Save Wins concurrency.** Concurrent editors can overwrite each other. Realtime conflict resolution is deferred.
- **Viewer UX deferred.** RLS supports viewer reads at the database level, but polished read-only workspace UI is not implemented.
