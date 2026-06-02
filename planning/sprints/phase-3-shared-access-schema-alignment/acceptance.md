# Phase 3 Shared Access Schema Alignment — Acceptance

## Documentation-planning PR acceptance
- [ ] Only docs/planning files changed.
- [ ] Phase 3 Shared Meeting Access Foundation is recorded as the current direction.
- [ ] Current schema and owner-only RLS findings are documented.
- [ ] The current `owner`/`admin`/`member` versus planned `owner`/`editor`/`viewer` mismatch is explicit.
- [ ] Pending pre-signup invites are part of the planned model.
- [ ] Manual Save, Local Mode, and surface-by-surface structured autosave boundaries are preserved.
- [ ] Realtime collaboration and expanded ownership models are explicitly deferred.

## Future PR 1A implementation acceptance
- [ ] A non-breaking Supabase migration explicitly aligns role storage toward `owner`, `editor`, `viewer`.
- [ ] Existing owner-created meetings remain accessible without data loss.
- [ ] Any existing `admin` or `member` rows receive deliberate migration or compatibility handling.
- [ ] Pending invitations can be stored before an invited person signs up.
- [ ] Invite lifecycle and duplicate/re-invite behavior are defined.
- [ ] `meetings.owner_id` remains the owner compatibility path.
- [ ] `meetings.meeting_data` remains intact for Manual Save and Backup/Restore.
- [ ] No membership-based RLS grant, dashboard UI, access-management UI, invite delivery, ownership transfer, org hierarchy, realtime feature, or autosave expansion is included.
