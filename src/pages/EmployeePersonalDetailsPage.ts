import { Page, expect } from "@playwright/test";
import { config } from "../config/config";
import {
  employeePersonalDetailsPageLocators,
  EmployeePersonalDetailsPageLocators,
} from "../../locators/EmployeePersonalDetailsPage.locators";

export default class EmployeePersonalDetailsPage {
  readonly page: Page;
  readonly locators: EmployeePersonalDetailsPageLocators;

  constructor(page: Page) {
    this.page = page;
    this.locators = employeePersonalDetailsPageLocators(page);
  }

  /**
   * Navigate directly to a specific employee's Personal Details page by
   * empNumber, instead of searching/paginating the Employee List UI - more
   * stable, since that list is shared with everyone using this public demo
   * and is already cluttered with other runs' test data, and it's exactly
   * the URL OrangeHRM's own UI redirects to after creating an employee.
   */
  async navigateToEmployee(empNumber: string) {
    const { origin } = new URL(config.baseUrl);
    await this.page.goto(
      `${origin}/web/index.php/pim/viewPersonalDetails/empNumber/${empNumber}`,
    );
    await expect(this.locators.employeeNameHeader).toBeVisible({
      timeout: 30000,
    });
  }

  /** Reads the employee number straight out of the current URL - valid
   * right after creating an employee (the Add Employee form redirects
   * here) or after navigateToEmployee(). */
  getEmpNumberFromUrl(): string {
    const match = this.page.url().match(/empNumber\/(\d+)/);
    if (!match) {
      throw new Error(
        `Not on an employee Personal Details page: ${this.page.url()}`,
      );
    }
    return match[1];
  }

  async editName(firstName: string, lastName: string, middleName?: string) {
    // The form renders pre-filled with the employee's current data, then
    // silently re-fetches and re-populates that same data a moment later -
    // confirmed live: filling immediately after the page loads gets
    // overwritten by that second population, so the save goes through with
    // the *original* values instead of the edit (still a "successful"
    // save, just a no-op one). Waiting for the field to be non-empty
    // doesn't help since it's already non-empty from the pre-fill - the
    // actual fix is waiting for the in-flight re-fetch to finish first.
    await this.page.waitForLoadState("networkidle");

    await this.locators.firstNameInput.fill(firstName);
    if (middleName !== undefined) {
      await this.locators.middleNameInput.fill(middleName);
    }
    await this.locators.lastNameInput.fill(lastName);
  }

  async save() {
    await this.locators.saveButton.click();
  }

  async assertSaveSucceeded() {
    await expect(this.locators.successToastMessage).toBeVisible({
      timeout: 10000,
    });
    await expect(this.locators.successToastMessage).toHaveText(
      "Successfully Updated",
    );
  }

  /** Verified live: the name header doesn't update reactively right after
   * a save - only a reload proves the edit actually persisted server-side
   * rather than just updating client state. */
  async assertEmployeeNameIs(fullName: string) {
    await this.page.reload();
    await expect(this.locators.employeeNameHeader).toHaveText(fullName, {
      timeout: 30000,
    });
  }
}
