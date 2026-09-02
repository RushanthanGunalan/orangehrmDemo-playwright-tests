import { Page, expect } from "@playwright/test";
import CommonActions from "../../utils/commonActions";
import { config } from "../config/config";
import {
  loginPageLocators,
  LoginPageLocators,
} from "../../locators/LoginPage.locators";

export default class LoginPage {
  readonly actions: CommonActions;
  readonly locators: LoginPageLocators;

  constructor(page: Page) {
    this.actions = new CommonActions(page);
    this.locators = loginPageLocators(page);
  }

  async navigate() {
    await this.actions.navigate(config.baseUrl);
  }

  async login(userName: string, passWord: string) {
    await this.locators.usernameInput.fill(userName);
    await this.locators.passwordInput.fill(passWord);
    await this.locators.submitButton.click();
  }

  async getMessage() {
    return await this.actions.getText(this.locators.breadcrumbHeading);
  }

  async assertLoginValidation(passedMessage: string) {
    const message = await this.getMessage();
    expect(message).toContain(passedMessage);
  }
}
