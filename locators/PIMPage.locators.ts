import { Page, Locator } from "@playwright/test";
import { sidebarNavLocators } from "./components/sidebarNav.locators";
import { topBarLocators } from "./components/topBar.locators";
import { toastLocators } from "./components/toast.locators";

/**
 * The Add Employee form's inputs have no name/id/placeholder at all
 * (verified live) except firstName/lastName/middleName - each one only has
 * a nearby <label> for a human to read. This anchors on that label text
 * instead of position, which is what the old nth-child chain was really
 * trying (and failing) to do.
 */
function inputGroupByLabel(page: Page, labelText: string | RegExp): Locator {
  return page
    .locator(".oxd-input-group")
    .filter({ has: page.locator("label", { hasText: labelText }) })
    .locator("input");
}

export type PIMPageLocators = {
  breadcrumbHeading: Locator;
  addButton: Locator;
  firstNameInput: Locator;
  lastNameInput: Locator;
  middleNameInput: Locator;
  employeeIdInput: Locator;
  submitButton: Locator;
  addedEmployeeHeading: Locator;
  loginDetailsToggle: Locator;
  loginUsernameInput: Locator;
  loginPasswordInput: Locator;
  loginConfirmPasswordInput: Locator;
  disabledStatusLabel: Locator;
  enabledStatusLabel: Locator;
  profileName: Locator;
  loginErrorMessage: Locator;
  pimMenuItem: Locator;
  employeeNameSearchInput: Locator;
  autocompleteOptionByText: (name: string) => Locator;
  searchButton: Locator;
  rowByEmployeeName: (fullName: string) => Locator;
  deleteButtonInRow: (row: Locator) => Locator;
  confirmDeleteDialog: Locator;
  confirmDeleteButton: Locator;
  cancelDeleteButton: Locator;
  deleteSuccessToastMessage: Locator;
};

export function pimPageLocators(page: Page): PIMPageLocators {
  return {
    breadcrumbHeading: page.locator(
      ".oxd-text.oxd-text--h6.oxd-topbar-header-breadcrumb-module",
    ),
    // Verified live: the only button with accessible name "Add" on the PIM
    // Employee List page - role-based, no dependency on the exact class
    // string (the old selector broke on any class reordering/addition).
    // Not exact: the button's icon precedes the text in the DOM, so its
    // real computed accessible name is " Add" (leading space) - confirmed
    // by an actual failed run, not just reasoning about the markup.
    addButton: page.getByRole("button", { name: "Add" }),
    // Verified live: real name="firstName"/"lastName"/"middleName" form
    // attributes - more stable than placeholder display text.
    firstNameInput: page.locator("input[name='firstName']"),
    lastNameInput: page.locator("input[name='lastName']"),
    middleNameInput: page.locator("input[name='middleName']"),
    // Verified live: this input has no name/id/placeholder whatsoever -
    // the nearby "Employee Id" label is the only stable hook available.
    employeeIdInput: inputGroupByLabel(page, "Employee Id"),
    submitButton: page.locator("button[type='submit']"),
    addedEmployeeHeading: page.locator(".oxd-text.oxd-text--h6.--strong"),
    // Verified live: the only switch on this form.
    loginDetailsToggle: page.locator("div.oxd-switch-wrapper"),
    // Verified live: none of the three fields below (username, password,
    // confirm password) have a name/id/placeholder either - same
    // label-anchoring approach as employeeIdInput. Password needs an
    // exact-match regex, not a plain substring, since "Password" is itself
    // a substring of "Confirm Password" - a plain hasText: "Password"
    // would match both input groups and make the locator ambiguous.
    loginUsernameInput: inputGroupByLabel(page, "Username"),
    loginPasswordInput: inputGroupByLabel(page, /^Password$/),
    loginConfirmPasswordInput: inputGroupByLabel(page, "Confirm Password"),
    disabledStatusLabel: page.locator("//label[normalize-space()='Disabled']"),
    enabledStatusLabel: page.locator("//label[normalize-space()='Enabled']"),
    // Same element as topBar.locators.ts's profileDropdown - reuse it
    // rather than maintaining the same selector in two places.
    profileName: topBarLocators(page).profileDropdown,
    loginErrorMessage: page.locator(
      ".oxd-text.oxd-text--p.oxd-alert-content-text",
    ),
    pimMenuItem: sidebarNavLocators(page).menuItemByName("PIM"),

    // --- Employee List search + delete (verified live) ---

    // Verified live via an actual failed run: "Type for hints..." isn't
    // unique - the Employee List filter panel has both an "Employee Name"
    // and a "Supervisor Name" autocomplete sharing that exact placeholder.
    // Same label-anchoring approach as the Add Employee form's unlabeled
    // fields (same .oxd-input-group wrapper structure, confirmed live).
    employeeNameSearchInput: inputGroupByLabel(page, "Employee Name"),
    autocompleteOptionByText: (name: string) =>
      page.locator(".oxd-autocomplete-option", { hasText: name }),
    // Not exact: same icon-before-text pattern as "Add"/"Login" - this one
    // has no icon (verified live, plain text "Search"), but kept non-exact
    // for consistency and because it costs nothing here.
    searchButton: page.getByRole("button", { name: "Search" }),
    // Scoping to a specific employee's row before clicking its delete icon
    // matters a lot here: this Employee List is shared with everyone using
    // this public demo, so searching by name first and confirming exactly
    // one row matches is what keeps this from ever deleting the wrong
    // employee.
    rowByEmployeeName: (fullName: string) =>
      page.locator(".oxd-table-body .oxd-table-row", { hasText: fullName }),
    // Verified live: the row's delete icon button has NO accessible name at
    // all (no aria-label, no title, no visible text) - a real gap in the
    // app's own accessibility, not something a better attribute can fix.
    // The icon's class (Bootstrap Icons' "trash", a purpose-built name, not
    // a generic/reused one) is the only stable hook available.
    deleteButtonInRow: (row: Locator) => row.locator("button:has(i.bi-trash)"),
    confirmDeleteDialog: page.locator(".oxd-dialog-container-default"),
    // Verified live: same icon-before-text pattern as "Add" - real <i>
    // element before " Yes, Delete ", so the computed accessible name has
    // a leading space. Not exact, learned from the "Add" button rather
    // than rediscovering it via another failed run.
    confirmDeleteButton: page.getByRole("button", { name: "Yes, Delete" }),
    cancelDeleteButton: page.getByRole("button", { name: "No, Cancel" }),
    deleteSuccessToastMessage: toastLocators(page).successMessage,
  };
}
