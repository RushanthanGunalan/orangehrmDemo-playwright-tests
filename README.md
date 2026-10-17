# OrangeHRM UI Automation — Playwright

End-to-end UI test automation for the [OrangeHRM open-source demo](https://opensource-demo.orangehrmlive.com/) built with **Playwright** and the **Page Object Model (POM)**. The suite covers authentication, side-panel navigation, and the PIM "Add Employee", "Edit Employee", "Search Employee", and "Delete Employee" workflows (including login-credential creation, blank-form validation, cancel-out, and account-status validation).

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
- **Independent tests that clean up after themselves** — each test creates its own marked data (employees get a recognisable `QAR…` id), prerequisites are created through the API rather than another feature's UI, everything is deleted after each test (pass *or* fail), and stale leftovers from crashed runs are purged before a run. The purge only ever deletes records it can prove are the suite's own. See [ARCHITECTURE.md §11](ARCHITECTURE.md#11-test-data-lifecycle-independence-setup-teardown-purge).
- **`PomManager`** — a single entry point that wires up all page objects, so tests instantiate one manager instead of many pages.
- **`CommonActions` wrapper** — shared, reusable Playwright interactions (`getText`, `waitForVisible`, `navigateSidePanel`, …) operating on Locator objects, so waiting logic lives in one place.
- **Web-first waiting** — reads/verifications go through auto-retrying `expect(locator).toBeVisible()`; actions rely on Playwright's built-in auto-waiting (no brittle fixed sleeps in the page layer).
- **Credentials & base URL via `.env`** — nothing hardcoded in source; see [Configuration](#-configuration) below.
- **Dynamic test data** — [`@faker-js/faker`](https://fakerjs.dev/) generates unique employee names, IDs, and credentials per run.
- **HTML reporting** — rich Playwright HTML reports with traces captured on retry.
- **CI** — GitHub Actions runs the full suite on every push/PR (see `.github/workflows/playwright.yml`).
- **Discord notifications** — a pass/fail summary (with the HTML report attached) posts to Discord after every CI run and after `pnpm test:notify` locally. Fully optional - no `DISCORD_WEBHOOK_URL` set, no message sent. See [Discord notifications](#-discord-notifications) below.
- **A sequence diagram for every test, in one page** — drawn with Archify: which spec calls which function, in order, and what reaches the demo. `pnpm diagrams` builds `docs/diagrams/all-tests.html`, a single file with a test list to switch between them. See [Test documentation](#-test-documentation).
- **Excel test-suite reference** — `docs/OrangeHRM-Test-Suite.xlsx`, generated from the committed `docs/test-suite/test-cases.json`: every Test ID, its QA Type, steps, expected result and whether it is automated yet. `pnpm docs:sync` keeps it (and the diagram sources) in step with the specs.

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
│       ├── topBar.locators.ts
│       ├── toast.locators.ts
│       └── formField.locators.ts
├── src/
│   ├── config/
│   │   ├── config.ts         # baseUrl (env-overridable), timeout - no secrets
│   │   ├── credentials.ts    # credential getters, reads .env
│   │   └── testTypes.json    # Test ID -> QA Type map (Discord tally + Excel reference)
│   ├── api/
│   │   └── OrangeHrmApi.ts   # own-session API client used for test setup and cleanup
│   ├── testData/             # test-data lifecycle: marker ids, per-test cleanup, pre-run purge
│   │   ├── ids.ts
│   │   ├── purge.ts
│   │   └── TestData.ts
│   └── pages/                # Page Object Model - behavior only
│       ├── PomManager.ts      # Aggregates all page objects (single entry point)
│       ├── LoginPage.ts       # Login flow + validation
│       ├── AdminPage.ts       # Admin page navigation & assertions
│       ├── PIMPage.ts         # PIM: add/search/delete employee, credentials, status checks
│       └── EmployeePersonalDetailsPage.ts   # Edit an employee's name fields, or confirm deletion
├── utils/
│   └── commonActions.ts   # Reusable Playwright interaction wrappers (locator-based)
├── tests/                 # Test specs
│   ├── fixtures.ts        # the suite's `test`: per-test `pm` + `testData`, pre-run purge
│   ├── Login.spec.ts
│   ├── Navigation.spec.ts
│   ├── AddEmployeeTest.spec.ts
│   ├── EditEmployeeTest.spec.ts
│   ├── SearchEmployeeTest.spec.ts
│   ├── DeleteEmployeeTest.spec.ts
│   ├── AddUserTest.spec.ts
│   └── TestDataSafetyTest.spec.ts   # offline tests of the cleanup's own safety guards
├── scripts/
│   ├── notify-discord.mjs     # posts a run summary to Discord via webhook
│   ├── test-and-notify.mjs    # runs the suite locally, then always notifies
│   ├── sync-test-docs.mjs     # keeps the test-case list, Excel sheet and diagram sources in step with the specs
│   ├── build-test-suite.mjs   # regenerates the Excel sheet from the test-case list
│   ├── build-diagrams.mjs     # builds every diagram with Archify, then bundles them into one html
│   └── lib/                   # xlsx writer, single-html diagram bundler
├── docs/
│   ├── test-suite/test-cases.json  # the test-case list (committed) - source of the Excel sheet
│   ├── OrangeHRM-Test-Suite.xlsx   # generated from it (gitignored)
│   └── diagrams/                   # sequence/*.json sources committed; all-tests.html built by `pnpm diagrams` (gitignored)
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

Discord notifications are separately optional - see [Discord notifications](#-discord-notifications) below; the suite runs and passes with no `.env` at all.

### Running the tests

```bash
pnpm test            # run all tests (headless)
pnpm test:headed     # run in a visible browser
pnpm test:ui         # open Playwright's interactive UI mode
pnpm test:debug      # step through with the Playwright Inspector
pnpm test:notify     # run all tests, then post the result to Discord (see below)
pnpm report          # open the last HTML report
```

Test documentation (see [Test documentation](#-test-documentation)):

```bash
pnpm docs:sync       # after adding a test: update the test-case list, Excel sheet and diagram sources
pnpm docs:check      # read-only: exit 1 if the docs are out of step with the specs
pnpm diagrams        # build docs/diagrams/all-tests.html (one page, every test's diagram)
pnpm test-suite      # regenerate the Excel sheet only
```

Run a single spec or test:

```bash
pnpm exec playwright test tests/Login.spec.ts
pnpm exec playwright test -g "TC_LOGIN_001"
```

## 💬 Discord notifications

A pass/fail summary posts to a Discord channel after every CI run, and after `pnpm test:notify` locally - branch, commit, pass/fail/flaky/skipped counts, duration, a per-QA-Type tally (Smoke / Functional / Negative / Navigation / Unit), and the zipped HTML report attached so it's one click away with no GitHub login needed.

This is entirely optional and safe to ignore: with no webhook configured, `scripts/notify-discord.mjs` logs that it's skipping and exits 0 - it never fails a build.

**To enable it:**

1. In Discord: **Server Settings → Integrations → Webhooks → New Webhook**, then copy its URL.
2. **Locally** - copy `.env.example` to `.env` and set `DISCORD_WEBHOOK_URL` (and optionally `DISCORD_THREAD_ID` to post into one thread instead of the channel). Then run `pnpm test:notify`.
3. **On CI** - add `DISCORD_WEBHOOK_URL` as a repository secret (Settings → Secrets and variables → Actions → New repository secret) and, optionally, `DISCORD_THREAD_ID` as a repository *variable*. The workflow's `Notify Discord` step picks both up automatically - no code changes needed.

See [ARCHITECTURE.md §10](ARCHITECTURE.md#10-discord-notifications--the-excel-test-suite-reference) for how the script is built and why it never fails the build.

## 📋 Test documentation

Three generated views let you look up what a test does instead of reading the TypeScript:

| You want to know | Look here |
|---|---|
| What a test checks: steps, expected result, priority, automated or only planned | `docs/OrangeHRM-Test-Suite.xlsx` |
| Which function calls which, in order, and what reaches the demo | `docs/diagrams/all-tests.html` |
| Where a step lives in the code | click a box in a diagram; its panel lists the exact file and lines |

**Excel sheet.** `docs/OrangeHRM-Test-Suite.xlsx` has one row per Test ID (ID, Priority, Type, Module, Scenario, Steps, Input Data, Expected Result, Automated, Spec File) and a Summary tab with per-type counts. It is generated and gitignored; its source is the committed [`docs/test-suite/test-cases.json`](docs/test-suite/test-cases.json), so edit that, not the sheet. `pnpm test-suite` rebuilds it.

**Sequence diagrams, one page.** `pnpm diagrams` builds every diagram with [Archify](https://github.com/tt-a1i/archify) and bundles them into **one file, `docs/diagrams/all-tests.html`** (about 6 MB, gitignored): open it and pick a test from the list on the left. Archify has no multi-diagram feature of its own, so the page is a thin container around Archify's unchanged output. Inside the frame it is the normal Archify viewer: click a box to see its verified source lines, or Export to PNG/SVG. It needs the Archify skill in `.claude/skills/archify` (not part of a fresh clone); the script prints the install command if it is missing. Full instructions: [docs/diagrams/README.md](docs/diagrams/README.md).

**Adding a test? Run `pnpm docs:sync`.** It finds every `test("TC_...")` in `tests/` and, for each one that is missing, adds its row to the test-case list (or flips its Planned row to Automated), its type to `src/config/testTypes.json`, and a drafted diagram source, then regenerates the sheet. Anything it adds is marked **DRAFT**: it can read the code but not the application, so priority, input data and expected result say `TBD` and the diagram shows only the test's direct calls. Review those before committing. `pnpm docs:check` makes the same comparison without changing anything and exits 1 on a difference, so it can guard CI. How it works and its limits: [ARCHITECTURE.md §12](ARCHITECTURE.md#12-test-documentation-excel-sheet-sequence-diagrams-and-keeping-them-in-step).

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
