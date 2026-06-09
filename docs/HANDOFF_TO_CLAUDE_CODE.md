# Handoff to Claude Code

## Executive Summary

Meeting Tool by LyArk is a lightweight operational leadership meeting tool for structured weekly leadership meetings. It is intended to help leadership teams run a meeting, keep the current top priority visible, capture agenda discussion, record decisions/actions, decide what needs cascading communication, and maintain strategic/operating follow-up without becoming a heavyweight project-management system.

Current stack and operating model:

- **Next.js + TypeScript + Tailwind CSS** application deployed on Vercel.
- **Supabase** provides authentication, cloud meeting containers, shared-access tables/RPCs, RLS, and structured persistence tables.
- **Shared Access model** is active for Team Beta: meetings have one authoritative owner plus active editor memberships; owners and editors can edit meeting content; owner-only lifecycle/container operations are protected separately.
- **Autosave architecture** is structured, surface-by-surface, debounced, and Last Save Wins. Cloud routes hydrate the `meetings.meeting_data` backup first, then overlay structured rows when available.
- **Manual Save architecture** remains the full-workspace cloud safety net. Manual Save writes the complete workspace backup JSON into `meetings.meeting_data` and must remain available until every important operational surface has proven structured autosave and backup/import compatibility.
- **Backup/import architecture** remains required. JSON export/import is the user-facing recovery path and must be preserved even as cloud persistence matures.

This PR is documentation-only. It does not change runtime behavior, schema, RLS, auth, persistence, or UI.


## Transition Support References

- `docs/AI_AGENT_WORKFLOW.md` — recommended AI-agent workflow, PR types, red flags, and prompt pattern for safe future work.
- `docs/CURRENT_PROJECT_STATUS.md` — concise snapshot of current project status, completed systems, before-main roadmap, and known before-main risks.
- `docs/PROJECT_HISTORY.md` — chronological project and decision history.


## Current Stopping Point: Forgot Password / Auth Email

PR #110 implements Forgot Password using Supabase password reset. The implementation appears structurally correct, but final validation is paused because Supabase default auth email delivery hit its rate limit and redirect configuration still needs final environment confirmation.

Current implementation state:

- Forgot password request flow exists.
- Generic success message exists and should not reveal whether an account exists.
- `/reset-password` route exists.
- Supabase reset helpers exist.
- Lint, typecheck, and build passed during PR #110 validation.

Current validation blockers:

- Supabase default auth email provider appears limited to 2 emails/hour.
- Testing reached `email rate limit exceeded`.
- A reset email link still appeared to point to localhost before redirect configuration was fully confirmed.
- Supabase Auth URL Configuration likely needs production and preview URLs added.
- Custom SMTP, likely Resend, should be set up before main to avoid auth email testing and production email limits.

Auth responsibility boundary:

- Supabase still owns auth security, tokens, reset sessions, password updates, login sessions, and authorization.
- Resend/custom SMTP would only deliver emails.
- Resend does not handle passwords, login sessions, reset validation, or authorization.

Supabase Auth URL Configuration must be corrected before new validation emails are trusted:

- Site URL should be the production Vercel/custom domain.
- Redirect URLs should include the production domain, preview Vercel wildcard, and localhost development URL.

Suggested Redirect URLs:

```text
https://YOUR_PRODUCTION_DOMAIN/**
https://*.vercel.app/**
http://localhost:3000/**
```

Validation guidance:

- Save Supabase Auth URL Configuration changes before requesting more auth emails.
- Generate new reset emails after config changes.
- Old reset emails may still contain old localhost redirects.
- If the default Supabase email provider rate limit blocks testing again, stop testing, wait for reset, or configure custom SMTP before continuing.
- See `docs/AUTH_EMAIL_SETUP.md` and `docs/VALIDATION.md` for the exact checklist.

## Current Product Vision

The product is a meeting-centric leadership operating system. Its core job is to support the live weekly leadership meeting and the follow-through that comes out of that meeting.

Intended workflow:

```text
Meeting
↓
Agenda Items
↓
Decision / Action
↓
Cascade Communication
↓
Strategic Topic
↓
Defining Objectives / Tasks / SOOs
```

Current intended workflow in practical terms:

1. **Open or create a Cloud Meeting** from the dashboard. Owners can manage owned meeting lifecycle actions; shared editors can open and edit shared meetings.
2. **Run the meeting from the Agenda workspace.** Agenda Items are the primary live-meeting surface and should stay full width.
3. **Capture discussion notes directly on Agenda Items.** Notes are attached to agenda work instead of floating as a separate meeting artifact.
4. **Mark the outcome for each Agenda Item.** Agenda Items can support Decision, Action, or both. Actions here are meeting outcomes, not full task-management records with due dates/status.
5. **Mark Cascade Needed when the team needs to communicate the outcome.** Cascading Communications remains a secondary output/communication surface with generated visibility into agenda items requiring cascade.
6. **Promote deeper items to Strategic Topics.** Strategic Topics are the persistent planning/longer-term surface for issues too large for the tactical meeting.
7. **Translate broader priorities into Defining Objectives, Tasks, and Standard Operating Objectives.** These remain the operating follow-up surfaces for priorities, execution details, and ongoing standards.
8. **Use Manual Save and JSON Backup/Restore as safety nets.** Autosave covers major structured surfaces, but backup/import compatibility remains part of the product contract.

## Architecture Summary

### Meeting ownership model

- `meetings.owner_id` remains the authoritative owner field.
- The product currently supports one active owner per meeting.
- Ownership transfer, multiple owners, organizations, and administrative ownership are deferred.
- Owner-only lifecycle/container operations include duplicate, archive, restore, soft-delete, and rename.

### Shared access model

- Shared access is meeting-scoped through `meeting_members` and invitation flow tables/RPCs.
- Active owners and editors are the Team Beta collaboration model.
- Pending invitations are not access grants; accepted active membership is required.
- Removed editors lose access after refresh/reload because helper policies exclude removed membership rows.

### Editor permissions

Editors can:

- open shared meetings;
- edit meeting content;
- participate in structured autosave surfaces;
- use Manual Save while structured autosave remains incomplete;
- view member lists and Tactical History where current policies allow it.

Editors cannot:

- rename meeting containers;
- duplicate meetings;
- archive, restore, or soft-delete meetings;
- mutate owner-only container fields such as `owner_id`, `metadata_json`, `archived_at`, or `deleted_at`.

### Member permissions

- Active meeting members can read meeting-scoped content under RLS helper policies.
- The UI currently focuses on owner/editor behavior; full Viewer UX remains deferred.
- Non-members, pending invitees without accepted membership, and removed editors must not read or write meeting content.

### RLS approach

- RLS uses meeting-scoped helper functions such as `user_can_access_meeting(meeting_id)` and `user_can_edit_meeting(meeting_id)`.
- Structured content tables follow the pattern: active members can select; owners/editors can insert/update/delete.
- Meeting container lifecycle mutation is separated from content editing and protected through owner-only RPCs, column privileges, and hardening triggers.
- Do not loosen RLS or reinterpret roles in application code without a dedicated architecture review and migration plan.

### Autosave strategy

- Autosave is structured by surface, not full-workspace JSONB autosave.
- Current structured autosave coverage includes meeting settings, Strategic Topics, Topic Notes, Meeting Notes, Cascading Communications, Defining Objectives, embedded Tasks, Standard Operating Objectives, and Agenda Items with outcomes/state.
- Autosave is debounced and Last Save Wins.
- There is no realtime collaboration, locking, presence, cursor display, CRDT behavior, or merge/conflict UI.
- Cloud routes hydrate fallback workspace backup data first and then overlay structured rows when available.

### Manual Save strategy

- Manual Save writes the full workspace backup to `meetings.meeting_data`.
- Owners and editors can use Manual Save because structured autosave is still being stabilized and compatibility paths remain active.
- Manual Save is not the long-term primary persistence architecture, but it remains mandatory before main as a cloud rollback/safety snapshot.

### Backup/import strategy

- JSON export/import remains a required backup and recovery path.
- Backup/import must preserve compatibility with localStorage keys, `meetings.meeting_data`, and structured cloud rows.
- Cloud imports should restore compatible structured rows where implemented while retaining full workspace backup data.
- Do not remove backup/import compatibility when adding or changing structured tables.

### Local Mode status

- Local Mode remains browser-only and does not autosave to cloud.
- It is a fallback path during shared cloud stabilization.
- Local Mode is planned for future decommission/demotion after cloud structured autosave and shared access are stable enough for main, but removal is not part of this handoff PR.

## Major Completed Milestones

### Phase 1 — local operational beta

- Established the localStorage-first leadership meeting workspace.
- Added JSON workspace export/import as the core backup and restore path.
- Built meeting setup, playbook definitions, top priority, objectives, tasks, SOOs, strategic topics, meeting notes, decisions/actions, cascading communication, and rich text support.

### Phase 2 — cloud/auth foundation

- Added Supabase Auth and cloud meeting containers.
- Added Manual Save/load of full workspace backup JSON through `meetings.meeting_data`.
- Added migration support from Local Workspace into selected Cloud Meetings without auto-overwriting local data.
- Preserved export/import backup behavior.

### Phase 3 — Shared Access

- Aligned shared access schema toward owner/editor/viewer roles.
- Added pending invitation storage and invite flow RPCs.
- Added membership-aware dashboard access with Owned by Me and Shared with Me sections.
- Added member-management capabilities for owners/editors, with owners able to remove active editors.
- Hardened shared access so editor content editing does not imply permission to mutate meeting containers/lifecycle fields.
- Confirmed Phase 3 Shared Access is effectively complete for Team Beta, with ownership transfer, full Viewer UX, organizations, and realtime collaboration deferred.

### Phase 4 — structured persistence and autosave

- Clarified that full-workspace JSONB autosave is not the long-term architecture.
- Added structured autosave for meeting settings.
- Added structured autosave for Strategic Topics, Topic Notes, and topic ordering.
- Added structured autosave for Meeting Notes and Cascading Communications.
- Added structured autosave for Defining Objectives, embedded Tasks, nested task details, and Standard Operating Objectives.
- Added Agenda Items as first-class persisted records with discussion notes, Decision support, Action support, Covered, Cascade Needed, and Promote to Strategic Topic.
- Preserved Manual Save, Local Mode, JSON export/import, and Last Save Wins throughout the migration.

### UX stabilization and polish

- Dashboard polish approved the simplified card/action hierarchy: Open, Members, Actions.
- Agenda workspace redesign made Agenda Items the fixed primary full-width workspace.
- Strategic Topics and Cascading Communications became secondary surfaces below Agenda Items.
- Agenda Item UX polish improved notes placement, outcome readability, covered-card collapse, and promotion feedback.
- The always-visible Decisions/Actions rollup was reduced to a collapsed read-only summary to avoid live-meeting noise.

## Current Data Model

### `meetings`

- Meeting container table and cloud route source.
- `owner_id` is authoritative for ownership.
- `meeting_data` stores the full-workspace Manual Save snapshot and fallback hydration payload.
- Lifecycle/container fields remain owner-only mutation surfaces.

### `meeting_members`

- Meeting-scoped active/removed membership table.
- Supports owner/editor/viewer role direction, with Team Beta focused on owners and editors.
- Used by helper policies for access and edit checks.
- Does not replace `meetings.owner_id` as the owner authority.

### `strategic_topics`

- Structured source of truth for Strategic Topic rows in Cloud Meetings where rows exist.
- Preserves numeric client IDs for runtime/localStorage/import/export compatibility.
- Stores topic lifecycle/order fields used by the planning surface.
- `strategic_topic_notes` stores topic-attached notes.

### `agenda_items`

- Structured source of truth for Agenda Items in Cloud Meetings where rows exist.
- Supports discussion notes, Decision outcome, Action outcome, Covered state, Cascade Needed, and Promote to Strategic Topic state/linkage.
- Legacy agenda/decision compatibility remains because older backups may still carry agenda/decision data in meeting note JSON paths.

### `meeting_notes`

- Active dated meeting-note rows keyed by meeting and client meeting ID.
- Stores active Meeting Notes and Cascading Communications.
- Keeps Agenda/Decision legacy compatibility payloads where needed during transition.
- Archival tactical/strategic session tables are separate and should not be reused for active autosave.

### Defining Objectives, Tasks, and SOOs

- `objectives`, `tasks`, and `standard_operating_objectives` are reconciled structured runtime tables.
- Numeric client IDs preserve compatibility with local runtime objects and backup/import payloads.
- Tasks remain embedded in the runtime UX under objectives but persist as structured task rows with nested details preserved.
- SOOs persist as meeting-scoped structured rows with ordering and display fields.

### Source-of-truth summary

- **Cloud meeting container/title/lifecycle:** `meetings` plus owner-only RPCs.
- **Cloud access/edit permissions:** `meeting_members`, invitation records, helper functions, RLS, and owner-only lifecycle controls.
- **Current cloud structured content:** `meeting_settings`, `strategic_topics`, `strategic_topic_notes`, `meeting_notes`, `objectives`, `tasks`, `standard_operating_objectives`, and `agenda_items`.
- **Safety snapshot/fallback:** `meetings.meeting_data` and JSON export/import payloads.
- **Local Mode:** browser `localStorage` only.

## Current UX Decisions

### Dashboard

- Dashboard cards should keep actions simple and meeting-focused.
- Primary card action is **Open**.
- **Members** is visible where the user can view/manage members.
- **Actions** contains secondary owner-only lifecycle controls.
- Owned and shared meetings are separated; shared cards remain Open-focused.
- Archive visibility is a dashboard-level control, not a per-card distraction.

### Agenda

- Agenda Items are the primary meeting workspace.
- Agenda Items are full width and fixed above secondary follow-up surfaces.
- Agenda Items are not user-draggable as a peer section.
- Discussion notes live on Agenda Items.
- Decision and Action outcomes are supported directly on Agenda Items.
- Covered Agenda Items collapse by default but remain re-expandable.
- Cascade Needed marks items that should feed communication follow-up.
- Promote to Strategic Topic lets deeper items move to the strategic planning surface.
- The Decisions/Actions rollup should be read-only and low-noise, not a competing input surface.

### Strategic Topics

- Strategic Topics are a secondary planning surface below Agenda Items.
- They hold strategic items that should not be resolved in the tactical meeting.
- Topic Notes are attached to Strategic Topics and autosave structurally.
- Topic ordering and lifecycle state are structured autosave surfaces.

### Cascading Communications

- Cascading Communications is a secondary communication/output surface.
- It remains editable for explicit communication notes.
- It also provides visibility into Agenda Items marked Cascade Needed.
- It should not replace Agenda Items as the primary discussion/outcome surface.

### Defining Objectives / Tasks / SOOs

- Defining Objectives and Tasks support execution against the Top Priority/Thematic Goal.
- Tasks carry execution details such as status, rich description, subtasks, comments, and activity history.
- Standard Operating Objectives track ongoing operating standards beyond the current top priority.
- These surfaces are operational follow-up, not the primary live agenda surface.

### Manual Save, autosave, and status UX

- Autosave should be visible enough for confidence but not dominate live-meeting work.
- Manual Save remains available as a safety action.
- Avoid large UI changes to save controls without a dedicated review because persistence is still transitioning.

## Known Technical Debt

- **Local Mode planned decommission/demotion:** Local Mode remains supported but creates product confusion and parallel code/testing burden. Future work should decide whether to label it browser-only fallback, hide it, or retire it after cloud main readiness.
- **Meeting State Review still needed:** Current meeting lifecycle/state, active meeting IDs, local/cloud hydration, setup/title state, and section state need a focused review before main.
- **Compatibility layers still present:** `meetings.meeting_data`, localStorage backup keys, import/export adapters, and structured-row overlay logic are all necessary but add complexity.
- **Legacy agenda/decision compatibility paths:** Older `decisionItems` and agenda payload paths remain preserved for backup/import and read-only visibility until a migration/display decision is made.
- **Manual Save remains in primary workflow:** This is intentional before main but should be reevaluated after final structured autosave coverage and backup compatibility are validated.
- **Last Save Wins concurrency:** Team Beta accepts overwrite risk. Realtime/presence/conflict resolution is deferred.
- **Viewer UX deferred:** RLS can support member reads, but polished Viewer read-only UI is not implemented.
- **Promotion atomicity:** Promote to Strategic Topic may need a future transactional RPC if client-side sequential writes prove risky.

## Before Main Roadmap

Priority order:

1. **Finish PR #110 Forgot Password validation — blocker.** Account recovery is implemented but final email-link validation is paused until Supabase email rate limit and Auth URL Configuration issues are resolved.
2. **Fix/confirm Supabase Auth URL Configuration — blocker.** Production Site URL and production/preview/local Redirect URLs must be correct before auth email validation can be trusted.
3. **Set up custom SMTP, likely Resend — blocker before main.** Supabase remains auth/security source of truth; custom SMTP should provide reliable auth email delivery and avoid default-provider limits.
4. **Documentation Refresh — blocker.** Refresh user-facing and developer docs to match shared access, Supabase cloud persistence, structured autosave, Manual Save, Local Mode status, backup/import behavior, and auth email setup.
5. **Main Readiness Review — blocker/final gate.** Validate the integrated Vercel/Supabase preview after the above work, focusing on permissions, autosave, Manual Save, backup/import, invite/member flows, dashboard UX, agenda workflow, Forgot Password/signup confirmation, and regression risk.
6. **Merge to main.** Merge only after the final readiness gate passes.

Nice-to-have or post-main unless final validation exposes a blocker:

- ownership transfer;
- full Viewer UX;
- realtime collaboration, presence, locks, CRDTs, or merge UI;
- Local Mode removal;
- transactional Promote to Strategic Topic RPC;
- one-time legacy decision migration tooling;
- multiple outcomes/actions per Agenda Item;
- organizations or workspace administration model.

## Claude Code Guidance

- Read planning first: `planning/STATE.md`, `planning/DECISIONS.md`, `planning/DOMAIN.md`, `planning/RISKS.md`, `planning/QUESTIONS.md`, active sprint files, and relevant docs.
- Keep changes small, reversible, and meeting-friendly.
- Do not overbuild the product into project management software.
- Before major implementation, write or update an architecture review in `planning/reviews/`.
- Before schema changes, review `docs/DATA_MODEL.md`, `docs/PERMISSIONS.md`, migrations, RLS helpers, backup/import compatibility, and Manual Save implications.
- Preserve `meetings.owner_id` as owner authority unless a dedicated ownership-transfer architecture PR changes that decision.
- Preserve existing RLS helper patterns; do not grant access through UI assumptions alone.
- Preserve JSON backup/import compatibility and `meetings.meeting_data` fallback until a deliberate replacement plan is approved.
- Preserve Local Mode behavior unless the task explicitly targets Local Mode decommission/demotion.
- For app-code changes, run `npm run lint`, `npx tsc --noEmit`, and `npm run build` when practical.
- For documentation-only changes, confirm the diff is limited to docs/planning/instruction files.
- Update `planning/STATE.md` when current project state, active work, parked work, or next actions change.
- Update `planning/DECISIONS.md` only for durable product, architecture, branch, or operating decisions.

## Recommended First Claude Tasks

1. **Meeting State Review**
   - Create a planning/review document that maps all current meeting state sources and route/hydration flows.
   - Identify blockers versus acceptable compatibility debt before main.
   - Do not change runtime behavior in the review PR.

2. **Forgot Password Implementation**
   - Implement Supabase password reset using existing auth conventions.
   - Validate email redirect configuration and user-facing recovery flow.
   - Avoid changing unrelated auth/session behavior.

3. **Documentation Refresh**
   - Refresh README, architecture, data model, permissions, validation, and any user guide material to reflect the final pre-main state.
   - Make docs consistent about Supabase, Shared Access, structured autosave, Manual Save, Local Mode, and Backup/Restore.

4. **Main Readiness Review**
   - Perform a final integrated review after Meeting State Review, Forgot Password, and Documentation Refresh.
   - Validate Vercel preview with Supabase, permissions/RLS, shared access flows, autosave surfaces, Manual Save, Backup/Restore, and agenda workflow.
