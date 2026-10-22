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

  test("TC_USF_002: Search For A Username That Does Not Exist Shows No Records", async ({ pm, testData }) => {
    // No data: nothing is created, so nothing needs cleaning up. The username
    // is only GENERATED (qar_ + random characters) and is not saved anywhere,
    // so no user can have it.
    //
    // Behaviour verified live before writing this: the table shows its own
    // "No Records Found" (plus a fading info toast with the same words), the
    // "(N) Records Found" count disappears, and only the header row is left.
    // Searching "Admi" (part of the existing "Admin") also finds nothing -
    // the username search is an exact match, not "starts with" - which was
    // only observed here, not asserted.
    const username = testData.username();

    await test.step("Act: open Admin > User Management", async () => {
      await pm.adminPage.navigateToAdminPage();
    });

    await test.step(`Act: search for the username "${username}", which no user has`, async () => {
      await pm.adminPage.searchUserByUsername(username);
    });

    await test.step('Assert: the table says "No Records Found" and no user row is shown', async () => {
      await pm.adminPage.assertSearchFoundNoUsers();
    });
  });
});
