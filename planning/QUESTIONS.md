# Open Questions

| Question                                                                                                                                                          | Area                           | Status                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What exact pending-invite table name, token strategy, expiration behavior, and acceptance transaction should PR 1A use?                                           | Phase 3 shared access          | Refined: PR 1A uses `meeting_invitations` with pending/accepted/revoked status and no token/expiration/acceptance transaction yet; PR 1B/follow-up invite UX must define token delivery and acceptance flow.                                                                      |
| How should existing or test `meeting_members` rows using `admin` or `member` be migrated into the planned `editor` or `viewer` roles?                             | Phase 3 roles                  | Answered in PR 1A: `owner` stays `owner`; `admin` and `member` migrate to `editor`; future roles are constrained to `owner`, `editor`, `viewer`.                                                                                                                                  |
| Should Team Beta allow Editors to invoke Manual Save, duplicate, archive, and soft-delete, or reserve some meeting-container actions for Owners?                  | Phase 3 permissions            | Refined by PR 3D: Manual Save remains editor-supported while structured autosave is incomplete, but duplicate, archive, restore, soft-delete, and rename/title lifecycle mutations should be owner-only at both UI and database/API boundaries before Phase 3 closes. |
| Should invitation revocation preserve an audit row, and when should re-inviting reuse or replace that row?                                                        | Phase 3 invites                | Answered for PR 3B planning: preserve revoked/accepted rows, mark revocation in place, make duplicate pending invites idempotent, block active-member invites, and allow a new pending row after revoked/accepted history only when there is no active member. |
| Should shared-editor duplicate ever be allowed, and if so should it copy full workspace backup data, omit history, or require owner approval?                     | Phase 3 dashboard permissions  | Open                                                                                                                                                                                                                                                                              |
| Should PR 2A retrieve membership role from `meeting_members`, or is `owner_id === auth.user.id` sufficient for first Owned by Me / Shared with Me classification? | Phase 3 dashboard architecture | Answered for PR 2B: dashboard grouping uses visible `meetings` rows from RLS plus `meeting.owner_id === auth.user.id`; owned rows get role `owner`, shared row role remains unknown, and lifecycle actions stay owner-only through `canManageMeetingLifecycle`.                   |
| Should archived Shared with Me cards remain openable when archive visibility is enabled, matching current archived owned-card behavior?                           | Phase 3 dashboard UX           | Answered in PR 2B: archived shared meetings follow the same Show Archived toggle as owned meetings and remain Open-only when shown.                                                                                                                                               |
| What Supabase schema should follow basic JSONB persistence if normalization is needed?                                                                            | Cloud data model               | Open                                                                                                                                                                                                                                                                              |
| How long should workspace data remain JSONB before considering normalized tables?                                                                                 | Cloud data model               | Open                                                                                                                                                                                                                                                                              |
| Should local-to-cloud migration state eventually move from browser-local signatures into cloud metadata?                                                          | Migration                      | Open                                                                                                                                                                                                                                                                              |
| What precise behavior should owner, editor, and viewer roles have?                                                                                                | Permissions                    | Refined: PR 1B defines database-level access/edit/manage helpers: owner can access/edit/manage; active editor can access/edit but not manage access; active viewer can access/read, with Viewer UI/read-only enforcement deferred.                                                |
| Is realtime collaboration required after basic cloud persistence?                                                                                                 | Collaboration                  | Open                                                                                                                                                                                                                                                                              |
| How should archived/completed Strategic Topics be surfaced?                                                                                                       | Product UX                     | Answered: use a Strategic Topic History modal with Completed and Archived tabs.                                                                                                                                                                                                   |
| What refinements, if any, should the merged Meeting Setup flow receive after team testing?                                                                        | Product UX                     | Open                                                                                                                                                                                                                                                                              |

## PR 3A follow-up questions

- Should dashboard header copy change from the current Team framing to `Mariano's Teams` when member lists are introduced?
- Answered for PR 3C: member display should use only `display_name`, email fallback, and role label; do not add avatars or broader profile data.
- Should invite acceptance reconcile pending invitation email to a profile row immediately, or only after explicit accepted membership creation?
- What audit events need user attribution first: content edits, meeting setup changes, access-management changes, or ownership transfer?

## PR 3B invite-flow follow-up questions

- Should a later PR add tokenized invite links for smoother cross-device/signup flow, and should those tokens expire?
- When automated email delivery is introduced, which provider and sender domain should Meeting Tool use?
- Should invitations ever expire automatically, or should owner revocation remain the only pending-invite cleanup path for Team Beta?
- Answered for PR 3B: former removed members are reactivated through the same explicit invite acceptance flow when a matching pending invitation is accepted; separate member-management actions remain deferred.

## PR 3B invite-flow resolved/deferred notes

- Resolved for PR 3B: former removed members are reactivated through explicit invite acceptance when a matching pending invitation is accepted.
- Deferred: tokenized invite links, token expiration policy, automated email provider/sender domain, automatic invite expiration, member removal, role editing, Viewer UX, ownership transfer, multiple owners, organizations, and realtime collaboration.


## PR 3C member-management resolved/deferred notes

- Resolved for PR 3C: no new member table is needed; use active `meeting_members` plus `meetings.owner_id`, `meeting_invitations` history, and `profiles` display metadata.
- Resolved for PR 3C: owners and editors can view active owner/editor members; owners can remove active editors; editors cannot remove members; owners cannot remove themselves in Phase 3.
- Resolved for PR 3C: dashboard member count means owner plus active editors, excluding pending invitations, removed members, and viewers.
- Resolved for PR 3C: Tactical History remains visible to owners and editors; no owner-only Tactical History restriction should be added in Phase 3.
- Resolved for PR 3C implementation: member listing uses `list_meeting_members(target_meeting_id)`, member count uses `get_accessible_meeting_member_counts()`, and owner-only removal uses `remove_meeting_editor(target_meeting_id, target_user_id)`.
- Open/deferred: role editing, ownership transfer, Viewer UX, organizations, multiple owners, avatars, Local Mode changes, autosave changes, and realtime collaboration.


## PR 3D shared-access hardening resolved/deferred notes

- Resolved: `meetings.owner_id` remains the authoritative owner; owner membership rows are support/future-expansion rows and do not create multiple-owner behavior today.
- Resolved: Phase 3 durable role vocabulary is `owner`/`editor`/`viewer`, but UI behavior remains owner/editor only; Viewer UX/read-only enforcement remains deferred.
- Resolved: pending invitations are not access grants; accepted editor membership is required for shared meeting access.
- Resolved: profiles are display metadata only and must not become authorization inputs.
- Resolved by PR 3D implementation: owner-only meeting lifecycle/container mutations are separated from editor Manual Save/content updates. Direct `meetings` updates are narrowed to `meeting_data`, owner-only duplicate/archive/restore/soft-delete/rename use RPCs, and a trigger blocks non-owner protected-field changes as defense in depth.
- Resolved by PR 3D implementation: use both owner-only lifecycle RPCs and database safeguards while preserving editor Manual Save and avoiding autosave expansion.
- Deferred: autosave expansion, forgot password, import-to-cloud, dashboard card polish, Tactical History rename, responsive/sticky header polish, Manual Save retirement/move, ownership transfer, multiple owners, Viewer UX, role editing, organizations, audit history, realtime collaboration, and email/tokenized invite delivery.

## Phase 4 PR 4A Autosave Audit Open Questions

- Should main/team beta wait until Strategic Topics plus topic notes and Meeting Notes/Agenda/Decisions/Cascading Communications have structured autosave, or is a controlled beta acceptable with prominent Manual Save training?
- Should `strategic_topic_notes` be formalized in a new migration, or should topic notes be mapped onto an existing structured notes table before PR 4B implementation?
- What identity model should structured autosave use for current numeric client IDs when migrating Strategic Topics, meeting notes, objectives, tasks, SOOs, and nested task records to UUID-backed structured tables?
- Should editor Manual Save remain enabled after structured autosave expands, or should editor writes gradually move to narrower structured tables while full-backup overwrite privileges are restricted?
- What UI copy is needed to prevent users from interpreting “Settings saved” as “full workspace saved” while Manual Save remains required?
- What stale-state and conflict warnings are acceptable for Last Save Wins before realtime/presence/merge behavior exists?


## Phase 4 PR 4B Strategic Topics Autosave Follow-up Questions

- What exact topic-note schema should be formalized: `strategic_topic_notes` keyed by `strategic_topic_id`, legacy `strategic_topic_item_id`, or both during migration?
- Should the existing `strategic_topics.notes` text column remain unused, hold a plain-text summary of rich Topic Notes, or be deprecated in documentation once `strategic_topic_notes` is formalized?
- Should the current Strategic Topic delete action become a real delete, archive, or hidden/removed state before structured autosave preserves it as durable behavior?
- What UI status language should distinguish Strategic Topic autosave, Topic Notes save/autosave, settings autosave, and Manual Save while all coexist?


## Phase 4 PR 4B Strategic Topics Autosave Resolved/Deferred Notes

- Resolved: Topic Notes use `public.strategic_topic_notes` with `meeting_id`, nullable `strategic_topic_id`, required legacy `strategic_topic_item_id`, `content_json`, and `content_text`.
- Resolved: Strategic Topic ordering is persisted on `public.strategic_topics.sort_order`.
- Resolved: `strategic_topics.notes` remains unused by the runtime rich Topic Notes editor; rich notes live in `strategic_topic_notes`.
- Deferred: delete semantics remain the existing non-destructive removed-context behavior; broader delete/archive product language can be revisited separately.
- Deferred: Objectives, tasks, SOOs, meeting notes, agenda items, decisions/actions, and cascading communication autosave remain future PRs.

## Phase 4 PR 4C Meeting Notes / Cascading Communications Autosave Resolved/Deferred Notes

- Resolved recommendation: the next implementation scope should be Meeting Notes + Cascading Communications only.
- Resolved recommendation: use a new active `meeting_notes` table rather than reusing `tactical_sessions`, `tactical_items`, `strategic_sessions`, or `strategic_session_notes` for mutable active autosave.
- Resolved recommendation: Meeting Notes and Cascading Communications should share the active table because they currently live in the same dated `MeetingRecord` and backup payload.
- Resolved recommendation: keep Last Save Wins and do not add realtime, merge, presence, or locking for this slice.
- Deferred: exact migration/RLS/client implementation details for `meeting_notes`.
- Deferred: Agenda Items and Decisions/Actions first-class structured autosave until the future agenda-discussion-decision-action workflow is decided.
- Deferred: Manual Save removal/demotion, Local Mode changes, Viewer UX/read-only enforcement, and collaboration conflict-resolution features.


## Phase 4 PR 4C follow-up questions

- What should the later Agenda/Decision/Action redesign do with the pass-through `notes_json` arrays currently preserved by `meeting_notes`?
- Should historical Meeting Notes rows receive an explicit archival/ended flag after Tactical History is created, or is current read-only UI plus `tactical_sessions.snapshot_json` sufficient for Team Beta?
- PR 4D implementation now finalizes the first runtime migration details for Defining Objectives, Tasks, and SOOs; Supabase preview validation remains before main readiness.

## Phase 4 PR 4D Objectives / Tasks / SOOs Resolved Schema Questions

- Resolved: rich descriptions use explicit `description_json` plus text-compatible description fields rather than undocumented metadata-only storage.
- Resolved: `tasks` use uniqueness by `(meeting_id, client_task_id)` while retaining `client_objective_id` for grouping/import compatibility.
- Resolved for this slice: nested task subtasks, comments, and activity history remain JSONB arrays on task rows; first-class nested-detail tables remain deferred unless reporting/audit needs justify them later.
- Resolved: cloud import/upsert preserves restored numeric client IDs and deletes structured rows missing from the restored Objective/Task/SOO backup payload.

## Phase 4 PR 4D Objectives / Tasks / SOOs Autosave Resolved/Deferred Notes

- Resolved: PR 4D uses the existing `objectives`, `tasks`, and `standard_operating_objectives` tables after schema reconciliation instead of creating replacement tables.
- Resolved: numeric client IDs remain the compatibility bridge for Defining Objectives, Tasks, SOOs, localStorage, Manual Save, and JSON backup/import.
- Resolved: nested task details stay embedded on each structured task row as JSON arrays for subtasks, comments, and activity history.
- Resolved: Cloud hydration loads `meetings.meeting_data` first and overlays structured rows only when present, preserving existing meetings and fallback behavior.
- Deferred: first-class Agenda Items autosave, first-class Decisions/Actions autosave, realtime collaboration, conflict/merge UI beyond Last Save Wins, Viewer UX, ownership transfer, Local Mode changes, Manual Save retirement, forgot password, UX polish, and the documentation refresh/main-readiness review.

## Phase 4 PR 4R Before Main Readiness Questions

- What exact product copy should distinguish structured autosave from Manual Save in the main-era README, user guide, and in-app status text?
- Should `docs/USER_GUIDE.md` and `docs/TESTING_GUIDE.md` both be added in the Documentation Refresh Sprint, or should testing guidance remain inside `docs/VALIDATION.md` until after main?
- What is the minimum accepted Forgot Password flow for main: reset request only, full reset completion route, or reset plus explicit user-facing troubleshooting guidance?
- Which Supabase/Vercel preview environment and test accounts should be treated as the canonical final Main Readiness Review environment?
- Should Agenda Items and Decisions/Actions remain documented as Manual Save-backed through main, or does the main readiness reviewer require their redesign before launch?
- Is Local Mode positioned as a supported browser-only mode for the main release, or should documentation call it a fallback mode pending future cloud-first onboarding?


## Before Main UX Architecture Review Questions

- Should the before-main UX sprint treat Agenda Items as first-class outcome containers with discussion notes, decision text, action items, completed state, promote-to-Strategic-Topic action, and cascade-needed markers?
- Should Decisions/Actions become a rollup/summary generated from agenda outcomes while still allowing standalone entries for items that do not belong to an agenda item?
- What is the minimum before-main Agenda/Decision autosave scope once the workflow is accepted: agenda title/order/completion only, or full discussion notes, decisions, action items, and cascade-needed markers?
- Should Manual Save remain visible in the sticky header through main, or move into Backup/Restore only after Agenda/Decision outcomes become first-class autosaved?
- Should Local Mode be labeled `Browser-only fallback` in the UI before main, or should that wording wait for a broader cloud-first onboarding pass?
- Should Strategic Topic lifecycle copy distinguish per-meeting `Reviewed this meeting` from durable `Completed` status before main?
- Should the menu label `Meeting History` be renamed to `Tactical History` in the before-main UX sprint while owner/editor visibility remains unchanged?
