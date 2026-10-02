/**
 * Posts the Playwright run result to a Discord channel via webhook.
 *
 * Reads the JSON reporter output (test-results/results.json) for test counts
 * and the GitHub Actions environment for run metadata. Never fails the
 * build: if the webhook is missing or Discord rejects the request, it logs
 * and exits 0 - a broken notification should never fail a green test run.
 *
 * The zipped HTML report is attached directly to the Discord message via
 * the webhook's multipart upload, so the report is one click away in the
 * channel regardless of whether the CI run link is reachable to whoever's
 * reading it.
 *
 * Env:
 *   DISCORD_WEBHOOK_URL  required, the Discord webhook to post to
 *   DISCORD_THREAD_ID    optional, posts into this thread of the webhook's channel
 *   JOB_STATUS           "success" | "failure" | "cancelled" (from the workflow)
 *   COMMIT_MESSAGE       optional, first line is shown in the embed
 *   REPORT_ZIP_PATH      optional, path to the zipped HTML report to attach
 */

import { readFileSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Local runs need DISCORD_WEBHOOK_URL from .env since this script reads
// process.env directly. No-op on CI: .env is gitignored and never checked
// out there, and dotenv never overrides vars that are already set (the
// GitHub Actions secret injected via the workflow's `env:` block).
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const webhook = process.env.DISCORD_WEBHOOK_URL;
if (!webhook) {
  console.log(
    "DISCORD_WEBHOOK_URL is not set - skipping Discord notification.",
  );
  process.exit(0);
}

const REPORT_PATH = "test-results/results.json";
// Discord's default per-file attachment cap on a non-boosted server. Stay a
// little under it to leave room for multipart overhead.
const MAX_ATTACHMENT_BYTES = 24 * 1024 * 1024;

function readReport() {
  try {
    return JSON.parse(readFileSync(REPORT_PATH, "utf8"));
  } catch {
    console.log(`Could not read ${REPORT_PATH} - reporting status only.`);
    return null;
  }
}

function readReportZip() {
  const zipPath = process.env.REPORT_ZIP_PATH?.trim();
  if (!zipPath) return null;
  try {
    const { size } = statSync(zipPath);
    if (size > MAX_ATTACHMENT_BYTES) {
      console.log(
        `${zipPath} is ${(size / 1024 / 1024).toFixed(1)}MB, over Discord's attachment limit - sending without it.`,
      );
      return null;
    }
    return readFileSync(zipPath);
  } catch {
    console.log(
      `Could not read ${zipPath} - sending notification without an attachment.`,
    );
    return null;
  }
}

/**
 * Test type per Test ID, sourced from the "Type" column of this suite's
 * Excel test-suite reference (docs/OrangeHRM-Test-Suite.xlsx, regenerated
 * on demand - see README.md). Kept as a small hand-maintained JSON mirror
 * here rather than reading the spreadsheet directly, same reasoning as the
 * larger Playwright repos this pattern is shared with: one source of truth
 * a Node script can read without an xlsx dependency.
 * Keep this in sync when a test is added or its ID's Type changes upstream.
 */
const TEST_TYPE_BY_ID = JSON.parse(
  readFileSync(path.resolve(__dirname, "../src/config/testTypes.json"), "utf8"),
);

// Matches this project's "<Test ID>: <Test Case Title>" title convention
// (see ARCHITECTURE.md §8) - TC_CEF_005, TC_LOGIN_001, etc.
const TEST_ID_PATTERN = /^([A-Z0-9_]+):\s/;

/**
 * Tally passed/failed per QA test type (Smoke / Functional / Negative /
 * Navigation / Unit), keyed off the Test ID embedded in each spec's title
 * ("TC_CEF_005: Add Employee Shows Required..." -> "TC_CEF_005"). A Test ID
 * with no entry in TEST_TYPE_BY_ID falls into "Other" rather than crashing
 * the notification - that's the signal the table is stale.
 */
function tallyByTestType(suites = [], types = new Map()) {
  for (const suite of suites) {
    for (const spec of suite.specs ?? []) {
      const testId = spec.title?.match(TEST_ID_PATTERN)?.[1];
      const type = (testId && TEST_TYPE_BY_ID[testId]) || "Other";
      const entry = types.get(type) ?? { passed: 0, failed: 0 };
      if (spec.ok) entry.passed += 1;
      else entry.failed += 1;
      types.set(type, entry);
    }
    tallyByTestType(suite.suites, types);
  }
  return types;
}

const TYPE_ORDER = ["Smoke", "Functional", "Negative", "Navigation", "Unit"];

function sortedTypes(types) {
  const known = TYPE_ORDER.filter((t) => types.has(t));
  const rest = [...types.keys()].filter((t) => !TYPE_ORDER.includes(t)).sort();
  return [...known, ...rest];
}

function formatDuration(ms) {
  if (!ms || ms < 0) return "n/a";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

const report = readReport();
const stats = report?.stats ?? {};
const typeStats = tallyByTestType(report?.suites);
const reportZip = readReportZip();

const status = (process.env.JOB_STATUS ?? "unknown").toLowerCase();

/**
 * This message's job is to notify that a run happened and hand over the
 * stats so whoever's watching can go triage whatever failed - not to
 * declare a verdict. A run with failed tests is routine on this suite (the
 * shared public OrangeHRM demo has known flaky spots - see ARCHITECTURE.md
 * §6) so it gets the same neutral treatment as an all-pass run. Only a run
 * that never produced results (crashed before reporting) or was manually
 * cancelled gets a different, genuinely alerting treatment.
 */
const outcome = !report
  ? { label: "Playwright Run Incomplete", emoji: "⚠️", color: 0xe67e22 }
  : status === "cancelled"
    ? { label: "Playwright Run Cancelled", emoji: "⚪", color: 0x95a5a6 }
    : { label: "Playwright Test Run", emoji: "🧪", color: 0x5865f2 };

// Outside GitHub Actions these are all unset together, so fall back to
// deriving the same info from git - keeps a locally-triggered message
// structurally identical to a CI one instead of showing "unknown/repo".
function git(command) {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function localRepoSlug() {
  const match = git("git config --get remote.origin.url").match(/[:/]([^/]+\/[^/]+?)(\.git)?$/);
  return match ? match[1] : "local/repo";
}

const {
  GITHUB_REPOSITORY: repo = localRepoSlug(),
  GITHUB_REF_NAME: branch = git("git rev-parse --abbrev-ref HEAD") || "unknown",
  GITHUB_SHA: sha = git("git rev-parse HEAD"),
  GITHUB_ACTOR: actor = git("git config --get user.name") || os.userInfo().username,
  GITHUB_SERVER_URL: server = "https://github.com",
  GITHUB_RUN_ID: runId = "",
  GITHUB_EVENT_NAME: event = "local run",
} = process.env;

// No real Actions run to link to locally - stays null so the embed omits
// the link instead of pointing at a broken URL.
const runUrl = runId ? `${server}/${repo}/actions/runs/${runId}` : null;
const commitMessage = (process.env.COMMIT_MESSAGE ?? "").split("\n")[0].trim();

const fields = [
  { name: "Branch", value: `\`${branch}\``, inline: true },
  {
    name: "Commit",
    value: sha ? `[\`${sha.slice(0, 7)}\`](${server}/${repo}/commit/${sha})` : "n/a",
    inline: true,
  },
  { name: "Triggered by", value: `${actor} (${event})`, inline: true },
];

if (report) {
  fields.push(
    { name: "Passed", value: String(stats.expected ?? 0), inline: true },
    { name: "Failed", value: String(stats.unexpected ?? 0), inline: true },
    { name: "Flaky", value: String(stats.flaky ?? 0), inline: true },
    { name: "Skipped", value: String(stats.skipped ?? 0), inline: true },
    { name: "Duration", value: formatDuration(stats.duration), inline: true },
  );

  for (const type of sortedTypes(typeStats)) {
    const { passed, failed } = typeStats.get(type);
    fields.push({
      name: type,
      value: `${passed} passed, ${failed} failed`,
      inline: true,
    });
  }
}

const descriptionParts = [];
if (commitMessage) descriptionParts.push(`**${commitMessage}**`);
if (runUrl) {
  descriptionParts.push(
    reportZip
      ? `📎 HTML report attached below - download and open \`index.html\`.\n[View CI run](${runUrl})`
      : `[View run and HTML report](${runUrl})`,
  );
} else if (reportZip) {
  descriptionParts.push(`📎 HTML report attached below - download and open \`index.html\`.`);
}

const payload = {
  username: "Playwright CI",
  embeds: [
    {
      title: `${outcome.emoji} ${outcome.label} - ${repo}`,
      ...(runUrl ? { url: runUrl } : {}),
      color: outcome.color,
      description: descriptionParts.join("\n\n").slice(0, 4000),
      fields,
      footer: { text: "OrangeHRM Playwright" },
      timestamp: new Date().toISOString(),
    },
  ],
};

/**
 * Target the webhook's channel, or a specific thread within it when
 * DISCORD_THREAD_ID is set. Discord unarchives the thread automatically.
 */
function webhookTarget() {
  const threadId = process.env.DISCORD_THREAD_ID?.trim();
  if (!threadId) return webhook;
  try {
    const url = new URL(webhook);
    url.searchParams.set("thread_id", threadId);
    return url.toString();
  } catch {
    console.log("DISCORD_WEBHOOK_URL is not a valid URL - ignoring thread id.");
    return webhook;
  }
}

function buildRequestBody() {
  if (!reportZip) {
    return {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    };
  }
  // Discord webhooks accept a file alongside the embed via multipart:
  // "payload_json" carries the same JSON body used above, plus a file field.
  const form = new FormData();
  form.append("payload_json", JSON.stringify(payload));
  form.append(
    "files[0]",
    new Blob([reportZip], { type: "application/zip" }),
    "playwright-report.zip",
  );
  return { headers: {}, body: form };
}

try {
  const { headers, body } = buildRequestBody();
  const response = await fetch(webhookTarget(), {
    method: "POST",
    headers,
    body,
  });
  if (response.ok) {
    console.log("Discord notification sent.");
  } else {
    console.log(
      `Discord webhook returned ${response.status}: ${await response.text()}`,
    );
  }
} catch (error) {
  console.log(`Could not reach Discord webhook: ${error.message}`);
}
