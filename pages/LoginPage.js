import CommonActions from "../utils/commonActions";
import { expect, test } from "@playwright/test";

export default class LoginPage {
  constructor(page) {
    this.actions = new CommonActions(page);
  }

  async navigate() {
    await this.actions.navigate(
      "https://opensource-demo.orangehrmlive.com/web/index.php/auth/login"
    );
  }

  async login(userName, passWord) {
    await this.actions.fill("input[placeholder='Username']", userName);
    await this.actions.fill("input[placeholder='Password']", passWord);
    await this.actions.click("button[type='submit']");
  }

  async getMessage() {
    return await this.actions.getText(
      ".oxd-text.oxd-text--h6.oxd-topbar-header-breadcrumb-module"
    );
  }

  async assertLoginValidation(passedMessage) {
    const message = await this.getMessage();
    expect(message).toContain(passedMessage);
  }
}
