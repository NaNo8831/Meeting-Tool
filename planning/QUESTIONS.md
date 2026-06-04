# Open Questions

| Question | Area | Status |
| --- | --- | --- |
| What exact pending-invite table name, token strategy, expiration behavior, and acceptance transaction should PR 1A use? | Phase 3 shared access | Refined: PR 1A uses `meeting_invitations` with pending/accepted/revoked status and no token/expiration/acceptance transaction yet; PR 1B/follow-up invite UX must define token delivery and acceptance flow. |
| How should existing or test `meeting_members` rows using `admin` or `member` be migrated into the planned `editor` or `viewer` roles? | Phase 3 roles | Answered in PR 1A: `owner` stays `owner`; `admin` and `member` migrate to `editor`; future roles are constrained to `owner`, `editor`, `viewer`. |
| Should Team Beta allow Editors to invoke Manual Save, duplicate, archive, and soft-delete, or reserve some meeting-container actions for Owners? | Phase 3 permissions | Refined: PR 1B permits owners/editors to update `meetings` so Manual Save to `meeting_data` can work for editors, but dashboard container-action UI remains deferred to PR 2+ and needs an explicit product decision before exposing duplicate/archive/soft-delete to editors. |
| Should invitation revocation preserve an audit row, and when should re-inviting reuse or replace that row? | Phase 3 invites | Refined: PR 1A preserves rows with `pending`, `accepted`, or `revoked` status and blocks duplicate active pending invites; follow-up UX should decide whether to update revoked rows or insert new rows when re-inviting. |
| What Supabase schema should follow basic JSONB persistence if normalization is needed? | Cloud data model | Open |
| How long should workspace data remain JSONB before considering normalized tables? | Cloud data model | Open |
| Should local-to-cloud migration state eventually move from browser-local signatures into cloud metadata? | Migration | Open |
| What precise behavior should owner, editor, and viewer roles have? | Permissions | Refined: PR 1B defines database-level access/edit/manage helpers: owner can access/edit/manage; active editor can access/edit but not manage access; active viewer can access/read, with Viewer UI/read-only enforcement deferred. |
| Is realtime collaboration required after basic cloud persistence? | Collaboration | Open |
| How should archived/completed Strategic Topics be surfaced? | Product UX | Answered: use a Strategic Topic History modal with Completed and Archived tabs. |
| What refinements, if any, should the merged Meeting Setup flow receive after team testing? | Product UX | Open |
