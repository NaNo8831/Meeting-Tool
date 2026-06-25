# Sprint 3B-4 — Acceptance Criteria

## Item 1 — Terminology
- [ ] "Testing Mode" replaced with "Test Mode" everywhere
- [ ] "Action date" replaced with "Meeting date" everywhere
- [ ] "Access/Members" replaced with "Members" everywhere
- [ ] "Cascade" label on agenda items reads "Cascade needed"
- [ ] No logic changes — labels only
- [ ] Build clean

## Item 2 — Owner-only audit
- [ ] All 8 gates verified and documented
- [ ] Any incorrect gates flagged and approved before fixing
- [ ] Build clean

## Item 3 — Viewer role in invitation
- [ ] Database and RPC support confirmed before UI change
- [ ] Role selector (Editor/Viewer) appears in invite UI
- [ ] Default is Editor — existing behavior preserved
- [ ] Confirmation message reflects selected role
- [ ] Pending invite display shows role
- [ ] Build clean

## Item 4 — Roles model documented
- [ ] planning/DECISIONS.md updated with approved roles model
- [ ] Build clean

## Overall
- [ ] npm run lint clean
- [ ] npx tsc --noEmit clean
- [ ] npm run build clean
- [ ] No merge to dev without live test
- [ ] No merge to main without explicit approval
