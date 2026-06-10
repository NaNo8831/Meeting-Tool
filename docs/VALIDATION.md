# Validation

This document covers the current validation approach, pre-merge checklist, Forgot Password checklist, and Main Readiness Review checklist for Meeting Tool. It reflects the state of `phase-3-shared-access` after the Documentation Refresh sprint.

---

## Current Validation Approach

- **Manual testing** of changed user flows in Vercel preview.
- **Lint:** `npm run lint`
- **TypeScript check:** `npx tsc --noEmit`
- **Build:** `npm run build`
- **Backup/import testing** for changes that touch persistence, localStorage keys, or workspace restoration.

For documentation-only changes: confirm the diff is limited to `docs/`, `planning/`, or instruction files. Lint/typecheck/build are not required.

---

## Pre-Merge Checklist

Before merging any PR:

- [ ] Confirm branch context is correct for the work.
- [ ] Review `git diff --name-only` for unexpected app or config file changes.
- [ ] For app-code changes: run lint, typecheck, and build. All must pass.
- [ ] For documentation-only changes: confirm no app behavior changed.
- [ ] Manually test affected meeting-critical flows on a Vercel preview.
- [ ] Verify JSON Backup/Restore still works after any persistence-related changes.
- [ ] Confirm non-member and removed-editor blocking still works after any permissions-related changes.

---

## Forgot Password / Auth Email Validation Checklist

Use this checklist after Forgot Password is implemented and Supabase Auth URL Configuration and custom SMTP are confirmed. The implementation (PR #110 scope) is pending merge to this branch.

**Pre-conditions:**
- [ ] Supabase Auth Site URL is set to the production Vercel/custom domain (not localhost).
- [ ] Redirect URLs include production domain, `https://*.vercel.app/**`, and `http://localhost:3000/**`.
- [ ] Changes are saved in the Supabase dashboard before sending test emails.
- [ ] Fresh reset/confirmation emails are generated after any URL configuration change; old emails may contain stale redirect targets.
- [ ] Custom SMTP (recommended: Resend) is configured if the Supabase default email limit has been reached.

**Validation steps:**
1. [ ] Navigate to the login page and find the Forgot Password link.
2. [ ] Enter a valid account email and submit.
3. [ ] Confirm the UI shows a generic success message that does not reveal whether the account exists.
4. [ ] Receive the reset email at the submitted address.
5. [ ] Confirm the reset link opens the deployed `/reset-password` route, not localhost.
6. [ ] Enter a new password and confirmation. Submit.
7. [ ] Confirm login succeeds with the new password.
8. [ ] Confirm login fails with the old password.
9. [ ] Repeat step 2–3 with an unknown (non-account) email. Confirm the same generic success message appears.
10. [ ] Confirm signup confirmation links also use the deployed domain, not localhost.

**If blocked by rate limits:** Stop sending default-provider auth emails. Wait for the rate limit window to reset, or configure custom SMTP (Resend) first. Do not consume the rate limit on repeated testing. See `docs/AUTH_EMAIL_SETUP.md`.

---

## Main Readiness Review Checklist

This is the final gate before merging `phase-3-shared-access` to `main`. Run on an integrated Vercel/Supabase preview with dedicated test accounts.

**Recommended test accounts:**
- `test1@example.test` — primary owner account.
- `test2@example.test` — shared editor/invitee account.
- `test3@example.test` — unrelated non-member security account.

**Authentication and account recovery:**
- [ ] Sign up creates a new account and signs in.
- [ ] Sign in works for an existing account.
- [ ] Sign out clears the session and returns to `/`.
- [ ] Forgot Password request flow works (pending PR #110 implementation).
- [ ] Reset email opens `/reset-password`, not localhost.
- [ ] Password update and re-login work.
- [ ] Unknown email shows generic success (no account enumeration).
- [ ] Signup confirmation link uses deployed domain.

**Dashboard and cloud meeting creation:**
- [ ] Dashboard loads Owned by Me and Shared with Me sections.
- [ ] Create new meeting works (uses `create_owned_meeting` RPC).
- [ ] Search filters both sections correctly.
- [ ] Archive and restore owned meetings work.
- [ ] Soft-delete archived owned meeting works.
- [ ] Duplicate owned meeting works.
- [ ] Dashboard member count is correct (owner + active editors, excludes pending/removed/viewers).
- [ ] Shared meeting card shows only Open action.
- [ ] Archive visibility toggle works for both owned and shared sections.
- [ ] Backup/Restore JSON export and import work from the dashboard.

**Member management (owner account):**
- [ ] Owner can invite `test2` by email.
- [ ] Pending invitation appears in the Access panel.
- [ ] Owner can revoke a pending invitation.
- [ ] Owner cannot create a duplicate active pending invite for the same meeting/email.
- [ ] `test2` sees the pending invitation in their dashboard.
- [ ] `test2` accepts the invitation and the meeting appears under Shared with Me.
- [ ] Owner can remove an active editor.
- [ ] Removed editor loses access after refresh/reload.
- [ ] `test3` (non-member) cannot open the meeting, list members, or accept another email's invite.

**Meeting workspace — owner:**
- [ ] Open a Cloud Meeting from the dashboard.
- [ ] Meeting settings autosave works (title, org info, section order).
- [ ] Strategic Topics add/edit/complete/archive/restore and Topic Notes autosave.
- [ ] Meeting Notes and Cascading Communications autosave.
- [ ] Agenda Items add/edit, discussion notes, Decision, Action, Covered, Cascade Needed, Promote to Strategic Topic autosave.
- [ ] Defining Objectives add/edit/reorder/color autosave.
- [ ] Tasks (within objectives) add/edit/status/due date/subtasks/comments/activity history autosave.
- [ ] Standard Operating Objectives add/edit/reorder/color autosave.
- [ ] Start Meeting, End Meeting (creates Tactical History snapshot), Tactical History readable.
- [ ] Test Mode (if `NEXT_PUBLIC_ENABLE_TESTING_TOOLS=true` on preview) creates dated records for selected dates.
- [ ] Manual Save writes full-workspace backup. Refresh restores it.
- [ ] JSON export produces a valid file. JSON import restores the workspace.

**Meeting workspace — editor (test2):**
- [ ] `test2` opens the shared meeting from Shared with Me.
- [ ] `test2` can edit content (settings, agenda, topics, notes, objectives, tasks, SOOs).
- [ ] `test2` can use Manual Save.
- [ ] `test2` can view Tactical History.
- [ ] `test2` does not see archive, restore, delete, duplicate, invite, or remove-member controls.
- [ ] `test2` direct API/RPC attempts to mutate protected fields (`name`, `owner_id`, `metadata_json`, `archived_at`, `deleted_at`) fail.

**Non-member (test3):**
- [ ] `test3` cannot open the meeting by direct URL.
- [ ] `test3` cannot list members or view invitations.
- [ ] `test3` cannot write meeting content.

**Regression — Local Mode:**
- [ ] `/meeting/local` loads without authentication.
- [ ] Local Mode edits do not write to Supabase.
- [ ] JSON export and import work in Local Mode.
- [ ] Navigating to Local Mode from the landing page works.

**Known before-main merge concern (do not fix in readiness pass — document the outcome):**
- PR #112 hotfix migration (`20260609000000_add_create_owned_meeting_rpc.sql`) exists on `main` but not on `phase-3-shared-access`. At merge time, the hotfix migration must be removed from the merge because `phase-3-shared-access` already has a more robust equivalent (`20260604150000_add_owned_meeting_create_rpc.sql`). Running both would silently downgrade the database function. Resolve the `supabaseClient.ts` conflict in favor of the phase-3 version.

---

## Shared Access Validation (Reference)

Quick reference for owner/editor/non-member regression after any permissions-related change:

| Check | Expected |
|-------|---------|
| Owner can create, open, archive, restore, delete, duplicate | Pass |
| Owner can invite, revoke, list members, remove editors | Pass |
| Editor can open shared meeting, edit content, Manual Save | Pass |
| Editor cannot archive, rename, or remove members | Blocked |
| Editor removed — loses access after refresh | Pass |
| Pending invite alone — cannot open meeting | Blocked |
| Non-member — cannot open meeting or list members | Blocked |

---

## Automated Validation Commands

```bash
npm run lint
npx tsc --noEmit
npm run build
```

All three must pass for any app-code PR before merge.
