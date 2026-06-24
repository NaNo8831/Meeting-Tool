# Sprint 3B-1 — Identity and First Run
## Requirements

**Goal:** Capture user's first and last name during sign-up and
persist the team/meeting name entered during meeting creation so
it does not need to be re-entered.

**User stories:**
1. As a new user signing up, I enter my first and last name once
   during account creation. I never need to enter it again.
2. As a user creating my first meeting, the team or meeting name
   I enter is remembered and pre-filled for future meetings.

**Scope:**
- Add First Name and Last Name fields to the sign-up form in
  AuthModal
- On sign-up success, write first_name and last_name to the
  profiles table for the new user
- Confirm profiles table has first_name and last_name columns
  (migration 20260604130000) — if not, add a new migration
- Investigate what "team/meeting name" means in the current
  creation flow and where it should persist

**Out of scope:**
- Profile edit screen (Sprint 4)
- Avatar or photo upload
- Name display in the workspace header (Sprint 4)
- Any changes to the login form (sign-in only, not sign-up)

**Constraints:**
- Name fields are optional at sign-up — do not block account
  creation if left blank
- Do not change the existing sign-up flow beyond adding the
  two fields
- Preserve all existing auth behavior
