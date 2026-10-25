import { test } from "./fixtures";
import { getAdminCredentials } from "../src/config/credentials";

test.describe("Edit User", () => {
  test.beforeEach(async ({ pm }) => {
    const admin = getAdminCredentials();
    await test.step("Setup: log in as admin and land on the Dashboard", async () => {
      await pm.loginPage.navigate();
      await pm.loginPage.login(admin.username, admin.password);
      await pm.loginPage.assertLoginValidation("Dashboard");
    });
  });

  test("TC_UEF_001: Edit User Status From Enabled To Disabled", async ({ pm, testData }) => {
    // The user being edited is created through the API (this test is about
    // EDITING, not the Add User form). The fixture deletes the employee
    // afterwards, which also removes the user.
    //
    // Behaviour verified live before writing this: the row's edit icon opens
    // /admin/saveSystemUser/<id> with the heading "Edit User"; the form opens
    // EMPTY and fills in about 3 seconds later; "Change Password ?" is
    // unchecked, so a status change needs no password; Save sends one PUT,
    // shows "Successfully Updated" and only a few seconds later redirects to
    // the list, where the row shows the new status and everything else
    // unchanged.
    const name = testData.employeeName();

    const employee = await test.step(`Arrange: create employee "${name.firstName} ${name.lastName}" via the API`, async () => {
      return testData.createEmployee(name);
    });
    const { username } = await test.step("Arrange: create an ESS / Enabled user for it via the API", async () => {
      return testData.createUser(employee);
    });
    const employeeName = `${employee.firstName} ${employee.lastName}`;

    await test.step(`Act: open Admin > User Management and search "${username}"`, async () => {
      await pm.adminPage.navigateToAdminPage();
      await pm.adminPage.searchUserByUsername(username);
    });

    // The starting point: proves the edit below is what changed the status.
    await test.step("Assert: the user starts as ESS / Enabled", async () => {
      await pm.adminPage.assertUserListed({ username, role: "ESS", employeeName, status: "Enabled" });
    });

    await test.step("Act: click the row's edit button", async () => {
      await pm.adminPage.openEditUser(username);
    });

    await test.step("Assert: the edit form has loaded the user's current values", async () => {
      await pm.adminPage.assertEditFormShows({ username, role: "ESS", status: "Enabled" });
    });

    await test.step("Act: change Status to Disabled and click Save", async () => {
      await pm.adminPage.setUserStatus("Disabled");
      await pm.adminPage.saveUser();
    });

    await test.step('Assert: the toast "Successfully Updated" appears', async () => {
      await pm.adminPage.assertUserUpdated();
    });

    await test.step(`Assert: searching "${username}" again shows Disabled, with everything else unchanged`, async () => {
      await pm.adminPage.searchUserByUsername(username);
      await pm.adminPage.assertUserListed({ username, role: "ESS", employeeName, status: "Disabled" });
    });
  });
});
