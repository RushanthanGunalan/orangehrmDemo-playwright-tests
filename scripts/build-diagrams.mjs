/**
 * Builds the per-test sequence diagrams (docs/diagrams/html/*.html) from their
 * committed sources (docs/diagrams/sequence/*.json) using Archify.
 *
 * Each diagram goes through Archify's own `finalize`: schema validation,
 * delivery, a strict check, and a real-browser check, with every source
 * reference verified against the committed code at the revision pinned in the
 * JSON. Nothing is hand-drawn here - this script only runs Archify.
 *
 * Archify makes one self-contained HTML per diagram (about 740 KB each). Those
 * go in docs/diagrams/html/ as a git-ignored build cache, and the last step
 * bundles all of them into ONE file, docs/diagrams/all-tests.html, with a test
 * list to switch between them. That single file is the thing to open. The JSON
 * in docs/diagrams/sequence/ is the source of truth.
 *
 * Archify refuses to overwrite evidence receipts it already wrote, so a diagram
 * is always rebuilt from a clean slate (its old output is removed first).
 *
 * Usage:
 *   pnpm diagrams                    rebuild every diagram, then the single html
 *   pnpm diagrams TC_CEF_003         rebuild only matching diagram(s), then the single html
 *
 * Needs the Archify skill installed in .claude/skills/archify (it is
 * git-ignored, so it is not part of a fresh clone).
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { bundleDiagrams } from "./lib/diagram-viewer.mjs";

const ARCHIFY = path.join(".claude", "skills", "archify", "bin", "archify.mjs");
const SRC_DIR = path.join("docs", "diagrams", "sequence");
const HTML_DIR = path.join("docs", "diagrams", "html");
const BUNDLE = path.join("docs", "diagrams", "all-tests.html");
const CASES = path.join("docs", "test-suite", "test-cases.json");

if (!existsSync(ARCHIFY)) {
  console.error(
    `Archify is not installed (missing ${ARCHIFY}).\n` +
      "Install it into this project only, from the repo root:\n" +
      "  npx skills add tt-a1i/archify --skill archify --agent claude-code --copy\n" +
      "then re-run: pnpm diagrams",
  );
  process.exit(1);
}

const filter = process.argv.slice(2).find((a) => !a.startsWith("--"));
const sources = readdirSync(SRC_DIR)
  .filter((f) => f.endsWith(".json"))
  .filter((f) => !filter || f.includes(filter))
  .sort();

if (sources.length === 0) {
  console.error(`No diagram source matches "${filter}" in ${SRC_DIR}.`);
  process.exit(1);
}

mkdirSync(HTML_DIR, { recursive: true });
for (const f of readdirSync(HTML_DIR)) {
  const stem = f.split(".")[0];
  if (sources.some((s) => s.replace(/\.json$/, "") === stem)) rmSync(path.join(HTML_DIR, f), { recursive: true, force: true });
}

const results = [];
for (const file of sources) {
  const jsonPath = path.join(SRC_DIR, file);
  const output = JSON.parse(readFileSync(jsonPath, "utf8")).meta.output;
  const run = spawnSync(
    process.execPath,
    [ARCHIFY, "finalize", "sequence", jsonPath, output, "--repo-root", ".", "--quality", "showcase", "--json"],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );

  let receipt = null;
  try {
    receipt = JSON.parse(run.stdout);
  } catch {
    /* not JSON: reported below with whatever the process printed */
  }

  const ok = run.status === 0 && receipt?.status === "pass";
  const issues = (receipt?.diagnostics ?? []).map((d) => `${d.code}: ${d.message}`);
  if (!receipt) issues.push((run.stderr || run.stdout || "no output").trim().split("\n")[0]);
  results.push({ name: file.replace(/\.json$/, ""), ok, issues });
  console.log(`${ok ? "pass" : "FAIL"}  ${file}`);
  for (const issue of issues) console.log(`        ${issue}`);
}

const failed = results.filter((r) => !r.ok);
console.log(
  `
${results.length - failed.length}/${results.length} diagrams built` + (failed.length ? ` - ${failed.length} failed` : ""),
);

// Bundle everything that has a built diagram, not just what this run rebuilt.
const bundle = bundleDiagrams({
  sequenceDir: SRC_DIR,
  htmlDir: HTML_DIR,
  casesFile: CASES,
  out: BUNDLE,
  files: readdirSync(SRC_DIR).filter((f) => f.endsWith(".json")),
});
console.log(
  `${BUNDLE}: ${bundle.tests} tests, ${bundle.diagrams} diagrams, ${(bundle.bytes / 1048576).toFixed(1)} MB - open this one file`,
);
if (bundle.missing.length) {
  console.log(`not in the bundle (no built html - run pnpm diagrams): ${bundle.missing.join(", ")}`);
}
process.exit(failed.length ? 1 : 0);
