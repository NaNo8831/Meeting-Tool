# Architecture and Scaffold Review — Sprint 2

**Branch:** ux/sprint-2-simplification  
**Date:** 2026-06-11  
**Scope:** Structural review of the full codebase as it stands after Sprint 2. No code
was changed during this review. All findings are based on static analysis of the branch.

---

## Format

Area | Finding | Risk | Recommended Action

---

## Edit Playbook — localStorage Scoping

Edit Playbook localStorage | `leadership-organization-info` is stored via `getStorageKey("leadership-organization-info")` in `MeetingWorkspace.tsx` (line 1405), which scopes the key per cloud workspace when `selectedMeetingId` is set: `meeting-tool-cloud-workspace:{id}:leadership-organization-info`. This means each cloud workspace actually has independent playbook data — contrary to the code comment added in Sprint 2 which says "Per-meeting cloud scoping deferred to Sprint 3." The comment is inaccurate. | High | Verify actual runtime behavior. If the workspace is correctly scoped (which the code suggests), update the comment to say "Per-meeting scoping is already active in cloud mode via getWorkspaceScopedStorageKey. Sprint 3 should migrate this to meeting_settings for cloud persistence and cross-device access." Then add the `meeting_settings.organization_info` column and write-through in Sprint 3. |

Edit Playbook dashboard | `dashboard/page.tsx` at line 134 reads `useLocalStorage("leadership-dashboard-title", "")` with a plain unscoped key. The dashboard does not use `getWorkspaceScopedStorageKey`. If a user edits the playbook via the workspace (scoped key) and then views the dashboard (unscoped key), the title may not match. | Medium | In Sprint 3, when Edit Playbook is moved to cloud `meeting_settings`, remove the global localStorage reads from the dashboard and load playbook title from the cloud meeting record. In the meantime, document this mismatch. |

---

## client_meeting_id / Date.now() Divergence

ID generation | All `MeetingRecord.id` values are generated via `Date.now()` in `createBlankMeeting()` (line 985). This is also used for Agenda Items, Strategic Topics, Decisions, Cascade items, Objectives, and Tasks. The Supabase tables `meeting_notes` and `agenda_items` use `(meeting_id, client_meeting_id)` as unique constraints. If two meetings are created in the same millisecond — across browser sessions or in test scenarios — the IDs will collide and the unique constraint will be violated on upsert. | Medium | Sprint 4 candidate (already in `POST_MAIN_ROADMAP.md`). For Sprint 3: add a monotonic counter seed (e.g., `Date.now() * 1000 + counter`) or use `crypto.randomUUID()` for client IDs. Document the collision risk clearly in `createBlankMeeting`. |

Meeting notes dedup | The roadmap identifies "client meeting record ID divergence: date-dedup pass in `mergeStructuredMeetingNotes`" as a known Sprint 4 issue. Multiple browser sessions can create separate `MeetingRecord` rows for the same calendar date because `Date.now()` produces distinct IDs per session. The unique constraint on `meeting_notes` is `(meeting_id, client_meeting_id)` — not `(meeting_id, date)` — so duplicates for the same date can accumulate in `meeting_notes`. | Medium | For Sprint 3: consider changing the unique constraint to `(meeting_id, date)` for `meeting_notes` and implementing a date-keyed upsert so all sessions converge on a single record per date. This is a schema migration. |

---

## handleOpenMembersModal — Unused Dead Code

Unused function | `handleOpenMembersModal` (line 1836, `MeetingWorkspace.tsx`) is declared but never called — ESLint flags it as a warning on every build. A new `useEffect` (added in Sprint 2) now auto-loads meeting members on workspace mount, which makes `isMeetingOwner` resolve correctly without the modal handler. The `handleOpenMembersModal` function opens the members modal AND loads members, but opening the modal is now done elsewhere. | Low | Sprint 3 cleanup: remove `handleOpenMembersModal` or extract its non-modal logic into the auto-load effect. The auto-load effect should also load invitations if the user is an owner. Eliminating the unused function removes the persistent ESLint warning. |

Members auto-load | The new members auto-load `useEffect` fires on every `authSession` or `selectedMeetingId` change. `authSession` is an object reference that may change identity on re-render even when the underlying session has not changed. This could cause redundant `listMeetingMembers` API calls. | Low | Use `authSession?.accessToken` as the dependency instead of the full `authSession` object, or memoize the session reference. |

---

## Backup / Restore Architecture

Workspace import disabled | `handleImportWorkspaceBackup` in `MeetingWorkspace.tsx` (line 4775) is preserved but not exposed in the UI. It is tagged with a comment: "Import/Restore intentionally removed from workspace UI per Sprint 2 — preserved for Sprint 3 cleanup." The function performs a 5-way parallel cloud restore (strategic topic notes, meeting notes, agenda items, objectives, SOOs) and includes a `window.confirm()` dialog. All of this is dead code until Sprint 3. | Medium | Sprint 3 decision point: either restore the full import flow in the workspace (useful for disaster recovery while inside a meeting), or delete the function entirely and rely solely on the dashboard import-as-new-meeting flow. The `window.confirm()` should be replaced with a proper modal in either case. |

Dashboard restore setup key | The dashboard import handler in `page.tsx` (line 597) constructs the cloud workspace scoped setup key manually: `` `meeting-tool-cloud-workspace:${meeting.id}:leadership-meeting-setup-completed` ``. If `cloudWorkspaceStorageKeyPrefix` or `getWorkspaceScopedStorageKey` logic changes, this string will silently fall out of sync and the setup modal will reappear on restore. | Medium | Export `getWorkspaceScopedStorageKey` (or a variant) from a shared utility and use it in the dashboard handler instead of constructing the string manually. |

Backup collectWorkspaceStorage vs collectLocalWorkspaceStorage | Two collection functions exist: `collectWorkspaceStorage` (takes an explicit state map, used in workspace export) and `collectLocalWorkspaceStorage` (reads raw localStorage keys, was used in the now-removed dashboard export). The two can diverge in what they capture. | Low | Document the difference. Consider removing `collectLocalWorkspaceStorage` in Sprint 3 if dashboard export is permanently removed. |

---

## localStorage Key Scoping Architecture

Scoping model | `getWorkspaceScopedStorageKey` produces: `meeting-tool-cloud-workspace:{id}:{baseKey}` for cloud and `{baseKey}` for local. All workspace state in `MeetingWorkspace.tsx` is routed through `getStorageKey()` which applies this scoping. This is a sound isolation pattern. | Low | No action needed. Document the scoping contract in `docs/ARCHITECTURE.md` or inline in `MeetingWorkspace.tsx` as a leading comment block. |

Global keys in dashboard | `dashboard/page.tsx` reads several localStorage keys directly without scoping (`leadership-dashboard-title`, `leadership-organization-info`). These are global and not isolated per meeting. If a user has multiple cloud meetings with different playbook settings, the dashboard shows whichever was last written globally. | Medium | Sprint 3: the dashboard should not read playbook data from localStorage. It should load from `meeting_settings` via the cloud API when a meeting is selected, or use a dedicated "account-level" settings table for globally shared settings like dashboard title. |

---

## Persistence Architecture — What Is and Is Not Autosaved

Autosave coverage | The following surfaces have structured cloud autosave: `meeting_settings` (title, org info, section order, setup completed), `strategic_topics`, `strategic_topic_notes`, `meeting_notes`, `cascade_items` (inside meeting_notes), `agenda_items`, `objectives`, `tasks`, `standard_operating_objectives`. | — | No action needed — document in `docs/DATA_MODEL.md` for clarity. |

Autosave not covered | Defining Objectives, Tasks, and SOOs are autosaved to Supabase via `objectives`, `tasks`, `standard_operating_objectives` tables. However the autosave calls on these tables were implemented in PR 4D and rely on schema reconciliation. Any breaking schema change or missing column will cause silent autosave failures without a user-visible error. | Medium | Add error boundary / failure logging for autosave. Display a visual indicator (red dot on autosave chip) if any structured autosave request fails. |

Manual Save as safety net | `meetings.meeting_data` full-workspace Manual Save remains the only guaranteed full-workspace snapshot. Structured autosave is primary but Manual Save is still required as the fallback. This dual-path adds complexity to the restore flow. | Low | Sprint 3: once all surfaces have validated structured autosave, consider removing Manual Save from the default UI and making it an advanced/debug action. For now, keep it as documented. |

---

## MeetingWorkspace.tsx — File Size and Structure

File size | `MeetingWorkspace.tsx` is the dominant file in the codebase — it contains the workspace layout, all autosave logic, all cloud API calls, all modal state, the backup/restore handlers, the members management logic, the playbook definitions modal trigger, and the meeting lifecycle handlers. At approximately 6200 lines, it is extremely difficult to navigate and modify safely. Small changes (like adding Edit Playbook to a menu) have caused regressions because the file is too large to review holistically. | High | Sprint 3 (or Sprint 5): begin extracting cohesive slices into separate files. Recommended first splits: (1) `MeetingHeader.tsx` — sticky header, autosave chip, menu trigger; (2) `useWorkspacePersistence.ts` — all autosave effects and cloud API calls; (3) `useWorkspaceMembers.ts` — member loading, invitations, ownership checks. Do not attempt a full refactor in one PR. |

---

## MeetingSection.tsx — Agenda Item Card

Card component | `AgendaItemCard` is a good candidate for extraction into its own file (`AgendaItemCard.tsx`) now that it has grown to ~80 lines with local state, useEffect, and conditional render branches. The collapsed and expanded states could also be split into sub-components for clarity. | Low | Sprint 3 cleanup. Extract after any further agenda item UX changes are finalized to avoid churn. |

isCovered / isExpanded interaction | The `useEffect` watching `isCovered` uses `setTimeout(0)` to defer the collapse. This works but is fragile — if React batches updates differently in future versions, the defer could cause a visible flash. The `useState(false)` default with a `useEffect` is also slightly less predictable than initializing from a derived value directly. | Low | Consider whether `useReducer` with an explicit `COVERED_CHANGED` action would be cleaner and more predictable for this state machine. Not urgent. |

---

## Auth and RLS

RLS correctness | All client-side meeting access routes through `supabaseMeetingClient` functions that pass the current `accessToken`. RLS policies on `public.meetings`, `public.meeting_members`, `public.meeting_notes`, `public.agenda_items`, etc. enforce access at the database level. Client-side `isMeetingOwner` check is UI-only and does not replace RLS. This is correct. | — | No action needed. Document clearly that `isMeetingOwner` is UI gating only and RLS is the authoritative access control. |

Owner-only RPCs | Lifecycle mutations (`archive_owned_meeting`, `soft_delete_owned_archived_meeting`, `duplicate_owned_meeting`, `rename_owned_meeting`) are correctly implemented as owner-only Postgres RPCs called from the client. These cannot be called by editors even if the client check is bypassed. | — | No action needed. |

Invite flow gap | Invitations are matched by email at acceptance time. If a user signs up with a different email than the one invited, they will not see the pending invitation. No fuzzy matching or re-invitation flow exists. | Low | Document this limitation. Consider adding an explicit "invitation code" fallback path in a future sprint. |

---

## Known Debt from POST_MAIN_ROADMAP.md — Sprint 3 Assessment

| Item | Current Risk | Sprint 3 Candidate? |
|---|---|---|
| Edit Playbook per-meeting cloud scoping | High (comment is inaccurate; storage may already be scoped but cloud persistence is missing) | Yes |
| client_meeting_id Date.now() divergence | Medium | No — Sprint 4 as planned |
| handleOpenMembersModal removal | Low | Yes — quick cleanup |
| workspace import re-enable or delete | Medium | Yes — decide and act |
| dashboard/workspace playbook state desync | Medium | Yes |
| MeetingWorkspace.tsx file split | High (future maintainability) | Partial — extract useWorkspacePersistence |
| Manual Save demotion | Low | No — defer until autosave fully trusted |
| Remove Save Notes button (Sprint 3 roadmap) | Low | Yes — paired with Close button move |

---

## Summary

**High-risk items requiring Sprint 3 attention:**
1. `MeetingWorkspace.tsx` file size — regressions from adjacent changes are the biggest near-term delivery risk
2. Edit Playbook code comment is inaccurate — the scoping concern is either already solved (storage) or requires a different fix (cloud persistence)
3. Dashboard global localStorage reads for playbook data — inconsistent with workspace scoped reads

**Medium-risk items:**
- Dashboard restore handler constructing scoped key as a raw string (fragile coupling)
- Date.now() ID collisions (planned Sprint 4; document the risk clearly in code now)
- Workspace import disabled in UI but large function preserved — increases cognitive load when reading the file

**Low-risk / housekeeping:**
- Unused `handleOpenMembersModal` function (ESLint warning on every build)
- `collectLocalWorkspaceStorage` no longer needed after dashboard export removed
- `handleImportBackupPlaceholder` stub in dashboard page

No critical security vulnerabilities identified. RLS is correctly authoritative for all data access. Client-side permission checks are correctly layered on top of — not instead of — database-level enforcement.
