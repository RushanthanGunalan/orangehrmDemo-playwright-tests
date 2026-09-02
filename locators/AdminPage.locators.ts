import { Page, Locator } from "@playwright/test";
import { sidebarNavLocators } from "./components/sidebarNav.locators";

export type AdminPageLocators = {
  adminMenuItem: Locator;
  breadcrumbHeading: Locator;
};

export function adminPageLocators(page: Page): AdminPageLocators {
  return {
    adminMenuItem: sidebarNavLocators(page).menuItemByName("Admin"),
    breadcrumbHeading: page.locator(
      ".oxd-text.oxd-text--h6.oxd-topbar-header-breadcrumb-module",
    ),
  };
}
