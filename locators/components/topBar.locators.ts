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
    // A plain <p>, no semantic role of its own to key off - the class name
    // is a specific, purpose-built design-system class (not a generic
    // utility one reused elsewhere), so it's already about as stable as
    // this element gets without a testid.
    profileDropdown: page.locator(".oxd-userdropdown-name"),
    // Verified live: role="menuitem" on the real <a> - more stable than
    // the previous XPath text match.
    logoutLink: page.getByRole("menuitem", { name: "Logout", exact: true }),
    // Verified live: the only <h5> on the login page, semantic role and
    // level both real (not just visual text) - more stable than XPath.
    loginHeading: page.getByRole("heading", { name: "Login", level: 5 }),
  };
}
