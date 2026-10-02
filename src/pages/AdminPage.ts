import { Page, expect } from "@playwright/test";
import CommonActions from "../../utils/commonActions";
import {
  adminPageLocators,
  AdminPageLocators,
} from "../../locators/AdminPage.locators";

export type NewUser = {
  role: "Admin" | "ESS";
  status: "Enabled" | "Disabled";
  /**
   * What to type into the Employee Name autocomplete. Pass a single unique
   * word (the employee's generated last name): the suggestion text can
   * render with extra spaces, so a multi-word substring match is unreliable
   * (same reason as PIMPage.searchEmployeeByName).
   */
  employeeSearchTerm: string;
  username: string;
  password: string;
};

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

  async navigateToAddUser() {
    await this.locators.addButton.click();
  }

  /** Fills every Add User field but does not submit - see saveUser(). */
  async fillUserForm(user: NewUser) {
    await this.locators.userRoleSelect.click();
    await this.locators.optionByName(user.role).click();

    await this.locators.statusSelect.click();
    await this.locators.optionByName(user.status).click();

    await this.locators.employeeNameInput.fill(user.employeeSearchTerm);
    await this.locators.employeeNameOption(user.employeeSearchTerm)
      .first()
      .click();

    await this.locators.usernameInput.fill(user.username);
    await this.locators.passwordInput.fill(user.password);
    await this.locators.confirmPasswordInput.fill(user.password);
  }

  async saveUser() {
    await this.locators.saveButton.click();
  }

  async assertUserSaved() {
    await expect(this.locators.successToastMessage).toBeVisible();
    await expect(this.locators.successToastMessage).toHaveText(
      "Successfully Saved",
    );
  }

  /**
   * Filters the User Management list to one username. Waits for the list
   * URL first: the Add User form ALSO has a "Username" field, so right
   * after Save (before the redirect lands) the same locator would resolve to
   * the form's input and we'd type the search term into the wrong page.
   */
  async searchUserByUsername(username: string) {
    await this.page.waitForURL("**/admin/viewSystemUsers");
    await this.locators.searchUsernameInput.fill(username);
    await this.locators.searchButton.click();
  }

  /**
   * Asserts the filtered list shows exactly this user with these values.
   * Waits on the "(1) Record Found" text first - the unfiltered table
   * already has rows, so without that the checks below could read the table
   * before the search was applied. The four columns are checked in ONE
   * assertion on purpose: a mismatch fails once, fast, with an
   * expected-vs-received diff of the whole row (separate soft assertions
   * each waited out a full timeout and only said "cell not found").
   */
  async assertUserListed(expected: {
    username: string;
    role: string;
    employeeName: string;
    status: string;
  }) {
    await expect(this.locators.recordsFoundText).toHaveText("(1) Record Found");

    const row = this.locators.userRow(expected.username);
    await expect(row).toHaveCount(1);
    await expect(this.locators.dataCellsInRow(row)).toHaveText([
      expected.username,
      expected.role,
      expected.employeeName,
      expected.status,
    ]);
  }
}
