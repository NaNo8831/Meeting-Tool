# Meeting Tool

Meeting Tool by LyArk is a lightweight operational leadership meeting tool for structured weekly leadership meetings. It helps leadership teams keep the current top priority visible, run agenda-driven meetings, capture decisions and actions, identify cascading communication, preserve strategic topics, and track defining objectives, tasks, and standard operating objectives without becoming a heavyweight project-management system.

## Current Feature Set

- **Cloud Meeting dashboard** with Owned by Me and Shared with Me sections.
- **Supabase email/password authentication**: sign up, sign in, sign out, profile display names, and Forgot Password / password reset.
- **Owner/editor collaboration model** for Team Beta: owners manage meeting lifecycle; owners and editors edit meeting content.
- **Meeting Setup and Playbook Definitions**: dashboard title, organization info, section order, setup state.
- **Top Priority / Thematic Goal** with rich text support.
- **Defining Objectives** with embedded Tasks, task details, subtasks, comments, and activity history.
- **Standard Operating Objectives** with ordering and color indicators.
- **Full-width Agenda Items** as the primary live-meeting workspace: discussion notes, Decision support, Action support, Covered state, Cascade Needed, and Promote to Strategic Topic.
- **Strategic Topics and Topic Notes** as the secondary planning surface.
- **Meeting Notes and Cascading Communications** as meeting output and communication surfaces.
- **Structured autosave** for all major surfaces (meeting settings, Strategic Topics, Topic Notes, Meeting Notes, Cascading Communications, Defining Objectives, embedded Tasks, Standard Operating Objectives, Agenda Items). Autosave is debounced, per-surface, and Last Save Wins.
- **Manual Save** to cloud full-workspace backup JSON — the cloud safety net while autosave stabilizes.
- **JSON workspace export/import** backup and restore.
- **Meeting lifecycle**: Start Meeting, End Meeting (creates Tactical History snapshot), read-only closed and past meetings, Test Mode date override for preview/development.
- **Tactical History** of past ended meetings.

## Workflow

The product is organized around the live leadership meeting and the follow-through it creates:

```
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
2. Run the meeting from the full-width Agenda Items workspace.
3. Capture discussion notes and mark Decision and/or Action outcomes on Agenda Items.
4. Mark Cascade Needed when an outcome must be communicated after the meeting.
5. Promote deeper agenda items to Strategic Topics for strategic follow-up.
6. Use Defining Objectives, Tasks, and SOOs for execution and ongoing operating standards.
7. Use Manual Save and JSON Backup/Restore as recovery paths alongside structured autosave.

## Access and Roles

| Role | Create meetings | Edit content | Lifecycle actions | Manage members |
|------|----------------|-------------|------------------|----------------|
| Owner | Yes | Yes | Yes (archive, rename, delete, duplicate) | Yes (invite, remove editors and viewers) |
| Editor | No | Yes | No | No |
| Viewer | No | No (read-only; full enforcement upcoming) | No | No |

Authorization is enforced at the database level through Supabase RLS. See `docs/PERMISSIONS.md`.

## Architecture

- **Framework:** Next.js 16 + TypeScript + Tailwind CSS 4.
- **Deployment:** Vercel, from the production `main` branch.
- **Auth and database:** Supabase — email/password auth, cloud meeting containers, structured persistence tables, row-level security, and owner-only RPCs.
- **Cloud persistence:** Structured autosave covers all major meeting surfaces. Cloud routes hydrate `meetings.meeting_data` full-workspace backup first, then overlay structured rows per surface.
- **Autosave model:** Debounced, per-surface, Last Save Wins. No realtime collaboration, presence, locks, or conflict resolution.
- **Manual Save:** Writes the full workspace backup JSON to `meetings.meeting_data`. Mandatory as the cloud rollback and backup/import path.
- **JSON export/import:** Full workspace backup and restore, compatible with `meetings.meeting_data` and structured rows.

## Environment Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` (not committed) with Supabase credentials:

   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

   Optionally, enable testing tools on preview/development deployments only:

   ```
   NEXT_PUBLIC_ENABLE_TESTING_TOOLS=true
   ```

   Never set `NEXT_PUBLIC_ENABLE_TESTING_TOOLS=true` on production.

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

Cloud meetings and shared access require a Supabase project with all migrations in `supabase/migrations/` applied in timestamp order.

## Supabase Auth URL Configuration

Before validating auth emails (password reset, signup confirmation) in any non-development environment:

- Set **Site URL** to the production domain (not localhost).
- Add **Redirect URLs** for production, Vercel previews (`https://*.vercel.app/**`), and local development (`http://localhost:3000/**`).

## Validation Commands

```bash
npm run lint
npx tsc --noEmit
npm run build
```

For documentation-only changes, confirm the diff is limited to `docs/`, `planning/`, or instruction files.

## Deployment

Vercel uses the default Next.js build and output settings. `main` is the production/stable branch. Keep JSON export/import and Manual Save available until a deliberate future architecture decision replaces those paths.

## Key Reference Documents

Before making implementation changes, read:

- `AGENTS.md` — repository operating instructions.
- `planning/STATE.md` — current project state and active roadmap.
- `planning/DECISIONS.md` — durable product and architecture decisions.
- `planning/DOMAIN.md` — terminology and meeting model.
- `planning/RISKS.md` — known risks and mitigations.
- `planning/QUESTIONS.md` — open questions.
- `docs/ARCHITECTURE.md` — system architecture, routes, data flow, key file structure.
- `docs/DATA_MODEL.md` — Supabase tables, columns, relationships, RLS approach.
- `docs/PERMISSIONS.md` — owner/editor/viewer roles, RLS helpers, what each role can/cannot do.
- `docs/VALIDATION.md` — validation checklists and pre-merge process.
