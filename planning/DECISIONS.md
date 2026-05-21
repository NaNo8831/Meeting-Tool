# Durable Decisions

| Date | Decision | Rationale / Notes |
| --- | --- | --- |
| 2026-05-21 | Track deferred non-critical roadmap items in `planning/FUTURE_PHASES.md`. | Creates an explicit scope-control backlog so future UX/org/sharing/roles/realtime/template/recap/mobile ideas are preserved without expanding active sprint scope. |
| 2026-05-17 | Make Local Workspace migration explicit, optional, and backup-shaped. | Migration into Cloud Workspace uses the same JSON backup object as export/import and `workspace_data`, warns before overwriting cloud data, leaves localStorage intact, and records a browser-local signature per user/workspace to avoid repeated prompts for the same local data. |
| 2026-05-17 | Store basic Cloud Workspace data as nullable JSONB on `workspaces.workspace_data`. | Keeps the Phase 2 persistence step small by saving the existing JSON backup shape for owner-only Cloud Workspaces while preserving Local Workspace, export/import, and no forced migration. |
| 2026-05-17 | Keep Cloud Workspace load/save explicit. | Selecting a cloud workspace container must not load or overwrite visible workspace data; saving to cloud requires an overwrite confirmation so local imports and current data are not silently pushed to Supabase. |
| 2026-05-16 | Add owner-only Supabase workspace containers before full cloud persistence. | Creates a safe Cloud Workspace identity for future Phase 2 work while keeping Local Workspace as the default and preserving localStorage plus JSON export/import behavior. |
| 2026-05-15 | Close stale Supabase Foundation PR work in favor of a fresh PR based on the updated `phase-2-cloud` branch. | Keeps Phase 2 cloud work aligned with the current long-running branch and avoids carrying forward drift from older PR context. |
| 2026-05-13 | Phase 1 remains localStorage-first. | Keeps the live operational beta simple while usability stabilizes. |
| 2026-05-13 | Deploy through Vercel. | Current production deployment path for the Next.js app. |
| 2026-05-13 | Keep JSON export/import backup even after cloud persistence is introduced. | Backup/restore protects users and supports migration/recovery. |
| 2026-05-13 | Keep UX lightweight and meeting-friendly. | The tool supports live weekly leadership meetings, not heavy project management. |
| 2026-05-13 | Supabase is the likely Phase 2 platform for cloud/auth/persistence. | Directional decision only; schema and migration design are unresolved. |
| 2026-05-13 | Use a separate long-running `phase-2-cloud` branch for cloud/auth/storage work. | Reduces risk to production/stable `main` while larger architecture work is planned. |
| 2026-05-13 | Treat `main` as production/stable and UX stabilization. | Main deploys to Vercel and should remain stable. |
