import { log } from "console";
import CommonActions from "../utils/commonActions";
import { expect, test } from "@playwright/test";

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
    await this.actions.fill("input[placeholder='Middle Name']", middleName);
    await this.actions.fill(
      "div[class='oxd-input-group oxd-input-field-bottom-space'] div input[class='oxd-input oxd-input--active']",
      randomID
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
    expect(expectedlastName).toContain(lastName); // Check first name
  }
}
