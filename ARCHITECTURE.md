# Architecture

## 1. What this repo is

A small Playwright + TypeScript regression suite against the [OrangeHRM open-source demo](https://opensource-demo.orangehrmlive.com/) - login, side-panel navigation, and the PIM "Add Employee", "Edit Employee", "Search Employee", and "Delete Employee" flows (including login-credential creation, blank-form validation, cancel-out, and account-status checks) plus Admin User Management (user creation first; the rest of its CRUD is being added one case at a time). 12 tests across 7 spec files. See [README.md](README.md) for day-to-day commands.

This is a portfolio-scale project, not an enterprise QA suite - so it keeps a light version of the patterns you'd see in the author's larger Playwright repos rather than the full versions: a small four-value QA Type tag (Smoke / Functional / Negative / Navigation, see §8 and §10) instead of a large taxonomy, one Discord notification step instead of a per-type CI dispatch matrix, and one Excel test-suite reference regenerated on demand instead of a maintained external tracker. Just the parts that earn their keep at this size, on top of a clean Locator Library split and credentials out of source.

## 2. High-level architecture

```
tests/*.spec.ts  --uses-->  src/pages/*.ts (Page Objects: behavior)
                                    |
                                    v
                          locators/*.locators.ts (raw selectors only)
```

A test never touches a raw selector. A Page Object never hardcodes a selector inline - it holds a `locators` object built by a factory function in `locators/`. Tests reach the Page Objects through `PomManager`, one object aggregating every page, rather than each test constructing several Page Objects individually.

## 3. Folder structure

```
locators/
  LoginPage.locators.ts         one factory per page - see §4
  AdminPage.locators.ts
  PIMPage.locators.ts
  EmployeePersonalDetailsPage.locators.ts
  components/
    sidebarNav.locators.ts       shared - the left nav menu, used by Admin + PIM
    topBar.locators.ts           shared - profile dropdown / logout / login heading
    toast.locators.ts            shared - the success toast, used by Edit + Delete + Add User
    formField.locators.ts        shared - label-anchored inputs, custom dropdowns, autocomplete (PIM + Admin)
src/
  config/
    config.ts                    baseUrl (env-overridable getter), timeout
    credentials.ts                credential getters, read .env
    testTypes.json                 Test ID -> QA Type map - see §10
  pages/
    PomManager.ts                 aggregates every Page Object - tests use this
    LoginPage.ts / AdminPage.ts / PIMPage.ts / EmployeePersonalDetailsPage.ts
utils/
  commonActions.ts                shared interaction wrappers (locator-based)
tests/
  Login.spec.ts / Navigation.spec.ts / AddEmployeeTest.spec.ts
  EditEmployeeTest.spec.ts / SearchEmployeeTest.spec.ts / DeleteEmployeeTest.spec.ts
  AddUserTest.spec.ts
scripts/
  notify-discord.mjs              posts a run summary to Discord - see §10
  test-and-notify.mjs              runs the suite locally, then always notifies
docs/
  OrangeHRM-Test-Suite.xlsx        generated, gitignored - see §10 (not committed)
.github/workflows/playwright.yml  CI - see §7
playwright.config.ts
tsconfig.json                    TypeScript compiler config
```

## 4. The Locator Library - how locators are managed

Every locator lives in `locators/*.locators.ts` as a factory function taking `page` and returning a plain object of Locators:

```ts
// locators/LoginPage.locators.ts
export type LoginPageLocators = {
  usernameInput: Locator;
  passwordInput: Locator;
  submitButton: Locator;
};

export function loginPageLocators(page: Page): LoginPageLocators {
  return {
    // name="username"/"password" verified live - more stable than
    // placeholder text, which is just display copy.
    usernameInput: page.locator("input[name='username']"),
    passwordInput: page.locator("input[name='password']"),
    submitButton: page.getByRole("button", { name: "Login", exact: true }),
  };
}
```

The matching Page Object holds that object under a single `locators` property and contains *only* behavior:

```ts
// src/pages/LoginPage.ts
export default class LoginPage {
  readonly locators: LoginPageLocators;

  constructor(page: Page) {
    this.locators = loginPageLocators(page);
  }
  async login(userName: string, passWord: string) {
    await this.locators.usernameInput.fill(userName);
    await this.locators.passwordInput.fill(passWord);
    await this.locators.submitButton.click();
  }
}
```

Elements that appear on more than one page (the side nav, the top-bar profile menu) get their own file under `locators/components/` instead of being copy-pasted into every page that uses them - `AdminPage` and `PIMPage` both navigate via `locators/components/sidebarNav.locators.ts`'s `menuItemByName(name)` rather than each re-implementing the same selector.

### Locator stability audit

Every locator in this suite was checked live against the running app (DOM attributes, ARIA roles, accessible names) rather than assumed stable from how it looked. Priority order, most to least preferred: a real `name`/`id` form attribute > ARIA role + accessible name (`getByRole`) > a purpose-built, non-generic CSS class > label-text anchoring > raw XPath/positional selectors as a last resort.

What changed as a result:
- **Sidebar nav items** (`sidebarNav.locators.ts`) and the **logout link**/**login heading** (`topBar.locators.ts`) were CSS-class-and-text-filter or XPath - verified live that these are real `<a>`/`<h5>` elements with genuine `role="link"`/`role="menuitem"`/heading roles and accessible names, so they're now `getByRole(...)` instead.
- **Login/employee name fields** were matched on placeholder text (display copy, not guaranteed stable) - verified live that `name="username"`/`"firstName"`/`"lastName"`/`"middleName"` attributes exist, so they're now attribute-matched instead.
- **The "Add" button** was an exact-string class match (`button[class='oxd-button oxd-button--medium oxd-button--secondary']`) - breaks if the class list is ever reordered or extended. Verified live it has accessible name "Add" via its own visible text, so it's now `getByRole("button", { name: "Add" })`.
- **The Employee ID field and the three login-credential fields** (username/password/confirm password on the Add Employee form) genuinely have **no** name/id/placeholder at all - verified live, this isn't an oversight to fix by picking a better attribute, there isn't one. The old `loginUsernameInput` selector was a 15-level-deep `nth-child` chain that would break on any layout change with zero warning. All four now anchor on their nearby `<label>` text instead (`inputGroupByLabel()` in `PIMPage.locators.ts`) - still not as strong as a real attribute, but tied to human-readable label text instead of raw DOM position, and verified to resolve to exactly one element each (the "Password" match needs an exact regex, not a substring, since "Confirm Password" would otherwise also match).
- **Two locators were kept as-is on purpose after verification**, not out of neglect: the breadcrumb heading's CSS class (verified live there are 2 `<h6>`s on some pages, so a generic role-based heading locator would be ambiguous - the specific class is actually the safer choice here) and `profileName`/`profileDropdown`'s CSS class (a plain `<p>` with no semantic role to key off - this class is already the most stable option available). `profileName` in `PIMPage.locators.ts` was also deduplicated to reuse `topBar.locators.ts`'s `profileDropdown` instead of maintaining an identical selector in two places.
- **The Employee Personal Details page's "Save" button** (`EmployeePersonalDetailsPage.locators.ts`) has the same ambiguity risk as the Employee ID field above, but for a different reason: the page has **two** `<form>` elements, each with its own "Save" button. `getByRole("button", { name: "Save" })` alone would be ambiguous - it's scoped to specifically the form containing `input[name='firstName']` first, which resolves to exactly one match.
- **Two accessible-name whitespace bugs were caught via actual failed test runs**, not by reasoning about the markup: the "Add" and "Login" buttons both have an icon before their text, giving them computed accessible names of `" Add"`/`" Login"` (leading space) - an `exact: true` match against `"Add"`/`"Login"` silently fails. Found via Playwright's own `ariaSnapshot()`, not a different inspection tool's rendering of the same page, since the two didn't agree with each other during this audit. The Delete flow's "Yes, Delete" dialog button has the exact same icon-before-text pattern - applied non-exact matching there from the start instead of rediscovering the bug a third time.
- **The Employee List's "Employee Name" search field** (`PIMPage.locators.ts`) looked unique by its placeholder ("Type for hints...") during manual exploration, but that exploration used a `.find()` that silently grabbed the first match - an actual Playwright locator correctly refused to guess and failed with a strict-mode violation, since the filter panel also has a "Supervisor Name" field sharing that exact placeholder. Fixed with the same `inputGroupByLabel()` label-anchoring already used for the Add Employee form, scoped to "Employee Name" specifically. A tool that silently tolerates ambiguity isn't proof a locator is unique - only a real strict-mode check is.
- **The Employee List row's delete icon has no accessible name at all** - verified live: no `aria-label`, no `title`, no visible text, just an icon. This is a real accessibility gap in the app itself, not something a better selector can paper over. Anchored on the icon's own class (`i.bi-trash`, a purpose-built Bootstrap Icons name) scoped to the specific employee's row instead - see §6 for why that row-scoping is also a safety measure, not just a stability one.
- **The Add Employee "Employee Full Name" field nests three input groups inside one** - verified live via a failed strict-mode run plus a DOM dump: the outer `.oxd-input-group` (label "Employee Full Name") wraps a separate inner `.oxd-input-group` for each of first / middle / last name, and each inner one renders its own "Required" error span on a blank submit. A `filter({ has: input[name='firstName'] })` on `.oxd-input-group` matched both the inner firstName wrapper and the outer wrapper (which also contains lastName), so the error-message sub-locator resolved to two spans and failed strict mode. `firstNameError`/`lastNameError` now add `filter({ hasNot: <the sibling input> })` to pin each to just its own inner wrapper. `assertRequiredFieldErrorsShown()` checks the two with `expect.soft()` so one missing error still reports the other.

## 5. Configuration & credentials

| File | Committed? | Contains |
|---|---|---|
| `src/config/config.ts` | Yes | `baseUrl` (env-overridable via `BASE_URL`), `timeout` - no secrets |
| `.env.example` | Yes | Template naming the optional override env vars |
| `.env` | No (gitignored) | Local overrides, if you use any |
| `src/config/credentials.ts` | Yes | Credential getters reading `.env` |

**This project's credentials are a genuine exception to "never hardcode a credential."** OrangeHRM publishes `Admin` / `admin123` itself as the public demo login - see https://opensource-demo.orangehrmlive.com/. They're not a secret in any real sense, so `getAdminCredentials()` falls back to that published value when `ADMIN_USERNAME`/`ADMIN_PASSWORD` aren't set, rather than throwing like a real internal app's credentials getter would. The env-var path still exists (and still wins when set) so the suite can point at a different OrangeHRM instance without touching source - just don't read the fallback here as license to hardcode credentials in a project where they'd actually be sensitive.

**Why the project is ESM (`"type": "module"`, `tsconfig` `module: ESNext`).** `@faker-js/faker` had a high-severity advisory (GHSA-qxc2-j82w-r537, arbitrary code execution via `faker.helpers.fake`) affecting every version up to 10.4.0, fixed in 10.5.0. Faker 10 is ESM-only (no `require` export), and this repo was CommonJS, so simply bumping the version made every spec fail to load ("require() of ES Module not supported") - `tsc` passed, only a real run caught it. Switching the project to ESM was the fix; nothing else in the source needed changing. Don't downgrade faker to get CJS back - every pre-10.5 version is the vulnerable one.

## 6. Reading a red test

`AddEmployeeTest.spec.ts` used to end every save with a fixed `page.waitForTimeout(...)` sleep (5-10s); those are gone - see `waitForEmployeeSaved()` below. Prefer waiting on whatever proves a step finished (a redirect, a visible element) over a sleep, which is either too short on a slow day or wasted time on a fast one.

**The "implicit wait" is one central setting, `config.waitTimeout` (60s, `WAIT_TIMEOUT_MS` overrides it).** Playwright has no global implicit-wait switch: actions auto-wait but with no cap of their own (they hang until the whole test times out), and web-first assertions default to only 5s. `playwright.config.ts` therefore sets `use.actionTimeout`, `use.navigationTimeout` and `expect.timeout` from that one value, and `CommonActions.defaultTimeout` reads it too - so every element lookup, click/fill, assertion and navigation gets the same wait. The per-call `{ timeout: 10000 }`/`30000` overrides that used to undercut it were removed from the page objects and specs. It started at 30s and was raised to 60s after a run where the employee's Personal Details heading was present but empty for a full 30s (the page loaded, the data behind it didn't). The per-test `timeout` (360s) is sized to fit several of these waits back to back, since one flow chains 5+ of them.

**`TC_CEF_003`/`TC_CEF_004` "flaked" because of their test data, not the site - the root cause is a password with no digit.** Both create an employee with a login, log out, and log back in as that user. The form refuses to save a password without a number ("Your password must contain minimum 1 number" appears under the field), and the tests used `faker.internet.password({ length: 7 })`, which is random: about 30% of the time (simulated: 29.8%) it contains no digit. Then Save does nothing, no account is created, and what the test sees depends on its version: the old fixed-sleep version logged out and tried a user that never existed ("Invalid credentials", or `TC_CEF_004` getting that instead of "Account disabled"); the current version times out on `waitForEmployeeSaved()` at the "fill ... and save" step. That is why it looked intermittent and why a retry usually "fixed" it - a retry just rolls a new random password.

Proven, not assumed: forcing the digit-less password `Abcdefg` fails the test every time at that step with the on-page message above, and with the password built as `"Aa1" + 4 random alphanumerics` both tests passed 8 of 8 runs with retries off. (An earlier version of this note blamed the fixed sleep; replacing the sleeps with `PIMPage.waitForEmployeeSaved()` was still the right change - a sleep is a guess - but it wasn't the cause.) If a test here ever fails at a "...and save" step, read the page snapshot in `error-context.md` for an inline validation message before blaming the site.

**A real race condition found while building Edit Employee, worth knowing about if this page gets touched again:** the Personal Details page's form renders pre-filled with the employee's current data, then silently re-fetches and re-populates that same data a moment later. Filling the fields immediately after the page loads (or right after creating the employee, since the Add flow redirects straight here) gets silently overwritten by that second population - the save still succeeds and shows "Successfully Updated", just with the *original* values instead of the edit. `EmployeePersonalDetailsPage.editName()` waits for network idle before filling to avoid this; a `not.toHaveValue("")` check does **not** catch it, since the field is already non-empty from the pre-fill.

**`TC_SEF_001` (Search Employee) is marked `test.slow()` and does no cleanup.** Its create -> navigate -> autocomplete -> search chain is a lot of round-trips against the shared public demo, which goes through slow spells (the same per-test timeout intermittently catches `TC_CEF_003`/`TC_CEF_004`, which also log in as a freshly-created employee). `test.slow()` triples the budget rather than papering over site latency with per-step waits. It deliberately leaves its created employee behind - its scope is "search finds the record", and the Add/Edit specs already leave their data too; only `DeleteEmployeeTest` exercises removal, and only on what it made.

**The base per-test timeout and retry count both went up after a run where the demo itself, not this suite, was the bottleneck.** A run on 2026-09-23 saw every test - including a bare button click - blow past 60s, confirmed via `error-context.md` call logs showing plain "waiting for locator(...)" timeouts with no assertion mismatch, i.e. the site was slow to respond, not behaving differently. `timeout` moved to 90000ms and `retries` from "CI only" to `process.env.CI ? 2 : 1` (see `playwright.config.ts`) so a load spike on the shared demo costs one retry instead of a false failure locally too. A test that's actually broken still fails on the retry and gets reported - this doesn't hide real regressions, it only absorbs the shared demo's own latency.

**Delete Employee only ever deletes data it created itself, and checks that safely.** This Employee List is shared with everyone using this public demo - `PIMPage.deleteEmployee()` asserts the search narrowed to exactly one matching row (`toHaveCount(1)`) before clicking that row's delete icon, so an ambiguous match fails the test loudly instead of risking a delete against the wrong (possibly someone else's) employee. `DeleteEmployeeTest.spec.ts` also searches by a generated last name alone, not the full "first last" string - the Employee List's autocomplete can render an extra space when there's no middle name, which would break a multi-word substring match.

## 7. CI

`.github/workflows/playwright.yml` runs the full suite on every push and pull request to `main`/`master`: checks out, enables corepack (so pnpm resolves to the exact version pinned in `package.json`'s `packageManager` field), installs dependencies (`pnpm install --frozen-lockfile`), installs Chromium with its OS dependencies, runs the suite, uploads the HTML report as a build artifact, zips that report, and notifies Discord (see §10) with the run's pass/fail counts and the zip attached. No secrets are required to run the suite itself - the credential fallback in §5 means CI works out of the box against the public demo instance - but `DISCORD_WEBHOOK_URL` must be set as a repo secret for the notify step to actually post (it silently no-ops without one, see §10).

## 8. Test naming

Every test title is `"<Test ID>: <Test Case Title>"` - e.g. `"TC_CEF_001: Add Employee Without Middle Name"` - so a test is identifiable by ID alone (for cross-referencing a test plan, a bug report, a CI failure notification) while the title still reads clearly on its own in the HTML report or terminal output. IDs are grouped by feature area with a numeric suffix: `TC_LOGIN_*`, `TC_NAV_*`, `TC_CEF_*` ("Create Employee Form"), `TC_EEF_*` ("Edit Employee Form"), `TC_SEF_*` ("Search Employee Form"), `TC_DEF_*` ("Delete Employee Form"), `TC_UCF_*` ("User Creation Form" - Admin > User Management). Give a new test the next number in whichever prefix it belongs to, or a new prefix if it's a new feature area.

## 9. Extending the suite

1. Add or extend the relevant `*.locators.ts` file (or a `components/` one, if it's shared) for any new element - see §4's stability priority order before picking a selector.
2. Add or extend the Page Object method that uses it - never a raw selector in a test.
3. Verify the case against the live app first, not just an assumption of what it should do.
4. Title the test `"<Test ID>: <Test Case Title>"` (see §8).
5. Never hardcode a credential in a spec - go through `src/config/credentials.ts` (see §5 for why this project's default isn't a throw).
6. Structure a longer test body as `test.step(...)` blocks (Arrange / Act / Assert), generating test data first so step titles can name the real values (employee name, username). Steps show up as a timed tree in the HTML report and trace viewer, and a failure is attributed to the step that broke - every spec follows this, including the login `beforeEach` ("Setup: ..."). Tests with no data to generate still use steps, named Act / Assert.
7. Add the new Test ID's QA Type to `src/config/testTypes.json` (see §10) so Discord's per-type tally and a regenerated Excel test-suite reference both stay accurate instead of silently bucketing the new test under "Other".

## 10. Discord notifications & the Excel test-suite reference

**Discord.** `scripts/notify-discord.mjs` posts a run summary - pass/fail/flaky/skipped counts, duration, branch, commit, and a per-QA-Type tally - to a Discord channel via webhook, with the zipped HTML report attached so the report is one click away without a GitHub login. It reads `test-results/results.json` (the `json` reporter, always on - see `playwright.config.ts`) for counts and `src/config/testTypes.json` for the Test ID -> QA Type map used in the tally. `DISCORD_WEBHOOK_URL` unset is a deliberate no-op (logs and exits 0) rather than a failure - a missing or misconfigured webhook should never fail a green test run, locally or on CI. `DISCORD_THREAD_ID` is optional and posts into a thread of that channel instead of the channel itself.

Two ways it runs:
- **CI** - `.github/workflows/playwright.yml`'s `Notify Discord` step runs after every push/PR, `if: always()` (so a failed run still notifies), reading `DISCORD_WEBHOOK_URL` from the repo's secret and `DISCORD_THREAD_ID` from a repo variable if set.
- **Local** - `pnpm test:notify` (`scripts/test-and-notify.mjs`) runs the full suite, zips `playwright-report/` with `archiver` (trace files excluded - they need `npx playwright show-trace` to view, so they're pure size cost with no payoff as a Discord attachment), and always calls `notify-discord.mjs` afterward regardless of the suite's exit code - `pnpm test && node scripts/notify-discord.mjs` would skip the notification entirely on a failed run, since `&&` short-circuits on a non-zero exit. Reads `DISCORD_WEBHOOK_URL`/`DISCORD_THREAD_ID` from `.env` (see `.env.example`) - `.env` is gitignored, so this is a local, per-developer opt-in.

**QA Type tally.** `src/config/testTypes.json` maps each Test ID to one of four types used across this suite: `Smoke`, `Functional`, `Negative`, `Navigation` - a small, hand-maintained JSON mirror of the "Test Type" column in the Excel reference below, kept as JSON rather than read from the spreadsheet directly so the notify script needs no xlsx dependency. `notify-discord.mjs` tallies passed/failed per type by matching each spec's title against the `"<Test ID>: ..."` convention (§8); a Test ID missing from the map falls into "Other" instead of crashing the script - that's the signal the map has gone stale after adding or renaming a test.

**Excel test-suite reference.** `docs/OrangeHRM-Test-Suite.xlsx` lists every test case - ID, Priority, Type, Module/Feature, Scenario, Steps, Input Data, Expected Result, Automated, and the spec file it lives in - one row per Test ID, plus a Summary tab with per-type counts. It's a **generated, point-in-time export**, gitignored (`docs/*.xlsx`) rather than committed: it goes stale the moment a test is added, renamed, or re-typed, so it's regenerated on demand instead of maintained by hand as a second source of truth. `src/config/testTypes.json` (committed) is the actual source of truth for each Test ID's Type; the spreadsheet is a human-readable view generated from the same test suite for sharing with whoever wants a non-repo reference (a QA lead, a test-plan review) without needing to read TypeScript.
