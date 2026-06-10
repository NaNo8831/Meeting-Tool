# Open Questions

This file tracks open questions that are genuinely unresolved. Questions that have been answered or deferred to post-main have been removed or closed. Updated during the Documentation Refresh sprint.

---

## Remaining Open Questions Before Main

### Auth Email / Forgot Password

- **Has Supabase Auth Site URL been changed from localhost to the production Vercel/custom domain?** This must be confirmed before any auth email validation is trusted.
- **Are Redirect URLs correct?** Production domain, `https://*.vercel.app/**`, and `http://localhost:3000/**` should all be present.
- **Custom SMTP provider:** Will the project use Resend before main, or is another provider preferred? Resend is the documented recommendation (`docs/AUTH_EMAIL_SETUP.md`) but no durable decision has been recorded.
- **Forgot Password implementation:** PR #110 is scoped and documented but not yet merged to this branch. When will it be implemented and validated?

### Meeting Lifecycle

- **Continue/Reopen Meeting:** Is an explicit Continue/Reopen action needed before main, or is the current "prefer open record, then newest record" refresh logic sufficient?
- **End Meeting and Manual Save:** Should End Meeting offer or trigger a full Manual Save backup, or remain Tactical History snapshot-only?

### Post-Main Decisions (Deferred — Do Not Resolve Before Main)

These are recorded here for visibility but should not block main:

- Should shared-editor duplicate ever be allowed? If so, what does it copy and who approves it?
- What Supabase schema normalization follows full-workspace JSONB if deeper normalization is needed?
- Should local-to-cloud migration state move from browser-local signatures into cloud metadata?
- Should Agenda Items support multiple outcomes per item, or is one outcome sufficient for main?
- Should legacy `decisionItems` receive a one-time migration tool into Agenda Item outcomes after main?
- Should Promote to Strategic Topic use a transactional RPC for atomicity, or is client-side sequential write acceptable through main?
- Should Local Mode be labeled `Browser-only fallback` in the UI before main, or after?
- Should the Decisions/Actions rollup remain inside the Agenda workspace or be removed/collapsed?
- Which Supabase/Vercel preview environment and test accounts should be the canonical Main Readiness Review environment?

---

## Resolved Questions (Closed)

The following questions from prior planning have been answered and are recorded here for reference.

| Question | Resolution |
|----------|-----------|
| Pending-invite table name, token strategy, expiration | `meeting_invitations` with pending/accepted/revoked status; no token/expiration for Team Beta. |
| How to migrate `admin`/`member` roles to `editor` | Explicit migration: `owner`→`owner`, `admin`→`editor`, `member`→`editor`. |
| Should editors use Manual Save? | Yes for Team Beta while structured autosave is incomplete. |
| Invitation revocation audit behavior | Preserve revoked rows; re-invite creates new pending row after revoked/accepted history only when no active member exists. |
| Dashboard grouping approach | Owned vs. Shared determined by `meetings.owner_id === auth.user.id`; lifecycle actions gated by `canManageMeetingLifecycle`. |
| Should archived Shared with Me cards be openable? | Yes, same Show Archived toggle as owned. |
| What precise permissions should owner/editor/viewer have? | Defined in `docs/PERMISSIONS.md` and enforced via `user_can_access_meeting`, `user_can_edit_meeting`, `user_can_manage_meeting_access`. |
| How should Strategic Topic completed/archived states be surfaced? | Strategic Topic History modal with Completed and Archived tabs. |
| Should Meeting Setup move out of the workspace? | Deferred; current first-time setup flow preserved. |
| Shared editor lifecycle hardening scope | Direct `meetings` updates narrowed to `meeting_data`; lifecycle column mutations blocked by trigger and owner-only RPCs. |
| Tactical History visibility for owners/editors | Visible to both; no owner-only restriction in Phase 3. |
| `strategic_topic_notes` schema | Keyed by `meeting_id` + `strategic_topic_item_id`; nullable `strategic_topic_id`; `content_json` + `content_text`. |
| Structured autosave hydration order | `meetings.meeting_data` first, then overlay structured rows per surface on load. |
| Dashboard title vs. meeting container name | `meeting_settings.dashboard_title` (in-workspace) distinct from `meetings.name` (container/dashboard). Not synced. |
| Member display name fallback order | Profile `display_name`, derived display_name, profile email, auth email. |
| Member count definition | Owner + active editors; excludes pending invitations, removed members, and viewers. |
| Meeting refresh preference | Prefer today's open dated record, then newest real dated record, then legacy fallback. |
| End Meeting behavior | Creates `tactical_sessions` snapshot; workspace remains visible and editable; autosave/Manual Save continue. |
| Numeric client IDs in structured tables | Preserved as compatibility bridge for runtime/localStorage/import/export. |
| Cloud import behavior | Upserts structured rows + restores `meetings.meeting_data`; preserves numeric client IDs. |
| Local Mode status | Retained for main as browser-only fallback; decommission deferred. |
| Is realtime collaboration required before main? | No; deferred. Last Save Wins is accepted for Team Beta. |
| Agenda Items as first-class persisted records | Implemented; `agenda_items` table with discussion notes, Decision, Action, Covered, Cascade Needed, Promote to Strategic Topic. |
| Decisions/Actions rollup behavior | Replaced with collapsed read-only summary; Agenda Items are the primary capture surface. |
| Agenda Items workspace position | Fixed full-width above Strategic Topics and Cascading Communications as secondary surfaces. |
| Documentation Refresh | Completed in this sprint. README, ARCHITECTURE.md, DATA_MODEL.md, PERMISSIONS.md, VALIDATION.md, QUESTIONS.md, CURRENT_PROJECT_STATUS.md, and STATE.md refreshed. |
