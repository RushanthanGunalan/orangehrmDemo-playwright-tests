import { test as base, expect } from "@playwright/test";
import PomManager from "../src/pages/PomManager";
import { OrangeHrmApi } from "../src/api/OrangeHrmApi";
import { config } from "../src/config/config";
import { getAdminCredentials } from "../src/config/credentials";
import { TestData } from "../src/testData/TestData";
import { purgeStaleTestData } from "../src/testData/purge";

/**
 * The suite's `test`. Specs import it from here instead of from
 * "@playwright/test" to get, per test:
 *
 *   pm        a fresh PomManager - replaces the module-level `let pm` the specs
 *             used to share (state that outlived each test).
 *   testData  data factories + automatic cleanup. Everything the test created
 *             is deleted when it ends, pass or fail.
 *
 * and, once per worker, a purge of employees abandoned by EARLIER runs.
 */

/** One admin API login per worker, created on first use and re-tried if it failed. */
class AdminApiSession {
  private api?: OrangeHrmApi;

  async get(): Promise<OrangeHrmApi> {
    this.api ??= await OrangeHrmApi.login(
      new URL(config.baseUrl).origin,
      getAdminCredentials(),
      config.waitTimeout,
    );
    return this.api;
  }

  async dispose(): Promise<void> {
    await this.api?.dispose();
  }
}

type TestFixtures = { pm: PomManager; testData: TestData };
type WorkerFixtures = { adminApi: AdminApiSession };

export const test = base.extend<TestFixtures, WorkerFixtures>({
  adminApi: [
    async ({}, use) => {
      const session = new AdminApiSession();

      // Pre-run purge: clears what earlier runs left behind (a crashed
      // worker, a failed teardown, Ctrl-C). `auto` so it happens before the
      // first test whether or not that test uses data - but it must NEVER
      // throw: Login/Navigation need no data and mustn't fail because a
      // cleanup call did. A test that does need data fails on its own,
      // clearly, when it asks the session for the API.
      try {
        const result = await purgeStaleTestData(await session.get());
        console.log(
          `[test-data] pre-run purge: deleted ${result.deleted} stale, kept ${result.keptFresh} fresh` +
            (result.refused > 0 ? `, REFUSED ${result.refused} (over the safety cap - check the match)` : ""),
        );
        if (result.refused > 0) {
          console.warn("[test-data] purge refused to delete - investigate before trusting the cleanup.");
        }
      } catch (error) {
        console.warn(`[test-data] pre-run purge skipped: ${error instanceof Error ? error.message : error}`);
      }

      await use(session);
      await session.dispose();
    },
    { scope: "worker", auto: true },
  ],

  pm: async ({ page }, use) => {
    await use(new PomManager(page));
  },

  testData: [
    async ({ adminApi }, use, testInfo) => {
      const data = new TestData(await adminApi.get());
      await use(data);

      // Runs whether the test passed, failed or timed out. Own timeout so a
      // test that used its whole budget still gets to clean up.
      const { deleted, leaked } = await data.cleanup();
      if (deleted > 0) console.log(`[test-data] teardown: removed ${deleted} employee(s) for "${testInfo.title}"`);
      if (leaked.length > 0) {
        const ids = leaked.join(", ");
        console.error(`[test-data] LEAKED after "${testInfo.title}": ${ids} - the next run's purge will remove them`);
        testInfo.annotations.push({ type: "leaked-test-data", description: ids });
      }
    },
    { timeout: 90_000 },
  ],
});

export { expect };
