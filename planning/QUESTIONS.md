# Open Questions

| Question | Area | Status |
| --- | --- | --- |
| What exact pending-invite table name, token strategy, expiration behavior, and acceptance transaction should PR 1A use? | Phase 3 shared access | Open |
| How should existing or test `meeting_members` rows using `admin` or `member` be migrated into the planned `editor` or `viewer` roles? | Phase 3 roles | Open |
| Should Team Beta allow Editors to invoke Manual Save, duplicate, archive, and soft-delete, or reserve some meeting-container actions for Owners? | Phase 3 permissions | Open |
| Should invitation revocation preserve an audit row, and when should re-inviting reuse or replace that row? | Phase 3 invites | Open |
| What Supabase schema should follow basic JSONB persistence if normalization is needed? | Cloud data model | Open |
| How long should workspace data remain JSONB before considering normalized tables? | Cloud data model | Open |
| Should local-to-cloud migration state eventually move from browser-local signatures into cloud metadata? | Migration | Open |
| What precise behavior should owner, editor, and viewer roles have? | Permissions | Open |
| Is realtime collaboration required after basic cloud persistence? | Collaboration | Open |
| How should archived/completed Strategic Topics be surfaced? | Product UX | Answered: use a Strategic Topic History modal with Completed and Archived tabs. |
| What refinements, if any, should the merged Meeting Setup flow receive after team testing? | Product UX | Open |
