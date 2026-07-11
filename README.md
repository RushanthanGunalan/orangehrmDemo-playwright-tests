# OrangeHRM UI Automation — Playwright

A UI test-automation framework for the [OrangeHRM open-source demo](https://opensource-demo.orangehrmlive.com/), built with **Playwright** and the **Page Object Model (POM)**.

The goal of this project is to provide a clean, maintainable, and scalable foundation for end-to-end testing of the OrangeHRM web application — demonstrating industry-standard automation patterns such as page objects, reusable action wrappers, dynamic test data, and web-first assertions.

<p>
  <img alt="Playwright" src="https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white">
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black">
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-5FA04E?logo=node.js&logoColor=white">
</p>

> ⚠️ **Work in progress** — this project is under active development and its test coverage continues to grow.

---

## 🎯 What This Project Is About

OrangeHRM is a popular open-source HR management system. This repository automates its web UI to validate core HR workflows — authentication, navigation, and employee (PIM) management — using a framework designed to stay readable and easy to extend as coverage expands.

## 🧱 Design & Architecture

- **Page Object Model** — each page is a class that exposes intent-revealing actions, keeping selectors and page logic out of the test specs.
- **`PomManager`** — a single entry point that wires up all page objects, so a test instantiates one manager instead of many pages.
- **`CommonActions` wrapper** — centralizes reusable Playwright interactions (`click`, `fill`, `getText`, …) so waiting and interaction logic live in one place.
- **Web-first waiting** — reads and verifications use auto-retrying `expect(locator).toBeVisible()`; actions rely on Playwright's built-in auto-waiting instead of brittle fixed sleeps.
- **Dynamic test data** — [`@faker-js/faker`](https://fakerjs.dev/) generates unique employee names, IDs, and credentials so tests don't depend on pre-seeded data.
- **HTML reporting & traces** — rich Playwright HTML reports, with traces captured on retry for debugging.

## 🛠️ Tech Stack

- **[Playwright Test](https://playwright.dev/)** — test runner & browser automation
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
├── playwright.config.js   # Playwright configuration
├── .npmrc                 # pnpm settings (supply-chain cooldown)
└── package.json
```

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
pnpm install                   # install dependencies
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

Run a single spec or a test by title:

```bash
pnpm exec playwright test tests/Login.spec.js
pnpm exec playwright test -g "Logging in with Correct Credentials"
```

## 🔐 Security Notes

This project uses **pnpm** with a supply-chain safeguard configured in [`.npmrc`](.npmrc):

```ini
minimum-release-age=4320   # 3 days, in minutes
```

pnpm will refuse to install any package version published within the last 3 days. Because malicious npm releases are typically detected and pulled within hours to days, this cooldown reduces exposure to fresh supply-chain attacks. The lockfile (`pnpm-lock.yaml`) is committed so installs are reproducible and integrity-checked.

---

> **App under test:** OrangeHRM open-source demo — https://opensource-demo.orangehrmlive.com/ (default credentials `Admin` / `admin123`). This is a public demo environment used purely for learning and portfolio purposes.
