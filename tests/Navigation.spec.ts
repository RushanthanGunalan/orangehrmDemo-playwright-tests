import { test } from "@playwright/test";
import PomManager from "../src/pages/PomManager";
import { getAdminCredentials } from "../src/config/credentials";

let pm: PomManager;

test.describe("Navigation To Specific Pages from Side Panel", () => {
  test.beforeEach(async ({ page }) => {
    const admin = getAdminCredentials();
    pm = new PomManager(page);
    await pm.loginPage.navigate();
    await pm.loginPage.login(admin.username, admin.password);
    await pm.loginPage.assertLoginValidation("Dashboard");
  });

  test("TC_NAV_001: Verify Navigation To Admin Page From Side Panel", async () => {
    await pm.adminPage.navigateToAdminPage();
    await pm.adminPage.assertAdminPage();
    await pm.adminPage.validateAdminPageIsLoaded("Admin");
  });
});
