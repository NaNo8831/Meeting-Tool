# 120x Quickstart

## Role Clarity for Ongoing Sprints

Each sprint has three roles. They do not overlap.

**Architect** — Owns the design decision. Reads the codebase, understands constraints, produces the design brief. Does not write implementation code.

**Project Lead** — Approves the design brief before implementation begins. The only person who can authorize Code to start.

**Code** — Implements from an approved brief. Does not make design decisions. Does not invent behavior that wasn't in the brief.

---

## Design Before Code — Required for UI/UX Changes

Any sprint item that changes how something looks or behaves
visually requires a design brief before Code writes a single line.

A design brief answers:
- What does the user see in each state?
- What is the single responsibility of each element?
- What is removed, what is added, what changes behavior?
- How does it behave on small screens?

The Architect produces the design brief in Chat.
The Project Lead approves it.
Code implements from the approved brief.

Skipping this step produces patch-on-patch work where each
fix reveals a new problem. The header redesign sprint is the
canonical example of what happens without it.

A prompt to Code is not a design brief.
A list of changes is not a design brief.
A design brief is a complete picture of the target state
before any implementation begins.
