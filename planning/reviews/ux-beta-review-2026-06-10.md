# UX Beta Review — 2026-06-10

**Reviewer:** Claude Code (automated structured UX audit)
**Date:** 2026-06-10
**App state:** Post-main Team Beta — phase-3-shared-access merged to main. Sprint 1 UX polish active.
**Scope:** Full user journey UX review — copy, affordances, information hierarchy, friction, consistency.

---

## Summary

Meeting Tool has a solid structural foundation: clear lifecycle states, a coherent permission model, and well-thought-out autosave coverage. The beta-ready experience is professional and functional. The primary friction areas are (1) cognitive overload in the autosave status panel, (2) terminology inconsistency across surfaces, (3) undiscoverable entry points for key actions, and (4) several cases where copy is technically accurate but does not communicate user intent clearly. No single issue is a blocker; most are medium-priority polish items appropriate for Sprint 2–3.

---

## 1. Landing / Auth

### 1.1 Landing Page

**What works well:**
- Clear binary choice: cloud sign-in vs. local browser mode.
- Subheading accurately describes the product at a glance.

**What is confusing or missing:**
- "Meeting Tool by LyArk" as the primary headline is a product/brand name, not a value proposition. A new user arriving cold has no idea what this tool does or why they should sign in.
- "Continue locally — browser only" is the only non-auth CTA on the page; its visual weight and position make it feel like a secondary escape hatch rather than a legitimate supported path. Users who should legitimately use it (non-auth testers, local-first users) may feel they are doing something wrong.
- There is no explanation of what "Cloud Meetings" vs "Local Workspace" means before the user commits.

**Suggested improvements:**
- Add a one-sentence tagline beneath the product name: e.g., "A structured meeting workspace for leadership teams." Priority: **Medium**
- Rewrite the local mode button label to remove the parenthetical and add context: "Use Local Workspace (browser only, no account needed)". Priority: **Low**
- Consider a brief two-line explainer about the difference between cloud and local before the sign-in form renders. Priority: **Low**

---

### 1.2 Sign In / Sign Up

**What works well:**
- Toggle between Sign In and Sign Up is clean and accessible.
- Loading state copy ("Signing in…", "Creating account…") is consistent.
- Success messages are appropriately calm and specific.

**What is confusing or missing:**
- The "Supabase Auth" badge (uppercase, blue text) is visible to end users and leaks an infrastructure detail that means nothing to non-developers. Beta users will wonder what Supabase is.
- Sign Up has no password requirements hint. If Supabase enforces a minimum length, users get a surprise error rather than upfront guidance.
- After sign-up, the success message says "Account created and signed in." but a user who receives a confirmation email (if configured) will not be immediately signed in. The alternative copy "Account created. Check your email if confirmation is required before signing in." is more honest but feels like a hedge — both messages are shown based on the flow path. This is fine but should be tested to verify the correct variant fires.
- No "Remember me" affordance, though session persistence via localStorage handles this implicitly. Users who expect to stay signed in across browser restarts have no visible confirmation of that behavior.

**Suggested improvements:**
- Remove the "Supabase Auth" badge, or replace it with something user-meaningful like "Secure sign-in" or nothing at all. Priority: **High**
- Add a password hint below the password field on Sign Up: "Minimum 6 characters." Priority: **Medium**
- The "Account" view shown after sign-in contains the line "Workspace data still stays in this browser's localStorage. Auth does not sync, migrate, or share workspace data yet." — this is developer-level copy exposed to end users. Remove it or replace with: "You're signed in. Your meetings are saved to the cloud." Priority: **High**

---

### 1.3 Forgot Password

**What works well:**
- Confirmation copy is intentionally vague for security: "If an account exists for this email, a password reset link has been sent." This is correct.
- Reset link and flow are implemented.

**What is confusing or missing:**
- There is no visual confirmation that the email was sent — just a green text message in the modal. For a flow that depends on the user leaving the page to check email, this is easy to miss.
- No "Back to Sign In" link on the reset-password route — if a user navigates to `/reset-password` manually or with an expired link, recovery path is unclear.

**Suggested improvements:**
- After submitting the reset form, replace the form with a full confirmation state: a checkmark icon, the green message, and a "Back to Sign In" link. Priority: **Medium**
- On the `/reset-password` page, add a fallback message if no valid token is present: "This link has expired or is invalid. Request a new reset link." with a link to the sign-in page. Priority: **Medium**

---

### 1.4 Onboarding (New User First Experience)

**What works well:**
- Empty state on the dashboard ("Create your first meeting to get started.") is clear and actionable.

**What is confusing or missing:**
- After a new user signs up and lands on the dashboard, there is no orientation to the product. Terms like "Playbook," "Strategic Topics," "Tactical History," "SOO," and "Cascading Communication" will be unfamiliar. Users are dropped in cold.
- No tooltip, highlight, or onboarding nudge exists to guide first use.
- The "Name your new recurring meeting" placeholder implies the meeting should be recurring, which may confuse users who want to create a one-off or project meeting. The product model is workspace-per-recurring-meeting, but this is not explained anywhere in the UI.

**Suggested improvements:**
- Change placeholder to "Name your meeting" and add help text beneath the create field: "Each meeting is a persistent workspace — agenda, objectives, and history are saved between sessions." Priority: **Medium**
- Consider a first-run welcome banner or tooltip: "Welcome! Create your first meeting workspace to get started." Priority: **Low**

---

## 2. Dashboard

### 2.1 Meeting Card Hierarchy and Information Density

**What works well:**
- Meeting name is prominent.
- "Updated [time ago]" gives instant recency signal.
- "Members: N" provides shared-access awareness at a glance.

**What is confusing or missing:**
- "Owner: [Name]" appears on all cards including cards the signed-in user owns. Showing "Owner: You" or omitting it on owned cards reduces noise.
- The "Members" count label with no icon or visual differentiation looks like a data label, not an interactive affordance. Users who want to manage members may not connect this label with the "Members" button below it.
- The three-button layout (Open / Members / Actions) adds cognitive load. "Members" and "Actions" as separate buttons means users must scan three options for every card to understand what actions are available.

**Suggested improvements:**
- On owned cards, replace "Owner: [Name]" with "Owned by you" or omit it entirely. Priority: **Low**
- Consolidate the Members count label and the Members button into one — clicking the member count (e.g., "3 members") opens the Members modal. Removes a redundant affordance. Priority: **Medium**
- Consider merging "Members" into "Actions" for non-owner shared cards where member management is read-only, reducing the action surface to two buttons. Priority: **Low**

---

### 2.2 Owned vs. Shared Meeting Distinction

**What works well:**
- "Owned by Me" and "Shared with Me" sections visually separate the two categories.
- Shared cards show Open only, which correctly signals reduced edit permissions.

**What is confusing or missing:**
- "Shared with Me" cards give no visual indication of the user's role (editor). An editor opening a shared meeting has no upfront confirmation that they can edit, which may cause hesitation.
- There is no visual differentiation (icon, color, badge) between owned and shared cards at the card level. Users scanning a mixed list after search must read section headers to orient themselves.

**Suggested improvements:**
- Add a subtle "Editor" role badge to Shared with Me cards. Priority: **Medium**
- Consider a small "Shared" or people-icon indicator on shared cards so they remain distinguishable even in search results where section headers may be distant. Priority: **Low**

---

### 2.3 Actions Available from Dashboard

**What works well:**
- Archive, Restore, Delete, Duplicate are all present and gated correctly.
- Confirmation dialogs explain consequences clearly.

**What is confusing or missing:**
- The Duplicate confirmation says "Tactical and Strategic history records are not copied yet." The word "yet" implies this is a planned future feature, which is not appropriate copy for a beta product. It looks like a development note left in.
- "Delete meeting?" confirmation says "This will hide the archived meeting from your dashboard. The record will remain safely stored for recovery." This is intentionally soft (it is a soft delete), but "safely stored for recovery" implies users could get the meeting back — but there is no visible recovery path in the UI. That creates a broken promise.
- The "Actions" dropdown label is generic. Users who need Duplicate or Archive must open Actions without knowing which actions are inside.

**Suggested improvements:**
- Change Duplicate confirmation copy to: "This copies the current meeting workspace. Meeting history (Tactical, Strategic) is not included in the copy." Remove "yet." Priority: **Medium**
- For Delete: either implement or surface a support recovery path, or change copy to "This permanently removes the archived meeting from your dashboard." and do not imply recoverability unless it actually exists in the UI. Priority: **High**
- Consider naming the dropdown "⋯" (ellipsis) or "More" rather than "Actions" since Open and Members are also actions. Priority: **Low**

---

### 2.4 Empty State

**What works well:**
- Per-context empty states are specific ("No owned meetings match this search." vs "Create your first meeting to get started.").

**What is confusing or missing:**
- The "Shared with Me" empty state "No shared meetings yet." implies future sharing is expected. For most new users this is accurate, but there is no explanation of how sharing works or that they need to be invited.

**Suggested improvements:**
- Expand the Shared with Me empty state: "No meetings have been shared with you yet. Ask a meeting owner to invite you." Priority: **Low**

---

### 2.5 Navigation Clarity

**What works well:**
- Dashboard header clearly says "Dashboard."
- The hamburger menu (Dashboard Menu) contains Profile, Import Backup, Logout — reasonable grouping.

**What is confusing or missing:**
- The hamburger icon (☰) is standard but has no accessible label visible to the user. On small screens there is no affordance explaining what it contains.
- "Import Backup" in the dashboard menu is a power-user action buried behind the same menu as "Profile" and "Logout." A user who has never exported a backup will not understand what importing means without a tooltip or description.
- "Profile" opens an editor for display name only. Users may expect more account management features (email, password change) here. The absence of "Change Password" creates a gap (noted in Sprint 2 backlog as a known item).

**Suggested improvements:**
- Add a tooltip or short description to "Import Backup" in the menu: "Restore a previously exported JSON backup." Priority: **Low**
- Prioritize Change Password in the Profile modal (Sprint 2 item) — for beta users who may have set a placeholder password during testing. Priority: **High** (Sprint 2 already targeted)

---

## 3. Meeting Workspace — Top Bar

### 3.1 Meeting Name, Status Badges, Date Visibility

**What works well:**
- The lifecycle chip (Open Meeting / Closed Meeting / Past Meeting / Test Mode) with date provides clear contextual state.
- "Local Mode (Legacy — browser only)" badge immediately signals the mode.

**What is confusing or missing:**
- The help (?) button that expands lifecycle explanations is not discoverable — users who do not know to click it may never understand the lifecycle state labels. The expanded copy is excellent but hidden.
- "Past Meeting" and "Closed Meeting" look similar to users. The distinction (past = date is prior; closed = ended via End Meeting) is meaningful to the system but not immediately clear from the labels alone.
- "Action date: [date]" is shown in the header but the term "action date" is not used anywhere else in the UI. It refers to the meeting date in context but is a jargon term that new users will not recognize.

**Suggested improvements:**
- Rename "Action date" to "Meeting date" for consistency. Priority: **Medium**
- Add a brief tooltip on hover for each lifecycle chip: e.g., hovering "Closed Meeting" shows "This meeting was ended and is read-only." This surfaces the help content without requiring a click. Priority: **Medium**
- Consider differentiating "Past Meeting" visually from "Closed Meeting" (e.g., different icon, slightly different color) since they imply different reasons for being read-only. Priority: **Low**

---

### 3.2 Autosave Status Indicator Clarity

**What works well:**
- The compact chip ("Autosaved" / "Saving…" / "Backup needed" / "Autosave issue") gives a glanceable status.
- The expanded detail panel breaks down status per surface, which is technically comprehensive.

**What is confusing or missing:**
- The detail panel status strings are verbose and asymmetric. "Meeting Notes and Cascading Communications saved to cloud" is much longer than "Agenda Items saved to cloud." At a glance, the panel reads as inconsistent.
- "Backup needed" as an autosave chip label will alarm users who do not know what backup means in this context. It sounds like data loss risk. The actual meaning is "Manual Save has not been run recently."
- The detail panel label "Full backup:" maps to Manual Save, not autosave. The autosave panel is called "autosave status" but one of its items is Manual Save status. This conflates two different concepts.
- The error message "Some cloud autosave changes may not have saved. Use Manual Save now, then retry or refresh after confirming status." contains a logic problem: if autosave failed, Manual Save should still work, but telling users to "retry or refresh after confirming status" is vague about what to confirm or where.

**Suggested improvements:**
- Rename "Backup needed" chip to "Manual Save needed" so it is clear this is a manual action prompt, not a failure state. Priority: **High**
- Separate the autosave detail panel into two logical sections: "Autosave" (Settings, Topics, Agenda, Notes & comms, Objectives & SOOs) and "Full Backup" (Manual Save status). Priority: **Medium**
- Standardize the autosave saved-state string format to "[Surface] saved" across all surfaces (e.g., "Notes saved" not "Meeting Notes and Cascading Communications saved to cloud"). Full detail can be in a tooltip. Priority: **Medium**
- Improve the error recovery message: "Autosave may have failed. Save a full backup now using Manual Save." Priority: **Medium**

---

### 3.3 Manual Save / Backup Prominence

**What works well:**
- "Manual Save" button is present and available to owners and editors.

**What is confusing or missing:**
- "Manual Save" and "Backup / Restore" are different things (Manual Save writes cloud backup JSON; Backup / Restore is the JSON export/import flow), but the naming is close enough to cause confusion. A user who wants to download a file will look at Manual Save first.
- There is no visual distinction between Manual Save (cloud write) and Backup/Restore (file export/import). Both use the word "backup."
- For editors who may not understand why Manual Save is still needed alongside autosave, there is no in-context explanation.

**Suggested improvements:**
- Rename "Backup / Restore" in the dropdown to "Export / Import JSON" to clarify it is a file operation. Priority: **Medium**
- Add a tooltip to Manual Save: "Saves a full workspace snapshot to the cloud. Use after major changes." Priority: **Low**

---

### 3.4 Dropdown Menu Items and Organization

**What works well:**
- Dashboard link and Sign Out are accessible from within the meeting workspace.
- Tactical History and Access/Members are logically grouped in the workspace menu (Sprint 1 adds Access/Members — confirmed).

**What is confusing or missing:**
- The menu mixes navigation items (Dashboard), user actions (Sign Out), meeting tools (Edit Playbook, Tactical History), access management (Access/Members), and data management (Backup/Restore, Delete Current Meeting Notes). There are no visual dividers or groupings between these categories.
- "Delete Current Meeting Notes" is a destructive action in a dropdown with no visual danger affordance at the menu level (it presumably uses a confirmation modal, which is good, but the menu item itself has the same visual weight as "Edit Playbook").
- "Edit Playbook" is a modal-opening action that takes the user to a full playbook editor — but the Playbook content is displayed read-only in the main workspace. New users who want to edit their mission/vision fields may not connect "Edit Playbook" in a dropdown with the read-only text visible on screen.

**Suggested improvements:**
- Add visual section dividers in the dropdown to group: (1) Navigation — Dashboard; (2) User — email, Sign Out; (3) Meeting — Edit Playbook, Tactical History, Access/Members; (4) Data — Manual Save is already in the header, Backup/Restore, Delete Meeting Notes. Priority: **Medium**
- Apply a red/danger color or warning icon to "Delete Current Meeting Notes" in the menu to signal its destructive nature before the confirmation modal. Priority: **Medium**
- Consider adding a subtle hint on the playbook section read-only fields: "Managed from Edit Playbook ↗" as a persistent label, not just on hover/double-click. Priority: **Low**

---

### 3.5 Access/Members Menu Item

**What works well:**
- Sprint 1 is adding Access/Members to the workspace dropdown — this closes a real gap identified at beta launch.

**What is confusing or missing:**
- Once Access/Members is in the workspace dropdown, there will be two paths to the same Members modal: the workspace dropdown and the dashboard card "Members" button. This is fine as redundancy, but if the two entry points open slightly different views (e.g., dashboard shows pending invites while workspace shows current members) users will be confused.
- "Access / Members" is a combined label that covers invite and membership viewing. After the label does double duty, the forward slash creates visual noise. "Members" alone is shorter and equally accurate.

**Suggested improvements:**
- Rename the menu item to "Members" for consistency with the dashboard button label. Priority: **Low**
- Ensure the Members modal opened from the workspace is identical to the one opened from the dashboard card. Priority: **Medium**

---

## 4. Meeting Workspace — Sections

### 4.1 Agenda Items

**What works well:**
- Status badges (Decision, Action, Cascade Needed, Promoted, Covered) give rich at-a-glance state.
- Covered items auto-collapse to reduce clutter — a good meeting-flow UX pattern.
- Promote to Strategic Topic is discoverable on the card and provides feedback when already promoted.
- Discussion Notes uses double-click to edit with clear in-context hint.

**What is confusing or missing:**
- The section description "Capture discussion notes, decisions, actions, covered state, cascade needs, and Strategic Topic promotion per agenda item." is accurate but reads like a feature spec, not user guidance. It is the longest sentence on any section header.
- The "Outcomes" sub-header "Decision, Action, or both" is minimally helpful. Users who do not know the product model may not understand that Outcome means a discrete decision reached or an action to be taken.
- The "Promote to Strategic Topic" button appears on every agenda item regardless of whether a decision or action has been captured. A user might promote an empty or irrelevant item by mistake.
- The "Promoted → Strategic Topic" badge copies the button label but adds an arrow. The arrow implies a link or navigation, but clicking it does nothing (it is a state indicator). This may cause user confusion expecting to navigate to the promoted topic.
- "Cascade Needed" checkbox label is jargon. Users new to the product will not know what "cascade" means in this context without reading the Cascading Communication section description.

**Suggested improvements:**
- Shorten the section description to: "Track discussion, outcomes, and follow-ups per agenda item." Priority: **Medium**
- Rename "Outcomes" sub-header to "Meeting Outcome" and add a compact help label: "Was a decision made or action assigned?" Priority: **Low**
- Add a tooltip to "Cascade Needed": "Mark this item to include it in the Cascading Communication rollup for staff." Priority: **Medium**
- Change the "Promoted → Strategic Topic" badge to "Added to Strategic Topics" with no arrow, since there is no navigation action. Priority: **Low**
- Consider gating "Promote to Strategic Topic" behind having a non-empty agenda item title. Priority: **Low**

---

### 4.2 Strategic Topics

**What works well:**
- Active/completed/archived lifecycle is clear and non-destructive.
- History modal separates completed and archived tabs cleanly.
- "Reviewed / completed: [date]" on completed items is informative.

**What is confusing or missing:**
- "Strategic Topics" as a section label is meaningful to users familiar with EOS or similar frameworks, but is jargon for users new to the product. No section description explains what a Strategic Topic is or how it differs from an agenda item.
- The three lifecycle actions — Archive (amber), Mark active (gray), Reviewed / completed checkbox — use three different interaction patterns (colored button, gray button, checkbox) for what is essentially a state machine transition. The inconsistency adds cognitive load.
- "Mark active" is shown only for completed topics (to return them to active). But "Unarchive" serves the same purpose for archived topics. Having two different labels for "move back to active" is inconsistent.
- The Notes button on each topic opens a modal with a "Save Notes" button rather than autosaving inline. This is inconsistent with the autosave behavior users experience everywhere else in the workspace. The "Save Notes" button also persists in the workspace top bar as a parallel save pathway, which is confusing alongside autosave.

**Suggested improvements:**
- Add a section description: "Long-running topics that carry across meetings — track progress, notes, and lifecycle state." Priority: **Medium**
- Standardize lifecycle actions: replace the "Reviewed / completed" checkbox with an explicit "Mark Completed" button, making all three transitions (Mark Completed, Archive, Mark Active) button-based and consistent. Priority: **Medium**
- Unify "Mark active" and "Unarchive" into the same label: "Restore to Active" for both completed and archived states. Priority: **Medium**
- Investigate whether Strategic Topic Notes can autosave inline rather than requiring an explicit Save Notes click, for consistency with the rest of the workspace. Priority: **Medium**

---

### 4.3 Cascading Communications

**What works well:**
- The generated rollup banner distinguishes system-generated items from user-written items visually.

**What is confusing or missing:**
- "Cascading Communication" is the highest-jargon label in the application. Users outside an EOS/Traction framework context will not know what this means. There is no explanation in the section.
- The section description "Generated cascade-needed agenda outcomes plus editable communication notes for Staff." uses "cascade-needed" (technical/jargon) and "Staff" (capitalized, implying a specific role that is not defined anywhere in the app).
- The generated rollup items are shown in white boxes with plain text. It is not immediately clear these are read-only auto-generated items vs. user-editable items in the section below.
- The add-item input "New cascading communication" implies users can add arbitrary communication items — but the purpose of the section is to push pre-defined cascade items to staff. The free-add feature undercuts the structured intent.

**Suggested improvements:**
- Add a section description rewrite: "Staff communication — items from agenda marked as Cascade Needed appear here automatically. Add additional communication notes below." Priority: **High**
- Add a "Read-only · Auto-generated" label or italic style to generated rollup items to distinguish them from user-added items. Priority: **Medium**
- Replace "Staff" with a lowercase "your team" in copy throughout the section. Priority: **Low**

---

### 4.4 Defining Objectives / Tasks / SOOs

**What works well:**
- Compact scan cards with color, title, and task summary give a strong at-a-glance view.
- Opening details automatically on Add Objective is a good UX pattern — users can immediately fill in the new item.
- The Planning/In Progress/Completed task summary on the card is highly informative.

**What is confusing or missing:**
- "Defining Objectives" is another EOS-framework term. Users who are not familiar with the framework model may not understand the difference between a "Defining Objective" and a "Standard Operating Objective."
- "SOO" is used as an abbreviation in the autosave status panel and internal labels. It is never spelled out or explained to the user in the UI.
- The card layout for Defining Objectives and SOOs is described as consistent, but SOOs have a description field while Defining Objectives focus on tasks. This structural difference is not communicated until the user opens the detail modal.
- The "Open details" action label on objective cards is generic. For new users, it is unclear what "details" means here — is it more information, or the primary edit interface?

**Suggested improvements:**
- Add section descriptions: for Defining Objectives: "Key goals for this quarter — track progress with tasks." For SOOs: "Ongoing processes that run every meeting cycle." Priority: **Medium**
- Spell out "SOO" at least once in the section header or description: "Standard Operating Objectives (SOOs)". Priority: **Low**
- Rename "Open details" to "View & edit" on objective cards to set clearer expectations. Priority: **Low**

---

### 4.5 Meeting Notes / Topic Notes Editing Experience

**What works well:**
- Previous/next navigation for dated meeting records is clear (← →).
- "Current Meeting" label on the active notes record is helpful.
- Read-only state for ended/past meetings surfaces a clear notice.

**What is confusing or missing:**
- The section header "Meeting Notes — [date]" changes dynamically as users navigate. If a user navigates to a previous date, the header correctly updates, but the navigation arrows (← →) have no tooltips or labels explaining what they navigate. Screen readers and new users have no context.
- The read-only notice for ended meetings ("This meeting has been ended and captured in Tactical History. Dated meeting notes are read-only.") is accurate but the phrase "captured in Tactical History" requires the user to know what Tactical History is.
- The "Delete Current Meeting Notes" action in the dropdown is the only way to delete a notes record — it is hidden and not near the notes it deletes. There is no in-context delete affordance within the notes section itself.
- The RichTextEditor is used in multiple sections (SOO description, Strategic Topic Notes, Meeting Notes) but its affordances are not consistent. Some instances show a full toolbar; others are minimal.

**Suggested improvements:**
- Add aria-labels and tooltips to the ← → navigation: "View previous meeting notes" / "View next meeting notes." Priority: **Medium**
- Simplify the read-only notice: "This meeting is ended. Notes are read-only." Users can access Tactical History via the menu if they need the full context. Priority: **Low**
- Add a subtle in-section delete affordance (trash icon, owner-only) at the bottom of the meeting notes section, in addition to the dropdown option. Priority: **Low**

---

## 5. Meeting Lifecycle

### 5.1 Start Meeting Flow and Copy

**What works well:**
- "Start Meeting" / "Edit Meeting" / "View Meeting" context-switching based on state is a strong pattern.
- The three-state button tells users exactly what action is available without requiring them to understand the underlying lifecycle state.

**What is confusing or missing:**
- The help text for lifecycle actions ("Start creates today's current meeting record." / "Edit opens today's current meeting record for continued work.") is only visible via the help (?) button. Users who proceed directly to Start or Edit without reading help may not understand the distinction.
- "Edit Meeting" sounds like editing the meeting's settings or name, not opening a dated notes record. A user who wants to change the meeting name will try "Edit Meeting" and be confused when it opens notes.

**Suggested improvements:**
- Rename "Edit Meeting" to "Continue Meeting" to better reflect the action — continuing today's meeting session, not editing the meeting configuration. Priority: **Medium**
- Consider renaming "Start Meeting" to "Start Today's Meeting" to add date context. Priority: **Low**

---

### 5.2 End Meeting Flow and Copy

**What works well:**
- The End Meeting confirmation modal is thorough. The "What stays unchanged" info box explicitly lists what does NOT change, which is the most common user concern.
- "Capture Historical Snapshot" as the confirm button label is accurate and less alarming than "End Meeting" or "Archive."

**What is confusing or missing:**
- The modal title "Capture this meeting in history?" is a question but reads more like a statement. The user action is to end the meeting; the result is a history capture. Framing as a question about the result may cause hesitation ("Am I just capturing history, or am I ending editing?").
- The "Keep Editing" cancel button is strong — it reassures the user they are not about to lose work.
- After End Meeting succeeds, the workspace should surface a clear "Meeting ended" confirmation state. The current behavior shows a "calm success message" — it would be worth verifying this is prominent enough on the meeting header chip.

**Suggested improvements:**
- Reframe the modal title: "End this meeting?" with subtitle "This captures a Tactical History snapshot and closes today's meeting for editing." This separates the action from the result. Priority: **Medium**
- Ensure the post-End Meeting state change (lifecycle chip updates to "Closed Meeting") is visually noticeable enough for users to confirm the action succeeded. Priority: **Medium**

---

### 5.3 Test Mode Clarity and Labeling

**What works well:**
- Test Mode is gated behind a feature flag and will not appear in production.
- "Test Date" badge on test-created sessions distinguishes them from real data.

**What is confusing or missing:**
- "Testing Mode" (used in modal copy) vs "Test Mode" (used in the header chip) — inconsistent naming.
- The Test Mode checkbox in the header has no surrounding context for users who encounter it — there is no tooltip or label explaining that this is for validation/development purposes.

**Suggested improvements:**
- Standardize to "Test Mode" throughout — modal copy, header, and all confirmations. Priority: **Low**
- Add a tooltip on the Test Mode checkbox: "Test Mode lets you create and end meetings on arbitrary dates for validation purposes. Use in non-production environments only." Priority: **Low**

---

### 5.4 Read-Only Ended Meeting State

**What works well:**
- Read-only notice is surfaced clearly per section ("This meeting has been ended…").
- Autosave and Manual Save continue to function, which is correctly documented in the End Meeting confirmation.

**What is confusing or missing:**
- There is no top-level visual indicator on the workspace as a whole that the meeting is in read-only state — users must read each section's individual notice.
- Editors who open an ended meeting and cannot edit notes may not understand that this is a lifecycle constraint, not a permissions constraint. The copy does not distinguish "this is read-only because the meeting was ended" from "this is read-only because you do not have permission."
- No "Reopen" or "Continue" action exists for ended meetings. This is a known deferred item (Sprint 4), but there is also no copy explaining to users what to do if they want to continue working.

**Suggested improvements:**
- Add a banner at the top of the workspace when a meeting is closed: "This meeting has been ended. Notes are read-only. Start a new meeting for today's session." Priority: **High**
- In the per-section read-only notices, clarify the reason: "This meeting was ended. To continue taking notes, start a new meeting for today." Priority: **Medium**

---

### 5.5 Closed Meeting Navigation

**What works well:**
- Users can still view ended meetings from the dashboard and via the workspace.

**What is confusing or missing:**
- Navigating to a closed meeting from the dashboard opens the full workspace, which may confuse users who expected a lighter read-only summary view.
- There is no visual differentiation on dashboard cards between meetings that are "open" (have a current active record) and meetings that are "closed" (last record was ended). Users cannot tell which meetings are active without opening them.

**Suggested improvements:**
- Add a subtle "Ended" or "Last ended [date]" label on dashboard cards for meetings whose most recent record has been ended. Priority: **Medium**
- Long-term, consider a lightweight read-only summary view for closed meetings rather than the full editor. Priority: **Low** (deferred)

---

## 6. Shared Access

### 6.1 Invite Flow from Within Meeting

**What works well:**
- Sprint 1 adds Access/Members to the workspace dropdown — closing the gap where members could only be invited from the dashboard.
- The invite flow (email input + Invite button) is simple and clear.

**What is confusing or missing:**
- There is no onscreen explanation of what being an "editor" means. The role label appears in the Members modal ("Invited [email] as an editor.") but the capabilities of an editor are never described.
- The invite input placeholder "teammate@example.com" is a placeholder, not a label. There is no label explaining the "Invite editor" section. On first use this is fine, but when no editors exist and the section only shows a text field, users may be unsure what type of person they are inviting.
- Invitation delivery depends on Supabase email, which was noted as requiring custom SMTP/Resend configuration. If email is misconfigured in a beta deployment, users will silently invite someone who never receives the notification. There is no in-app feedback about email delivery.

**Suggested improvements:**
- Add a brief role description near the Invite section: "Editors can view and edit meeting content but cannot manage members or delete the meeting." Priority: **Medium**
- Add a note after successful invite: "An invitation email has been sent. They can also accept from their dashboard if they are already signed in." Priority: **Medium**

---

### 6.2 Member List Display

**What works well:**
- Owner section and Editors section are clearly separated.
- Pending invitations are shown separately with Revoke option.

**What is confusing or missing:**
- Owner and Editor sections have different levels of detail. The Owner row shows a display name only; Editor rows show a display name plus a Remove button. The asymmetry is logical but may look like the Owner row is incomplete (missing button).
- "Owner information is not available." as an empty state on the Owner section looks like an error. It should only appear if the owner profile cannot be loaded, but it may briefly flash during loading and concern users.
- There is no timestamp for when an editor was added or when a pending invitation was sent, making it hard to audit access for older meetings.

**Suggested improvements:**
- Change "Owner information is not available." to show a loading state while loading, and only show an error state if loading definitively fails (e.g., after 5 seconds). Priority: **Low**
- Add "Invited [date]" to pending invitation rows so owners can track old outstanding invites. Priority: **Low**

---

### 6.3 Role Clarity

**What works well:**
- Owner vs. Editor distinction is enforced at the database level and surfaced correctly.

**What is confusing or missing:**
- "Editor" is the only non-owner role currently visible to users. "Viewer" is mentioned in documentation but not in the UI. If users discover the viewer concept in docs or changelogs, they may try to create viewer invites that do not exist yet.
- There is no role description anywhere in the product UI. A user reading "Editors" in the Members panel has no way to know what editors can and cannot do without trial and error.

**Suggested improvements:**
- Add a brief role description footnote in the Members modal: "Editors can view and edit meeting content. Role changes are not yet supported." This sets accurate expectations and forestalls user questions. Priority: **Medium**

---

### 6.4 Permission Feedback

**What works well:**
- Owner-only actions (Archive, Restore, Delete, Duplicate, Rename) are gated and not shown to editors at the dashboard level.
- Shared cards show "Open" only, which is consistent with editor capabilities.

**What is confusing or missing:**
- When an editor opens a meeting and encounters an action they cannot perform (e.g., End Meeting — is this owner-only or editor-allowed?), the UI must either hide the control or show a clear "owner only" message. Based on the architecture, the RLS will reject unauthorized writes, but the frontend behavior for these edge cases is unclear from the UX review.
- Editors who try to delete a meeting notes record (if exposed) will get a Supabase RLS error rather than a clean UI message.

**Suggested improvements:**
- Audit all owner-only destructive actions and ensure editors see either a hidden control or an explicit "Only the meeting owner can do this" tooltip/message rather than a failed API call. Priority: **High**
- End Meeting availability for editors should be documented and surfaced explicitly: either editors can end a meeting (and this should be shown clearly) or they cannot (and the button should be hidden or disabled with a tooltip). Priority: **High**

---

## 7. Local Mode

### 7.1 Legacy Label Clarity

**What works well:**
- Sprint 1 adds "Local Mode (Legacy — browser only)" as the header badge — this correctly signals that Local Mode is not the future path.

**What is confusing or missing:**
- "Legacy" is a developer/technical term. End users may not know what legacy means in product context. It could imply the feature is broken, unsupported, or about to be removed — which may panic users who rely on it.
- There is no explanation of what "legacy" means in the context of Local Mode. The badge appears in the header but has no accompanying help text.
- For users currently using Local Mode, there is no clear path to transitioning to a cloud account shown within the local workspace. The migration modal exists but requires knowledge of the Local-to-Cloud migration prompt, which is not prominently advertised.

**Suggested improvements:**
- Replace "Legacy" in the badge with "Browser only, not synced" or add a tooltip: "Local Mode saves data in this browser only. Sign in to enable cloud sync and sharing." Priority: **High**
- Add a persistent, dismissible banner in the Local Mode workspace: "You're working in Local Mode — data is saved in this browser only and cannot be shared. Sign in to switch to cloud meetings." with a "Sign In" button. Priority: **Medium**
- Ensure the migration modal is triggered or at least surfaced when a signed-in user accesses `/meeting/local`. Priority: **Low**

---

### 7.2 Transition Path to Cloud

**What works well:**
- The Local-to-Cloud migration modal exists and offers a clear choice (move, keep, continue local).

**What is confusing or missing:**
- The migration prompt requires users to know it exists and navigate to a cloud meeting that has Local Workspace data. The discovery path is not clear.
- The overwrite warning ("This will overwrite the saved cloud data for [workspace] with the current Local Workspace data.") uses the word "workspace" inconsistently with other UI surfaces (meetings, not workspaces, is the primary noun).
- "Keep existing Cloud Meeting unchanged" and "Continue using Local Workspace" sound similar. The distinction (keep cloud = discard local data vs. continue local = don't migrate at all) needs clearer copy.

**Suggested improvements:**
- Make the migration banner (from 7.1 above) the primary discovery path.
- Rename migration modal buttons:
  - "Move Local Workspace to Cloud Meeting" → "Copy local data to this cloud meeting"
  - "Keep existing Cloud Meeting unchanged" → "Keep cloud meeting as-is (discard local data)"
  - "Continue using Local Workspace" → "Stay in Local Mode" Priority: **Medium**

---

## 8. General

### 8.1 Consistent Terminology

**Issues found:**

| Inconsistency | Surfaces |
|---|---|
| "Testing Mode" vs "Test Mode" | End Meeting modal vs. header chip |
| "Action date" vs "Meeting date" | Header (action date) vs. notes section (meeting date) |
| "Manual Save" vs "Backup" | Header button vs. dropdown menu item and help text |
| "Access / Members" vs "Members" | Workspace dropdown (Sprint 1) vs. dashboard card button |
| "Workspace" vs "Meeting" | Migration modal uses "workspace"; rest of app uses "meeting" |
| "End Meeting" vs "Capture Historical Snapshot" | Header button vs. confirmation modal submit button |
| "Tactical History" vs "Meeting History" | Dropdown label vs. referenced as "Meeting History" in STATE.md |

**Suggested improvements:**
- Establish a canonical glossary and align all UI copy to it. Recommended canonical terms:
  - "Meeting" (not Workspace in user-facing copy)
  - "Test Mode" (not Testing Mode)
  - "Meeting date" (not Action date)
  - "Manual Save" (not Backup in the header button context)
  - "Members" (not Access / Members)
  - "End Meeting" (button) → confirm action "End this meeting" (not Capture Historical Snapshot)
  - "Tactical History" (not Meeting History)
  Priority: **Medium** (can be done incrementally)

---

### 8.2 Button and Action Hierarchy

**What works well:**
- Color-coding is largely consistent: blue = primary, green = success/decision, amber = warning/archive, red = danger.
- Loading states ("Saving…") are present throughout.

**What is confusing or missing:**
- The workspace header has too many equally-weighted buttons: Start/Edit/View Meeting, End Meeting, Manual Save, and the settings menu icon all appear at the same level. On smaller screens these will crowd.
- "End Meeting" is a major destructive-adjacent lifecycle action but is styled similarly to "Manual Save." A visual weight distinction would help users pause before clicking End Meeting by accident.
- Some modals have "Save" as a primary button; others have "Capture Historical Snapshot." The lack of a consistent primary action label pattern makes the app feel like it was assembled from independent pieces.

**Suggested improvements:**
- Style "End Meeting" with a slightly different treatment (e.g., outlined rather than filled, or amber rather than default color) to signal it is a significant lifecycle action, not a routine save. Priority: **Medium**
- Standardize modal primary action labels: "Save", "Save & Close", "Confirm" — avoid inventing new labels per modal unless the action is truly unique. Priority: **Low**

---

### 8.3 Mobile / Responsive Experience

**What works noted:**
- Basic responsive layout is present.

**What is confusing or missing:**
- The sticky header contains meeting name, lifecycle chip, autosave status, lifecycle action buttons, Manual Save, and the menu icon. On a mobile viewport, this is too much for a single bar. The autosave status panel and lifecycle chip in particular will truncate or overflow.
- Meeting section cards (Agenda Items, Objectives, SOOs) are designed for wide screens and will be challenging to interact with on mobile. The card layout with color selectors, compact badges, and drag handles is inherently desktop-first.
- The Mobile-first responsive pass is listed as a future/deferred item, which is acceptable for a Team Beta, but should be clearly communicated to beta users so they are not surprised by the experience.

**Suggested improvements:**
- Add a banner or note in beta communications: "Meeting Tool is optimized for desktop browsers. Mobile support is coming in a future release." Priority: **Low** (communication, not code)
- At minimum, ensure the sticky header does not overflow or break on a 375px viewport. Priority: **Medium**

---

### 8.4 Confusing or Redundant UI Elements

1. **"Save Notes" button in Strategic Topic Notes modal** — inconsistent with autosave behavior elsewhere. Redundant if autosave covers Topics. Priority: **Medium**
2. **Decisions/Actions Summary collapsible section** — now described as a "read-only summary generated from Agenda Items." The section title "Decisions / Actions Summary ([count])" is accurate but the section itself may confuse users who remember when it was an input surface. A brief subtitle "Auto-generated from Agenda Items" would clarify. Priority: **Low**
3. **"FeedbackWidget"** — likely only visible in beta/dev environments, but should be styled to not look like part of the main product UI if it appears in production. Priority: **Low**
4. **Autosave detail panel "Reload cloud backup" button** — buried in the autosave detail panel, which is itself triggered by clicking a small chip. This recovery action is important but hard to find under failure conditions when users may be stressed. Priority: **Medium**

---

### 8.5 Missing Affordances

1. **No way to rename a meeting from within the workspace.** Renaming requires going to the dashboard. Users who realize they named a meeting wrong mid-session have no in-context path. Priority: **Medium**
2. **No "Copy link" to share a meeting URL.** Editors who want to share the meeting URL with a teammate must copy from the browser address bar. A "Copy meeting link" option in the Members modal would improve the invite flow. Priority: **Low**
3. **No visual indicator of concurrent editor presence.** Two editors can be in the same meeting simultaneously with Last Save Wins — a known debt item. At minimum, a note in the UI ("You are sharing this meeting with editors — last save wins") would set expectations. Priority: **Medium** (Sprint 4 tracks this)
4. **No "Save All" or explicit full-save shortcut.** Power users who want to force a full save of all surfaces have Manual Save, but there is no keyboard shortcut and the button is small. Priority: **Low**
5. **Change Password is missing from Profile.** Already in Sprint 2 backlog. Priority: **High** (already tracked)
6. **No way to leave a shared meeting as an editor.** Editors can be removed by the owner, but there is no self-removal path. Priority: **Low** (noted as deferred in architecture)

---

## Priority Summary

| Priority | Count | Key Items |
|---|---|---|
| **High** | 9 | Remove "Supabase Auth" badge; fix developer copy in Account view; Delete meeting copy / soft-delete honesty; Rename "Backup needed" chip; Closed meeting banner; Permission feedback for editors; End Meeting visibility for editors; Local Mode legacy label; Change Password (Sprint 2 already targeted) |
| **Medium** | 22 | Autosave panel restructure; terminology standardization; section descriptions for jargon terms; cascade needed tooltip; invite role description; closed meeting date on dashboard cards; Sign Up password hint; forgot password confirmation state; sticky header overflow on mobile; rename "Edit Meeting" to "Continue Meeting"; reframe End Meeting modal title; Shared with Me role badge; consolidate Members count + button; editor concurrent warning |
| **Low** | 14 | Tagline on landing; local mode button label; onboarding nudge; SOO spelled out; "Open details" rename; drag handle accessibility; copy-link in Members modal; self-removal for editors; mobile banner; admin/history timestamps on invites |

---

## Sprint 2 Additions

See `planning/POST_MAIN_ROADMAP.md` Sprint 2 section for items added from this review.
