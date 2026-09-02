import { Page, Locator } from "@playwright/test";

/**
 * Locator Library pattern - raw selectors ONLY, nothing about what you can
 * *do* with them. The matching Page Object (src/pages/LoginPage.ts) holds
 * this under a single `locators` property and contains only behavior.
 */
export type LoginPageLocators = {
  usernameInput: Locator;
  passwordInput: Locator;
  submitButton: Locator;
  breadcrumbHeading: Locator;
};

export function loginPageLocators(page: Page): LoginPageLocators {
  return {
    usernameInput: page.locator("input[placeholder='Username']"),
    passwordInput: page.locator("input[placeholder='Password']"),
    submitButton: page.locator("button[type='submit']"),
    breadcrumbHeading: page.locator(
      ".oxd-text.oxd-text--h6.oxd-topbar-header-breadcrumb-module",
    ),
  };
}
