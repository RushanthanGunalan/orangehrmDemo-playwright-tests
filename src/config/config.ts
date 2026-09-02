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
  timeout: 30000,
};
