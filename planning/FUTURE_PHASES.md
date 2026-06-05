# Future Phases Backlog (Scope Control)

## Purpose
This file preserves intentionally deferred ideas so the team can avoid unplanned scope expansion in active implementation sprints. Items here are directional and should only move into sprint planning after explicit prioritization.

## Guardrails
- Do not pull items from this file into active implementation without a scoped sprint requirement.
- Keep Phase 1 and current stabilization work focused on meeting reliability and usability.
- Preserve Local Workspace + JSON export/import behavior while future cloud and collaboration work evolves.

## Later UX polish
- Refine dense screens for faster in-meeting scanning, especially task and meeting sections.
- Improve microcopy consistency across setup, tasks, and cloud meeting actions.
- Revisit drag/drop affordances and empty states after additional user testing.
- Add non-invasive keyboard/accessibility polish where it improves live meeting speed.
- Investigate dashboard/action button INP warnings, including archive/message interactions.
- Investigate Manual Save INP warnings and address them in a later performance/autosave hardening pass.

## Organizations layer
- Add an organization/account container above workspaces for multi-team ownership.
- Define how org-level settings (name, defaults, policies) relate to workspace-level data.
- Clarify upgrade path from owner-only workspace model to org-managed access.
- Plan org-aware data boundaries before any schema normalization.

## Invitations/sharing
Shared meeting access has been promoted into Phase 3 planning. Keep only later refinements here:
- Decide whether invitation expiration is needed after the initial pending/accepted/revoked lifecycle.
- Evaluate organization-scoped invitations only after meeting-scoped invites are stable.
- Add auditable invitation events if Team Beta usage shows a need.

## Advanced roles
The durable `owner`/`editor`/`viewer` direction is part of Phase 3. Keep later refinements here:
- Define fine-grained per-surface Viewer permissions before Viewer is exposed.
- Resolve behavior when permissions change while users are active.
- Add auditable role change events before broad rollout.
- Evaluate multiple-owner or organization/admin ownership only after the single-owner shared-access beta is stable.

## Realtime collaboration
- Evaluate presence indicators, live cursors, and optimistic vs authoritative merge strategy.
- Decide conflict resolution model for concurrent edits to tasks and meeting sections.
- Establish reliability/performance thresholds before enabling realtime by default.
- Keep fallback recovery and snapshot backup paths available.

## Templates
- Add reusable workspace templates for recurring meeting structures and playbooks.
- Support template creation from existing workspace state.
- Define versioning rules when templates evolve over time.
- Preserve lightweight setup flow so templates reduce, not add, meeting overhead.

## Autosave/status future work
- Consider a sticky/frozen status or header area after autosave coverage and in-meeting layout needs are clearer.
- Make refresh return to the currently open/active meeting note when possible.
- Review multi-session open meeting behavior before adding collaboration or conflict-handling UX.
- Remove or demote Manual Save only after structured autosave coverage is complete and validated.

## Meeting recap emails
- Generate post-meeting recap summaries from decisions/actions and cascading communication.
- Define delivery timing and audience controls.
- Confirm how recap formatting aligns with rich text and structured sections.
- Include opt-out and compliance-safe delivery behavior before production rollout.

## Mobile/responsive future work
- Improve mobile-first navigation and editing for leadership users on phones/tablets.
- Rework dense list/table patterns for smaller viewports.
- Validate drag/drop alternatives and touch ergonomics.
- Define minimum supported viewport and browser matrix for mobile usage.

## Promotion Criteria (Future to Active Sprint)
Before moving any item into active sprint scope:
1. Write explicit user value and in-scope boundaries.
2. Define data/permission impact and migration/backward-compatibility expectations.
3. Add acceptance criteria and rollout/testing plan.
4. Confirm branch strategy (`main` vs `phase-2-cloud`) and dependency order.
