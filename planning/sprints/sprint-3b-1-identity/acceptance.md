# Sprint 3B-1 — Acceptance Criteria

## Item 1 — Name capture on sign-up
- [ ] First Name and Last Name fields appear on the sign-up
      form in AuthModal
- [ ] Fields are optional — sign-up succeeds if left blank
- [ ] On successful sign-up, first_name and last_name are
      written to the profiles table
- [ ] Existing sign-in flow is unchanged
- [ ] Existing sign-up flow unchanged beyond the two new fields
- [ ] Build, lint, and tsc all clean

## Item 2 — Team/Meeting name persistence
> **Deferred to Sprint 4.**
> Investigation confirmed that `leadership-dashboard-title` already
> persists in localStorage across sessions and is pre-filled when
> the setup modal reopens. No cloud sync is needed in this sprint.

## Overall
- [ ] npm run lint clean
- [ ] npx tsc --noEmit clean
- [ ] npm run build clean
- [ ] No merge to dev without live test
- [ ] No merge to main without explicit approval
