import { Page, Locator, expect } from "@playwright/test";
import {
  sidebarNavLocators,
  SidebarNavLocators,
} from "../locators/components/sidebarNav.locators";
import {
  topBarLocators,
  TopBarLocators,
} from "../locators/components/topBar.locators";

/**
 * Shared, reusable interaction wrappers - operates on Locator objects
 * (from locators/*.locators.ts) rather than raw selector strings, so every
 * selector in the suite has exactly one home.
 */
export default class CommonActions {
  readonly page: Page;
  readonly sidebarNav: SidebarNavLocators;
  readonly topBar: TopBarLocators;
  // Default time to wait for an element to become visible at a checkpoint.
  readonly defaultTimeout = 30000;

  constructor(page: Page) {
    this.page = page;
    this.sidebarNav = sidebarNavLocators(page);
    this.topBar = topBarLocators(page);
  }

  async navigate(url: string) {
    await this.page.goto(url);
  }

  // Web-first assertion: auto-retries until the element is visible or times out.
  // Use at read/verify checkpoints; actions below already auto-wait.
  async waitForVisible(locator: Locator) {
    await expect(locator.first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  async navigateSidePanel(sidePanelText: string) {
    // click() auto-waits for the element to be actionable.
    await this.sidebarNav.menuItemByName(sidePanelText).click();
  }

  async getText(locator: Locator) {
    // Ensure the element has loaded before reading its (non-retrying) content.
    await this.waitForVisible(locator);
    return await locator.textContent();
  }

  async isChecked(locator: Locator) {
    await this.waitForVisible(locator);
    return await locator.isChecked();
  }

  async isLoggedOut() {
    await this.topBar.profileDropdown.click();
    await this.topBar.logoutLink.click();
    await this.getText(this.topBar.loginHeading);
  }
}
