# Meeting Tool

Meeting Tool by LyArk is a lightweight operational leadership meeting tool for structured weekly leadership meetings. It helps leadership teams keep the current top priority visible, run agenda-driven meetings, capture decisions/actions, identify cascading communication, preserve strategic topics, and track defining objectives, tasks, and standard operating objectives without becoming a heavyweight project-management system.

## Current Feature Set

- Cloud Meeting dashboard with owned and shared meetings.
- Supabase email/password authentication and shared meeting access.
- Owner/editor collaboration model for Team Beta.
- Meeting Setup and Playbook Definitions.
- Top Priority / Thematic Goal.
- Defining Objectives with embedded Tasks, task details, subtasks, comments, and activity history.
- Standard Operating Objectives.
- Full-width Agenda Items as the primary meeting workspace.
- Agenda Item discussion notes, Decision support, Action support, Covered state, Cascade Needed, and Promote to Strategic Topic.
- Strategic Topics and Topic Notes as the secondary planning surface.
- Meeting Notes and Cascading Communications as meeting output/communication surfaces.
- Manual Save to cloud full-workspace backup JSON.
- JSON workspace export/import backup and restore.
- Browser-only Local Mode fallback.

## Current Workflow

The product is organized around the live leadership meeting and the follow-through it creates:

```text
Meeting
↓
Agenda Items
↓
Decision / Action
↓
Cascade Communication
↓
Strategic Topic
↓
Defining Objectives / Tasks / SOOs
```

In practice:

1. Open a Cloud Meeting from the dashboard.
2. Run the meeting from full-width Agenda Items.
3. Capture discussion notes and mark Decision and/or Action outcomes on Agenda Items.
4. Mark Cascade Needed when an outcome must be communicated after the meeting.
5. Promote deeper agenda items to Strategic Topics when they need strategic follow-up.
6. Use Defining Objectives, Tasks, and SOOs for execution and ongoing operating standards.
7. Keep Manual Save and JSON Backup/Restore available as recovery paths while structured autosave continues to mature.

## Current Architecture

- Next.js app using TypeScript and Tailwind CSS.
- Deployed on Vercel from the production/stable `main` branch.
- Supabase provides auth, cloud meeting containers, shared access, RLS, RPCs, and structured persistence tables.
- Cloud Meeting routes hydrate `meetings.meeting_data` full-workspace backup first, then overlay structured rows when available.
- Structured autosave is debounced, Last Save Wins, and rolled out surface-by-surface.
- Current structured autosave coverage includes meeting settings, Strategic Topics, Topic Notes, Meeting Notes, Cascading Communications, Defining Objectives, embedded Tasks, Standard Operating Objectives, and Agenda Items.
- Manual Save writes full workspace backup JSON to `meetings.meeting_data` and remains the cloud safety net.
- JSON export/import remains the user-facing backup and recovery path.
- Local Mode remains browser-only and does not autosave to cloud.
- Realtime collaboration, locks, presence, CRDTs, conflict resolution, ownership transfer, full Viewer UX, and organizations are deferred.

## Environment Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create an uncommitted `.env.local` for Supabase-backed cloud/auth flows:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

   Do not commit `.env.local` or service-role secrets.

3. Start the local development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in a browser.

Local Mode can run browser-only, but shared cloud access and structured cloud persistence require Supabase environment variables and an appropriately migrated Supabase project.

## Validation Commands

Run these checks for app-code changes and when doing a full maintenance verification:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

For documentation-only changes, confirm the diff is limited to docs/planning/instruction files unless a full validation run is explicitly requested.

## Deployment

Vercel uses the default Next.js install, build, and output settings. `main` is production/stable. `phase-3-shared-access` is the current shared-access/pre-main integration branch. Keep JSON export/import and Manual Save available until a deliberate future architecture decision replaces those safety paths.

## Architecture and Handoff References

Read these files before major implementation work:

- `AGENTS.md` — repository operating instructions.
- `planning/STATE.md` — current project state and active roadmap.
- `planning/DECISIONS.md` — durable product and architecture decisions.
- `planning/DOMAIN.md` — terminology and meeting model.
- `planning/RISKS.md` — known risks and mitigations.
- `planning/QUESTIONS.md` — open questions.
- `docs/ARCHITECTURE.md` — architecture notes and persistence direction.
- `docs/DATA_MODEL.md` — current and target data model notes.
- `docs/PERMISSIONS.md` — shared access and RLS guidance.
- `docs/VALIDATION.md` — validation expectations.
- `docs/CLAUDE_CODE_START_HERE.md` — direct Claude Code start guide for the current before-main stopping point.
- `docs/CLAUDE_CHAT_HANDOFF.md` — plain-language Claude Chat handoff for reasoning, planning, and prompt writing.
- `docs/AUTH_EMAIL_SETUP.md` — Supabase Auth URL, custom SMTP/Resend, and auth email validation guidance.
- `docs/CURRENT_PROJECT_STATUS.md` — current project status, completed systems, before-main roadmap, and known risks.
- `docs/HANDOFF_TO_CLAUDE_CODE.md` — transition review and Claude Code handoff package.
- `docs/AI_AGENT_WORKFLOW.md` — AI-agent workflow, PR types, red flags, and preferred prompt pattern.
- `docs/PROJECT_HISTORY.md` — chronological project and decision history.
