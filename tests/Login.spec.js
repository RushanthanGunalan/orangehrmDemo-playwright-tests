import { beforeEach } from "node:test";
import { expect, test } from "@playwright/test";
import PomManager from "../pages/PomManager";
import LoginPage from "./../pages/LoginPage";

let pm;

test.describe("Login Tests", () => {
  test.beforeEach(async ({ page }) => {
    pm = new PomManager(page);
  });

  test.afterEach(async ({ page }) => {
    await page.close();
  });

  test("Logging in with Correct Credentials", async () => {
    await pm.loginPage.navigate();
    await pm.loginPage.login("Admin", "admin123");
    await pm.loginPage.assertLoginValidation("Dashboard");
  });
});
