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
}
