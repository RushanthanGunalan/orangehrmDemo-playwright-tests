import { Page, Locator } from "@playwright/test";

/**
 * The Personal Details page an employee lands on after creation (or is
 * reached via /pim/viewPersonalDetails/empNumber/<n>). This is where an
 * existing employee's details are edited - a different page/form than the
 * Add Employee one, despite sharing the same firstName/lastName/middleName
 * field names.
 */
export type EmployeePersonalDetailsPageLocators = {
  employeeNameHeader: Locator;
  firstNameInput: Locator;
  middleNameInput: Locator;
  lastNameInput: Locator;
  saveButton: Locator;
  successToastMessage: Locator;
};

export function employeePersonalDetailsPageLocators(
  page: Page,
): EmployeePersonalDetailsPageLocators {
  // Verified live: this page has TWO <form> elements, each with its own
  // "Save" button (the name fields vs. the rest of Personal Details) -
  // scoping to the form that actually contains firstName is what makes
  // saveButton resolve to exactly one element instead of being ambiguous.
  const nameForm = page
    .locator("form")
    .filter({ has: page.locator("input[name='firstName']") });

  return {
    // Verified live: a purpose-built class showing the employee's current
    // full name. Confirmed it does NOT update reactively right after a
    // save - only after a reload/re-fetch - so it's useful for confirming
    // which employee's page loaded, not for confirming a save succeeded.
    employeeNameHeader: page.locator(".orangehrm-edit-employee-name"),
    firstNameInput: page.locator("input[name='firstName']"),
    middleNameInput: page.locator("input[name='middleName']"),
    lastNameInput: page.locator("input[name='lastName']"),
    // Not exact: same Vue-comment-node-before-text pattern as the Login
    // button (verified harmless there - comments don't affect the
    // computed accessible name, unlike the Add button's real <i> icon).
    saveButton: nameForm.getByRole("button", { name: "Save" }),
    // Verified live: the success toast's message-specific class, scoped to
    // the success-styled toast container so it can never accidentally
    // match an error toast's message text instead.
    successToastMessage: page.locator(
      ".oxd-toast--success .oxd-text--toast-message",
    ),
  };
}
