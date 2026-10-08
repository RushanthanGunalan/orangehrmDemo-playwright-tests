/**
 * Keeps the test documentation in step with the specs.
 *
 *   pnpm docs:sync     update the files below, then rebuild the Excel sheet
 *   pnpm docs:check    change nothing; exit 1 if anything is out of step (CI / pre-commit)
 *
 * It reads every `test("TC_XXX_NNN: ...")` in tests/*.spec.ts and makes sure
 * that each one has:
 *
 *   1. a row in docs/test-suite/test-cases.json, marked Automated = Yes
 *      (a row that was "Planned" is flipped; a missing row is added as a DRAFT)
 *   2. an entry in src/config/testTypes.json (the Discord per-type tally reads it)
 *   3. a sequence-diagram source in docs/diagrams/sequence/ (a missing one is
 *      drafted from the calls in the test body)
 *
 * Then it regenerates docs/OrangeHRM-Test-Suite.xlsx.
 *
 * What it can and cannot know: it reads the code, not the application. A
 * drafted row therefore has the scenario and steps taken from the test's own
 * title and test.step names, and says "TBD" for priority, input data and
 * expected result. A drafted diagram shows the spec's direct calls only (one
 * level deep, no source badges, no returns). Both are marked DRAFT so a human
 * (or Claude with Archify) can complete them - they are never silently
 * presented as reviewed.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { writeTestSuiteWorkbook } from "./lib/test-suite-workbook.mjs";

const TESTS_DIR = "tests";
const CASES_FILE = "docs/test-suite/test-cases.json";
const TYPES_FILE = "src/config/testTypes.json";
const DIAGRAM_DIR = "docs/diagrams/sequence";
const POM_FILE = "src/pages/PomManager.ts";
const XLSX_OUT = "docs/OrangeHRM-Test-Suite.xlsx";

const CHECK_ONLY = process.argv.includes("--check");
const PLANNED_PREFIX = "Planned, not automated yet. ";
const MAX_MESSAGES = 14; // a sequence canvas stays readable up to about this many

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + "\n");

/** Rewrites only when the data changed, so line endings are not churned in git. */
function writeJsonIfChanged(file, value) {
  const next = JSON.stringify(value, null, 2);
  const current = existsSync(file) ? readFileSync(file, "utf8").replace(/\r\n/g, "\n").trimEnd() : null;
  if (current !== next) writeJson(file, value);
}

// ---------- read the specs ----------

/** Text of the block that starts at the first "{" at or after `from`. */
function braceBlock(src, from) {
  const open = src.indexOf("{", from);
  if (open < 0) return "";
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(open, i + 1);
  }
  return src.slice(open);
}

const readable = (text) => text.replace(/\$\{[^}]*\}/g, "…").replace(/\s+/g, " ").trim();

function readSpecs() {
  const found = [];
  for (const file of readdirSync(TESTS_DIR).filter((f) => f.endsWith(".spec.ts")).sort()) {
    const src = readFileSync(path.join(TESTS_DIR, file), "utf8");
    const describe = src.match(/test\.describe\(\s*["'`]([^"'`]+)["'`]/)?.[1] ?? file.replace(/\.spec\.ts$/, "");
    const re = /\btest\(\s*["'`](TC_[A-Z]+_\d+):\s*([^"'`]+)["'`]/g;
    let m;
    while ((m = re.exec(src))) {
      const body = braceBlock(src, src.indexOf("=>", m.index));
      const steps = [...body.matchAll(/test\.step\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)].map((s) => ({
        index: s.index,
        text: readable(s[2]),
      }));
      found.push({
        id: m[1],
        title: m[2].trim(),
        file: `${TESTS_DIR}/${file}`,
        describe,
        body,
        steps,
      });
    }
  }
  return found;
}

/** pm property -> page-object class, read from PomManager so it never drifts. */
function readPomMap() {
  const map = { commonActions: "CommonActions" };
  if (!existsSync(POM_FILE)) return map;
  for (const m of readFileSync(POM_FILE, "utf8").matchAll(/readonly\s+(\w+):\s+(\w+);/g)) {
    if (m[1] !== "page") map[m[1]] = m[2];
  }
  return map;
}

// ---------- drafts ----------

function draftRow(spec, type) {
  const steps = spec.steps.length
    ? spec.steps.map((s, i) => `${i + 1}. ${s.text}`).join("\n")
    : "TBD - no test.step blocks to copy the steps from";
  return {
    id: spec.id,
    priority: "TBD",
    type,
    module: spec.describe,
    scenario: spec.title,
    steps,
    input: "TBD",
    expected: "TBD - fill in what this test asserts",
    automated: "Yes",
    spec: spec.file,
    notes:
      "DRAFT auto-added by `pnpm docs:sync` from the spec. Scenario and steps are the test's own title and " +
      "test.step names; priority, input data and expected result need a human review.",
  };
}

function draftDiagram(spec, pomMap) {
  const callRe = /\b(?:pm\.(\w+)|(testData))\.(\w+)\(/g;
  const calls = [];
  let m;
  while ((m = callRe.exec(spec.body))) {
    const cls = m[2] ? "TestData" : pomMap[m[1]];
    if (!cls) continue;
    const stepIdx = spec.steps.reduce((acc, s, i) => (s.index <= m.index ? i : acc), -1);
    calls.push({ cls, label: `${m[2] ? "testData" : m[1]}.${m[3]}()`, step: stepIdx });
  }
  if (calls.length === 0) return null;

  const shown = calls.slice(0, MAX_MESSAGES);
  const classes = [...new Set(shown.map((c) => c.cls))];
  const id = (cls) => cls.toLowerCase();

  let lastStep = -2;
  const messages = shown.map((c, i) => {
    const msg = {
      from: "spec",
      to: id(c.cls),
      y: 175 + i * 30,
      label: c.label.slice(0, 44),
      variant: "default",
    };
    if (c.step !== lastStep && c.step >= 0) msg.note = spec.steps[c.step].text.slice(0, 120);
    lastStep = c.step;
    return msg;
  });

  const lastY = 175 + (shown.length - 1) * 30;
  const items = [
    "DRAFT drawn automatically from the spec's direct calls. It shows no returns and nothing below the page-object layer.",
    "Not source-linked: there are no SRC badges until the test is committed and the diagram is completed.",
  ];
  if (calls.length > shown.length) items.push(`Only the first ${shown.length} of ${calls.length} calls are drawn.`);

  return {
    schema_version: 1,
    diagram_type: "sequence",
    meta: {
      title: `${spec.id}: ${spec.title}`.slice(0, 80),
      output: `docs/diagrams/html/${spec.id}.html`,
      viewBox: [1080, Math.max(480, lastY + 122)], // Archify needs a canvas at least 480 tall
      column_fit: "spread",
      quality_profile: "showcase",
      legend: { mode: "hidden" },
    },
    participants: [
      { id: "spec", type: "backend", label: "Spec", sublabel: spec.id },
      ...classes.map((cls) => ({ id: id(cls), type: "backend", label: cls })),
    ],
    segments: [{ from: 160, to: lastY + 44, label: "Test" }],
    messages,
    cards: [{ dot: "amber", title: "Draft - needs review", items }],
  };
}

// ---------- reconcile ----------

const specs = readSpecs();
const specIds = new Set(specs.map((s) => s.id));
const cases = readJson(CASES_FILE);
const types = readJson(TYPES_FILE);
const pomMap = readPomMap();
const report = { rowsAdded: [], rowsFlipped: [], rowsRespec: [], typesAdded: [], diagramsAdded: [], orphans: [], noCalls: [] };

for (const spec of specs) {
  let row = cases.find((c) => c.id === spec.id);
  if (!row) {
    row = draftRow(spec, types[spec.id] ?? "Functional");
    cases.push(row);
    report.rowsAdded.push(spec.id);
  } else if (row.automated !== "Yes") {
    row.automated = "Yes";
    row.spec = spec.file;
    row.notes =
      "Flipped to automated by `pnpm docs:sync`: re-check that the steps and expected result match the test as written. " +
      (row.notes ?? "").replace(PLANNED_PREFIX, "");
    report.rowsFlipped.push(spec.id);
  } else if (row.spec !== spec.file) {
    row.spec = spec.file;
    report.rowsRespec.push(spec.id);
  }

  if (!types[spec.id]) {
    types[spec.id] = row.type || "Functional";
    report.typesAdded.push(spec.id);
  }

  const hasDiagram = readdirSync(DIAGRAM_DIR).some((f) => f.startsWith(`${spec.id}.`) || f.startsWith(`${spec.id}-`));
  if (!hasDiagram) {
    const draft = draftDiagram(spec, pomMap);
    if (!draft) report.noCalls.push(spec.id);
    else {
      if (!CHECK_ONLY) writeJson(path.join(DIAGRAM_DIR, `${spec.id}.json`), draft);
      report.diagramsAdded.push(spec.id);
    }
  }
}

for (const row of cases) {
  if (row.automated === "Yes" && !specIds.has(row.id)) report.orphans.push(row.id);
}

// ---------- report / write ----------

const lines = [
  [report.rowsAdded, "added to the test-case list as DRAFT rows (priority/input/expected say TBD)"],
  [report.rowsFlipped, "were Planned and are now marked Automated = Yes"],
  [report.rowsRespec, "had their spec file updated"],
  [report.typesAdded, "added to src/config/testTypes.json"],
  [report.diagramsAdded, "had a DRAFT diagram source " + (CHECK_ONLY ? "missing" : "created in docs/diagrams/sequence/")],
  [report.noCalls, "have no diagram: no page-object or testData calls found in the test body to draw"],
  [report.orphans, "are marked Automated = Yes but no matching test exists in tests/ (review: renamed or deleted?)"],
];
let drift = 0;
for (const [ids, text] of lines) {
  if (ids.length) {
    console.log(`${ids.length} ${text}:\n    ${ids.join(", ")}`);
    drift += ids.length;
  }
}

if (CHECK_ONLY) {
  if (drift) {
    console.error("\nTest docs are out of step with the specs. Run: pnpm docs:sync");
    process.exit(1);
  }
  console.log("Test docs are in step with the specs.");
  process.exit(0);
}

writeJsonIfChanged(CASES_FILE, cases);
writeJsonIfChanged(TYPES_FILE, types);
mkdirSync(path.dirname(XLSX_OUT), { recursive: true });
await writeTestSuiteWorkbook(cases, XLSX_OUT);

const automated = cases.filter((c) => c.automated === "Yes").length;
console.log(
  `${drift ? "\n" : ""}docs in step: ${cases.length} test cases (${automated} automated, ` +
    `${cases.filter((c) => c.automated === "Planned").length} planned) -> ${XLSX_OUT}`,
);
if (report.diagramsAdded.length || report.rowsAdded.length) {
  console.log("Review the DRAFT items above before committing them.");
}
