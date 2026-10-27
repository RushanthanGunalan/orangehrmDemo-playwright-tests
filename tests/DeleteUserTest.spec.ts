import { test, expect } from "./fixtures";
import { getAdminCredentials } from "../src/config/credentials";

test.describe("Delete User", () => {
  test.beforeEach(async ({ pm }) => {
    const admin = getAdminCredentials();
    await test.step("Setup: log in as admin and land on the Dashboard", async () => {
      await pm.loginPage.navigate();
      await pm.loginPage.login(admin.username, admin.password);
      await pm.loginPage.assertLoginValidation("Dashboard");
    });
  });

  test("TC_UDF_001: Delete A User From The List", async ({ pm, testData }) => {
    // The user being deleted is created through the API (this test is about
    // DELETING). It is the test's own user, so this deletes nothing that
    // belongs to anyone else. The fixture still deletes the employee at the
    // end - which is what makes the last check below matter: deleting a user
    // must leave its employee alone.
    //
    // Behaviour verified live before writing this: the row's trash button
    // opens a role="dialog" ("Are you Sure? The selected record will be
    // permanently deleted...") with "No, Cancel" and "Yes, Delete"; Yes sends
    // one DELETE, shows "Successfully Deleted", stays on the list (no
    // redirect) and the list refreshes itself without the row.
    const name = testData.employeeName();

    const employee = await test.step(`Arrange: create employee "${name.firstName} ${name.lastName}" via the API`, async () => {
      return testData.createEmployee(name);
    });
    const { username } = await test.step("Arrange: create an ESS / Enabled user for it via the API", async () => {
      return testData.createUser(employee);
    });

    // The starting point: proves it is the DELETE that removes the user.
    await test.step(`Act: open Admin > User Management and search "${username}"`, async () => {
      await pm.adminPage.navigateToAdminPage();
      await pm.adminPage.searchUserByUsername(username);
    });
    await test.step("Assert: the user is listed (ESS / Enabled)", async () => {
      await pm.adminPage.assertUserListed({
        username,
        role: "ESS",
        employeeName: `${employee.firstName} ${employee.lastName}`,
        status: "Enabled",
      });
    });

    await test.step("Act: click the row's delete button", async () => {
      await pm.adminPage.openDeleteConfirmation(username);
    });

    await test.step('Act: confirm with "Yes, Delete"', async () => {
      await pm.adminPage.confirmDelete();
    });

    await test.step('Assert: the toast "Successfully Deleted" appears and the dialog has closed', async () => {
      await pm.adminPage.assertUserDeleted();
    });

    // The list refreshes itself after a delete and keeps the username filter,
    // so this waits for the row to go and "No Records Found" to appear.
    await test.step("Assert: the list no longer shows the user", async () => {
      await pm.adminPage.assertUserNotListed(username);
    });

    // A fresh search, so this does not rest on the page's own refresh alone.
    await test.step(`Assert: searching "${username}" again still finds no user`, async () => {
      await pm.adminPage.searchUserByUsername(username);
      await pm.adminPage.assertUserNotListed(username);
    });

    await test.step("Assert: the employee still exists (only the user was deleted)", async () => {
      expect(await testData.employeeExists(employee), "the employee should have survived deleting its user").toBe(true);
    });
  });
});
