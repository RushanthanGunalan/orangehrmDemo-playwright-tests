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
  /** Defaults to `password`. Pass a different value to test a mismatch. */
  confirmPassword?: string;
};

/**
 * The Add User form's fields in on-screen order. `name` is how a failure
 * reads; `label` is what the field is found by ("Password" needs an exact
 * regex because it is also a substring of "Confirm Password").
 */
export type AddUserFieldName =
  | "User Role"
  | "Employee Name"
  | "Status"
  | "Username"
  | "Password"
  | "Confirm Password";

const ADD_USER_FIELDS: { name: AddUserFieldName; label: string | RegExp }[] = [
  { name: "User Role", label: "User Role" },
  { name: "Employee Name", label: "Employee Name" },
  { name: "Status", label: "Status" },
  { name: "Username", label: "Username" },
  { name: "Password", label: /^Password$/ },
  { name: "Confirm Password", label: "Confirm Password" },
];

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
    await this.locators.confirmPasswordInput.fill(
      user.confirmPassword ?? user.password,
    );
  }

  async saveUser() {
    await this.locators.saveButton.click();
  }

  /**
   * Replaces just the Username on a form that is already filled in, then
   * leaves the field (Tab) like a person committing it. Without the Tab, a
   * run was seen where the previous value's "Should be at least 5
   * characters" message stayed on screen for a full minute after a valid
   * value replaced it; leaving the field makes the app validate again.
   */
  async setUsername(username: string) {
    await this.locators.usernameInput.fill(username);
    await this.locators.usernameInput.press("Tab");
  }

  /** Every Add User field's current validation message ("" when none is shown). */
  private async readFieldErrors(): Promise<Record<string, string>> {
    const errors: Record<string, string> = {};
    for (const field of ADD_USER_FIELDS) {
      errors[field.name] = (
        await this.locators.fieldError(field.label).allTextContents()
      ).join(" | ");
    }
    return errors;
  }

  /**
   * Waits until the form's messages are exactly `expected` (field name ->
   * message, "" for none), then fails ONCE with a field -> message diff if
   * they never become that. Naming the field is the point: separate
   * assertions each wait out a full timeout and only say "not found".
   */
  private async expectFieldErrors(expected: Record<string, string>) {
    await expect
      .poll(() => this.readFieldErrors(), { timeout: this.actions.defaultTimeout })
      .toEqual(expected);
  }

  /**
   * Asserts no field shows a validation message (on a pristine form, or on a
   * filled one that is valid). It first waits for the form itself: with the
   * page not loaded every message is trivially absent, which would make this
   * check pass without proving anything.
   */
  async assertNoFieldErrors() {
    await expect(this.locators.usernameInput).toBeVisible();
    await this.expectFieldErrors(
      Object.fromEntries(ADD_USER_FIELDS.map((f) => [f.name, ""])),
    );
  }

  /**
   * Asserts the messages shown after submitting the form with every field
   * empty, in ONE assertion that names the field when one is wrong (it
   * retries until all six messages have rendered, then fails once with a
   * field -> message diff).
   *
   * Verified live: five fields say "Required", but Confirm Password says
   * "Passwords do not match" even though both password fields are empty
   * (why the app words it that way is not known). That is the app's real
   * behaviour today and is asserted as such; if the app is changed to say
   * "Required" here, this fails on purpose so a person decides which is right.
   */
  async assertBlankFormErrors() {
    await this.expectFieldErrors({
      "User Role": "Required",
      "Employee Name": "Required",
      Status: "Required",
      Username: "Required",
      Password: "Required",
      "Confirm Password": "Passwords do not match",
    });
  }

  /**
   * Asserts a form filled in correctly except for a Confirm Password that
   * differs from Password shows exactly one message, "Passwords do not
   * match", on Confirm Password and nothing on any other field. Verified
   * live: the message appears as soon as the value is typed (it does not wait
   * for Save), it is case-sensitive, and it clears when the two match again.
   */
  async assertOnlyConfirmPasswordMismatch() {
    await this.assertOnlyFieldError("Confirm Password", "Passwords do not match");
  }

  /**
   * Asserts exactly one field shows `message` and every other field shows
   * nothing - so a test about one rule also proves it did not trip another.
   * Failure is one field -> message diff.
   */
  async assertOnlyFieldError(field: AddUserFieldName, message: string) {
    await this.expectFieldErrors({
      ...Object.fromEntries(ADD_USER_FIELDS.map((f) => [f.name, ""])),
      [field]: message,
    });
  }

  /**
   * Asserts the submit did not go through: still on the Add User form (a real
   * save redirects to the user list) and no success toast appeared.
   */
  async assertStillOnAddUserForm() {
    await expect(this.page).toHaveURL(/\/admin\/saveSystemUser/);
    await expect(this.locators.successToastMessage).toHaveCount(0);
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

  /**
   * Asserts the filtered list has NO user with this username - the proof that
   * a rejected save really created nothing. Waits on "No Records Found" FIRST:
   * before the search lands the unfiltered table is on screen, and "no row
   * has this username" would be trivially true, proving nothing. (Verified
   * live: that message appears twice - as an info toast and as text in the
   * table - which is why the locator takes .first() instead of being strict.)
   */
  async assertUserNotListed(username: string) {
    await expect(
      this.locators.noRecordsFoundText.first(),
      `expected no user "${username}", but the list did not report "No Records Found" - the user may have been created`,
    ).toBeVisible();
    await expect(this.locators.userRow(username)).toHaveCount(0);
  }
}
