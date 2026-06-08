# Open Questions

## Remaining Open Questions Before Main

- **Meeting State Review:** Are local/cloud route hydration, active meeting IDs, setup/title state, section order normalization, Manual Save fallback state, and structured overlay behavior coherent enough for main, or are there blocker inconsistencies to fix first?
- **Forgot Password:** What exact Supabase password-reset redirect URL and production/preview email template behavior should be validated before main?
- **Documentation Refresh:** Which user-facing docs need to be added or refreshed beyond README and architecture docs so the main release accurately explains Shared Access, structured autosave, Manual Save, Local Mode, and Backup/Restore?
- **Main Readiness Review:** What is the final acceptance checklist for Vercel preview + Supabase validation before merging `phase-3-shared-access` to `main`?
- **Local Mode:** Should Local Mode be labeled as a browser-only fallback before main, remain as-is until after main, or be hidden/demoted only after cloud readiness is confirmed?
- **Legacy Agenda/Decision compatibility:** Should legacy standalone `decisionItems` remain available only through backup/import compatibility, be shown in a collapsed legacy drawer, or receive a later one-time migration into Agenda Item outcomes?
- **Promote to Strategic Topic:** Is client-side sequential promotion acceptable through main, or does final validation identify a blocker requiring a transactional RPC before main?
- **Viewer behavior:** Is the absence of polished Viewer read-only UI acceptable for main while owner/editor Team Beta remains the supported collaboration model?

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

## Before Main UX Follow-up Review Questions

- Resolved for UX-2A: Dashboard/opened cloud meeting title consistency was safe as display-only alignment by preferring the existing `meetings.name` value in the opened cloud meeting header. No persistence syncing was added between `meetings.name`, `meeting_settings.dashboard_title`, local workspace title, or cloud meeting title.
- Which helper-copy removals are safe because the UI is self-explanatory, and which permission/data-loss warnings must remain explicit?
- If Start Meeting, End Meeting, and Test Mode move into the sticky header, what is the smallest responsive layout that keeps Manual Save and autosave status visible?
- For UX-2B, which rich text surfaces should keep modal/draft boundaries for intentional editing, and which should convert to inline Save/Cancel first?
- For UX-3A, should Agenda Item become the parent object for notes, Decision/Action outcome, completed state, cascade marker, and promote-to-Strategic-Topic conversion?
- After Decisions/Actions is removed or replaced, should Cascading Communications remain a separate section, become an agenda-outcome rollup, or display only outcomes marked for cascade?
- Should UX-3B happen before main only if final validation finds Agenda/Decision capture blocking, or remain post-main by default with Manual Save covering the current separate Agenda and Decisions/Actions lists?


## UX-3A Agenda / Decision Architecture Review Questions

- Resolved recommendation: Agenda Item should become the parent object for discussion notes, one primary Decision/Action outcome selector, covered/completed state, cascade-needed marker, and promote-to-Strategic-Topic action.
- Resolved recommendation: Agenda actions should not include due dates; ownership, due dates, status, and task tracking belong in Defining Objectives / Tasks.
- Resolved recommendation: the separate Decisions/Actions capture section should eventually be replaced by a read-only rollup/summary from Agenda Item outcomes, with legacy `decisionItems` preserved during transition.
- Open for implementation: should Agenda discussion notes be stored directly on `agenda_items`, or should implementation use a one-to-one `agenda_item_notes` table if independent save status/history is needed?
- Open for implementation: does Promote to Strategic Topic need a transactional RPC across `agenda_items`, `strategic_topics`, and `strategic_topic_notes`, or are client-side sequential writes acceptable for the first PR?
- Open for post-main: do teams need multiple outcomes per Agenda Item or optional standalone decision/action entries, or is one primary Agenda Item outcome enough?

## UX-3B Agenda / Decision Follow-up Questions

- Should future promotion use a dedicated transactional RPC so Agenda Item linkage, Strategic Topic creation, and seeded Topic Notes are committed atomically?
- Should legacy `decisionItems` receive a one-time migration tool into Agenda Item outcomes after teams validate the rollup workflow?
- Should Agenda Items eventually support multiple actions per item, or is one action text field sufficient for the main release?


## Agenda Workspace Layout Review Questions

- Resolved recommendation: Agenda Items should become the fixed full-width primary workspace, not a movable peer section.
- Resolved recommendation: Strategic Topics should be treated as the planning/long-term follow-up surface and may remain movable only within the secondary follow-up area.
- Resolved recommendation: Cascading Communication should be treated as the output/communication surface and may remain movable only within the secondary follow-up area.
- Resolved recommendation: Option A is the preferred future desktop layout: Agenda Items full width, with Strategic Topics and Cascading Communication side-by-side beneath where screen width allows.
- Open for implementation: where should the read-only Decisions / Actions summary live if it remains visible: inside the Agenda workspace, directly below Agenda Items, or below the secondary follow-up surfaces?
- Open for implementation: how should existing persisted `meetingSectionOrder` values be normalized so older workspaces cannot place Agenda Items below secondary sections?

## Agenda Item UX Polish Review Questions

- Resolved recommendation: Agenda Item Notes should move to a stable left-side or left-leading card position aligned with the Strategic Topic note-control pattern.
- Resolved recommendation: covered Agenda Items should collapse to title-only by default, remain re-expandable, and preserve covered state until explicitly unchecked.
- Resolved recommendation: the always-visible Decisions/Actions rollup should not remain the default long-term pattern because it duplicates Agenda Item outcomes and adds live-workspace noise.
- Open for implementation: should the optional Decisions/Actions summary be collapsed by default inside Agenda Items, moved to End Meeting, or omitted entirely from the live workspace?
- Open for implementation: should covered collapsed cards keep `Cascade Needed` and `Promoted` chips visible next to the title?
- Open for implementation: should rich-text Discussion Notes use a new accessible read/edit wrapper for double-click editing, or reuse an existing editing component pattern?
- Open for implementation: should legacy standalone `decisionItems` be hidden but preserved, shown in a collapsed legacy drawer, or only remain available through backup/import data after the live rollup is removed?

## Meeting State Review Questions

- Resolved recommendation: ended dated meeting records should remain read-only by default before main to protect Tactical History snapshot integrity.
- Resolved recommendation: Test Mode should be treated as a testing-only tool, not the normal workaround for continuing real meetings after refresh.
- Open before-main: should Cloud Meeting refresh keep restoring the last active dated meeting from `leadership-active-meeting-id`, or should it prefer today's editable meeting when one exists?
- Open before-main: should the next UX PR add only clearer read-only/current-meeting navigation, or should it introduce an explicit Continue/Reopen Meeting action?
- Open before-main: if Continue/Reopen Meeting is introduced, should active editors be allowed to use it as content editing, or should it be owner-only lifecycle control?
- Open before-main: should End Meeting remain Tactical History snapshot-only, or should it also trigger/offer a full Manual Save backup refresh?

