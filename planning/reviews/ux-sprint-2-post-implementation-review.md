# UX Sprint 2 — Post-Implementation Review

**Branch:** ux/sprint-2-simplification  
**Date:** 2026-06-11  
**Scope:** Full application UX audit after Sprint 2 fixes. Covers landing page,
dashboard, meeting workspace, agenda items, backup/restore, auth, and menus.

---

## Format

Surface | Finding | Priority | Recommended Action

---

## Landing Page

Landing page | Auth modal `onContinueLocally` prop still wires up `router.push("/meeting/local")` even though the "Use without an account" link was removed from the page. Local Mode can still be reached by typing the URL directly. | Medium | Either fully remove the route guard gap by redirecting `/meeting/local` to sign-in for unauthenticated users, or document Local Mode as an intentional legacy path. Decide before main merge. |

Landing page | The page background (`bg-slate-950` with gradient and `backdrop-blur`) renders even though the modal is always open and nothing behind it is visible. This is harmless but wastes CSS. | Low | Minor — no action needed before main. |

---

## Auth Modal

Auth modal | The "Supabase Auth" badge has not been confirmed removed from the AuthModal in this sprint — the `planning/POST_MAIN_ROADMAP.md` lists it as a Sprint 2 UX finding. Leaking infrastructure detail to end users. | High | Verify and remove the badge if still present. Replace with nothing or "Secure sign-in." |

Auth modal | Sign Up password hint ("Minimum 6 characters.") — listed as a Sprint 2 finding in POST_MAIN_ROADMAP but not confirmed addressed in this sprint. | High | Add "Minimum 6 characters." below the password field on the Sign Up view. |

Auth modal | Forgot password confirmation state — listed as Sprint 2 finding. After submitting, the form should replace itself with a full confirmation state (icon + message + "Back to Sign In") rather than only an in-form green notice. | Medium | Implement full confirmation state on password reset request. |

---

## Dashboard

Dashboard | "You're signed in. Your meetings are saved to the cloud." copy from the Account view developer cleanup is listed as Sprint 2 but not confirmed done. Developer copy "Workspace data still stays in this browser's localStorage…" should be replaced. | Medium | Confirm current Account view copy and replace if needed. |

Dashboard | Delete meeting confirmation copy still says "safely stored for recovery" — Sprint 2 finding. No recovery path exists in the UI. | High | Change to "permanently removes the archived meeting from your dashboard." |

Dashboard | "Restore from Backup" flow: if the user is not signed in (`session` is null), the import falls back to plain `restoreWorkspaceBackup(backup)` with message "Backup restored." but there is no meeting to navigate into. The non-authenticated path is a no-op with no visible result. | Medium | Either gate "Restore from Backup" behind sign-in (show a message if not signed in), or remove the non-authenticated fallback branch and require sign-in for the restore flow. |

Dashboard | "Restore from Backup" modal: after a restore in progress the modal closes and navigates immediately — there is no loading state. If the `createWorkspace` call is slow the user sees no feedback. | Medium | Show a loading spinner or disable the "Choose Backup File" button while creating the meeting. |

Dashboard | "Meeting name" field in the Restore modal resets to "Restored Meeting" every time the modal reopens (state is inside the modal). If the user changes the name, closes, reopens, and imports, the name is back to default. | Low | Minor annoyance — acceptable pre-main. Can pass an initial value prop or lift state if it becomes a reported issue. |

Dashboard | Archived meeting delete confirmation copy — "safely stored for recovery" still implies recovery. See same issue above. | High | Same fix as above — "permanently removed." |

Dashboard | The `handleImportBackupPlaceholder` placeholder function (lines 617–631) remains in `dashboard/page.tsx` with a console-level stub message. It is wired to a hidden `<input ref={backupInputRef}>` that has no UI trigger. Dead code with no clear removal timeline. | Low | Delete in Sprint 3 cleanup. |

---

## Workspace Menu

Workspace menu | "Tactical History" appears in the workspace settings dropdown for all authenticated users. Editors and viewers likely should not initiate a new Tactical History session (End Meeting), but viewing Tactical History is reasonable. Confirm whether the button is purely view-only or triggers owner-only actions. | Medium | Audit the Tactical History modal for owner-only vs. editor-safe actions and gate accordingly before main if End Meeting is surfaced there. |

Workspace menu | "Edit Playbook" is now owner-only in the workspace menu, correctly gated by `isMeetingOwner`. However, `isMeetingOwner` is populated by a new auto-load `useEffect` that fires on every workspace mount. The comment on the code says the localStorage key is scoped per meeting — so "global" behavior described in the code comment (line 5248) may be inaccurate. Needs verification. | Medium | Verify whether `leadership-organization-info` is truly per-workspace-scoped or global. Update the code comment to match reality. |

Workspace menu | "Export Backup" appears for all authenticated users, including editors. Exporting a full workspace backup (including meeting notes) may be undesirable for editors. | Low | Consider restricting Export Backup to owner-only or confirm that exporting is intentionally editor-accessible. |

Workspace menu | Non-authenticated (Local Mode) users see "Export Backup" and "Sign In" in the workspace menu. This is the correct minimal set but Local Mode is labeled as legacy — consider adding a visible "Local Mode (Legacy)" label to this menu state so users know they are not in cloud mode. | Low | Add a small header label in the local-mode branch of the settings menu. |

---

## Agenda Item Cards

Agenda items | Collapsed card shows outcome preview text only on `sm:` breakpoints and above. On mobile, users have no way to see an outcome preview in collapsed state without expanding. | Medium | Consider showing a truncated outcome on mobile too, possibly below the title on a second line within the card. |

Agenda items | The collapsed card title is `text-sm font-bold`. The section header uses a larger style. On busy meeting pages with many agenda items the bold text on a white card stands out well but the font size is still relatively small. | Low | Consider `text-base` or leaving as-is — acceptable. |

Agenda items | There is no affordance to reorder agenda items. Items are fixed-order since the drag-to-reorder was removed in this sprint. If a user creates items in the wrong order there is no recourse other than delete-and-recreate. | Medium | Add to Sprint 3: drag-to-reorder or up/down arrow controls for agenda items. |

Agenda items | The × delete button on the collapsed card is the only delete affordance. In the expanded card, there is no delete button. A user who expands an item to add notes has no delete option without collapsing first. | Low | Add a × or trash icon in the expanded card controls row. |

Agenda items | Adding a new agenda item creates it in collapsed state (default `isExpanded = false`). The user must click ▶ to expand and fill in details. This is an extra step for every new item. | Medium | Consider auto-expanding a newly created agenda item (set `isExpanded = true` when `item.id` is the most-recently-created). |

Agenda items | "Covered" checkbox collapses the card but there is no visible indication that the item is covered when looking at the collapsed card. A covered item looks identical to an uncovered collapsed item. | High | Add a visual indicator in the collapsed card (e.g., a checkmark badge, strikethrough title, or muted color) when `isCovered` is true. |

Agenda items | Cascade checkbox label says "Cascade" with a tooltip. This is domain jargon. Non-owner editors may not know what "Cascade" means without reading the tooltip. | Low | Rename to "Cascade needed" or add a one-word description in the label. Tooltip is helpful but easy to miss. |

Agenda items | "+ Strategic Topic" button is always visible in the expanded card even after the item has been promoted. After promotion it shows "In Topics" (disabled). A disabled button that provides no click affordance can be confusing — users may think it's broken. | Low | Consider hiding the button entirely after promotion, or replacing with a text label. |

---

## Meeting Workspace — General

Meeting workspace | "Backup needed" chip (autosave status) is still labeled ambiguously per the Sprint 2 roadmap finding — it should say "Manual Save needed" not "Backup needed." Confirm whether this was addressed. | High | Rename to "Manual Save needed" if not already done. |

Meeting workspace | Closed meeting workspace banner — Sprint 2 roadmap finding. When a meeting is ended, show a top-level banner: "This meeting has been ended. Notes are read-only. Start a new meeting for today's session." Currently only per-section notices exist. | Medium | Add a top-level banner. Acceptable to defer to Sprint 3 if not done. |

Meeting workspace | Owner-only action audit — Sprint 2 roadmap finding. Confirm all owner-only actions (End Meeting, rename, archive, delete, Edit Playbook, manage members) are either hidden or show a clear "owner only" message for editors. | High | Audit before main merge. |

Meeting workspace | Local Mode legacy label — Sprint 2 roadmap. The badge tooltip or help text should say "Data saved in this browser only. Sign in to enable cloud sync." A dismissible banner prompting sign-in should appear in local mode. | Medium | Add help text and sign-in prompt for Local Mode before main merge. |

Meeting workspace | "Test Mode" / "Testing Mode" terminology inconsistency from Sprint 2 roadmap — "Test Mode" should be used everywhere, not "Testing Mode." | Low | Confirm and clean up in Sprint 3. |

Meeting workspace | "Meeting date" vs "Action date" terminology inconsistency from Sprint 2 roadmap. | Low | Sprint 3 cleanup. |

Meeting workspace | "Members" vs "Access / Members" inconsistency. | Low | Sprint 3 cleanup. |

---

## Backup / Restore

Backup / Restore | Export Backup modal (workspace) says "Save a copy of this meeting to your device" but the backup is actually a full workspace backup including all meetings, objectives, and settings — not just the current meeting. The copy is inaccurate. | High | Change to "Save a full workspace backup to your device. Includes all meetings, objectives, and settings." |

Backup / Restore | Restore from Backup creates a meeting named by the user but the backup may contain a dashboard title in `leadership-dashboard-title`. The restored meeting title and the backed-up workspace title may differ, causing confusion. | Medium | After restore, consider also restoring the dashboard title from the backup into the new meeting's workspace title field. |

Backup / Restore | The restore flow currently sets `leadership-meeting-setup-completed` to `true` via a hardcoded localStorage key pattern. If `getWorkspaceScopedStorageKey` format changes, this will silently break. | Medium | Use a shared constant or utility function for the scoped key rather than constructing the string manually in dashboard/page.tsx. |

---

## Sprint 3 Candidates (from this review)

Items recommended for Sprint 3 before main merge:
1. Remove "Supabase Auth" badge from AuthModal (High)
2. Add password hint to Sign Up form (High)
3. Fix delete meeting copy — "safely stored for recovery" (High)
4. Rename "Backup needed" chip to "Manual Save needed" (High)
5. Owner-only action audit — confirm all gated correctly (High)
6. Fix Export Backup modal copy — not just "this meeting", full workspace (High)
7. Add covered-state visual indicator on collapsed agenda item card (High)
8. Close `/meeting/local` to unauthenticated users or document as intentional legacy (Medium)
9. Local Mode dismissible sign-in banner (Medium)
10. Closed meeting top-level banner (Medium)
11. Auto-expand newly created agenda item (Medium)

Items for post-main backlog:
- Agenda item reorder (Medium)
- Delete button in expanded card (Low)
- Forgot password full confirmation state (Medium)
- Cascade label copy clarity (Low)
- Edit Playbook localStorage scoping (already code-commented for Sprint 3)
