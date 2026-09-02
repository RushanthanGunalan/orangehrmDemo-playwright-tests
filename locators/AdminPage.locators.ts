import { Page, Locator } from "@playwright/test";
import { sidebarNavLocators } from "./components/sidebarNav.locators";

export type AdminPageLocators = {
  adminMenuItem: Locator;
  breadcrumbHeading: Locator;
};

export function adminPageLocators(page: Page): AdminPageLocators {
  return {
    adminMenuItem: sidebarNavLocators(page).menuItemByName("Admin"),
    // Verified live: exactly 2 <h6> elements can exist on a given page here
    // (e.g. the Add Employee form has its own), so a generic role-based
    // heading locator would be ambiguous - this specific, purpose-built
    // class is actually the more reliable choice.
    breadcrumbHeading: page.locator(
      ".oxd-text.oxd-text--h6.oxd-topbar-header-breadcrumb-module",
    ),
  };
}
