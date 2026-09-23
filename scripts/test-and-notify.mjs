/**
 * Runs the full Playwright suite locally and always posts the result to
 * Discord afterward, mirroring the CI workflow's `if: always()` notify
 * step. `pnpm test && node notify-discord.mjs` would skip the notification
 * entirely whenever a test failed, since a failed run exits non-zero - this
 * runs the suite first, captures its exit code, and notifies regardless.
 *
 * Usage:
 *   node scripts/test-and-notify.mjs
 *   pnpm test:notify
 *
 * Also zips the HTML report and hands it to notify-discord.mjs so a local
 * run gets the same downloadable-report attachment CI's Discord message
 * gets - CI has a dedicated zip action available, this doesn't, so this
 * does it with `archiver` instead. Trace files (data/*.zip) are excluded
 * from the zip - they aren't viewable in a browser anyway (they need
 * `npx playwright show-trace`), so they're pure size cost with no payoff
 * for a Discord attachment.
 */

import { spawnSync } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import { ZipArchive } from "archiver";

const REPORT_DIR = "playwright-report";
const REPORT_ZIP_PATH = "playwright-report.zip";

const testRun = spawnSync("pnpm", ["exec", "playwright", "test", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, CI: "true" },
});

function zipReport() {
  if (!existsSync(REPORT_DIR)) return Promise.resolve(null);
  return new Promise((resolve) => {
    const output = createWriteStream(REPORT_ZIP_PATH);
    const archive = new ZipArchive({ zlib: { level: 9 } });
    output.on("close", () => resolve(REPORT_ZIP_PATH));
    archive.on("error", (error) => {
      console.log(`Could not zip ${REPORT_DIR}: ${error.message}`);
      resolve(null);
    });
    archive.pipe(output);
    archive.glob(
      "**/*",
      { cwd: REPORT_DIR, ignore: ["data/*.zip"] },
      { prefix: REPORT_DIR },
    );
    archive.finalize();
  });
}

const zipPath = await zipReport();

spawnSync("node", ["scripts/notify-discord.mjs"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    JOB_STATUS: testRun.status === 0 ? "success" : "failure",
    ...(zipPath ? { REPORT_ZIP_PATH: zipPath } : {}),
  },
});

process.exit(testRun.status ?? 1);
