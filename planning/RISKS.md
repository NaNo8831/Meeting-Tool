# Risks

Last updated: 2026-06-24 (pre-beta polish). Entries reflect the current cloud-first, Team Beta state.

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Last Save Wins — no conflict resolution. | Concurrent editors can silently overwrite each other's changes. | Keep Team Beta small, communicate Last Save Wins behavior explicitly, preserve Manual Save / JSON Backup-Restore as recovery paths. Realtime conflict handling is deferred. |
| Manual Save is still the primary rollback path while structured autosave stabilizes. | A user who never uses Manual Save has no cloud rollback point beyond the last autosave write. | Keep Manual Save visible and accessible to owners and editors. Do not remove it until autosave coverage is proven and validated across all surfaces. |
| Supabase migrations must be applied manually per environment. | A missed migration causes silent feature failure or RLS errors in production or preview. | Apply all migrations in `supabase/migrations/` in timestamp order on every environment. New migrations should be noted in `planning/STATE.md`. |
| Viewer read-only UX enforcement is incomplete. | Viewers can currently reach edit surfaces in the workspace UI even though RLS blocks their writes at the DB layer. | Polished Viewer UI enforcement is deferred. Until implemented, viewers should be aware of the current state. Do not grant viewer access to users who need true read-only isolation. |
| Rich text editing can be fragile. | Formatting or editing may break meeting flow. | Keep formatting lightweight and regression-test editor flows after any RichTextEditor or autosave changes. |
| Drag-and-drop can conflict with text editing and selection. | Users may accidentally move items while editing. | Test pointer/selection behavior around draggable content after any section or drag affordance changes. |
| Feature branches can drift from `dev` during parallel work. | Work may target stale assumptions or cause merge conflicts. | Confirm branch context, keep branches short-lived, merge to `dev` promptly, and update `planning/STATE.md` on every merge. |
