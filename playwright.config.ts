import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import { config } from "./src/config/config";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 *
 * No explicit path - dotenv defaults to reading .env from process.cwd(),
 * which is always this project's root since that's where
 * playwright.config.ts lives and where `pnpm test` /
 * `pnpm exec playwright test` are always run from.
 */
dotenv.config();

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests",
  /* Default 30s is too tight for the PIM flows - they already include a
   * hardcoded page.waitForTimeout(10000) after saving an employee, on top
   * of real navigation/network time, and were bumping into the default
   * budget even before this restructuring. Bumped again from 60s after a
   * run where the shared public demo was slow enough that even a single
   * button click blew a 60s budget (see ARCHITECTURE.md §6) - this suite
   * has no control over that server's load, only over how much room it
   * gives it. */
  timeout: 360000,
  /* The "implicit wait": every element lookup, action, web-first assertion
   * and navigation gets config.waitTimeout (60s, WAIT_TIMEOUT_MS to
   * override) before failing. Without these, actions have no cap of their
   * own (they hang until the whole test times out) and assertions only get
   * Playwright's 5s default. The per-test timeout above has to be large
   * enough to fit several of these waits back to back - a single flow
   * (login, navigate, add, save, redirect) can chain 5+ of them. */
  expect: { timeout: config.waitTimeout },
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* At least 1 retry everywhere, not just CI: this suite runs against a
   * shared public demo (see ARCHITECTURE.md §6) whose load spikes cause a
   * whole run to fail on a basic click, unrelated to any real bug - a
   * retry re-does the test from a clean login, which usually clears once
   * the spike passes. A genuine bug still fails twice and gets reported. */
  retries: process.env.CI ? 2 : 1,
  /* `fullyParallel: false` above already means tests within one file never
   * run concurrently - but without pinning workers too, Playwright still
   * runs *different* files on separate workers at once by default, so
   * Login/Navigation/AddEmployeeTest ended up hitting the same shared
   * public demo server simultaneously and caused a real, reproduced click
   * to hang until timeout under that concurrent load. Serializing
   * everything to one worker (not just on CI) matches what `fullyParallel:
   * false` was already going for. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  /* Also emit JSON always (not just on CI) - scripts/notify-discord.mjs
   * reads test-results/results.json for pass/fail/flaky counts whether the
   * run is local (`pnpm test:notify`) or on CI, and "list" on CI shows live
   * per-test progress in the Actions log instead of staying silent until
   * the whole run finishes. */
  reporter: process.env.CI
    ? [["list"], ["html"], ["json", { outputFile: "test-results/results.json" }]]
    : [["html"], ["json", { outputFile: "test-results/results.json" }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. Sourced from
     * src/config/config.ts (BASE_URL env var, falls back to the public
     * OrangeHRM demo instance) - see that file for why it's a getter. */
    baseURL: config.baseUrl,

    actionTimeout: config.waitTimeout,
    navigationTimeout: config.waitTimeout,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
