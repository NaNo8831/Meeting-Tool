# Feedback Reports

This folder contains weekly feedback review reports generated
from the Supabase feedback table.

## Naming convention
YYYY-MM-DD-feedback-report.md
Example: 2026-06-25-feedback-report.md

## How reports are generated
1. Project lead runs the weekly SQL query in Supabase
2. Results are pasted into a Claude Code feedback session
3. Claude Code formats the report and writes it here
4. Architect (Claude Chat) reads reports from project knowledge
   when planning sprints

## Weekly SQL query
Run this in Supabase SQL editor each week:

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
WHERE created_at >= now() - interval '7 days'
ORDER BY severity DESC, created_at DESC;
