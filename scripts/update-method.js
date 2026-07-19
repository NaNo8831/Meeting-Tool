#!/usr/bin/env node
// Sprint 060 — the any-tool method updater + self-heal, run from a coding tool
// (Claude Code / Codex / Cursor) instead of the Mission Control browser dashboard.
//
// It does the SAME mode-aware update + repair the browser does: it reads this folder's
// mode + version from .120x/method-manifest.json, fetches the current method files for
// that mode from the 120x app, rewrites only the shared method files that changed, and —
// for an existing-project folder — repairs the two non-allowlist files that broke pre-059
// downloads (copies the old-named Architect prompt to the canonical name if the canonical
// is absent; seeds planning/STATUS.json if absent). It COPIES — never deletes — and never
// overwrites an existing STATUS.json. Nothing is uploaded; the only network call fetches
// our own doctrine TO this machine.
//
// Pure Node — no dependencies, uses the global fetch (Node 18+). It ships INSIDE customer
// folders (a TEMPLATE_FILE), so it cannot require the app's modules. The three helpers
// below are deliberate inlined copies of:
//   - diffManifest      → apps/hosted/lib/cockpit/method-update.js
//   - inferFolderMode   → apps/hosted/lib/cockpit/method-heal.js
//   - planHeal          → apps/hosted/lib/cockpit/method-heal.js
// Keep them in sync if the originals change (an accepted watch-item, recorded in
// planning/QUESTIONS.md, same posture as the cockpit's copied strings). tests/update-method.test.js
// checks this copy against the SAME case matrix as tests/cockpit-method-heal.test.js.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Mirrors src/generators.js DEFAULT_METHOD_SOURCE — the production Render deploy. Used only
// when the folder's manifest has no `source` and METHOD_API_BASE isn't set.
const DEFAULT_METHOD_SOURCE = "https://one20x-project-launcher.onrender.com";

const MANIFEST_PATH = ".120x/method-manifest.json";

// Heal constants — mirror apps/hosted/lib/cockpit/method-heal.js.
const OLD_PROMPT_NAME = "existing-project-feature-or-fix-architect-starter-prompt.md";
const CANONICAL_PROMPT_NAME = "architect-chat-starter-prompt.md";
const STATUS_PATH = "planning/STATUS.json";
const EXISTING_PROJECT_SPRINT_FOLDER = "planning/sprints/001-existing-project-feature-or-fix";
// MUST stay byte-identical to src/generators.js generateStatusJsonContent().
const STATUS_SEED =
  JSON.stringify({ schemaVersion: 1, phase: "discovery", sprint: null, updated: null }, null, 2) + "\n";

// ── inlined pure helpers (kept in sync with the app — see header note) ──────────────────

// Mirror of apps/hosted/lib/cockpit/method-update.js diffManifest.
function diffManifest(current, folderHashes, folderVersion) {
  const files = (current && current.files) || {};
  const hashes = folderHashes || {};
  const changedFiles = Object.keys(files).filter((p) => hashes[p] !== files[p]);
  const baseVersion = folderVersion == null ? 0 : folderVersion;
  const newChangelog = ((current && current.changelog) || [])
    .filter((entry) => entry && typeof entry.version === "number" && entry.version > baseVersion)
    .slice()
    .sort((a, b) => b.version - a.version);
  return { behind: changedFiles.length > 0, changedFiles, newChangelog };
}

// Mirror of apps/hosted/lib/cockpit/method-heal.js inferFolderMode.
function inferFolderMode({ manifestMode, oldPromptExists, existingSprintFolderExists }) {
  if (
    manifestMode === "existing-project" ||
    manifestMode === "new-project" ||
    manifestMode === "website"
  ) {
    return manifestMode;
  }
  if (oldPromptExists || existingSprintFolderExists) {
    return "existing-project";
  }
  return "new-project";
}

// Mirror of apps/hosted/lib/cockpit/method-heal.js planHeal.
function planHeal({ mode, canonicalPromptExists, oldPromptExists, statusExists }) {
  if (mode !== "existing-project") {
    return { copyPrompt: false, seedStatus: false };
  }
  return {
    copyPrompt: !canonicalPromptExists && oldPromptExists,
    seedStatus: !statusExists,
  };
}

// ── filesystem helpers ──────────────────────────────────────────────────────────────────

// Walk up from `start` to the nearest directory that holds .120x/method-manifest.json.
// Returns that directory, or null if none is found up to the filesystem root.
function findProjectRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, MANIFEST_PATH))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

function readManifest(root) {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(root, MANIFEST_PATH), "utf8"));
    return {
      version: typeof parsed.version === "number" ? parsed.version : null,
      mode: typeof parsed.mode === "string" ? parsed.mode : null,
      source: typeof parsed.source === "string" ? parsed.source : null,
    };
  } catch {
    return { version: null, mode: null, source: null };
  }
}

function hashFile(absPath) {
  return crypto.createHash("sha256").update(fs.readFileSync(absPath, "utf8"), "utf8").digest("hex");
}

function writeRepoFile(root, relativePath, content) {
  const absPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content);
}

// ── main ────────────────────────────────────────────────────────────────────────────────

// Injectable for tests: pass { cwd, fetchImpl, log }. Returns a result object describing
// what happened (so a test can assert without parsing stdout).
async function run({ cwd = process.cwd(), fetchImpl = globalThis.fetch, log = console.log } = {}) {
  const root = findProjectRoot(cwd) || path.resolve(cwd);
  const manifest = readManifest(root);

  const oldPromptExists = fs.existsSync(path.join(root, OLD_PROMPT_NAME));
  const existingSprintFolderExists = fs.existsSync(path.join(root, EXISTING_PROJECT_SPRINT_FOLDER));
  const mode = inferFolderMode({
    manifestMode: manifest.mode,
    oldPromptExists,
    existingSprintFolderExists,
  });

  const base = (process.env.METHOD_API_BASE || manifest.source || DEFAULT_METHOD_SOURCE).replace(
    /\/+$/,
    ""
  );

  if (typeof fetchImpl !== "function") {
    throw new Error("This Node version has no global fetch. Use Node 18+ to run /update.");
  }
  const res = await fetchImpl(`${base}/api/method?mode=${encodeURIComponent(mode)}&contents=1`);
  if (!res.ok) {
    throw new Error(`Couldn't fetch the latest method files (${res.status}) from ${base}.`);
  }
  const current = await res.json();
  if (!current || !current.files) {
    throw new Error("The method endpoint returned an unexpected response.");
  }
  const contents = current.contents || {};

  // Diff this mode's allowlist against the folder.
  const folderHashes = {};
  for (const relativePath of Object.keys(current.files)) {
    const absPath = path.join(root, relativePath);
    folderHashes[relativePath] = fs.existsSync(absPath) ? hashFile(absPath) : null;
  }
  const diff = diffManifest(current, folderHashes, manifest.version);

  // Write only changed allowlist files; assert membership before every write.
  let refreshed = 0;
  for (const relativePath of diff.changedFiles) {
    if (!Object.prototype.hasOwnProperty.call(current.files, relativePath)) {
      throw new Error(`Refused to write a file outside the method allowlist: ${relativePath}`);
    }
    const content = contents[relativePath];
    if (typeof content !== "string") {
      throw new Error(`The latest method files were incomplete (missing ${relativePath}). Nothing else was changed.`);
    }
    writeRepoFile(root, relativePath, content);
    refreshed += 1;
  }

  // Heal — existing-project only; copy-not-delete, seed-if-absent.
  let copiedPrompt = false;
  let seededStatus = false;
  const plan = planHeal({
    mode,
    canonicalPromptExists: fs.existsSync(path.join(root, CANONICAL_PROMPT_NAME)),
    oldPromptExists,
    statusExists: fs.existsSync(path.join(root, STATUS_PATH)),
  });
  if (plan.copyPrompt) {
    writeRepoFile(root, CANONICAL_PROMPT_NAME, fs.readFileSync(path.join(root, OLD_PROMPT_NAME), "utf8"));
    copiedPrompt = true;
  }
  if (plan.seedStatus) {
    writeRepoFile(root, STATUS_PATH, STATUS_SEED);
    seededStatus = true;
  }

  const changed = refreshed > 0 || copiedPrompt || seededStatus;

  // Re-stamp the mode-aware manifest only when something changed.
  if (changed) {
    const stamp =
      JSON.stringify(
        {
          version: current.version,
          released: current.released,
          mode: mode || "new-project",
          source: base,
          files: current.files,
        },
        null,
        2
      ) + "\n";
    writeRepoFile(root, MANIFEST_PATH, stamp);
  }

  // Plain-English summary.
  let summary;
  if (!changed) {
    summary = `Your 120x method is already up to date (v${current.version}).`;
  } else {
    const extras = [];
    if (copiedPrompt) extras.push("added your Architect starter prompt");
    if (seededStatus) extras.push("added status tracking");
    const tail = extras.length ? `, ${extras.join(", ")}` : "";
    summary = `Updated to v${current.version}: refreshed ${refreshed} file${refreshed === 1 ? "" : "s"}${tail}.`;
  }
  log(summary);

  return {
    root,
    mode,
    base,
    version: current.version,
    upToDate: !changed,
    refreshed,
    changedFiles: diff.changedFiles,
    healed: { copiedPrompt, seededStatus },
    summary,
  };
}

module.exports = {
  run,
  diffManifest,
  inferFolderMode,
  planHeal,
  findProjectRoot,
  DEFAULT_METHOD_SOURCE,
  STATUS_SEED,
  OLD_PROMPT_NAME,
  CANONICAL_PROMPT_NAME,
  STATUS_PATH,
  EXISTING_PROJECT_SPRINT_FOLDER,
};

if (require.main === module) {
  run().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
