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

  test("TC_UCF_002: Create Admin User With Disabled Status", async ({ pm, testData }) => {
    // Same flow as TC_UCF_001 with the OTHER role and status: this proves the
    // form handles both dropdown values, not just the ones the first case
    // happened to pick. Deliberately written out in full instead of sharing
    // code with TC_UCF_001, so each test reads top to bottom and can be
    // understood (or deleted) on its own.
    //
    // Note this creates an account with ADMIN privileges on a shared public
    // demo. It is created Disabled (it can't log in), has a random password,
    // and belongs to an employee the fixture deletes afterwards - deleting
    // that employee also removes this user (verified live for an
    // Admin-role, Disabled user, not just for ESS).
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

    await test.step(`Act: fill the form for user "${username}" (Admin, Disabled) and save`, async () => {
      await pm.adminPage.fillUserForm({
        role: "Admin",
        status: "Disabled",
        employeeSearchTerm: employee.lastName,
        username,
        password,
      });
      await pm.adminPage.saveUser();
    });

    await test.step('Assert: success toast "Successfully Saved" appears', async () => {
      await pm.adminPage.assertUserSaved();
    });

    await test.step(`Assert: user "${username}" is listed as Admin / Disabled`, async () => {
      await pm.adminPage.searchUserByUsername(username);
      await pm.adminPage.assertUserListed({
        username,
        role: "Admin",
        employeeName: `${employee.firstName} ${employee.lastName}`,
        status: "Disabled",
      });
    });
  });

  test("TC_UCF_003: Add User Shows Required Field Errors When Form Is Blank", async ({ pm }) => {
    // No data: this test never fills the form, so it creates no employee and
    // no user and has nothing to clean up (it does not use `testData` at all).
    //
    // Messages verified live before writing this: five fields say "Required",
    // and Confirm Password says "Passwords do not match" - not "Required", as
    // the test plan first assumed. See AdminPage.assertBlankFormErrors().
    await test.step("Act: open Admin > Add User form", async () => {
      await pm.adminPage.navigateToAdminPage();
      await pm.adminPage.navigateToAddUser();
    });

    // Proves the messages below are caused by Save, not already on screen.
    await test.step("Assert: the untouched form shows no validation messages", async () => {
      await pm.adminPage.assertNoFieldErrors();
    });

    await test.step("Act: click Save with every field empty", async () => {
      await pm.adminPage.saveUser();
    });

    await test.step('Assert: five fields show "Required" and Confirm Password shows "Passwords do not match"', async () => {
      await pm.adminPage.assertBlankFormErrors();
    });

    await test.step("Assert: still on the Add User form and no success toast (nothing was saved)", async () => {
      await pm.adminPage.assertStillOnAddUserForm();
    });
  });
});
