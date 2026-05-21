# Permissions

## Current State
- Signed-out users can use Local Workspace with browser `localStorage` and JSON export/import backup.
- Supabase email/password auth is available on `phase-2-cloud` when environment variables are configured.
- Authenticated users can create and select owner-only Cloud Meetings; selected cloud meeting IDs are scoped by signed-in user in browser state.
- Selected Cloud Meetings can save and load full Meeting Tool workspace backup JSON in owner-only Supabase storage through explicit load/save actions.
- Authenticated owners can explicitly migrate their browser-local Local Workspace data into a selected Cloud Meeting they own; RLS prevents migrating into another user’s workspace.
- Tester feedback can be submitted to Supabase separately from workspace persistence.

## Current Supabase RLS

### `feedback`
- Anonymous and authenticated users can insert tester feedback.
- Authenticated feedback rows must either have `user_id` unset or match `auth.uid()`.

### `meetings`
- Only authenticated users can insert workspace containers where `owner_id = auth.uid()`.
- Only authenticated users can select workspace containers they own.
- Only authenticated users can update the name, metadata, or `meeting_data` for workspaces they own.
- Anonymous users have no workspace-container access.

## Future Planned Roles
| Role | Planned Direction |
| --- | --- |
| Owner | Workspace creator/admin with full control over workspace settings, members, data, export, and destructive actions. |
| Editor | Can participate in meeting operations and update workspace content. |
| Viewer | Can read workspace content with limited or no mutation rights. |

## Open Items After Basic Cloud Persistence
- Exact owner/editor/viewer permissions.
- Invitation and membership model.
- Workspace transfer or recovery behavior.
- Export/import behavior for each role.
- Whether realtime collaboration is part of initial cloud launch.
- Future conflict behavior if sharing or realtime collaboration is introduced.

This file documents the current owner-only basic Cloud Meeting persistence and optional local-to-cloud migration foundation plus future planning. Do not implement broader permissions unless a future scoped task explicitly requests it on the correct branch.
