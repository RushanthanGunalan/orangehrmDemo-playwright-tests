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
}
