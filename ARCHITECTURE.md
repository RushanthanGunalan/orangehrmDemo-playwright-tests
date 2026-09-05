# Architecture

## 1. What this repo is

A small Playwright + TypeScript regression suite against the [OrangeHRM open-source demo](https://opensource-demo.orangehrmlive.com/) - login, side-panel navigation, and the PIM "Add Employee" and "Edit Employee" flows (including login-credential creation and account-status checks). 7 tests across 4 spec files. See [README.md](README.md) for day-to-day commands.

This is a portfolio-scale project, not an enterprise QA suite - so unlike larger Playwright repos you might see the same author work on, there's deliberately no QA-Type taxonomy, no Discord notification pipeline, and no tracking spreadsheet here. Just the parts that earn their keep at this size: a clean Locator Library split and credentials out of source.

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
src/
  config/
    config.ts                    baseUrl (env-overridable getter), timeout
    credentials.ts                credential getters, read .env
  pages/
    PomManager.ts                 aggregates every Page Object - tests use this
    LoginPage.ts / AdminPage.ts / PIMPage.ts / EmployeePersonalDetailsPage.ts
utils/
  commonActions.ts                shared interaction wrappers (locator-based)
tests/
  Login.spec.ts / Navigation.spec.ts / AddEmployeeTest.spec.ts / EditEmployeeTest.spec.ts
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
- **Two accessible-name whitespace bugs were caught via actual failed test runs**, not by reasoning about the markup: the "Add" and "Login" buttons both have an icon before their text, giving them computed accessible names of `" Add"`/`" Login"` (leading space) - an `exact: true` match against `"Add"`/`"Login"` silently fails. Found via Playwright's own `ariaSnapshot()`, not a different inspection tool's rendering of the same page, since the two didn't agree with each other during this audit.

## 5. Configuration & credentials

| File | Committed? | Contains |
|---|---|---|
| `src/config/config.ts` | Yes | `baseUrl` (env-overridable via `BASE_URL`), `timeout` - no secrets |
| `.env.example` | Yes | Template naming the optional override env vars |
| `.env` | No (gitignored) | Local overrides, if you use any |
| `src/config/credentials.ts` | Yes | Credential getters reading `.env` |

**This project's credentials are a genuine exception to "never hardcode a credential."** OrangeHRM publishes `Admin` / `admin123` itself as the public demo login - see https://opensource-demo.orangehrmlive.com/. They're not a secret in any real sense, so `getAdminCredentials()` falls back to that published value when `ADMIN_USERNAME`/`ADMIN_PASSWORD` aren't set, rather than throwing like a real internal app's credentials getter would. The env-var path still exists (and still wins when set) so the suite can point at a different OrangeHRM instance without touching source - just don't read the fallback here as license to hardcode credentials in a project where they'd actually be sensitive.

## 6. Reading a red test

`AddEmployeeTest.spec.ts` uses fixed `page.waitForTimeout(...)` sleeps (5-10s) after form submission rather than an explicit wait on the resulting state - this predates the Locator Library pass and wasn't touched during it (the ask was to restructure, not rewrite test logic). If these specs get flaky, that's the first place to look: replace the sleep with an explicit `expect(locator).toBeVisible()` on whatever confirms the save actually completed.

**A real race condition found while building Edit Employee, worth knowing about if this page gets touched again:** the Personal Details page's form renders pre-filled with the employee's current data, then silently re-fetches and re-populates that same data a moment later. Filling the fields immediately after the page loads (or right after creating the employee, since the Add flow redirects straight here) gets silently overwritten by that second population - the save still succeeds and shows "Successfully Updated", just with the *original* values instead of the edit. `EmployeePersonalDetailsPage.editName()` waits for network idle before filling to avoid this; a `not.toHaveValue("")` check does **not** catch it, since the field is already non-empty from the pre-fill.

## 7. CI

`.github/workflows/playwright.yml` runs the full suite on every push and pull request to `main`/`master`: checks out, enables corepack (so pnpm resolves to the exact version pinned in `package.json`'s `packageManager` field), installs dependencies (`pnpm install --frozen-lockfile`), installs Chromium with its OS dependencies, runs the suite, and uploads the HTML report as a build artifact. No secrets are required - the credential fallback in §5 means CI works out of the box against the public demo instance.

## 8. Test naming

Every test title is `"<Test ID>: <Test Case Title>"` - e.g. `"TC_CEF_001: Add Employee Without Middle Name"` - so a test is identifiable by ID alone (for cross-referencing a test plan, a bug report, a CI failure notification) while the title still reads clearly on its own in the HTML report or terminal output. IDs are grouped by feature area with a numeric suffix: `TC_LOGIN_*`, `TC_NAV_*`, `TC_CEF_*` ("Create Employee Form"), `TC_EEF_*` ("Edit Employee Form"). Give a new test the next number in whichever prefix it belongs to, or a new prefix if it's a new feature area.

## 9. Extending the suite

1. Add or extend the relevant `*.locators.ts` file (or a `components/` one, if it's shared) for any new element - see §4's stability priority order before picking a selector.
2. Add or extend the Page Object method that uses it - never a raw selector in a test.
3. Verify the case against the live app first, not just an assumption of what it should do.
4. Title the test `"<Test ID>: <Test Case Title>"` (see §8).
5. Never hardcode a credential in a spec - go through `src/config/credentials.ts` (see §5 for why this project's default isn't a throw).
