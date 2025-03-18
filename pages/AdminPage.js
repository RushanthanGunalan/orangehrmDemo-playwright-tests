import CommonActions from "../utils/commonActions";
import { expect, test } from "@playwright/test";

export default class AdminPage {
  constructor(page) {
    this.actions = new CommonActions(page);
    this.page = page;
  }

  async navigateToAdminPage() {
    await this.page
      .locator("span.oxd-text.oxd-text--span.oxd-main-menu-item--name")
      .filter({ hasText: "Admin" })
      .click();
  }
  async assertAdminPage() {
    return await this.actions.getText(
      ".oxd-text.oxd-text--h6.oxd-topbar-header-breadcrumb-module"
    );
  }
  async validateAdminPageIsLoaded(breadcrumbText) {
    const pageTitle = await this.assertAdminPage();
    expect(pageTitle).toContain(breadcrumbText);

    await this.page.waitForURL("**/admin/viewSystemUsers");
  }
}
