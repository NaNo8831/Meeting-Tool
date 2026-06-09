# Claude Chat Handoff

This is a plain-language handoff for Claude Chat. It is meant to support reasoning, planning, prompt writing, and review guidance. It is not a request to blindly change code.

## Project Summary

Meeting Tool by LyArk is a lightweight leadership meeting tool for structured weekly leadership meetings. It helps a leadership team track the current top priority, run agenda-driven meetings, capture decisions/actions, identify cascading communication, and maintain strategic/operating follow-up.

The app uses Next.js, TypeScript, Tailwind CSS, Vercel, and Supabase. Supabase currently provides authentication, cloud meeting containers, shared access, RLS, RPCs, and structured persistence. Manual Save and JSON export/import remain important safety nets.

## Current Branch

- Base branch: `phase-3-shared-access`
- Current before-main path: finish Forgot Password validation, complete documentation refresh, complete main readiness review, then merge to `main`.

## What Has Been Completed

- PR #107 added AI Agent Workflow and Current Project Status docs.
- PR #108 added Meeting State Review.
- PR #109 implemented Meeting State follow-up and was tested as merge-ready.
- PR #110 implements Forgot Password using Supabase password reset and appears structurally complete.

## Current Blocker

Forgot Password is implemented in PR #110 but final email-link validation is blocked by Supabase email rate limit and redirect configuration.

The implementation currently appears to have:

- Forgot password request flow.
- Generic success messaging.
- `/reset-password` route.
- Supabase reset helpers.
- Passing lint/typecheck/build from the PR #110 validation pass.

Validation is paused because:

- Supabase default auth email provider appears limited to 2 emails/hour.
- Testing reached `email rate limit exceeded`.
- A reset email still appeared to point to localhost before redirect configuration was fully confirmed.
- Supabase Auth URL Configuration likely needs production/preview/local URLs corrected.
- Custom SMTP, likely Resend, should be set up before main.

## Supabase vs. Resend

- Supabase handles auth security, reset tokens, reset sessions, password updates, login sessions, and authorization.
- Resend handles email delivery only.
- Resend does not handle passwords, login sessions, reset validation, or authorization.
- A custom SMTP provider changes how Supabase sends auth emails; it does not replace Supabase Auth.

## How Claude Chat Should Help

Use Claude Chat to:

- Reason through the auth-email setup and validation sequence.
- Draft precise Claude Code prompts.
- Review whether a proposed plan stays documentation-only or requires implementation.
- Help identify missing validation steps or environment assumptions.

Do not use Claude Chat to:

- Blindly change code without branch/context review.
- Invent schema, RLS, auth, or persistence changes.
- Bypass Supabase Auth security or reveal account-existence state in Forgot Password flows.

## Recommended Next Claude Code Prompt

```text
Repository: https://github.com/NaNo8831/Meeting-Tool
Base branch: phase-3-shared-access

Task: Continue PR #110 Forgot Password validation.

Read first:
- docs/CLAUDE_CODE_START_HERE.md
- docs/CURRENT_PROJECT_STATUS.md
- docs/HANDOFF_TO_CLAUDE_CODE.md
- docs/AUTH_EMAIL_SETUP.md
- docs/VALIDATION.md
- planning/STATE.md
- planning/DECISIONS.md
- planning/QUESTIONS.md

Current stopping point:
Forgot Password implementation appears structurally complete and lint/typecheck/build passed, but final validation is paused because Supabase default auth email delivery hit the email rate limit and a reset link still appeared to point to localhost before Auth URL Configuration was fully confirmed.

Do not change schema, migrations, RLS, persistence, or unrelated UI.

Next steps:
1. Confirm Supabase Auth Site URL and Redirect URLs.
2. Wait for email rate limit reset or configure custom SMTP, preferably Resend.
3. Send one fresh reset email after config changes.
4. Confirm the link opens deployed /reset-password, not localhost.
5. Confirm password update and login with the new password.
6. Confirm old password fails if practical.
7. Confirm unknown email shows generic success.
8. Document validation results and blockers.
```
