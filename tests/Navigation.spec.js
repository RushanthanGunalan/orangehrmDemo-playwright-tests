import { expect, test } from "@playwright/test";
import PomManager from "../pages/PomManager";

let pm;

test.describe("Navigation To Specific Pages from Side Panel", () => {
  test.beforeEach(async ({ page }) => {
    pm = new PomManager(page);
    await pm.loginPage.navigate();
    await pm.loginPage.login("Admin", "admin123");
    await pm.loginPage.assertLoginValidation("Dashboard");
  });
  test("Navigating to Admin Page", async () => {
    await pm.adminPage.navigateToAdminPage();
    await pm.adminPage.assertAdminPage();
    await pm.adminPage.validateAdminPageIsLoaded("Admin");
  });
});
