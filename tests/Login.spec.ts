import { test } from "./fixtures";
import { getAdminCredentials } from "../src/config/credentials";

test.describe("Login Tests", () => {
  test("TC_LOGIN_001: Verify Successful Login With Valid Credentials", async ({ pm }) => {
    const admin = getAdminCredentials();

    await test.step("Act: open the login page", async () => {
      await pm.loginPage.navigate();
    });

    await test.step("Act: log in with the admin credentials", async () => {
      await pm.loginPage.login(admin.username, admin.password);
    });

    await test.step("Assert: the Dashboard is shown", async () => {
      await pm.loginPage.assertLoginValidation("Dashboard");
    });
  });
});
