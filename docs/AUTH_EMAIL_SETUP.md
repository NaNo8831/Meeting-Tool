# Auth Email Setup

This document captures the current Supabase Auth email setup guidance for signup confirmation and Forgot Password validation before merging the shared-access branch to `main`.

## Purpose

Meeting Tool uses Supabase Auth for email/password authentication. Supabase should remain the auth/security source of truth. Custom SMTP, likely Resend, should be used only to deliver auth emails reliably.

## Supabase vs. Resend Responsibilities

Supabase owns:

- Auth security.
- Signup confirmation tokens.
- Password reset tokens.
- Reset sessions.
- Password updates.
- Login sessions.
- Authorization and RLS identity.

Resend/custom SMTP owns only:

- Email delivery for Supabase-generated auth emails.
- Deliverability, sender identity, and operational email limits.

Resend does not handle passwords, login sessions, reset validation, or authorization.

## Supabase Auth URL Configuration Checklist

In Supabase Dashboard, review Authentication URL settings before further auth email validation:

- Confirm **Site URL** is the production Vercel/custom domain, not localhost.
- Confirm **Redirect URLs** include production, Vercel preview, and local development URLs.
- Save configuration changes before generating new signup confirmation or reset password emails.
- Generate fresh emails after configuration changes; old emails may still contain old redirect values.

## Site URL Guidance

Use the production user-facing deployment as the Site URL.

Recommended pattern:

```text
https://YOUR_PRODUCTION_DOMAIN
```

If the production custom domain is not final yet, use the production Vercel deployment URL temporarily and record that decision in planning docs.

Do not leave Site URL set to `http://localhost:3000` for preview or production validation.

## Redirect URL Guidance

Suggested Redirect URLs:

```text
https://YOUR_PRODUCTION_DOMAIN/**
https://*.vercel.app/**
http://localhost:3000/**
```

Expected coverage:

- Production domain: production signup confirmation and password reset links.
- Vercel preview wildcard: preview PR validation links.
- Localhost: local development only.

## Production vs. Preview vs. Local Development

- Production validation should use the production Vercel/custom domain.
- Preview validation should use the active Vercel preview URL and should be allowed by the Vercel wildcard redirect entry.
- Local development should use `http://localhost:3000/**` only for local browser testing.
- A reset or confirmation email generated before redirect settings are corrected may continue to point to an old localhost redirect; request a new email after saving the corrected settings.

## Localhost Redirect Issue

A reset email link appearing to point to localhost usually means one of these is true:

- Supabase Auth Site URL is still set to localhost.
- The deployed app sent a redirect URL that was not allowed by Supabase and Supabase fell back to the Site URL.
- The email was generated before configuration changes were saved.
- The preview/production URL was missing from the allowed Redirect URLs list.

Treat localhost links in production/preview auth email testing as a configuration blocker, not as proof that the reset implementation is broken.

## Supabase Default Email Rate Limit

The default Supabase auth email provider appears limited for testing and production-readiness purposes. During PR #110 validation, testing reached `email rate limit exceeded`, blocking further Forgot Password email-link validation.

If the rate limit is exceeded:

- Stop sending additional default-provider auth emails.
- Wait for the limit window to reset, or configure custom SMTP.
- Record the blocker and exact error in the PR/status docs.
- Resume validation with one fresh email after reset/configuration.

## Custom SMTP Recommendation

Configure custom SMTP before merging to `main`, preferably Resend unless a different provider is chosen.

Reasons:

- Avoid Supabase default-provider auth email limits during final validation.
- Improve production deliverability.
- Keep Supabase Auth as the security/session/token authority while delegating only email delivery.

Configuration should be validated with both signup confirmation and Forgot Password reset flows.

## Manual Validation Checklist

### Forgot Password Reset

1. Login → Forgot Password.
2. Enter a valid account email.
3. Confirm the UI shows a generic success message.
4. Confirm reset email is received.
5. Confirm the link opens deployed `/reset-password`, not localhost.
6. Enter new password and confirmation.
7. Confirm password update succeeds.
8. Confirm login succeeds with the new password.
9. Confirm the old password fails if practical.
10. Enter an unknown email and confirm the same generic success message appears.

### Signup Confirmation

1. Start signup with a new test email.
2. Confirm signup confirmation email is received.
3. Confirm confirmation link opens the deployed app/domain, not localhost.
4. Confirm the account can sign in after confirmation.
5. Confirm no account-existence or security-sensitive detail is exposed in public UI messages.
