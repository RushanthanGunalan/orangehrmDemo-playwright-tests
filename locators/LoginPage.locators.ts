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
    // Verified live: real name="username"/name="password" form attributes
    // exist - more stable than the placeholder text ("Username"/"Password"
    // display copy could change independently of the field's actual
    // purpose; the name attribute is tied to form submission and won't).
    usernameInput: page.locator("input[name='username']"),
    passwordInput: page.locator("input[name='password']"),
    // Verified live: the only submit button on this page, accessible name
    // "Login" via its visible text. Not exact: a Vue placeholder node
    // precedes the text in the DOM, so the real computed accessible name is
    // " Login" (leading space) - confirmed by an actual failed run on the
    // sibling "Add" button, which has the same icon-before-text pattern.
    submitButton: page.getByRole("button", { name: "Login" }),
    breadcrumbHeading: page.locator(
      ".oxd-text.oxd-text--h6.oxd-topbar-header-breadcrumb-module",
    ),
  };
}
