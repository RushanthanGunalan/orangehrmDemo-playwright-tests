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
    // Each menu item is a real <a> with its visible text as the accessible
    // name (verified live: e.g. href="/web/index.php/admin/viewAdminModule")
    // - role-based is more stable than the previous CSS-class + text-filter
    // combo, since it doesn't depend on the design system's utility classes
    // at all.
    menuItemByName: (name: string) =>
      page.getByRole("link", { name, exact: true }),
  };
}
