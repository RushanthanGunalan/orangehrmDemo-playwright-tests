# OrangeHRM UI Automation — Playwright

End-to-end UI test automation for the [OrangeHRM open-source demo](https://opensource-demo.orangehrmlive.com/) built with **Playwright** and the **Page Object Model (POM)**. The suite covers authentication, side-panel navigation, and the PIM "Add Employee" and "Edit Employee" workflows (including login-credential creation and account-status validation).

<p>
  <img alt="Playwright" src="https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white">
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-5FA04E?logo=node.js&logoColor=white">
</p>

---

## ✨ Highlights

- **Locator Library + Page Object Model** — every raw selector lives in `locators/*.locators.ts`, kept separate from the Page Objects (`src/pages/`) that hold the actual behavior. See [ARCHITECTURE.md](ARCHITECTURE.md) for the full pattern.
- **TypeScript throughout** — Locators, Page Objects, and config are fully typed; `tsc --noEmit` runs clean and has already caught one real bug (a `faker` API misuse that was silently generating passwords with the wrong length).
- **`PomManager`** — a single entry point that wires up all page objects, so tests instantiate one manager instead of many pages.
- **`CommonActions` wrapper** — shared, reusable Playwright interactions (`getText`, `waitForVisible`, `navigateSidePanel`, …) operating on Locator objects, so waiting logic lives in one place.
- **Web-first waiting** — reads/verifications go through auto-retrying `expect(locator).toBeVisible()`; actions rely on Playwright's built-in auto-waiting (no brittle fixed sleeps in the page layer).
- **Credentials & base URL via `.env`** — nothing hardcoded in source; see [Configuration](#-configuration) below.
- **Dynamic test data** — [`@faker-js/faker`](https://fakerjs.dev/) generates unique employee names, IDs, and credentials per run.
- **HTML reporting** — rich Playwright HTML reports with traces captured on retry.
- **CI** — GitHub Actions runs the full suite on every push/PR (see `.github/workflows/playwright.yml`).

## 🛠️ Tech Stack

- **[Playwright Test](https://playwright.dev/)** — test runner & browser automation (Chromium project enabled)
- **TypeScript**
- **[@faker-js/faker](https://fakerjs.dev/)** — test data generation
- **[pnpm](https://pnpm.io/)** — fast, disk-efficient package manager (see [Security](#-security-notes))

## 📁 Project Structure

```
.
├── locators/               # Locator Library - raw selectors only, nothing else
│   ├── LoginPage.locators.ts
│   ├── AdminPage.locators.ts
│   ├── PIMPage.locators.ts
│   ├── EmployeePersonalDetailsPage.locators.ts
│   └── components/          # shared elements reused across pages
│       ├── sidebarNav.locators.ts
│       └── topBar.locators.ts
├── src/
│   ├── config/
│   │   ├── config.ts         # baseUrl (env-overridable), timeout - no secrets
│   │   └── credentials.ts    # credential getters, reads .env
│   └── pages/                # Page Object Model - behavior only
│       ├── PomManager.ts      # Aggregates all page objects (single entry point)
│       ├── LoginPage.ts       # Login flow + validation
│       ├── AdminPage.ts       # Admin page navigation & assertions
│       ├── PIMPage.ts         # PIM: add employee, credentials, status checks
│       └── EmployeePersonalDetailsPage.ts   # Edit an employee's name fields
├── utils/
│   └── commonActions.ts   # Reusable Playwright interaction wrappers (locator-based)
├── tests/                 # Test specs
│   ├── Login.spec.ts
│   ├── Navigation.spec.ts
│   ├── AddEmployeeTest.spec.ts
│   └── EditEmployeeTest.spec.ts
├── .github/workflows/      # CI
├── playwright.config.ts   # Playwright configuration
├── tsconfig.json          # TypeScript compiler config
├── .env.example           # template for local overrides (see Configuration)
├── .npmrc                 # pnpm settings (supply-chain cooldown)
└── package.json
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for why it's split this way.

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (tested on 20.x)
- **pnpm** — this repo uses pnpm. The easiest way to get the pinned version is via Corepack (bundled with Node):

  ```bash
  corepack enable
  ```

  Corepack reads the `packageManager` field in `package.json` and uses the correct pnpm version automatically.

### Installation

```bash
pnpm install                    # install dependencies
pnpm exec playwright install    # download the Playwright browser binaries
```

### Configuration

Nothing is required to get running — `src/config/credentials.ts` and `src/config/config.ts` fall back to OrangeHRM's own published public demo login (`Admin` / `admin123`) and the public demo instance if no `.env` is present, since those aren't actually secrets (OrangeHRM publishes them itself for anyone to use).

If you want to point the suite at a different OrangeHRM instance or account, copy `.env.example` to `.env` and fill in `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and/or `BASE_URL`. `.env` is gitignored either way.

### Running the tests

```bash
pnpm test            # run all tests (headless)
pnpm test:headed     # run in a visible browser
pnpm test:ui         # open Playwright's interactive UI mode
pnpm test:debug      # step through with the Playwright Inspector
pnpm report          # open the last HTML report
```

Run a single spec or test:

```bash
pnpm exec playwright test tests/Login.spec.ts
pnpm exec playwright test -g "TC_LOGIN_001"
```

## 🔐 Security Notes

This project uses **pnpm** with a supply-chain safeguard configured in [`.npmrc`](.npmrc):

```ini
minimum-release-age=4320   # 3 days, in minutes
```

pnpm will refuse to install any package version published within the last 3 days. Because malicious npm releases are typically detected and pulled within hours to days, this cooldown significantly reduces exposure to fresh supply-chain attacks. The lockfile (`pnpm-lock.yaml`) is committed so installs are reproducible and integrity-checked.

## 📊 Reports

After a run, Playwright generates an HTML report:

```bash
pnpm report
```

Traces are collected on the first retry (`trace: "on-first-retry"`) and can be explored in the [Trace Viewer](https://playwright.dev/docs/trace-viewer).

---

> **App under test:** OrangeHRM open-source demo — https://opensource-demo.orangehrmlive.com/ (default credentials `Admin` / `admin123`, published by OrangeHRM itself). This is a public demo environment used purely for learning and portfolio purposes.
