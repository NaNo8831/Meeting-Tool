# Sprint 3A — Blueprint

## Branch
Cut ux/sprint-3a-architecture from main before any changes.

## Item 1 — MeetingWorkspace.tsx Split
Do this first. Extract one slice at a time. Build after each.

### Slice A — MeetingHeader.tsx
Files to create:
- components/MeetingHeader.tsx

What goes in it:
- Sticky header JSX
- Autosave chip display
- Settings/menu trigger button
- Meeting name display
- Status badges (closed, test mode, etc.)

Steps:
1. Read MeetingWorkspace.tsx in full to locate all header JSX and
   the props/state it consumes.
2. Create MeetingHeader.tsx accepting those values as props.
3. Replace the inline JSX in MeetingWorkspace.tsx with <MeetingHeader />.
4. Run: npm run lint && npx tsc --noEmit && npm run build
5. Commit: "Extract MeetingHeader.tsx from MeetingWorkspace"

### Slice B — useWorkspacePersistence.ts
Files to create:
- hooks/useWorkspacePersistence.ts

What goes in it:
- All autosave useEffect hooks for structured persistence
- All cloud API calls (strategic topics, agenda items, meeting notes,
  cascading comms, DOs, tasks, SOOs, meeting settings)
- Debounce logic tied to those saves

Steps:
1. Identify every autosave effect and cloud write in MeetingWorkspace.tsx.
2. Extract into the hook; return any state or callbacks needed by parent.
3. Replace inline logic in MeetingWorkspace.tsx with the hook call.
4. Run: npm run lint && npx tsc --noEmit && npm run build
5. Commit: "Extract useWorkspacePersistence.ts from MeetingWorkspace"

### Slice C — useWorkspaceMembers.ts
Files to create:
- hooks/useWorkspaceMembers.ts

What goes in it:
- Member loading on workspace mount
- Invitation management
- isMeetingOwner derivation

Steps:
1. Locate the members useEffect and all related state in
   MeetingWorkspace.tsx.
2. Extract into the hook; return members, isMeetingOwner, and any
   invitation handlers needed by the parent.
3. Replace inline logic in MeetingWorkspace.tsx with the hook call.
4. Run: npm run lint && npx tsc --noEmit && npm run build
5. Commit: "Extract useWorkspaceMembers.ts from MeetingWorkspace"

---

## Item 2 — Edit Playbook Cloud Persistence

**Status: already implemented prior to Sprint 3A. Comment fix only.**

Investigation findings (Sprint 3A):
- organization_info JSONB column already existed in meeting_settings
  (migration 20260523000000_add_structured_persistence_foundation.sql).
  No new migration was required (blueprint said TEXT; actual type is
  JSONB, which is correct for structured data).
- Cloud load was already wired: applyMeetingSettingsToState reads
  settings.organization_info and applies it to state on workspace load.
- Cloud save was already wired: meetingSettingsAutosavePayload includes
  organization_info and is debounce-autosaved via useWorkspacePersistence.
- localStorage key is already scoped per-meeting via
  getWorkspaceScopedStorageKey("leadership-organization-info").
- PlaybookDefinitionsModal is prop-driven; no direct storage access.

Action taken:
- Fixed inaccurate comment in MeetingHeader.tsx (L560–563) that said
  organization_info used a global localStorage key and that cloud
  scoping was deferred to Sprint 3. Corrected to reflect actual state.

---

## Item 3 — Dead Code Removal

Sequencing note: Delete handleOpenMembersModal before starting Slice C of Item 1.
They share the same code region and removing the dead code first
makes the extraction cleaner.

Files to modify:
- MeetingWorkspace.tsx (or extracted hooks post-Item 1)
- app/dashboard/page.tsx

Remove with a one-line comment before each deletion explaining why:
- handleOpenMembersModal — never called; ESLint warning every build
- handleImportWorkspaceBackup — workspace import removed from UI in Sprint 2
- handleImportBackupPlaceholder in dashboard/page.tsx — stub, never wired

Note: collectLocalWorkspaceStorage is NOT Item 3 scope. It has two active
callsites (refreshLocalWorkspaceMigrationSignature and
handleMigrateLocalWorkspaceToCloud) that exist solely for Local Mode.
It will be removed as part of Item 4.

Run: npm run lint && npx tsc --noEmit && npm run build
Commit: "Remove dead code: handleOpenMembersModal, handleImportWorkspaceBackup,
handleImportBackupPlaceholder"

---

## Item 4 — Local Mode Hard Removal

This touches many files. Before removing anything, produce a list of
every file containing isLocalMode, localModeRef, onContinueLocally,
/meeting/local, or "Local Mode" and report it to the project lead
for approval before starting removal.

Files to delete:
- app/meeting/local/page.tsx (and directory if empty)

Files to modify — remove all Local Mode logic:
- MeetingWorkspace.tsx — isLocalMode, localModeRef, localStorage
  fallback paths that exist solely for Local Mode
- components/AuthModal.tsx — onContinueLocally handler
- app/page.tsx — any remaining Local Mode wiring
- Any other files surfaced in the search above

Do NOT remove:
- getWorkspaceScopedStorageKey
- Manual Save / Backup / Restore
- Any localStorage reads/writes that serve cloud workspace sessions

Steps:
1. Search and report file list — wait for approval before proceeding.
2. Remove in order: route → detection logic → UI elements →
   handlers → localStorage keys exclusive to local mode → doc references.
3. Run: npm run lint && npx tsc --noEmit && npm run build
4. Commit: "Hard remove Local Mode — route, detection logic, UI, handlers"

---

## Item 5 — SQL and Schema Cleanup

Files to read:
- All files in supabase/migrations/

Files to update:
- docs/DATA_MODEL.md

Steps:
1. Read every migration file in order.
2. Document each in a table: filename | purpose | tables affected |
   status (active / superseded / legacy).
3. Flag any orphaned tables or columns no longer referenced in
   application code.
4. Do NOT delete any migration files.
5. Update docs/DATA_MODEL.md with findings.
6. Commit: "SQL and schema cleanup — document migrations, update DATA_MODEL"

---

## Item 6 — Doc Cleanup

Files to delete:
- docs/CLAUDE_CODE_START_HERE.md
- docs/CURRENT_PROJECT_STATUS.md
- docs/HANDOFF_TO_CLAUDE_CODE.md
- docs/CLAUDE_CHAT_HANDOFF.md
- docs/AUTH_EMAIL_SETUP.md

Files to update:
- docs/CONTRIBUTING.md or docs/DEVELOPMENT.md — absorb any
  still-relevant content from docs/AI_AGENT_WORKFLOW.md

Files to delete after consolidation:
- docs/AI_AGENT_WORKFLOW.md

Steps:
1. Read AI_AGENT_WORKFLOW.md and identify any content not already
   in CONTRIBUTING.md or DEVELOPMENT.md.
2. Merge that content into the appropriate doc.
3. Delete all six files.
4. Run: npm run lint && npx tsc --noEmit && npm run build
5. Commit: "Doc cleanup — remove stale transition docs, consolidate AI workflow"
