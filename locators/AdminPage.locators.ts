import { Page, Locator } from "@playwright/test";
import { sidebarNavLocators } from "./components/sidebarNav.locators";
import { toastLocators } from "./components/toast.locators";
import {
  inputGroupByLabel,
  selectByLabel,
  optionByName,
  autocompleteOptionByText,
  fieldErrorByLabel,
} from "./components/formField.locators";

export type AdminPageLocators = {
  adminMenuItem: Locator;
  breadcrumbHeading: Locator;

  // --- User Management list ---
  addButton: Locator;
  searchUsernameInput: Locator;
  searchButton: Locator;
  recordsFoundText: Locator;
  userRow: (username: string) => Locator;
  dataCellsInRow: (row: Locator) => Locator;

  // --- Add User form ---
  userRoleSelect: Locator;
  statusSelect: Locator;
  optionByName: (name: string) => Locator;
  employeeNameInput: Locator;
  employeeNameOption: (text: string) => Locator;
  usernameInput: Locator;
  passwordInput: Locator;
  confirmPasswordInput: Locator;
  saveButton: Locator;
  successToastMessage: Locator;
  /** The validation message under one field, found by that field's label. */
  fieldError: (labelText: string | RegExp) => Locator;
};

export function adminPageLocators(page: Page): AdminPageLocators {
  return {
    adminMenuItem: sidebarNavLocators(page).menuItemByName("Admin"),
    // Verified live: exactly 2 <h6> elements can exist on a given page here
    // (e.g. the Add Employee form has its own), so a generic role-based
    // heading locator would be ambiguous - this specific, purpose-built
    // class is actually the more reliable choice.
    breadcrumbHeading: page.locator(
      ".oxd-text.oxd-text--h6.oxd-topbar-header-breadcrumb-module",
    ),

    // --- User Management list ---

    // Not exact: the button's icon precedes its text, so the computed
    // accessible name is " Add" (leading space) - same quirk as PIM's "Add".
    addButton: page.getByRole("button", { name: "Add" }),
    // Same label-anchored selector as the Add User form's Username field -
    // that's fine, they're on different pages (the list and the form), but
    // wait for the right URL before using either (see AdminPage.ts).
    searchUsernameInput: inputGroupByLabel(page, "Username"),
    searchButton: page.getByRole("button", { name: "Search" }),
    // "(1) Record Found" / "(11) Records Found" - the count text changes
    // when a search filter lands, which makes it the signal to wait on:
    // the unfiltered table already has rows, so "a row exists" proves
    // nothing about whether the search has been applied yet.
    recordsFoundText: page.getByText(/\(\d+\) Records? Found/),
    // Verified live: table rows are role="row" and cells role="cell" with
    // clean accessible names, so no CSS classes are needed. The header row
    // never contains a username, so hasText can't match it.
    userRow: (username: string) =>
      page.getByRole("row").filter({ hasText: username }),
    // The row's four visible data columns (Username, User Role, Employee
    // Name, Status): every cell except the checkbox cell at the start and
    // the edit/delete-button cell at the end. Filtering those out by what
    // they contain avoids hard-coding column positions around the icons.
    dataCellsInRow: (row: Locator) =>
      row
        .getByRole("cell")
        .filter({ hasNot: page.getByRole("checkbox") })
        .filter({ hasNot: page.getByRole("button") }),

    // --- Add User form ---
    // Verified live: none of these inputs have a name/id, so they're found
    // by label text; User Role and Status are custom <div> dropdowns.

    userRoleSelect: selectByLabel(page, "User Role"),
    statusSelect: selectByLabel(page, "Status"),
    optionByName: (name: string) => optionByName(page, name),
    employeeNameInput: inputGroupByLabel(page, "Employee Name"),
    employeeNameOption: (text: string) => autocompleteOptionByText(page, text),
    usernameInput: inputGroupByLabel(page, "Username"),
    // Exact regex: "Password" is a substring of "Confirm Password".
    passwordInput: inputGroupByLabel(page, /^Password$/),
    confirmPasswordInput: inputGroupByLabel(page, "Confirm Password"),
    saveButton: page.getByRole("button", { name: "Save" }),
    successToastMessage: toastLocators(page).successMessage,
    fieldError: (labelText: string | RegExp) =>
      fieldErrorByLabel(page, labelText),
  };
}
