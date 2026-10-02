import { test } from "./fixtures";
import { getAdminCredentials } from "../src/config/credentials";

test.describe("Add User", () => {
  test.beforeEach(async ({ pm }) => {
    const admin = getAdminCredentials();
    await test.step("Setup: log in as admin and land on the Dashboard", async () => {
      await pm.loginPage.navigate();
      await pm.loginPage.login(admin.username, admin.password);
      await pm.loginPage.assertLoginValidation("Dashboard");
    });
  });

  test("TC_UCF_001: Create ESS User With Enabled Status", async ({ pm, testData }) => {
    // A user must be attached to an existing employee, and this is a shared
    // public demo - so we create our OWN employee rather than borrow a seeded
    // one that someone else may have renamed or deleted. It is created through
    // the API because this test is about ADDING A USER, not the Add Employee
    // form. The fixture deletes the employee afterwards, and deleting an
    // employee also removes their user (verified live) - so the user this
    // test creates needs no clean-up of its own.
    //
    // Test data is generated up front, outside the steps, so the step titles
    // below can name the real values - when a run fails, the report says
    // which employee/username to look for in the app.
    const name = testData.employeeName();
    const username = testData.username();
    const password = testData.password();

    const employee = await test.step(`Arrange: create employee "${name.firstName} ${name.lastName}" via the API`, async () => {
      return testData.createEmployee(name);
    });

    await test.step("Act: open Admin > Add User form", async () => {
      await pm.adminPage.navigateToAdminPage();
      await pm.adminPage.navigateToAddUser();
    });

    await test.step(`Act: fill the form for user "${username}" (ESS, Enabled) and save`, async () => {
      await pm.adminPage.fillUserForm({
        role: "ESS",
        status: "Enabled",
        employeeSearchTerm: employee.lastName,
        username,
        password,
      });
      await pm.adminPage.saveUser();
    });

    // The app confirms the save AND the user is really in the list with the
    // values we entered - a toast alone doesn't prove it persisted.
    await test.step('Assert: success toast "Successfully Saved" appears', async () => {
      await pm.adminPage.assertUserSaved();
    });

    await test.step(`Assert: user "${username}" is listed with the entered values`, async () => {
      await pm.adminPage.searchUserByUsername(username);
      await pm.adminPage.assertUserListed({
        username,
        role: "ESS",
        employeeName: `${employee.firstName} ${employee.lastName}`,
        status: "Enabled",
      });
    });
  });
});
