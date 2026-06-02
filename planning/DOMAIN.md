# Domain Model and Meeting Context

## Product Context
Meeting Tool by LyArk is a lightweight operational leadership meeting tool. It is influenced by The Table Group / The Advantage tactical meeting model and is intended to help leadership teams run structured weekly meetings without becoming a heavy project management system.

## Key Terms
| Term | Meaning |
| --- | --- |
| Top Priority / Thematic Goal | The current short-term rallying priority for the leadership team. |
| Defining Objectives | Temporary qualitative components that help describe and accomplish the Top Priority / Thematic Goal. |
| Standard Operating Objectives | Ongoing priorities and operating standards that continue beyond the current Top Priority. |
| Strategic Topics | Persistent strategic holding items that should not be resolved during tactical meetings. |
| Tactical Meeting | A recurring operating meeting focused on near-term priorities, blockers, commitments, and communication. |
| Cascading Communication | The information staff or direct reports need to know after the leadership meeting. |

## Current Meeting Flow
1. Complete first-time setup to name the team or meeting and seed playbook prompts.
2. Use Edit Playbook to review and adjust playbook definitions and current organizational context as needed.
3. Align around the Top Priority / Thematic Goal.
4. Review Defining Objectives and associated tasks.
5. Track tasks through `Planning → In Progress → Completed`.
6. Capture Agenda Items, Strategic Topics, Decisions / Actions, and Cascading Communication in meeting sections.
7. Preserve workspace data through browser storage and JSON backup exports.

## Intended User Roles
- Project owner: sets product direction, prioritizes work, and validates meeting usefulness.
- Leadership team member: uses the live app during meetings to review priorities, tasks, and communication.
- Future builder/Codex: implements scoped changes after reading the planning source of truth.

## Assumptions
- Phase 1 usage is single-browser/local workspace usage.
- Shared collaboration, auth, and role enforcement are Phase 2 concerns and are not yet implemented.
