# Sprint 3B-1 — Blueprint

## Branch
sprint-3b-1-identity cut from dev.

## Investigation first — do before any code

1. Check profiles table schema:
   Run in Supabase or check existing migrations:
   select column_name, data_type from
   information_schema.columns where table_name = 'profiles'
   order by ordinal_position;
   Does it have first_name and last_name columns?
   Report before proceeding.

2. Check the meeting creation flow:
   - Where does the user enter a team or meeting name on
     first-time setup?
   - What localStorage key or Supabase field stores it?
   - Is it currently persisted across meetings or re-entered
     each time?
   - Report findings before any code changes.

## Item 1 — First and Last Name on Sign-Up

Files to modify:
- app/components/auth/AuthModal.tsx

Steps:
1. In the sign-up view, add two fields above the email field:
   - First Name (text input, optional)
   - Last Name (text input, optional)
2. On sign-up success, write first_name and last_name to the
   profiles table via an upsert
3. If profiles table does not have these columns, create a
   new migration to add them before implementing the UI
4. Run: npm run lint && npx tsc --noEmit && npm run build
5. Commit: "Add first and last name fields to sign-up form"

## Item 2 — Team/Meeting Name Persistence

Steps depend on investigation findings.
Do not implement until investigation report is reviewed
and approach is approved by project lead.
