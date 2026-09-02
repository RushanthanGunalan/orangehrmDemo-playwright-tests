import { Page, Locator } from "@playwright/test";

/**
 * Shared left-side navigation menu, used by every page after login (Admin,
 * PIM, ...). One locator factory here instead of each page re-implementing
 * its own "find this menu item by name" selector inline.
 */
export type SidebarNavLocators = {
  menuItemByName: (name: string) => Locator;
};

export function sidebarNavLocators(page: Page): SidebarNavLocators {
  return {
    menuItemByName: (name: string) =>
      page
        .locator("span.oxd-text.oxd-text--span.oxd-main-menu-item--name")
        .filter({ hasText: name }),
  };
}
