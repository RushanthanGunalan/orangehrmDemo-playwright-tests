import { test } from "./fixtures";
import { getAdminCredentials } from "../src/config/credentials";

test.describe("Navigation To Specific Pages from Side Panel", () => {
  test.beforeEach(async ({ pm }) => {
    const admin = getAdminCredentials();
    await test.step("Setup: log in as admin and land on the Dashboard", async () => {
      await pm.loginPage.navigate();
      await pm.loginPage.login(admin.username, admin.password);
      await pm.loginPage.assertLoginValidation("Dashboard");
    });
  });

  test("TC_NAV_001: Verify Navigation To Admin Page From Side Panel", async ({ pm }) => {
    await test.step("Act: click Admin in the side panel", async () => {
      await pm.adminPage.navigateToAdminPage();
    });

    await test.step("Assert: the Admin page is loaded (breadcrumb and URL)", async () => {
      await pm.adminPage.assertAdminPage();
      await pm.adminPage.validateAdminPageIsLoaded("Admin");
    });
  });
});
