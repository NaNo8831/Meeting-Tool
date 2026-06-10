# Project History

## Purpose

This document summarizes the chronological evolution of Meeting Tool by LyArk so a new coding agent can understand what was built, why major decisions were made, and which assumptions still matter.

## Phase 1 — Local operational meeting tool

The product began as a lightweight leadership meeting workspace for structured weekly operational meetings. The early priority was usability during live meetings, not enterprise administration or heavyweight project management.

Major product capabilities established:

- Meeting Setup and team/meeting naming.
- Playbook Definitions and operating context.
- Top Priority / Thematic Goal.
- Defining Objectives and embedded Tasks.
- Standard Operating Objectives.
- Strategic Topics.
- Meeting notes, agenda items, decisions/actions, and cascading communication.
- Lightweight rich text editing.
- JSON backup/export and import/restore.

Major architecture decision:

- Use browser `localStorage` as the first persistence layer.

Why:

- The first goal was fast operational usability and meeting flow validation.
- Local persistence avoided premature database/auth complexity.
- JSON backup/export reduced the risk of browser-local data loss.

Tradeoff:

- Local data is browser/device-specific and cannot support true team collaboration.

## Phase 2 — Supabase cloud/auth foundation

The next major direction was to introduce cloud meeting containers and authentication without destabilizing the local workspace.

Major implementation themes:

- Supabase Auth for sign up, sign in, sign out, and session restore.
- Cloud Meeting containers in Supabase.
- Manual Save/load of full workspace backup JSON through `meetings.meeting_data`.
- Local Workspace to Cloud Meeting migration prompts.
- Preservation of JSON export/import.

Major architecture decision:

- Keep Manual Save as an explicit full-workspace cloud backup instead of immediately autosaving the entire workspace JSONB payload.

Why:

- Full-workspace JSONB autosave was considered fragile because it creates race conditions, large payload writes, and unclear merge behavior.
- The app needed a safe cloud foundation before normalizing every meeting surface.
- Manual Save preserved user control during the transition from local to cloud.

Tradeoff:

- Some cloud data remained dependent on user-driven saves until structured autosave was rolled out surface by surface.

## Structured persistence foundation

After cloud containers existed, the project introduced structured tables for durable meeting content while keeping `meetings.meeting_data` as fallback.

Major architecture decision:

- Structured persistence should be rolled out by surface/item, not as broad full-workspace JSONB autosave.

Why:

- Structured rows are a better foundation for permissions, shared access, autosave status, future collaboration, and backup/import compatibility.
- Incremental rollout reduces migration risk.
- Keeping the full backup snapshot allows rollback and import/export recovery while structured surfaces mature.

Core migration direction:

- Hydrate cloud meetings from `meetings.meeting_data` first.
- Overlay structured rows when rows exist.
- Preserve numeric client IDs where needed so local runtime objects and backup/import formats stay compatible.
- Keep Local Mode browser-only and out of cloud autosave paths.

## Phase 3 — Shared Access

Phase 3 focused on making Cloud Meetings usable by a small team beta.

Major work completed:

- Shared access schema alignment toward owner/editor/viewer roles.
- Pending invitation storage and invite lifecycle support.
- Membership-aware RLS foundation.
- Dashboard listing that distinguishes Owned by Me and Shared with Me.
- Owner/editor member visibility.
- Owner ability to remove active editors.
- Invite flow and create-meeting RPC support.
- User profile display-name support.
- Shared Access hardening to separate content editing from container/lifecycle mutation.

Major product decision:

- Team Beta exposes owner/editor collaboration first; polished Viewer behavior is deferred.

Why:

- The immediate value is shared editing in leadership meetings.
- Viewer UX requires careful read-only UI handling across many surfaces.
- Roles and RLS can prepare for viewer semantics without forcing the UI to support them before main.

Major architecture decision:

- `meetings.owner_id` remains authoritative for ownership.

Why:

- It avoids ambiguous access during the transition from single-user cloud meetings to shared meetings.
- It keeps owner-only lifecycle/container operations clear.
- Ownership transfer and multiple-owner models require separate product decisions.

Major hardening decision:

- Editors may edit content and use Manual Save, but owner-only lifecycle/container mutations stay owner-only.

Why:

- Manual Save is still required while structured autosave remains incomplete.
- Allowing editors to rename/archive/delete containers would expand permissions beyond the Team Beta need.

## Phase 4 — Autosave expansion

Phase 4 moved key meeting surfaces from Manual Save dependency to structured autosave.

Completed autosave milestones:

1. **Meeting settings pilot**
   - Narrow structured autosave for dashboard/playbook-level settings.
   - Proved the overlay pattern without changing all runtime data.

2. **Strategic Topics autosave**
   - Strategic Topic rows became structured cloud data.
   - Topic ordering and lifecycle state persisted structurally.
   - Topic Notes were added with backup/import compatibility.

3. **Meeting Notes and Cascading Communications autosave**
   - Active dated meeting notes moved into `meeting_notes`.
   - Cascading Communications moved with the active meeting-note record.
   - Agenda/Decision compatibility payloads were preserved where needed.

4. **Defining Objectives, Tasks, and SOOs autosave**
   - Reconciled existing structured tables for current runtime shapes.
   - Preserved numeric client IDs and rich/nested task detail compatibility.
   - Added structured autosave for objectives, embedded tasks, and standard operating objectives.

5. **Agenda Items first-class persistence**
   - Agenda Items became structured records.
   - Discussion Notes, Decision support, Action support, Covered state, Cascade Needed, and Promote to Strategic Topic were added.
   - Decisions/Actions shifted away from a competing live input surface toward a read-only rollup from Agenda Item outcomes.

Major architecture decision:

- Autosave remains debounced and Last Save Wins.

Why:

- Team Beta can tolerate light concurrency risk.
- Realtime collaboration, conflict resolution, locks, presence, and CRDTs would add complexity that is not required before main.

## UX evolution

The UI evolved from a collection of meeting sections into a clearer meeting-first workflow.

Major Dashboard UX decisions:

- Keep cards focused on Open, Members, and Actions.
- Separate Owned by Me and Shared with Me.
- Keep shared cards Open-focused.
- Move archive visibility to a dashboard-level control.
- Hide placeholder/coming-soon distractions.

Why:

- Dashboard should help users quickly enter the correct meeting and manage access without overwhelming live meeting operations.

Major Agenda UX decisions:

- Agenda Items are the primary workspace.
- Agenda Items are full width and fixed above secondary follow-up surfaces.
- Strategic Topics and Cascading Communications are secondary surfaces below Agenda Items.
- Agenda Items support Decision, Action, Covered, Cascade Needed, and Promote to Strategic Topic.
- Covered cards collapse by default.
- Discussion notes are attached to agenda items.
- The Decisions/Actions rollup is read-only and low-noise, not a competing capture surface.

Why:

- The live meeting should start with agenda discussion and produce outcomes.
- Strategic planning and cascading communication are follow-up/output surfaces.
- Separate live Decisions/Actions capture duplicated Agenda Item outcomes and created noise.

## Current transition point

Phase 3 Shared Access is effectively complete, and the major Phase 4 autosave surfaces have been implemented. The project is now close to a before-main readiness path.

The remaining before-main roadmap is intentionally narrow:

1. Meeting State Review.
2. Forgot Password.
3. Documentation Refresh.
4. Main Readiness Review.

Current deferred items include:

- Local Mode decommission/demotion.
- Ownership transfer.
- Full Viewer UX.
- Realtime collaboration and conflict resolution.
- Organization/workspace administration.
- Transactional Promote to Strategic Topic RPC.
- Legacy decision migration tooling.
- Multiple outcomes/actions per Agenda Item.

## Why the current architecture matters

New agents should preserve the existing transition architecture unless explicitly asked to change it:

- `meetings.meeting_data` remains the full-workspace safety snapshot.
- Structured rows are the cloud source of truth for implemented surfaces when rows exist.
- JSON export/import remains a required recovery mechanism.
- `meetings.owner_id` remains authoritative for ownership.
- RLS helper functions are the permission boundary.
- Editors can edit content but not lifecycle/container fields.
- Local Mode remains browser-only.
- Last Save Wins remains accepted for Team Beta.
