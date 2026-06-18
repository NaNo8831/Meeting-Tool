# Feedback Reports

Weekly feedback review reports generated from the
Supabase feedback table.

## Naming convention
YYYY-MM-DD-feedback-report.md
Example: 2026-06-25-feedback-report.md

## How reports are generated
1. Project lead runs the weekly SQL query in Supabase
2. Results are pasted into a Claude Code feedback session
3. Claude Code reads this file and FEEDBACK_REVIEW_AGENT.md,
   formats the report, and writes it here
4. Architect (Claude Chat) reads reports from project
   knowledge when planning sprints

## Weekly SQL query
Run this in Supabase SQL editor:

SELECT
  id,
  created_at,
  user_email,
  type,
  severity,
  note,
  intent,
  page
FROM public.feedback
WHERE created_at >= now() - interval '14 days'
ORDER BY severity DESC, created_at DESC;

## Weekly Code prompt
Open a Claude Code session and paste:

"Read docs/FEEDBACK_REVIEW_AGENT.md and
planning/feedback/README.md from the repo.
Here is this week's feedback data from Supabase:
[PASTE SQL RESULTS]
Proceed with the review process."
