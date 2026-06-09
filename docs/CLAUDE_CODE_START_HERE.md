# Claude Code Start Here

This is the direct start guide for Claude Code continuing Meeting Tool after the Codex/ChatGPT-assisted development transition.

## 1. Repo / Branch

- Repository: https://github.com/NaNo8831/Meeting-Tool
- Base branch: `phase-3-shared-access`
- Current before-main focus: finish auth email validation, refresh docs, complete main readiness review, then merge to `main`.

## 2. Required First Read List

Read these before changing implementation:

1. `docs/CURRENT_PROJECT_STATUS.md`
2. `docs/HANDOFF_TO_CLAUDE_CODE.md`
3. `docs/AI_AGENT_WORKFLOW.md`
4. `planning/STATE.md`
5. `planning/DECISIONS.md`
6. `planning/QUESTIONS.md`
7. `docs/VALIDATION.md`

Also check `docs/AUTH_EMAIL_SETUP.md` before continuing Forgot Password or signup-confirmation validation.

## 3. Current Task

Finish Forgot Password validation / PR #110.

Current known state:

- Forgot Password implementation appears structurally complete.
- Lint, typecheck, and build passed during the PR #110 validation pass.
- Final email-link validation is paused because Supabase default auth email delivery reached its rate limit and redirect configuration still needs final confirmation.

## 4. Exact Next Steps

1. Confirm Supabase Auth URL Configuration.
2. Wait for the Supabase default email limit to reset, or configure custom SMTP first.
3. Send one fresh reset email after configuration changes.
4. Confirm the reset email opens the deployed `/reset-password` route, not localhost.
5. Confirm new password update works.
6. Confirm login with the new password works.
7. Confirm the old password no longer works if practical.
8. Confirm an unknown email shows the same generic success message.
9. Confirm signup confirmation links also use the deployed route/domain, not localhost.

## 5. If Testing Remains Blocked

If Supabase auth email testing remains blocked:

1. Stop sending more default-provider auth emails.
2. Document the blocker with exact date, environment, account/email used, and the exact Supabase or UI message.
3. Proceed to Custom SMTP setup documentation/review.
4. Prefer Resend as the custom SMTP provider unless a different durable decision is recorded.
5. Re-run Forgot Password and signup-confirmation validation only after SMTP and redirect configuration are confirmed.

## 6. Then

After Forgot Password validation is complete or clearly blocked and documented:

1. Documentation Refresh.
2. Main Readiness Review.
3. Merge to `main` only after the final readiness gate passes.
