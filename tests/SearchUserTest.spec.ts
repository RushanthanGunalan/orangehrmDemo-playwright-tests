import { test } from "./fixtures";
import { getAdminCredentials } from "../src/config/credentials";

test.describe("Search User", () => {
  test.beforeEach(async ({ pm }) => {
    const admin = getAdminCredentials();
    await test.step("Setup: log in as admin and land on the Dashboard", async () => {
      await pm.loginPage.navigate();
      await pm.loginPage.login(admin.username, admin.password);
      await pm.loginPage.assertLoginValidation("Dashboard");
    });
  });

  test("TC_USF_001: Search Users By Username Shows The Matching User And Reset Restores The List", async ({ pm, testData }) => {
    // The user being searched for is created through the API (this test is
    // about the SEARCH, not the Add User form). The fixture deletes the
    // employee afterwards, which also removes the user.
    //
    // Behaviour verified live before writing this: a search for one username
    // gives "(1) Record Found" with that single row; Reset empties the search
    // box and brings the full list back (33 users on the day checked). The
    // total is shared with everyone using the demo, so it is never asserted -
    // only that it is more than one.
    const name = testData.employeeName();

    const employee = await test.step(`Arrange: create employee "${name.firstName} ${name.lastName}" via the API`, async () => {
      return testData.createEmployee(name);
    });
    const { username } = await test.step("Arrange: create an ESS / Enabled user for it via the API", async () => {
      return testData.createUser(employee);
    });

    await test.step("Act: open Admin > User Management", async () => {
      await pm.adminPage.navigateToAdminPage();
    });

    await test.step(`Act: search for the username "${username}"`, async () => {
      await pm.adminPage.searchUserByUsername(username);
    });

    await test.step("Assert: exactly one record is shown, with the user's values", async () => {
      await pm.adminPage.assertUserListed({
        username,
        role: "ESS",
        employeeName: `${employee.firstName} ${employee.lastName}`,
        status: "Enabled",
      });
    });

    await test.step("Act: click Reset", async () => {
      await pm.adminPage.resetUserSearch();
    });

    await test.step("Assert: the search box is empty and the list is no longer filtered", async () => {
      await pm.adminPage.assertUserSearchIsReset();
    });
  });
});
