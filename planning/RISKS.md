# Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| `localStorage` is browser/device-specific. | Local Workspace users may not see the same workspace on another browser or device. | Keep backup/export visible and keep Cloud Meeting migration explicit. |
| Shared Team Beta uses Last Save Wins without live conflict resolution. | Concurrent edits can overwrite each other. | Keep the Team Beta small, communicate Last Save Wins behavior, preserve Manual Save/Backup Restore, and defer realtime/presence/cursors/websockets/CRDTs until separately prioritized. |
| Data loss without regular exports. | Browser reset or device loss can remove workspace data. | Encourage JSON backup exports and retain import/export after cloud launch. |
| Cloud migration could overwrite or duplicate local data. | Users may lose or duplicate workspace records. | Do not auto-migrate; prompt only when signed in with a selected Cloud Meeting and meaningful Local Workspace data, warn before cloud overwrite, recommend JSON export first, leave localStorage intact, and record migration signatures to reduce duplicate prompts. |
| Multiple Codex PRs can drift. | Work may target the wrong branch or stale assumptions. | Confirm branch context and update planning state/decisions. |
| Rich text editing can be fragile. | Formatting or editing may break meeting flow. | Keep formatting lightweight and regression-test editor flows. |
| Drag/drop can conflict with editing/selecting text. | Users may accidentally move items while editing. | Test pointer/selection behavior around draggable content. |
| Permission model is only owner-based for now, and current schema roles are `owner`/`admin`/`member` rather than planned `owner`/`editor`/`viewer`. | Shared-access expansion could expose or restrict data incorrectly if schema and policies move together too quickly. | Align schema explicitly in PR 1A, preserve the owner path, then add membership RLS separately in PR 1B. |
