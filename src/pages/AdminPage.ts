import { Page, expect } from "@playwright/test";
import CommonActions from "../../utils/commonActions";
import {
  adminPageLocators,
  AdminPageLocators,
} from "../../locators/AdminPage.locators";

export default class AdminPage {
  readonly actions: CommonActions;
  readonly page: Page;
  readonly locators: AdminPageLocators;

  constructor(page: Page) {
    this.actions = new CommonActions(page);
    this.page = page;
    this.locators = adminPageLocators(page);
  }

  async navigateToAdminPage() {
    // click() auto-waits for the menu item to be actionable.
    await this.locators.adminMenuItem.click();
  }

  async assertAdminPage() {
    return await this.actions.getText(this.locators.breadcrumbHeading);
  }

  async validateAdminPageIsLoaded(breadcrumbText: string) {
    const pageTitle = await this.assertAdminPage();
    expect(pageTitle).toContain(breadcrumbText);

    await this.page.waitForURL("**/admin/viewSystemUsers");
  }
}
