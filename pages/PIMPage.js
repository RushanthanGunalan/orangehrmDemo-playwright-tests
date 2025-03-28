import { log } from "console";
import CommonActions from "../utils/commonActions";
import { expect, test } from "@playwright/test";
import PomManager from "./PomManager";

export default class PIMPage {
  constructor(page) {
    this.actions = new CommonActions(page);

    this.page = page;
  }

  async navigatetoPIMPage() {
    await this.actions.navigateSidePanel("PIM");
  }

  async assertPIMPage() {
    return await this.actions.getText(
      ".oxd-text.oxd-text--h6.oxd-topbar-header-breadcrumb-module"
    );
  }
  async validatePIMPagePath(breadcrumbText) {
    const pageTitle = await this.assertPIMPage();
    expect(pageTitle).toContain(breadcrumbText);
  }

  async navigateToAddEmployee() {
    await this.actions.click(
      "button[class='oxd-button oxd-button--medium oxd-button--secondary']"
    );
  }

  async addEmployee(firstName, lastName, middleName, randomID) {
    await this.actions.fill("input[placeholder='First Name']", firstName);
    await this.actions.fill("input[placeholder='Last Name']", lastName);

    if (middleName) {
      await this.actions.fill("input[placeholder='Middle Name']", middleName);
    }
    // await this.actions.fill(
    //   "div[class='oxd-input-group oxd-input-field-bottom-space'] div input[class='oxd-input oxd-input--active']",
    //   randomID
    // );

    const existingValue = await this.page.inputValue(
      "div[class='oxd-input-group oxd-input-field-bottom-space'] div input[class='oxd-input oxd-input--active']"
    );
    // Append the randomID to the existing value
    const updatedValue = existingValue + randomID;

    // Fill the input field with the updated value
    await this.actions.fill(
      "div[class='oxd-input-group oxd-input-field-bottom-space'] div input[class='oxd-input oxd-input--active']",
      updatedValue
    );
  }

  async saveEmployeeDetails() {
    await this.actions.click("button[type='submit']");
  }

  async assertAddedEmployeeDetails() {
    return await this.actions.getText(".oxd-text.oxd-text--h6.--strong");
  }

  async validateAddedEmployeeDetails(firstName, lastName) {
    const expectedfirstName = await this.assertAddedEmployeeDetails();
    const expectedlastName = await this.assertAddedEmployeeDetails();
    console.log("Retrieved First Name: ", firstName);
    console.log("Retrieved Last Name: ", lastName);
    expect(expectedfirstName).toContain(firstName); // Check first name
    expect(expectedlastName).toContain(lastName); // Check last name
  }

  async AddEmployeeLoginCredentials(userName, passWord) {
    await this.actions.click("div.oxd-switch-wrapper");
    await this.actions.fill(
      "body > div:nth-child(3) > div:nth-child(1) > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > form:nth-child(3) > div:nth-child(1) > div:nth-child(2) > div:nth-child(4) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > input:nth-child(1)",
      userName
    );
    await this.actions.fill(
      "div[class='oxd-grid-item oxd-grid-item--gutters user-password-cell'] div[class='oxd-input-group oxd-input-field-bottom-space'] div input[type='password']",
      passWord
    );

    await this.actions.fill(
      "div[class='oxd-grid-item oxd-grid-item--gutters'] div[class='oxd-input-group oxd-input-field-bottom-space'] div input[type='password']",
      passWord
    );
  }

  async DisableLoginCredentialStatus(disable) {
    if (disable) {
      await this.page.locator("//label[normalize-space()='Disabled']").click();
    } else {
      await this.page.locator("//label[normalize-space()='Enabled']").click();
    }
  }

  async getProfileName() {
    return await this.actions.getText(".oxd-userdropdown-name");
  }

  async assertCreatedEmployeeCredential(firstName, lastName) {
    const expectedfirstName = await this.getProfileName();
    const expectedlastName = await this.getProfileName();
    console.log("retrieved Firstname", firstName);
    console.log("retrieved Lastname", lastName);
    expect(expectedfirstName).toContain(firstName);
    expect(expectedlastName).toContain(lastName);
  }

  async getLoginErrorMessage() {
    return await this.actions.getText(
      ".oxd-text.oxd-text--p.oxd-alert-content-text"
    );
  }

  async assertDisabledLogin(errorMessage) {
    const expectedErrorMessage = await this.getLoginErrorMessage();
    console.log("ReturnedErrorMessage", errorMessage);
    console.log("expected Error Messsage ", expectedErrorMessage);
    expect(expectedErrorMessage).toContain(errorMessage);
  }
}
