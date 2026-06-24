# Sprint 3A — Acceptance Criteria

Sprint 3A is not complete until all of the following are true.

## Item 1 — MeetingWorkspace.tsx Split
- [ ] MeetingHeader.tsx exists and renders the sticky header,
      autosave chip, menu trigger, meeting name, and status badges
- [ ] useWorkspacePersistence.ts exists and owns all autosave effects
      and cloud API calls
- [ ] useWorkspaceMembers.ts exists and owns member loading,
      invitations, and isMeetingOwner
- [ ] MeetingWorkspace.tsx imports and uses all three — no inline duplication
- [ ] Build passes after each individual extraction
- [ ] No functional behavior has changed

## Item 2 — Edit Playbook Cloud Persistence
- [ ] A new Supabase migration adds organization_info to meeting_settings
- [ ] Edit Playbook saves write to meeting_settings.organization_info
- [ ] Workspace load reads organization_info from cloud; falls back
      to localStorage if null
- [ ] Playbook data survives a fresh browser session
- [ ] The inaccurate comment in MeetingWorkspace.tsx is corrected
- [ ] Build passes

## Item 3 — Dead Code Removal
- [ ] handleOpenMembersModal is gone
- [ ] handleImportWorkspaceBackup is gone
- [ ] collectLocalWorkspaceStorage is gone
- [ ] handleImportBackupPlaceholder is gone
- [ ] npm run lint produces no ESLint warning for these functions
- [ ] Build passes

## Item 4 — Local Mode Hard Removal
- [ ] /meeting/local route does not exist
- [ ] isLocalMode and localModeRef are gone from the codebase
- [ ] onContinueLocally is gone
- [ ] No UI element references Local Mode
- [ ] getWorkspaceScopedStorageKey still exists and works
- [ ] Manual Save, Backup, and Restore still work
- [ ] Build passes

## Item 5 — SQL and Schema Cleanup
- [ ] Every migration file is documented in a table in DATA_MODEL.md
- [ ] Any orphaned tables or columns are flagged with notes
- [ ] No migration files were deleted
- [ ] DATA_MODEL.md is updated and accurate

## Item 6 — Doc Cleanup
- [ ] All six stale docs are deleted
- [ ] Any still-relevant AI_AGENT_WORKFLOW.md content is in
      CONTRIBUTING.md or DEVELOPMENT.md
- [ ] Build passes

## Overall
- [ ] npm run lint passes clean
- [ ] npx tsc --noEmit passes clean
- [ ] npm run build passes clean
- [ ] No merge to main has occurred
