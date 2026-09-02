import { test } from "@playwright/test";
import PomManager from "../src/pages/PomManager";
import { getAdminCredentials } from "../src/config/credentials";

let pm: PomManager;

test.describe("Login Tests", () => {
  test.beforeEach(async ({ page }) => {
    pm = new PomManager(page);
  });

  test("Logging in with Correct Credentials", async () => {
    const admin = getAdminCredentials();
    await pm.loginPage.navigate();
    await pm.loginPage.login(admin.username, admin.password);
    await pm.loginPage.assertLoginValidation("Dashboard");
  });
});
