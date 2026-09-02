import { Page, Locator } from "@playwright/test";
import { sidebarNavLocators } from "./components/sidebarNav.locators";

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
    addButton: page.locator(
      "button[class='oxd-button oxd-button--medium oxd-button--secondary']",
    ),
    firstNameInput: page.locator("input[placeholder='First Name']"),
    lastNameInput: page.locator("input[placeholder='Last Name']"),
    middleNameInput: page.locator("input[placeholder='Middle Name']"),
    employeeIdInput: page.locator(
      "div[class='oxd-input-group oxd-input-field-bottom-space'] div input[class='oxd-input oxd-input--active']",
    ),
    submitButton: page.locator("button[type='submit']"),
    addedEmployeeHeading: page.locator(".oxd-text.oxd-text--h6.--strong"),
    loginDetailsToggle: page.locator("div.oxd-switch-wrapper"),
    /**
     * Brittle: a deep nth-child chain with no id/testid/placeholder to key
     * off - it's the only selector in this suite that isn't at least a
     * stable attribute or filtered text match. Kept exactly as-is (a
     * behavior change here needs verifying against the live app first),
     * flagged for whoever next touches this page - if the Add Employee
     * form's login-credentials username field ever gets a `name` or
     * `data-testid` attribute, replace this.
     */
    loginUsernameInput: page.locator(
      "body > div:nth-child(3) > div:nth-child(1) > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > form:nth-child(3) > div:nth-child(1) > div:nth-child(2) > div:nth-child(4) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > input:nth-child(1)",
    ),
    loginPasswordInput: page.locator(
      "div[class='oxd-grid-item oxd-grid-item--gutters user-password-cell'] div[class='oxd-input-group oxd-input-field-bottom-space'] div input[type='password']",
    ),
    loginConfirmPasswordInput: page.locator(
      "div[class='oxd-grid-item oxd-grid-item--gutters'] div[class='oxd-input-group oxd-input-field-bottom-space'] div input[type='password']",
    ),
    disabledStatusLabel: page.locator("//label[normalize-space()='Disabled']"),
    enabledStatusLabel: page.locator("//label[normalize-space()='Enabled']"),
    profileName: page.locator(".oxd-userdropdown-name"),
    loginErrorMessage: page.locator(
      ".oxd-text.oxd-text--p.oxd-alert-content-text",
    ),
    pimMenuItem: sidebarNavLocators(page).menuItemByName("PIM"),
  };
}
