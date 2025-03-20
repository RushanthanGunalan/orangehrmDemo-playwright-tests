export default class CommonActions {
  constructor(page) {
    this.page = page;
  }

  async navigate(url) {
    await this.page.goto(url);
  }

  async navigateSidePanel(SidePanelText) {
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
    return await this.page.textContent(selector);
  }

  async isChecked(selector) {
    return await this.page.isChecked(selector);
  }

  async isLoggedOut() {
    await this.page.click(".oxd-userdropdown-name");
    await this.page.locator("//a[normalize-space()='Logout']").click();
    await this.getText("//h5[normalize-space()='Login']");
  }
}
