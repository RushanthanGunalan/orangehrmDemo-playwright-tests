/**
 * Regenerates docs/OrangeHRM-Test-Suite.xlsx from docs/test-suite/test-cases.json.
 *
 *   pnpm test-suite
 *
 * `pnpm docs:sync` calls the same writer after it updates the JSON, so you
 * normally only run this directly after editing the JSON by hand.
 */

import { readFileSync } from "node:fs";
import { writeTestSuiteWorkbook } from "./lib/test-suite-workbook.mjs";

const CASES = "docs/test-suite/test-cases.json";
const OUT = "docs/OrangeHRM-Test-Suite.xlsx";

const rows = JSON.parse(readFileSync(CASES, "utf8"));
await writeTestSuiteWorkbook(rows, OUT);
console.log(`wrote ${OUT} (${rows.length} test cases)`);
