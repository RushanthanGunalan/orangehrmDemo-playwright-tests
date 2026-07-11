# OrangeHRM UI Automation — Playwright

End-to-end UI test automation for the [OrangeHRM open-source demo](https://opensource-demo.orangehrmlive.com/) built with **Playwright** and the **Page Object Model (POM)**. The suite covers authentication, side-panel navigation, and the PIM "Add Employee" workflows (including login-credential creation and account-status validation).

<p>
  <img alt="Playwright" src="https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white">
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black">
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-5FA04E?logo=node.js&logoColor=white">
</p>

---

## ✨ Highlights

- **Page Object Model** — every page is a class exposing intent-revealing actions, kept separate from test logic.
- **`PomManager`** — a single entry point that wires up all page objects, so tests instantiate one manager instead of many pages.
- **`CommonActions` wrapper** — shared, reusable Playwright interactions (`click`, `fill`, `getText`, …) so selectors and waiting logic live in one place.
- **Web-first waiting** — reads/verifications go through auto-retrying `expect(locator).toBeVisible()`; actions rely on Playwright's built-in auto-waiting (no brittle fixed sleeps in the page layer).
- **Dynamic test data** — [`@faker-js/faker`](https://fakerjs.dev/) generates unique employee names, IDs, and credentials per run.
- **HTML reporting** — rich Playwright HTML reports with traces captured on retry.

## 🧪 Test Coverage

| Spec                            | Scenario                                                                                                                                                                                                             |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/Login.spec.js`           | Logging in with valid credentials and asserting the Dashboard loads                                                                                                                                                  |
| `tests/Navigation.spec.js`      | Navigating to the Admin page from the side panel and validating the route                                                                                                                                            |
| `tests/AddEmployeeTest.spec.js` | Adding an employee (with/without middle name); creating an employee **with** login credentials and logging in as them; creating an employee with **disabled** credentials and asserting the "Account disabled" error |

## 🛠️ Tech Stack

- **[Playwright Test](https://playwright.dev/)** — test runner & browser automation (Chromium project enabled)
- **JavaScript (ES Modules)**
- **[@faker-js/faker](https://fakerjs.dev/)** — test data generation
- **[pnpm](https://pnpm.io/)** — fast, disk-efficient package manager (see [Security](#-security-notes))

## 📁 Project Structure

```
.
├── pages/                 # Page Object Model classes
│   ├── PomManager.js      # Aggregates all page objects (single entry point)
│   ├── LoginPage.js       # Login flow + validation
│   ├── AdminPage.js       # Admin page navigation & assertions
│   └── PIMPage.js         # PIM: add employee, credentials, status checks
├── utils/
│   └── commonActions.js   # Reusable Playwright interaction wrappers
├── tests/                 # Test specs
│   ├── Login.spec.js
│   ├── Navigation.spec.js
│   └── AddEmployeeTest.spec.js
├── playwright.config.js   # Playwright configuration
├── .npmrc                 # pnpm settings (supply-chain cooldown)
└── package.json
```

<!--
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
pnpm install              # install dependencies
pnpm exec playwright install   # download the Playwright browser binaries
```

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
pnpm exec playwright test tests/Login.spec.js
pnpm exec playwright test -g "Logging in with Correct Credentials"
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

> **App under test:** OrangeHRM open-source demo — https://opensource-demo.orangehrmlive.com/ (default credentials `Admin` / `admin123`). This is a public demo environment used purely for learning and portfolio purposes.


-->
