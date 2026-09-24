/**
 * Non-secret, environment-level config - not a credential, so it lives in
 * a plain module rather than .env. Override via the BASE_URL env var if
 * you ever need to point the suite at a different OrangeHRM instance
 * without editing source.
 */
export const config = {
  // A getter, not a plain value - ES module imports are hoisted and
  // evaluated before the importing file's own top-level code runs, so a
  // plain `baseUrl: process.env.BASE_URL ?? ...` here would read
  // process.env BEFORE playwright.config.ts's dotenv.config() call ever
  // executes, silently ignoring whatever's in .env. A getter defers the
  // read to whenever `config.baseUrl` is actually accessed instead.
  get baseUrl(): string {
    return (
      process.env.BASE_URL ??
      "https://opensource-demo.orangehrmlive.com/web/index.php/auth/login"
    );
  },
  /**
   * The suite's "implicit wait": the longest any single element lookup,
   * action (click/fill/...), web-first assertion, or page navigation may
   * wait before failing. Playwright has no global implicit-wait switch -
   * actions auto-wait, but with NO cap of their own (they run until the
   * whole test times out) and assertions default to just 5s - so this one
   * value is wired into playwright.config.ts (`actionTimeout`,
   * `navigationTimeout`, `expect.timeout`) and CommonActions, instead of
   * scattering 10000/30000 literals through the page objects.
   * Override with WAIT_TIMEOUT_MS if the target is slower than the default.
   * A getter for the same import-hoisting reason as baseUrl above.
   */
  get waitTimeout(): number {
    const fromEnv = Number(process.env.WAIT_TIMEOUT_MS);
    return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 60000;
  },
};
