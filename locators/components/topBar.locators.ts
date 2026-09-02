import { Page, Locator } from "@playwright/test";

/**
 * Shared top-bar controls, present on every authenticated page (profile
 * dropdown, logout link, the heading shown once back on the login page).
 */
export type TopBarLocators = {
  profileDropdown: Locator;
  logoutLink: Locator;
  loginHeading: Locator;
};

export function topBarLocators(page: Page): TopBarLocators {
  return {
    profileDropdown: page.locator(".oxd-userdropdown-name"),
    logoutLink: page.locator("//a[normalize-space()='Logout']"),
    loginHeading: page.locator("//h5[normalize-space()='Login']"),
  };
}
