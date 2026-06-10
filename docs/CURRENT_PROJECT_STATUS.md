# Current Project Status

This snapshot summarizes the current pre-main transition state for Meeting Tool. It is intended as a quick orientation document for Claude Code, Claude Chat, future developers, and AI agents before they inspect the detailed handoff, planning, architecture, and validation docs.

---

## Current Project Status

**PR #110 Forgot Password validation complete and ready to merge. Main Readiness Review is the next step after merge.**

- Phase 3 Shared Access: complete.
- Phase 4 Structured Persistence: complete.
- Agenda/Decision first-class autosave: complete.
- Agenda Workspace UX polish: complete.
- Dashboard UX polish: complete.
- AI-agent transition handoff docs (PR #107): complete.
- Meeting State Review (PR #108): complete.
- Meeting State follow-up implementation (PR #109): complete.
- Transition docs update for Claude (PR #111): complete.
- Documentation Refresh sprint (PR #113): complete.
- **Forgot Password (PR #110): validation complete, ready to merge.** All checklist items passed: Resend SMTP confirmed delivering email, reset link correctly opens `/reset-password` on the deployed app, password update succeeds, login with new password works. A recovery token session-exchange bug was found and fixed during audit (raw `access_token` used as Bearer for `PUT /auth/v1/user` could return 200 without committing the change; fix exchanges the recovery `refresh_token` for a live session first). PR #110 is merge-ready.

---

## Current Branch

`phase-3-shared-access`

This is the pre-main integration branch. All before-main work targets this branch. Do not merge to `main` until the Main Readiness Review gate passes.

---

## Current Before-Main Roadmap

1. ~~**Merge Forgot Password (PR #110)**~~ — **ready to merge.** Validation complete. Merge PR #110 (`codex/add-forgot-password-implementation`) to `phase-3-shared-access`.
2. ~~**Complete email-link validation**~~ — **complete.** Resend SMTP confirmed, reset link opens deployed `/reset-password`, password update and re-login work.
3. ~~**Fix/confirm Supabase Auth URL Configuration**~~ — **confirmed correct.**
4. ~~**Set up custom SMTP (Resend)**~~ — **complete.**
5. ~~**Documentation Refresh**~~ — **complete** (PR #113).
6. **Main Readiness Review** — run the full validation checklist in `docs/VALIDATION.md` on a Vercel/Supabase preview with dedicated test accounts.
7. **Merge to `main`** — only after the Main Readiness Review gate passes.

### Known merge concern for step 6

PR #112 hotfix on `main` (`fix/meetings-create-permission`) is superseded by a more robust equivalent already on `phase-3-shared-access`. At merge time:
- Remove `supabase/migrations/20260609000000_add_create_owned_meeting_rpc.sql` from the merge (the phase-3 version `20260604150000_add_owned_meeting_create_rpc.sql` is more robust; running both would silently downgrade the database function).
- Resolve the `app/lib/supabaseClient.ts` conflict in favor of the phase-3 version.

---

## Completed Major Systems

| System | Status |
|--------|--------|
| Supabase Auth (sign-up, sign-in, sign-out, profiles) | Complete |
| Forgot Password / reset-password route | Validation complete — ready to merge (PR #110) |
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

- **Forgot Password PR #110 ready to merge.** Validation is complete. Merge `codex/add-forgot-password-implementation` to `phase-3-shared-access` before proceeding to Main Readiness Review.
- **Main merge conflict risk.** The PR #112 duplicate migration must be removed at merge time to avoid silently downgrading the `create_owned_meeting` database function. See merge concern above.
- **Local Mode remains browser-only fallback.** No cloud sync; decommission deferred.
- **Manual Save remains the safety net.** Structured autosave is stable but Manual Save is still required as the full-workspace backup path.
- **Last Save Wins concurrency.** Concurrent editors can overwrite each other. Realtime conflict resolution is deferred.
- **Viewer UX deferred.** RLS supports viewer reads at the database level, but polished read-only workspace UI is not implemented.
