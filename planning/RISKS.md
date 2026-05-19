# Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| `localStorage` is browser/device-specific. | Local Workspace users may not see the same workspace on another browser or device. | Keep backup/export visible and keep Cloud Workspace migration explicit. |
| No shared live collaboration. | Leadership teams cannot safely co-edit one live workspace yet. | Treat collaboration as Phase 2 planning unless explicitly prioritized. |
| Data loss without regular exports. | Browser reset or device loss can remove workspace data. | Encourage JSON backup exports and retain import/export after cloud launch. |
| Cloud migration could overwrite or duplicate local data. | Users may lose or duplicate workspace records. | Do not auto-migrate; prompt only when signed in with a selected Cloud Workspace and meaningful Local Workspace data, warn before cloud overwrite, recommend JSON export first, leave localStorage intact, and record migration signatures to reduce duplicate prompts. |
| Multiple Codex PRs can drift. | Work may target the wrong branch or stale assumptions. | Confirm branch context and update planning state/decisions. |
| Rich text editing can be fragile. | Formatting or editing may break meeting flow. | Keep formatting lightweight and regression-test editor flows. |
| Drag/drop can conflict with editing/selecting text. | Users may accidentally move items while editing. | Test pointer/selection behavior around draggable content. |
| Permission model is only owner-based for now. | Future sharing could expose or restrict data incorrectly if expanded too quickly. | Keep current RLS owner-only and define owner/editor/viewer behavior before team sharing. |
