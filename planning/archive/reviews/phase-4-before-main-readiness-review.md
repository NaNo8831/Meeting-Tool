# Phase 4 PR 4R — Before Main Readiness Review

This is a review, documentation, and planning PR only. It does not implement features, change runtime behavior, add migrations, change RLS, redesign UI, or modify persistence.

## Files and areas reviewed

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/PERMISSIONS.md`
- `docs/VALIDATION.md`
- `planning/STATE.md`
- `planning/DECISIONS.md`
- `planning/DOMAIN.md`
- `planning/RISKS.md`
- `planning/QUESTIONS.md`
- Phase 3 and Phase 4 review files in `planning/reviews/`
- Supabase migrations through Phase 4 persistence work, including profiles, invitations, shared access, lifecycle hardening, Strategic Topics, Meeting Notes/Cascading Communications, and Objectives/Tasks/SOOs autosave.
- Runtime code paths were reviewed only to understand current behavior and documentation gaps; no application code was changed.

## 1. Executive Summary

Phase 4 is close enough to begin a controlled Before Main sequence, but it is not ready to merge to `main` without three follow-up PRs.

Completed Phase 4 persistence work materially reduces the previous Manual Save dependency for core operational surfaces. Cloud Meetings now have structured autosave coverage for Settings, Strategic Topics, Topic Notes, Meeting Notes, Cascading Communications, Defining Objectives, Tasks, nested task detail payloads, and Standard Operating Objectives. Backup/export/import remains available, Local Mode remains browser-only, and Manual Save remains the full-workspace backup safety net.

The primary readiness blockers are not additional autosave implementation. They are account recovery, documentation accuracy, and final validation discipline:

1. **Forgot Password is required before main.** Authentication supports sign in, sign up, session restore, profile bootstrap, and profile editing, but no account recovery flow is documented as implemented. A user who loses access to a password can be blocked from Cloud Meetings and shared meetings.
2. **Documentation is materially stale.** README and some architecture/data/validation notes still describe earlier Phase 1/2 assumptions or partial autosave states. A Documentation Refresh Sprint is needed before main so users and maintainers understand Cloud Meetings, Local Mode, Manual Save, autosave coverage, shared access, and backup/import correctly.
3. **Main Readiness Review should be a separate final PR.** After Forgot Password and documentation refresh, run a final validation-only review against Vercel/Supabase preview with owner, editor, removed editor, invitee, and non-member scenarios.

Expected next PR order:

- **PR A — Forgot Password**
- **PR B — Documentation Refresh Sprint**
- **PR C — Main Readiness Review**

## 2. Persistence Coverage Matrix

| Surface | Structured Autosave | Backup/Import | Shared Access | Status |
| --- | --- | --- | --- | --- |
| Settings | Yes — `meeting_settings` for dashboard/playbook title, organization/playbook setup info, meeting section order, and setup completion. | Yes — included in full workspace backup/import and overlaid by structured rows when present. | Owners/editors can edit; active members can read through meeting-scoped access. | **Main-ready after validation.** Keep Manual Save as full backup safety net. |
| Strategic Topics | Yes — structured Strategic Topic rows and ordering. | Yes — full backup/import remains available; Cloud import restores structured topic rows. | Owners/editors can edit; non-members blocked by meeting access. | **Main-ready after validation.** Delete/archive language remains a later UX/product question. |
| Topic Notes | Yes — rich Topic Notes use `strategic_topic_notes`. | Yes — restored through backup/import compatibility and structured restore path. | Owners/editors can edit; active members can read. | **Main-ready after validation.** Confirm deployed schema/RLS is aligned in preview. |
| Meeting Notes | Yes — active Meeting Notes persist through `meeting_notes`. | Yes — preserved in full backup/import; active structured rows overlay backup when present. | Owners/editors can edit; active members can read. | **Main-ready after validation.** Historical/archival semantics remain separate from active autosave. |
| Cascading Communications | Yes — persisted with Meeting Notes in `meeting_notes`. | Yes — preserved in full backup/import. | Owners/editors can edit; active members can read. | **Main-ready after validation.** Keep communication wording clear in docs. |
| Defining Objectives | Yes — structured `objectives` rows keyed by numeric client IDs. | Yes — full backup/import remains compatible; import restores structured rows. | Owners/editors can edit; active members can read. | **Main-ready after validation.** Numeric client ID compatibility remains intentional. |
| Tasks | Yes — structured `tasks` rows, including nested subtasks/comments/activity history as row JSON payloads. | Yes — full backup/import remains compatible; import restores structured rows. | Owners/editors can edit; active members can read. | **Main-ready after validation.** First-class nested task tables are deferred unless reporting/audit needs emerge. |
| SOOs | Yes — structured `standard_operating_objectives` rows. | Yes — full backup/import remains compatible; import restores structured rows. | Owners/editors can edit; active members can read. | **Main-ready after validation.** Verify reorder/color/status persistence in preview. |
| Agenda Items | No first-class structured autosave. | Yes — retained in full workspace backup/import and pass-through meeting note compatibility. | Shared editors can preserve through Manual Save/full backup. | **Manual Save dependency remains. Post Main unless agenda redesign becomes required before launch.** |
| Decisions/Actions | No first-class structured autosave. | Yes — retained in full workspace backup/import and pass-through meeting note compatibility. | Shared editors can preserve through Manual Save/full backup. | **Manual Save dependency remains. Post Main with future Agenda/Decision redesign.** |

### Remaining Manual Save dependencies

Manual Save remains required for:

- Full-workspace backup parity to `meetings.meeting_data`.
- Agenda Items until the future agenda/discussion/decision/action workflow is redesigned.
- Decisions/Actions until the same redesign is completed.
- Any other workspace state not represented in the current structured autosave tables.
- Explicit recovery/rollback posture while structured autosave continues to be validated.

Manual Save should remain visible through main. The Before Main documentation should explain that structured surfaces autosave individually, while Manual Save backs up the full workspace.

## 3. Authentication Review

### Current coverage

- **Login:** Supabase email/password login is available through the auth modal.
- **Signup:** Email/password signup is available and should create/authenticate a user through Supabase Auth.
- **Profile creation:** Dashboard/profile bootstrap creates or loads a profile for signed-in users.
- **Profile editing:** Signed-in users can edit their own first/last name display profile.
- **Invite acceptance:** Pending invitations are accepted by a signed-in user whose normalized auth email matches the pending invite email; acceptance creates/reactivates editor membership.
- **Session restore/expiration:** The auth hook restores Supabase session state and the app routes signed-in users into dashboard/cloud meeting flows. Expiration handling should be validated in preview because the user-facing recovery path is still thin.

### Findings and risks

| Finding | Readiness classification | Risk |
| --- | --- | --- |
| Forgot Password is missing from the implemented user-facing flow. | **Required Before Main** | Users can be locked out of owned/shared Cloud Meetings with no self-service account recovery. |
| Signup and invite acceptance depend on matching the invited email. | **Recommended Before Main docs/validation** | Users signing up with a different email will not see the invite; docs and UI copy need to explain matching email behavior. |
| Session expiration copy and retry behavior need manual preview validation. | **Recommended Before Main** | Expired sessions during a live meeting can look like autosave or permission failure. |
| Profile bootstrap/edit is adequate for beta, but profile data is display-only. | **Post Main** | Rich profile/organization concepts are not needed for main readiness. |

### Authentication recommendation

Implement **PR A — Forgot Password** before main. Keep it narrow:

- Add a reset-password request entry point from the auth modal.
- Use Supabase Auth password reset mechanics.
- Document the expected email redirect configuration.
- Validate reset request, reset completion, sign-in after reset, and safe handling for unknown emails.
- Do not add organizations, SSO, magic links, invite-token infrastructure, or broad auth redesign.

## 4. Shared Access Review

### Current coverage

- Owners can create meetings and receive owner membership rows.
- Owners can invite editors by email, list pending invitations, revoke pending invitations, and see active members.
- Invitees accept matching pending invitations after signing in with the invited email.
- Active editors can access shared meetings and edit current content surfaces allowed by shared access.
- Owners can remove active editors through a soft-removal flow.
- Removed editors lose access after refresh/reload and should be excluded from member counts.
- Tactical History visibility is available to owners and editors, with non-members blocked.
- Lifecycle/container hardening separates owner-only actions from editor content and Manual Save access.

### Findings and risks

| Area | Finding | Readiness classification |
| --- | --- | --- |
| Invitations | Pending invitations are not access grants, which is correct. Email-match acceptance should be documented for owners and invitees. | **Recommended Before Main** |
| Member management | Owner/editor list and owner removal coverage are adequate for beta. Owner self-removal is blocked. | **Main-ready after validation** |
| Owner/editor permissions | Editor editing is expected for Team Beta; Viewer role/read-only UX remains deferred. | **Post Main** |
| Tactical History | Owner/editor visibility is acceptable for beta; confirm removed-editor and non-member denial in final validation. | **Recommended Before Main validation** |
| Removal flows | Removed editor refresh/reload denial and member-count exclusion require final regression validation. | **Required in PR C validation** |
| Ownership transfer | Not implemented and should stay deferred unless owner self-removal or account recovery needs require it. | **Post Main dependency** |

### Shared access recommendation

No new shared-access feature PR is required before main unless final validation exposes regressions. Document current roles clearly: owner and editor are the only practical Team Beta roles; Viewer exists as a future role direction but has no complete read-only UX.

## 5. Local Mode Review

### Current purpose

Local Mode remains a browser-only workspace for users who want to run the Meeting Tool without signing in or cloud sync. It also acts as a safety fallback for operational use and development/testing.

### Current usage

- Uses browser `localStorage`.
- Does not read or write Cloud Meeting structured autosave tables.
- Supports JSON export/import.
- Can be explicitly migrated/imported into a selected Cloud Meeting through existing backup/import workflows.

### Migration path

Retain Local Mode through main. Document a simple migration path:

1. Export/backup Local Workspace JSON.
2. Create/sign in to Cloud Meeting.
3. Import the backup into the Cloud Meeting.
4. Use Manual Save once after import as full-workspace backup safety, while structured surfaces restore to their tables.

### Recommendation

**Retain Local Mode for main.** Do not remove or deprecate it in this cycle. Reconsider deprecation only in a future version after Cloud Meetings, account recovery, backup/import, and documentation have been stable for real users.

## 6. UX Review

The following backlog is collected from current planning context and should be separated by launch criticality.

### Before Main

| Item | Recommendation | Rationale |
| --- | --- | --- |
| Autosave visibility | Clarify status copy and docs so users understand structured autosave vs Manual Save. | Prevents false confidence that every surface is autosaved. |
| Manual Save placement | Keep visible; consider copy/placement polish only if it reduces confusion without redesign. | Agenda Items and Decisions/Actions still depend on full backup. |
| Meeting refresh behavior | Validate refresh/new-browser behavior across autosaved surfaces and Manual Save-only surfaces. | High-risk live meeting scenario. |
| Multi-session behavior | Document Last Save Wins and validate two-session overwrite expectations. | Collaboration risk remains by design. |
| Tactical History naming | Decide whether current naming is understandable enough for main docs. | Users may confuse active Meeting Notes with history snapshots. |
| Members button | Ensure existing access/member entry point is discoverable enough in docs; avoid new redesign unless validation shows severe confusion. | Shared access must be operable for beta. |

### Post Main

| Item | Recommendation | Rationale |
| --- | --- | --- |
| Sticky header | Post Main UX polish. | Helpful, not a readiness blocker. |
| Dashboard card redesign | Post Main. | Larger redesign risk before main. |
| Open button sizing | Post Main unless accessibility/validation exposes a critical issue. | Low operational risk. |
| Other menu | Post Main information architecture polish. | Avoid churn before main. |
| Members button redesign | Post Main if documentation is sufficient for main. | Do not block on visual polish. |
| Tactical History renaming/redesign | Post Main unless final review finds serious misunderstanding. | Naming can be documented for beta. |

## 7. Documentation Review

### Findings

| Document area | Finding | Readiness classification |
| --- | --- | --- |
| `README.md` | Still describes Phase 1 localStorage-first and Phase 2 auth foundation as if workspace data is not stored in Supabase yet. This contradicts completed Phase 4 structured autosave. | **Required Before Main** |
| `docs/ARCHITECTURE.md` | Mostly reflects Phase 4 PR 4D but should be refreshed into a stable main-era architecture summary rather than a PR-by-PR log. | **Required Before Main** |
| `docs/DATA_MODEL.md` | Needs a concise current Cloud Meeting data model covering `meetings.meeting_data`, structured autosave tables, memberships, invitations, profiles, and Local Mode backup/import. | **Required Before Main** |
| `docs/PERMISSIONS.md` | Needs a main-ready permissions matrix for owner/editor/non-member plus deferred Viewer semantics. | **Required Before Main** |
| `docs/VALIDATION.md` | Contains useful PR validation history, but needs a current validation checklist and final main-readiness test plan. | **Required Before Main** |
| `planning/*` | Planning source is comprehensive but still includes many historical phase notes. Keep it, but add a current-state summary and close resolved questions. | **Recommended Before Main** |
| `USER_GUIDE` | No current user guide file was found. | **Recommended Before Main** |
| `TESTING_GUIDE` | No dedicated testing guide file was found. | **Recommended Before Main** |

### Recommended Documentation Refresh Sprint scope

**PR B — Documentation Refresh Sprint** should update or add:

1. `README.md`
   - Current product summary.
   - Local Mode vs Cloud Meeting.
   - Auth/shared access summary.
   - Autosave vs Manual Save explanation.
   - Backup/export/import recovery path.
2. `docs/ARCHITECTURE.md`
   - Main-ready architecture overview.
   - Structured autosave surfaces.
   - Manual Save safety-net role.
   - Last Save Wins limitation.
3. `docs/DATA_MODEL.md`
   - Current tables and payload ownership.
   - Structured vs backup JSON responsibilities.
   - Numeric client ID compatibility for objectives/tasks/SOOs.
4. `docs/PERMISSIONS.md`
   - Owner/editor/non-member matrix.
   - Pending invite is not access.
   - Removed editor denial.
   - Deferred Viewer/ownership transfer.
5. `docs/VALIDATION.md` or new `docs/TESTING_GUIDE.md`
   - Main readiness validation checklist.
   - Manual testing accounts and scenarios.
   - Refresh/new-browser/multi-session checks.
6. New `docs/USER_GUIDE.md` if scope allows
   - Start local.
   - Create/sign in to Cloud Meeting.
   - Invite/accept.
   - Run weekly meeting.
   - Use autosave/Manual Save/Backup Restore.
   - Recover password after PR A.

## 8. Security Review

### Current coverage

- RLS is enabled and scoped around owner/member access for meeting-scoped tables.
- Shared access helper functions distinguish access/edit/manage concepts.
- Pending invitations are not runtime access grants.
- Member removal is soft removal and should invalidate access on refresh/reload.
- Lifecycle hardening restricts editor mutation of owner-only meeting container fields while preserving editor content/Manual Save access.
- Profiles are user-owned/display-focused.
- Invite acceptance is constrained to the signed-in user's normalized email.

### Remaining risks and recommended hardening

| Risk | Classification | Recommendation |
| --- | --- | --- |
| No forgot password / account recovery. | **Required Before Main** | Implement PR A. Account recovery is a security and operational availability requirement. |
| Last Save Wins can overwrite another active editor's recent changes. | **Recommended Before Main docs** | Document limitation; do not implement realtime/merge before main. |
| Editor can still write full `meeting_data` via Manual Save while some surfaces remain manual/backed-up only. | **Recommended Before Main docs/validation** | Keep for backup compatibility; explain that owner/editor trust model is intentional for Team Beta. |
| Agenda Items and Decisions/Actions are not first-class structured rows. | **Post Main** | Address with future agenda/decision redesign rather than ad hoc schema. |
| Ownership transfer is absent. | **Post Main** | Keep owner self-removal blocked; revisit transfer if owner account loss/departure becomes operationally urgent. |
| Viewer role exists in role direction but lacks full read-only UX enforcement. | **Post Main** | Do not expose Viewer as a polished main feature until UI and write paths are fully read-only. |
| Documentation drift can create unsafe operator assumptions. | **Required Before Main** | Refresh docs and validation guide before final readiness review. |

## 9. Testing Review

### Existing validation coverage

Existing validation notes cover:

- Lint/typecheck/build expectations for app-code changes.
- Profiles.
- Invitations.
- Member management.
- Shared-access hardening.
- Lifecycle mutation hardening.
- Settings autosave.
- Strategic Topics/Topic Notes autosave.
- Meeting Notes/Cascading Communications autosave.
- Defining Objectives/Tasks/SOOs autosave.
- Documentation-only PR validation expectations.

### Missing testing guide coverage

A dedicated `TESTING_GUIDE` should include:

1. **Test accounts**
   - Owner account.
   - Editor invitee account.
   - Removed editor account or reused editor after removal.
   - Non-member account.
2. **Authentication**
   - Sign up.
   - Sign in.
   - Profile bootstrap/edit.
   - Forgot Password after PR A.
   - Session expiration/reload behavior.
3. **Shared access**
   - Invite creation.
   - Duplicate invite blocking.
   - Invite revoke.
   - Invite acceptance.
   - Pending invite denial before acceptance.
   - Editor access.
   - Editor removal.
   - Non-member denial.
4. **Persistence**
   - Refresh/new browser for each structured autosave surface.
   - Backup export/import.
   - Manual Save-only Agenda Items and Decisions/Actions.
   - Local Mode isolation.
5. **Meeting-critical UX**
   - Task workflow.
   - Task details, comments, activity history, subtasks.
   - Rich text editing.
   - Drag/drop ordering.
   - Meeting sections.
   - Tactical History.
6. **Security/negative checks**
   - Direct URL access as non-member.
   - Removed-editor access after reload.
   - Editor attempts owner-only lifecycle actions.
   - Pending invitee before acceptance.

## 10. Release Readiness Matrix

| Item | Classification | Notes |
| --- | --- | --- |
| Forgot Password | **Required Before Main** | Required account recovery path. |
| Documentation Refresh Sprint | **Required Before Main** | README/docs are stale relative to completed Phase 4. |
| Final Main Readiness Review | **Required Before Main** | Must validate preview after PR A and PR B. |
| Confirm review-only PR constraints | **Required Before Main** | This PR must remain docs/planning only. |
| Supabase preview validation of Phase 4 autosave | **Required Before Main / PR C** | Validate deployed migrations/RLS/runtime together. |
| Removed-editor/non-member negative validation | **Required Before Main / PR C** | Security-critical shared access check. |
| Autosave visibility copy/docs | **Recommended Before Main** | Can be documentation-first unless UI confusion is severe. |
| Manual Save explanation | **Recommended Before Main** | Required in docs; UI placement can remain unless validation fails. |
| Local Mode retention/docs | **Recommended Before Main** | Retain for main and explain migration/import. |
| USER_GUIDE | **Recommended Before Main** | Strongly recommended for beta onboarding. |
| TESTING_GUIDE | **Recommended Before Main** | Can be part of docs refresh or PR C preparation. |
| Sticky header | **Post Main** | UX polish. |
| Dashboard card redesign | **Post Main** | Avoid pre-main redesign. |
| Open button sizing | **Post Main** | Unless accessibility validation finds a blocker. |
| Other menu redesign | **Post Main** | Information architecture polish. |
| Members button redesign | **Post Main** | Document current behavior first. |
| Tactical History naming redesign | **Post Main** | Document current semantics for beta. |
| Agenda/Decision redesign | **Post Main** | Needed before first-class structured autosave for those surfaces. |
| Ownership transfer | **Post Main** | Keep owner self-removal blocked until designed. |
| Viewer UX/read-only enforcement | **Post Main** | Do not expose as complete main capability. |
| Realtime collaboration/conflict UI | **Post Main** | Last Save Wins remains Team Beta model. |

## 11. Recommended Next PR Order

### PR A — Forgot Password

Scope:

- Add self-service password reset request and completion flow.
- Configure/document Supabase redirect behavior.
- Validate reset request/completion and post-reset sign-in.

Do not include shared-access redesign, invite tokens, organizations, SSO, or persistence changes.

### PR B — Documentation Refresh Sprint

Scope:

- Refresh README and core docs to match current Phase 4 Cloud Meeting reality.
- Add or update user/testing guidance.
- Clarify autosave vs Manual Save, Local Mode, backup/import, shared access, permissions, and known limitations.

Do not include runtime behavior changes.

### PR C — Main Readiness Review

Scope:

- Final validation-only review after PR A and PR B.
- Confirm Vercel/Supabase preview behavior with owner/editor/removed-editor/non-member scenarios.
- Confirm all Required Before Main items are complete or explicitly accepted as risks.

Do not include feature implementation except emergency fixes in separate narrow PRs.

## 12. Validation for this PR

Confirmed for PR 4R:

- Review only.
- No runtime changes.
- No schema changes.
- No migrations.
- No RLS changes.
- No UI changes.
- No persistence changes.
