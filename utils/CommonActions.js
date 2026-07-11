import { expect } from "@playwright/test";

export default class CommonActions {
  constructor(page) {
    this.page = page;
    // Default time to wait for an element to become visible at a checkpoint.
    this.defaultTimeout = 30000;
  }

  async navigate(url) {
    await this.page.goto(url);
  }

  // Web-first assertion: auto-retries until the element is visible or times out.
  // Use at read/verify checkpoints; actions below already auto-wait.
  async waitForVisible(selector) {
    await expect(this.page.locator(selector).first()).toBeVisible({
      timeout: this.defaultTimeout,
    });
  }

  async navigateSidePanel(SidePanelText) {
    // click() auto-waits for the element to be actionable.
    await this.page
      .locator("span.oxd-text.oxd-text--span.oxd-main-menu-item--name")
      .filter({ hasText: SidePanelText })
      .click();
  }

  async click(selector) {
    await this.page.click(selector);
  }

  async fill(selector, text) {
    await this.page.fill(selector, text);
  }

  async getText(selector) {
    // Ensure the element has loaded before reading its (non-retrying) content.
    await this.waitForVisible(selector);
    return await this.page.textContent(selector);
  }

  async isChecked(selector) {
    await this.waitForVisible(selector);
    return await this.page.isChecked(selector);
  }

  async isLoggedOut() {
    await this.page.click(".oxd-userdropdown-name");
    await this.page.locator("//a[normalize-space()='Logout']").click();
    await this.getText("//h5[normalize-space()='Login']");
  }
}
