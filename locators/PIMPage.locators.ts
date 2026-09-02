import { Page, Locator } from "@playwright/test";
import { sidebarNavLocators } from "./components/sidebarNav.locators";
import { topBarLocators } from "./components/topBar.locators";

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
  };
}
