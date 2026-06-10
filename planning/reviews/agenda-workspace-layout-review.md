# Agenda Workspace Layout Review

## Scope

This is a planning/review document only. It does not approve app-code, UI, migration, persistence, autosave, or permission changes by itself.

The review responds to the workflow introduced by PR #102:

```text
Agenda Item
↓
Decision / Action
↓
Cascade Communication
↓
Strategic Topic
```

The primary question is whether the Meeting page layout should make Agenda Items feel like the dominant meeting workspace, with Strategic Topics and Cascading Communication positioned as downstream surfaces instead of peer sections.

## 1. Current Layout Analysis

### Current arrangement

The meeting workspace currently renders the meeting sections from the persisted `meetingSectionOrder` array inside a two-column responsive grid. The default order is:

1. Agenda Items
2. Strategic Topics
3. Decisions / Actions
4. Cascading Communication

Because the grid is `md:grid-cols-2`, the default desktop layout reads as a two-by-two matrix:

```text
| Agenda Items        | Strategic Topics          |
| Decisions / Actions | Cascading Communication   |
```

The sections can be reordered by dragging the section cards. That means the visual order can drift per workspace and the page does not enforce a fixed meeting hierarchy.

### Current visual hierarchy

The current visual hierarchy is mostly equal-weight section cards:

- Each section uses the same rounded card treatment, border, background, padding, heading scale, description copy, item list, and Add row pattern.
- Agenda Items has richer per-item controls for notes, covered state, decision, action, cascade-needed, and promote-to-Strategic-Topic, but the parent Agenda section itself does not receive more width or placement emphasis than the other sections.
- Decisions / Actions is now read-only and generated from Agenda Items, but it still occupies its own peer card in the same grid.
- Cascading Communication includes generated cascade-needed rollups plus editable communication notes, but it appears as another peer card rather than a visible output lane from agenda outcomes.
- Strategic Topics is operationally persistent and long-term, but the current two-column placement beside Agenda Items can make it feel equally primary during the live meeting.

### Workflow implied by the current layout

The current layout implies a dashboard of parallel meeting buckets more than a workflow. On desktop, users see Agenda Items and Strategic Topics as peers in the first row, with Decisions / Actions and Cascading Communication as peers in the second row. That arrangement under-emphasizes the fact that Decisions / Actions and Cascade markers are now captured inside Agenda Items, and that Strategic Topics are usually promoted follow-up or long-term parking rather than the primary tactical working surface.

The architecture now says “work the agenda item, record the outcome, mark cascade needs, and optionally promote to Strategic Topic.” The layout still says “choose among several equivalent meeting sections.”

## 2. Recommended Meeting Workflow

The recommended conceptual workflow is:

```text
Agenda Item
↓
Decision
↓
Action
↓
Cascade
↓
Promote to Strategic Topic
```

Agenda Items should become the dominant workspace section. They now contain the most meeting-critical state: discussion notes, covered/completed state, decision text, action text, cascade-needed marker, and promotion to Strategic Topic. During a live leadership meeting, the team should primarily ask: “What agenda item are we working, what did we decide, what action exists, what must cascade, and does this belong as a strategic topic?”

Strategic Topics should remain visible, but as a planning and long-term follow-up surface. They should help the team park or review durable strategic matters without pulling the primary meeting workflow away from the active agenda.

Cascading Communication should remain visible, but as an output and communication surface. Its generated rollup should help the team verify what needs to be communicated after the meeting, while editable notes can refine wording for Staff/direct reports.

The separate Decisions / Actions section should not become visually dominant. If retained in the UI, it should continue to behave as a generated/read-only summary or be folded into the Agenda workspace area in a future implementation. It should not compete with Agenda Items as a peer capture location.

## 3. Layout Recommendation

### Option A: Agenda Items full width; Strategic Topics and Cascading Communications beneath

```text
|---------------- Meeting ----------------|

|------------- Agenda Items -------------|

| Strategic Topics | Cascading Communication |
```

Recommendation: **choose Option A**.

Rationale:

- It best matches the desired conceptual hierarchy: Agenda Items are the primary working surface; Strategic Topics and Cascading Communication are secondary downstream surfaces.
- It preserves side-by-side visibility for the two follow-up surfaces on desktop: one for long-term planning/follow-up, one for post-meeting communication output.
- It avoids over-promoting Cascading Communication above Strategic Topics or burying Strategic Topics too far down the page.
- It creates a practical live-meeting rhythm: work full-width Agenda Items first, then scan follow-up parking and communication output before ending the meeting.
- It can be implemented as a layout-only change later without changing persistence, autosave, RLS, schema, or Agenda Item data shape.

Recommended future desktop shape:

```text
Meeting header / controls
Top Priority / Objectives / SOOs as currently designed

Agenda Workspace
└─ Agenda Items, full width and non-section-draggable
   ├─ Discussion notes
   ├─ Decision
   ├─ Action
   ├─ Cascade Needed
   └─ Promote to Strategic Topic

Follow-up Surfaces
├─ Strategic Topics, half width on desktop
└─ Cascading Communication, half width on desktop

Decisions / Actions Summary
└─ Optional generated/read-only rollup if still needed, visually subordinate to Agenda Items
```

### Option B: Agenda Items full width; Strategic Topics beneath; Cascading Communications beneath

```text
|------------- Agenda Items -------------|
|----------- Strategic Topics -----------|
|-------- Cascading Communication -------|
```

Option B is acceptable for narrow or highly focused meeting views, but it is not the preferred desktop layout. It makes the hierarchy very clear, but it increases vertical distance between the active agenda and the communication output. On larger screens, it may make follow-up scanning slower near the end of the meeting.

Option B should effectively be the mobile/tablet collapse pattern rather than the primary desktop recommendation.

### Option C: Alternative recommendation

A stronger alternative would be a single “Agenda Workspace” parent container with tabs or nested panels for Outcomes, Strategic Topic promotions, and Cascade output. This could make the workflow explicit, but it risks overbuilding the current Phase 1/Phase 3 stabilization needs. It would also be a larger UX refactor and could accidentally change editing expectations, autosave boundaries, or user mental models.

Do not choose Option C before main unless later validation shows that Option A still leaves users confused.

## 4. Mobile Considerations

On smaller screens, the hierarchy should collapse into a single vertical flow:

```text
Agenda Items
Strategic Topics
Cascading Communication
Decisions / Actions Summary, if retained
```

Mobile rules:

- Agenda Items should always appear first.
- Agenda Items should remain full width.
- Strategic Topics should appear before Cascading Communication when the user is still in meeting-planning mode; Cascading Communication can remain immediately after if the primary need is end-of-meeting output review.
- Generated rollups should stay close to the sections they summarize, but not above the editable agenda workspace.
- Avoid requiring drag/reorder gestures on mobile for major section layout. Dragging section cards on small screens is difficult, discoverability is low, and accidental reordering can damage the meeting flow.

Recommended responsive behavior:

- Desktop: Agenda full width, Strategic Topics and Cascading Communication side-by-side below.
- Tablet: Agenda full width, Strategic Topics and Cascading Communication can remain side-by-side only if the cards remain readable; otherwise stack.
- Mobile: fully stacked, fixed hierarchy.

## 5. Drag/Reorder Rules

User direction remains appropriate with one refinement:

### Agenda Items section

Agenda Items should **not** be movable as a section.

Reasoning:

- It is now the primary working surface and should anchor the meeting workflow.
- Allowing it to move lets a workspace drift back into the peer-section layout problem.
- Fixed placement reduces live-meeting confusion and makes training/documentation easier.

Agenda items themselves may still need item-level ordering if the product supports agenda sequence management. This review only recommends fixing the Agenda Items section placement, not removing item order within Agenda Items.

### Strategic Topics section

Strategic Topics may remain movable, but only within the secondary follow-up area.

Reasoning:

- Some teams may prefer to scan Strategic Topics before communication output; others may prefer the reverse near meeting close.
- Keeping limited movement preserves flexibility without weakening Agenda Items as the anchor.

### Cascading Communication section

Cascading Communication may remain movable, but only within the secondary follow-up area.

Reasoning:

- It is an output surface, not the primary capture surface.
- It can trade order with Strategic Topics if needed, but should not move above Agenda Items.

### Decisions / Actions section

If Decisions / Actions remains visible, it should remain read-only and visually subordinate. It should not be a movable peer section that can appear above Agenda Items. Longer term, the product should decide whether the read-only summary belongs inside the Agenda workspace, below the Agenda workspace, or in meeting history/export summaries.

## 6. Before-Main Recommendation

### Should this happen before main?

Recommendation: **Yes, if PR #102-style Agenda Item persistence and Agenda outcome capture are intended to reach main before or with this branch.**

The architecture is already pushing users toward Agenda Items as the parent object. Leaving the page layout as equal peer cards risks training users into the old model right before main. A layout-only implementation of Option A would align the page with the actual workflow without changing the data model.

If main readiness is constrained, this can be split:

1. Before main: make Agenda Items fixed and full-width; place Strategic Topics and Cascading Communication beneath.
2. After main: decide whether to remove, relocate, or further subordinate the read-only Decisions / Actions summary.

### Implementation complexity

Estimated complexity: **low to moderate**.

Likely implementation shape for a future code PR:

- Stop rendering Agenda Items as one member of the generic reorderable two-column section grid.
- Render Agenda Items as a fixed full-width section above the secondary grid.
- Render Strategic Topics and Cascading Communication in a secondary responsive grid.
- Keep or relocate the generated Decisions / Actions rollup as a subordinate summary.
- Constrain persisted section order so older workspace values cannot place Agenda Items below other sections.
- Preserve existing Agenda Item, Strategic Topic, Cascade, and Decision/Action data fields.

No schema, migration, autosave, RLS, permission, or persistence redesign should be required for the basic layout change.

### Implementation risk

Estimated risk: **low to moderate**.

Risks to manage in the later implementation PR:

- Existing persisted `meetingSectionOrder` values may conflict with the new fixed hierarchy unless normalized defensively.
- Section drag/drop code currently treats all non-read-only sections as draggable, so the implementation must avoid accidentally making Agenda Items movable.
- If Decisions / Actions is still part of the persisted section order, the implementation must define where it appears without turning it back into a peer capture section.
- Mobile stacking should be tested to confirm Agenda controls remain readable after becoming the dominant section.
- No persistence/autosave behavior should change; any future PR should verify that Agenda Item autosave, cascade rollups, Strategic Topic promotion, Backup/Restore, and read-only historical meeting notes still behave the same.

## Final Recommendation

Use **Option A** as the future layout direction:

```text
|---------------- Meeting ----------------|

|------------- Agenda Items -------------|

| Strategic Topics | Cascading Communication |
```

Agenda Items should become the fixed, full-width primary workspace. Strategic Topics and Cascading Communication should become secondary follow-up/output surfaces beneath Agenda Items. Decisions / Actions should remain read-only and subordinate if retained. This should happen before main if Agenda outcome capture is part of the main candidate, because the layout should teach the same workflow that the architecture now supports.
