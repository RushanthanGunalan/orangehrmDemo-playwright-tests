import { test } from "@playwright/test";
import PomManager from "../src/pages/PomManager";
import { getAdminCredentials } from "../src/config/credentials";

let pm: PomManager;

test.describe("Login Tests", () => {
  test.beforeEach(async ({ page }) => {
    pm = new PomManager(page);
  });

  test("TC_LOGIN_001: Verify Successful Login With Valid Credentials", async () => {
    const admin = getAdminCredentials();
    await pm.loginPage.navigate();
    await pm.loginPage.login(admin.username, admin.password);
    await pm.loginPage.assertLoginValidation("Dashboard");
  });
});
