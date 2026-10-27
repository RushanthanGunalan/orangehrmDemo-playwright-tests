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

  /** Leaves the Add User form without saving. */
  async cancelAddUser() {
    await this.locators.cancelButton.click();
  }

  /** Leaves the Edit User form without saving (it has the same Cancel button). */
  async cancelEditUser() {
    await this.locators.cancelButton.click();
  }

  /**
   * Asserts we are on the User Management LIST, not the Add User form. Three
   * independent signs, because any one alone is weak: the list's URL (waiting
   * for the redirect - the click returns before it lands), the list's "Add"
   * button, and the form's "Save" button being GONE. Deliberately no check on
   * how many users the list shows: the demo is shared and that number changes
   * whenever anyone adds one.
   */
  async assertOnUserList() {
    await expect(this.page).toHaveURL(/\/admin\/viewSystemUsers/);
    await expect(this.locators.addButton).toBeVisible();
    await expect(this.locators.saveButton).toHaveCount(0);
  }

  /**
   * Asserts a freshly opened Add User form has nothing carried over from an
   * earlier, cancelled attempt. Waits for the form's own URL first: the list
   * has a "Username" search box found the same way, which would otherwise be
   * checked instead.
   */
  async assertAddUserFormIsBlank() {
    await expect(this.page).toHaveURL(/\/admin\/saveSystemUser/);
    await expect(this.locators.usernameInput).toHaveValue("");
    await expect(this.locators.passwordInput).toHaveValue("");
    await expect(this.locators.confirmPasswordInput).toHaveValue("");
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

  /**
   * Same for the EDIT form: still on /admin/saveSystemUser/<id> (a real save
   * redirects to the list a few seconds later) and no success toast. The id
   * in the URL is what tells the edit form from the add form.
   */
  async assertStillOnEditUserForm() {
    await expect(this.page).toHaveURL(/\/admin\/saveSystemUser\/\d+/);
    await expect(this.locators.successToastMessage).toHaveCount(0);
  }

  async assertUserSaved() {
    await expect(this.locators.successToastMessage).toBeVisible();
    await expect(this.locators.successToastMessage).toHaveText(
      "Successfully Saved",
    );
  }

  /**
   * The toast after EDITING a user says "Successfully Updated" (verified
   * live), not "Successfully Saved" like adding one. It appears BEFORE the
   * redirect to the list, which lands a few seconds later - searchUserBy
   * Username() waits for that redirect.
   */
  async assertUserUpdated() {
    await expect(this.locators.successToastMessage).toBeVisible();
    await expect(this.locators.successToastMessage).toHaveText(
      "Successfully Updated",
    );
  }

  /**
   * Opens the edit form of the (single) user the list currently shows for
   * this username, by clicking the row's edit icon.
   */
  async openEditUser(username: string) {
    await this.locators.editButtonInRow(this.locators.userRow(username)).click();
    await this.page.waitForURL("**/admin/saveSystemUser/**");
  }

  /**
   * Clicks the row's delete (trash) button and asserts the confirmation
   * appears with its warning text. Nothing is deleted yet: that only happens
   * on "Yes, Delete" (see confirmDelete()).
   */
  async openDeleteConfirmation(username: string) {
    await this.locators.deleteButtonInRow(this.locators.userRow(username)).click();
    await expect(this.locators.deleteDialog).toContainText("Are you Sure?");
    await expect(this.locators.deleteDialog).toContainText(
      "The selected record will be permanently deleted",
    );
  }

  /** Clicks "Yes, Delete" in the confirmation. */
  async confirmDelete() {
    await this.locators.confirmDeleteButton.click();
  }

  /**
   * Asserts the delete went through: the toast says "Successfully Deleted"
   * (verified live; the page stays on the list, there is no redirect) and the
   * confirmation has closed.
   */
  async assertUserDeleted() {
    await expect(this.locators.successToastMessage).toBeVisible();
    await expect(this.locators.successToastMessage).toHaveText(
      "Successfully Deleted",
    );
    await expect(this.locators.deleteDialog).toHaveCount(0);
  }

  /**
   * Asserts the edit form is LOADED and shows this user's current role,
   * status and username. Not optional before editing: verified live that the
   * form opens EMPTY ("-- Select --", blank username) and fills in about 3
   * seconds later, so a change made too early can be overwritten by the late
   * data - or saved against blank fields. The username is checked first
   * because it is the last thing to appear. (The Employee Name is not
   * checked here: the form shows it with a doubled space, the list does not.)
   */
  async assertEditFormShows(expected: {
    username: string;
    role: NewUser["role"];
    status: NewUser["status"];
  }) {
    await expect(this.locators.usernameInput).toHaveValue(expected.username);
    await expect(this.locators.userRoleSelect).toHaveText(expected.role);
    await expect(this.locators.statusSelect).toHaveText(expected.status);
  }

  /** Picks a different Status in the (add or edit) user form's dropdown. */
  async setUserStatus(status: NewUser["status"]) {
    await this.locators.statusSelect.click();
    await this.locators.optionByName(status).click();
    await expect(this.locators.statusSelect).toHaveText(status);
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
   * Searches the User Management list by username AND, optionally, the User
   * Role and Status filters. Pass every filter you want applied each time: a
   * dropdown keeps the value chosen on the previous search, so a search that
   * omits one is not "any" - it is "whatever was picked last" (only Reset
   * puts them back to "-- Select --", verified live). The options are the
   * ones the list offers: Admin / ESS and Enabled / Disabled.
   */
  async filterUsers(filters: {
    username: string;
    role?: NewUser["role"];
    status?: NewUser["status"];
  }) {
    await this.page.waitForURL("**/admin/viewSystemUsers");
    await this.locators.searchUsernameInput.fill(filters.username);
    if (filters.role) {
      await this.locators.userRoleSelect.click();
      await this.locators.optionByName(filters.role).click();
    }
    if (filters.status) {
      await this.locators.statusSelect.click();
      await this.locators.optionByName(filters.status).click();
    }
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

  /**
   * Asserts the current search found NOTHING, from the user's point of view:
   * the table says "No Records Found" (its own message, not the fading
   * toast), the "(N) Records Found" count is gone, and no data row is left -
   * only the header. It waits on the message first: until the search lands
   * the unfiltered table is on screen, where "no data rows" would be false and
   * "no count" would be false too, but a check made too early proves nothing.
   */
  async assertSearchFoundNoUsers() {
    await expect(this.locators.noRecordsTableMessage).toBeVisible();
    await expect(this.locators.recordsFoundText).toHaveCount(0);
    await expect(this.locators.tableRows).toHaveCount(1); // the header row only
  }

  /** Clears the user search (the list's Reset button). */
  async resetUserSearch() {
    await this.locators.resetButton.click();
  }

  /**
   * Asserts the search was reset: the username box is empty AND the list is
   * unfiltered again. "Unfiltered" is checked as "two or more records", never
   * as a number - the demo is shared and the total changes whenever anyone
   * adds or removes a user. It also cannot pass early: right after a search
   * the text still says "(1) Record Found", and this waits until it does not.
   */
  async assertUserSearchIsReset() {
    await expect(this.locators.searchUsernameInput).toHaveValue("");
    // The page text has a leading space (" (33) Records Found") and a regex
    // match, unlike a string match, does not trim it - hence the \s*.
    await expect(this.locators.recordsFoundText).toHaveText(
      /^\s*\(([2-9]|\d{2,})\) Records Found\s*$/,
    );
  }
}
