# Meeting Tool

Meeting Tool by LyArk is a lightweight operational leadership meeting tool for structured weekly leadership meetings. It supports Meeting Setup, Playbook Definitions, Top Priority / Thematic Goal, Defining Objectives, tasks, Standard Operating Objectives, Strategic Topics, meeting notes, decisions/actions, cascading communication, and JSON workspace backup/restore.

## Current Architecture

- Next.js app using TypeScript and Tailwind CSS.
- Deployed on Vercel from the production/stable `main` branch.
- Phase 1 workspace persistence is browser `localStorage` with JSON export/import backup.
- Phase 2 authentication foundation supports optional Supabase email/password sign up, sign in, logout, and session restore on the `phase-2-cloud` branch.
- Workspace data is not stored in Supabase yet; schema, permissions, migration, and realtime collaboration details are still unresolved.

## Environment Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the local development server:

   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in a browser.

The localStorage-first workspace works without signing in. To enable optional Supabase Auth locally, create an uncommitted `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Do not commit `.env.local` or service-role secrets. Auth does not migrate, sync, or share workspace data yet; JSON export/import remains the backup and restore path.

## Validation Commands

Run these checks for app-code changes and when doing a full maintenance verification:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

For documentation-only changes, confirm the diff is limited to docs/planning/instruction files unless a full validation run is explicitly requested.

## Deployment

Vercel uses the default Next.js install, build, and output settings. Keep JSON export/import available even after future cloud persistence is introduced so users retain a backup and recovery path.

## Contributor Context

Read `AGENTS.md` first for canonical operating instructions, then review the planning source of truth under `planning/` and the architecture notes under `docs/` before changing implementation.
