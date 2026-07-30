#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const DELIMITER = "============================================================";
const PROTECTED_FILES = new Set([
  "CLAUDE.md",
  "CODEX.md",
  ".gitignore",
  "src/README.md",
  "tests/README.md",
  "scripts/README.md",
  "samples/README.md",
  "references/README.md",
]);

function usage() {
  console.error("Usage: node scripts/apply-architect-pack.js path/to/architect-pack.md [--dry-run]");
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function normalizeProjectPath(filePath) {
  if (!filePath || filePath.trim() !== filePath) {
    fail(`Invalid FILE path: "${filePath}"`);
  }

  if (path.isAbsolute(filePath)) {
    fail(`Absolute paths are not allowed: ${filePath}`);
  }

  const normalized = path.posix.normalize(filePath.replace(/\\/g, "/"));

  if (normalized === "." || normalized.startsWith("../") || normalized === "..") {
    fail(`Paths outside the project root are not allowed: ${filePath}`);
  }

  if (PROTECTED_FILES.has(normalized)) {
    fail(`Protected file cannot be overwritten by an Architect Pack: ${normalized}`);
  }

  return normalized;
}

function parseArchitectPack(content) {
  const lines = content.split(/\r?\n/);
  const sections = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i] !== DELIMITER) {
      i += 1;
      continue;
    }

    const header = lines[i + 1] || "";
    const closing = lines[i + 2] || "";
    const match = header.match(/^FILE: (.+)$/);

    if (!match || closing !== DELIMITER) {
      fail(`Malformed FILE section near line ${i + 1}`);
    }

    const filePath = normalizeProjectPath(match[1]);
    i += 3;

    if (lines[i] === "") {
      i += 1;
    }

    const body = [];
    while (i < lines.length && lines[i] !== DELIMITER) {
      body.push(lines[i]);
      i += 1;
    }

    sections.push({
      filePath,
      content: body.join("\n").replace(/\n*$/, "\n"),
    });
  }

  return sections;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const packArgs = args.filter((arg) => arg !== "--dry-run");

  if (packArgs.length !== 1 || args.some((arg) => arg !== "--dry-run" && arg.startsWith("--"))) {
    usage();
    process.exit(1);
  }

  const packPath = path.resolve(process.cwd(), packArgs[0]);
  if (!fs.existsSync(packPath)) {
    fail(`Architect Pack not found: ${packArgs[0]}`);
  }

  const projectRoot = path.resolve(__dirname, "..");
  const packContent = fs.readFileSync(packPath, "utf8");
  const sections = parseArchitectPack(packContent);

  if (sections.length === 0) {
    fail("No FILE sections found.");
  }

  const seen = new Set();
  for (const section of sections) {
    if (seen.has(section.filePath)) {
      fail(`Duplicate FILE section: ${section.filePath}`);
    }
    seen.add(section.filePath);
  }

  const results = [];

  for (const section of sections) {
    const targetPath = path.resolve(projectRoot, section.filePath);
    const relativeCheck = path.relative(projectRoot, targetPath);

    if (relativeCheck.startsWith("..") || path.isAbsolute(relativeCheck)) {
      fail(`Resolved path escapes project root: ${section.filePath}`);
    }

    const exists = fs.existsSync(targetPath);
    const action = exists ? "updated" : "created";

    if (!dryRun) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, section.content, "utf8");
    }

    results.push({ action, filePath: section.filePath });
  }

  console.log(dryRun ? "Dry run: no files written." : "Architect Pack applied.");
  for (const result of results) {
    const verb = dryRun ? `would be ${result.action}` : result.action;
    console.log(`- ${verb}: ${result.filePath}`);
  }
}

main();
