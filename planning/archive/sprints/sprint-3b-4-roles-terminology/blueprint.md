# Sprint 3B-4 — Blueprint

Branch: sprint-3b-4-roles-terminology cut from dev.

## Item 1 — Terminology Cleanup

Files to search and fix:
- All source files under app/

Changes:
1. "Testing Mode" → "Test Mode" everywhere
2. "Action date" or "action date" → "Meeting date" everywhere
   (confirm current usage first — report before changing)
3. "Access / Members" or "Access/Members" → "Members"
   everywhere
4. "Cascade" checkbox/label on agenda items →
   "Cascade needed"

Steps:
1. Search codebase for each term before changing anything
2. Report every file and line where each term appears
3. Make changes — copy and labels only, no logic changes
4. Run: npm run lint && npx tsc --noEmit && npm run build
5. Commit: "Terminology cleanup — Test Mode, Meeting Date,
   Members, Cascade Needed"

## Item 2 — Owner-Only Action Audit

No code changes unless a gate is wrong.

Verify the following against the approved roles model:
Owner: full access including delete, invite, remove,
  edit playbook, elevate/demote roles
Editor: same as owner except cannot delete meeting.
  Can start and end meeting. (already confirmed working)
Viewer: read-only — not yet enforced in UI (Sprint 4B)

Current known gates (confirm each is correct):
1. Invite editor — gated by isMeetingOwner ✓
2. Remove editor — gated by isMeetingOwner ✓
3. Pending invitations view — gated by isMeetingOwner ✓
4. Edit Playbook menu item — gated by isMeetingOwner ✓
5. Delete meeting — confirm where this is gated and by what
6. Archive meeting — confirm where this is gated and by what
7. Start Meeting — confirm open to all members (expected) ✓
8. End Meeting — confirm open to all members (expected) ✓

Report findings before making any changes.
If any gate is wrong, flag it and wait for approval before
fixing.

## Item 3 — Viewer Role in Invitation UI

Investigation first — report before coding:
1. Does the meeting_invitations table have a role column?
   What type and what values does it accept?
2. Does the RLS or invite RPC support a viewer role or
   only editor?
3. What does the current invite handler pass as the role
   value when creating an invitation?

If the database and RPC support viewer role:
- Add a role selector to the invite UI in both locations:
  app/components/meeting/MeetingWorkspace.tsx (~line 4227)
  app/dashboard/page.tsx (~line 1572)
- Selector options: Editor / Viewer
- Default: Editor (preserves existing behavior)
- Pass selected role through to the invite handler
- Update confirmation messages to reflect selected role:
  "Invited [email] as an editor." or
  "Invited [email] as a viewer."
- Update pending invite display to show role:
  "Invited by [name] as an editor." or
  "Invited by [name] as a viewer."

If the database or RPC does not support viewer role:
- Report what migration or RPC change is needed
- Do not implement UI until backend is confirmed
- Wait for architect approval before proceeding

Run: npm run lint && npx tsc --noEmit && npm run build
Commit: "Add viewer role option to invitation UI"

## Item 4 — Document Roles Model

Update planning/DECISIONS.md with the approved roles model:

Owner:
- Full access to all meeting features
- Can delete meeting
- Can invite, remove, and manage members
- Can elevate viewer to editor and demote editor to viewer
- Can edit playbook

Editor:
- Same as owner except cannot delete meeting
- Can start and end meeting
- Can invite and remove members
- Cannot edit playbook

Viewer (future enforcement — Sprint 4B):
- Read-only access to all meeting content
- Can view tactical history
- Cannot edit any field
- Cannot start or end meeting
- Cannot invite or remove members
- Owner can elevate to editor at any time

Commit: "Document approved roles model in DECISIONS.md"
