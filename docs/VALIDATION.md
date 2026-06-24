# Validation

This document covers the current validation approach, pre-merge checklist, and Main Readiness Review checklist for Meeting Tool. Last updated 2026-06-24 (pre-beta polish).

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

## Main Readiness Review Checklist

Run on an integrated Vercel/Supabase preview with dedicated test accounts before merging `dev` to `main`.

**Recommended test accounts:**
- `test1@example.test` — primary owner account.
- `test2@example.test` — shared editor/invitee account.
- `test3@example.test` — unrelated non-member security account.

**Authentication and account recovery:**
- [ ] Sign up creates a new account and signs in.
- [ ] Sign in works for an existing account.
- [ ] Sign out clears the session and returns to `/`.
- [ ] Forgot Password request flow works.
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

---

## Shared Access Validation (Reference)

Quick reference for owner/editor/non-member regression after any permissions-related change:

| Check | Expected |
|-------|---------|
| Owner can create, open, archive, restore, delete, duplicate | Pass |
| Owner can invite, revoke, list members, remove editors and viewers | Pass |
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
