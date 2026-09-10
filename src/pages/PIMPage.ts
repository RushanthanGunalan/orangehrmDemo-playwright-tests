import { Page, Locator, expect } from "@playwright/test";
import CommonActions from "../../utils/commonActions";
import {
  pimPageLocators,
  PIMPageLocators,
} from "../../locators/PIMPage.locators";

export default class PIMPage {
  readonly actions: CommonActions;
  readonly page: Page;
  readonly locators: PIMPageLocators;

  constructor(page: Page) {
    this.actions = new CommonActions(page);
    this.page = page;
    this.locators = pimPageLocators(page);
  }

  async navigatetoPIMPage() {
    // click() auto-waits for the menu item to be actionable.
    await this.locators.pimMenuItem.click();
  }

  async assertPIMPage() {
    return await this.actions.getText(this.locators.breadcrumbHeading);
  }

  async validatePIMPagePath(breadcrumbText: string) {
    const pageTitle = await this.assertPIMPage();
    expect(pageTitle).toContain(breadcrumbText);
  }

  async navigateToAddEmployee() {
    await this.locators.addButton.click();
  }

  async addEmployee(
    firstName: string,
    lastName: string,
    middleName: string | null,
    randomID: string,
  ) {
    await this.locators.firstNameInput.fill(firstName);
    await this.locators.lastNameInput.fill(lastName);

    if (middleName) {
      await this.locators.middleNameInput.fill(middleName);
    }

    await this.actions.waitForVisible(this.locators.employeeIdInput);
    const existingValue = await this.locators.employeeIdInput.inputValue();
    // Append the randomID to the existing value
    const updatedValue = existingValue + randomID;

    // Fill the input field with the updated value
    await this.locators.employeeIdInput.fill(updatedValue);
  }

  async saveEmployeeDetails() {
    await this.locators.submitButton.click();
  }

  async cancelAddEmployee() {
    await this.locators.cancelButton.click();
  }

  /**
   * Submits the Add Employee form with firstName and lastName left blank
   * and asserts the per-field "Required" errors both appear. Uses
   * expect.soft() so a failure on one field still checks the other and
   * both show up in one report, rather than the test stopping at the
   * first - they're two independent validations of the same action.
   */
  async assertRequiredFieldErrorsShown() {
    await this.locators.submitButton.click();
    await expect.soft(this.locators.firstNameError).toBeVisible({
      timeout: 10000,
    });
    await expect.soft(this.locators.firstNameError).toHaveText("Required");
    await expect.soft(this.locators.lastNameError).toBeVisible({
      timeout: 10000,
    });
    await expect.soft(this.locators.lastNameError).toHaveText("Required");
  }

  /** Confirms we're back on the Employee List - its "Add" button is only
   * present on that list page, not on the Add Employee form. */
  async assertOnEmployeeList() {
    await expect(this.locators.addButton).toBeVisible({ timeout: 10000 });
  }

  /**
   * Asserts a search narrowed the Employee List to exactly one row for
   * searchTerm and that row is visible - call searchEmployeeByName() first.
   * Same single-word searchTerm rule as searchEmployeeByName().
   */
  async assertEmployeeFoundInList(searchTerm: string) {
    const row = this.locators.rowByEmployeeName(searchTerm);
    await expect(row).toHaveCount(1, { timeout: 10000 });
    await expect(row).toBeVisible();
  }

  async assertAddedEmployeeDetails() {
    return await this.actions.getText(this.locators.addedEmployeeHeading);
  }

  async validateAddedEmployeeDetails(firstName: string, lastName: string) {
    const expectedfirstName = await this.assertAddedEmployeeDetails();
    const expectedlastName = await this.assertAddedEmployeeDetails();
    console.log("Retrieved First Name: ", firstName);
    console.log("Retrieved Last Name: ", lastName);
    expect(expectedfirstName).toContain(firstName); // Check first name
    expect(expectedlastName).toContain(lastName); // Check last name
  }

  async AddEmployeeLoginCredentials(userName: string, passWord: string) {
    await this.locators.loginDetailsToggle.click();
    await this.locators.loginUsernameInput.fill(userName);
    await this.locators.loginPasswordInput.fill(passWord);
    await this.locators.loginConfirmPasswordInput.fill(passWord);
  }

  async DisableLoginCredentialStatus(disable: boolean) {
    const statusLabel: Locator = disable
      ? this.locators.disabledStatusLabel
      : this.locators.enabledStatusLabel;
    // click() auto-waits for the label to be actionable.
    await statusLabel.click();
  }

  async getProfileName() {
    return await this.actions.getText(this.locators.profileName);
  }

  async assertCreatedEmployeeCredential(firstName: string, lastName: string) {
    const expectedfirstName = await this.getProfileName();
    const expectedlastName = await this.getProfileName();
    console.log("retrieved Firstname", firstName);
    console.log("retrieved Lastname", lastName);
    expect(expectedfirstName).toContain(firstName);
    expect(expectedlastName).toContain(lastName);
  }

  async getLoginErrorMessage() {
    return await this.actions.getText(this.locators.loginErrorMessage);
  }

  async assertDisabledLogin(errorMessage: string) {
    const expectedErrorMessage = await this.getLoginErrorMessage();
    console.log("ReturnedErrorMessage", errorMessage);
    console.log("expected Error Messsage ", expectedErrorMessage);
    expect(expectedErrorMessage).toContain(errorMessage);
  }

  /**
   * Searches the Employee List by name. Pass a single-word value (e.g. a
   * generated last name) rather than a full "first last" string - verified
   * live that the autocomplete's own suggestion text can render with an
   * extra space when there's no middle name, which would break a
   * multi-word substring match against it.
   */
  async searchEmployeeByName(searchTerm: string) {
    await this.locators.employeeNameSearchInput.fill(searchTerm);
    await this.locators.autocompleteOptionByText(searchTerm).first().click();
    await this.locators.searchButton.click();
  }

  /**
   * Deletes the employee matching searchTerm - call searchEmployeeByName()
   * first. Confirms the search narrowed to exactly one row before clicking
   * delete: this Employee List is shared with everyone using this public
   * demo, so an ambiguous match is a reason to fail loudly, never a reason
   * to guess which row to delete.
   */
  async deleteEmployee(searchTerm: string) {
    const row = this.locators.rowByEmployeeName(searchTerm);
    await expect(row).toHaveCount(1, { timeout: 10000 });
    await this.locators.deleteButtonInRow(row).click();
  }

  async confirmDelete() {
    await expect(this.locators.confirmDeleteDialog).toBeVisible({
      timeout: 10000,
    });
    await this.locators.confirmDeleteButton.click();
  }

  async cancelDelete() {
    await expect(this.locators.confirmDeleteDialog).toBeVisible({
      timeout: 10000,
    });
    await this.locators.cancelDeleteButton.click();
  }

  async assertDeleteSucceeded() {
    await expect(this.locators.deleteSuccessToastMessage).toBeVisible({
      timeout: 10000,
    });
    await expect(this.locators.deleteSuccessToastMessage).toHaveText(
      "Successfully Deleted",
    );
  }
}
