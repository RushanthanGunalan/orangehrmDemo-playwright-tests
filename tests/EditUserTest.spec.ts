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

  test("TC_UEF_002: Editing A User To A Username That Is Already Taken Is Rejected", async ({ pm, testData }) => {
    // Two users, both created through the API (this test is about EDITING).
    // The fixture deletes both employees afterwards, which removes both users.
    //
    // Behaviour verified live before writing this: on the edit form a taken
    // username shows "Already exists" as soon as it is typed - the same
    // wording as the Add User form - and typing the user's OWN username again
    // is not flagged. Save then stays on /admin/saveSystemUser/<id>, shows no
    // toast, and sends no update (only the validation request).
    const firstName = testData.employeeName();
    const secondName = testData.employeeName();

    const firstEmployee = await test.step(`Arrange: create employee "${firstName.firstName} ${firstName.lastName}" via the API`, async () => {
      return testData.createEmployee(firstName);
    });
    const secondEmployee = await test.step(`Arrange: create employee "${secondName.firstName} ${secondName.lastName}" via the API`, async () => {
      return testData.createEmployee(secondName);
    });
    const { username: takenUsername } = await test.step("Arrange: create a user for the first employee via the API", async () => {
      return testData.createUser(firstEmployee);
    });
    const { username: ownUsername } = await test.step("Arrange: create a user for the second employee via the API", async () => {
      return testData.createUser(secondEmployee);
    });
    const first = { username: takenUsername, role: "ESS", employeeName: `${firstEmployee.firstName} ${firstEmployee.lastName}`, status: "Enabled" };
    const second = { username: ownUsername, role: "ESS", employeeName: `${secondEmployee.firstName} ${secondEmployee.lastName}`, status: "Enabled" };

    await test.step(`Act: open Admin > User Management and search the second user "${ownUsername}"`, async () => {
      await pm.adminPage.navigateToAdminPage();
      await pm.adminPage.searchUserByUsername(ownUsername);
      await pm.adminPage.assertUserListed(second);
    });

    await test.step("Act: open the second user's edit form and wait for it to load", async () => {
      await pm.adminPage.openEditUser(ownUsername);
      await pm.adminPage.assertEditFormShows({ username: ownUsername, role: "ESS", status: "Enabled" });
    });

    await test.step(`Act: change the username to the FIRST user's "${takenUsername}"`, async () => {
      await pm.adminPage.setUsername(takenUsername);
    });

    await test.step('Assert: only Username shows "Already exists"; no other field errors', async () => {
      await pm.adminPage.assertOnlyFieldError("Username", "Already exists");
    });

    await test.step("Act: click Save", async () => {
      await pm.adminPage.saveUser();
    });

    await test.step("Assert: still on the edit form, the message is still there, no success toast", async () => {
      await pm.adminPage.assertStillOnEditUserForm();
      await pm.adminPage.assertOnlyFieldError("Username", "Already exists");
    });

    await test.step("Act: click Cancel to leave the edit form", async () => {
      await pm.adminPage.cancelEditUser();
      await pm.adminPage.assertOnUserList();
    });

    // assertUserListed waits for THIS username's row, so it cannot pass on the
    // previous search's "(1) Record Found" still being on screen.
    await test.step("Assert: the second user still has its ORIGINAL username", async () => {
      await pm.adminPage.searchUserByUsername(ownUsername);
      await pm.adminPage.assertUserListed(second);
    });

    // Exactly one record: had the rename gone through, two users would share it.
    await test.step("Assert: the taken username still belongs to the first user alone", async () => {
      await pm.adminPage.searchUserByUsername(takenUsername);
      await pm.adminPage.assertUserListed(first);
    });
  });
});
