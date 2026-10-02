import PomManager from "../src/pages/PomManager";
import { faker } from "@faker-js/faker";
import { test } from "@playwright/test";
import { getAdminCredentials } from "../src/config/credentials";

let pm: PomManager;

test.describe("Add User", () => {
  test.beforeEach(async ({ page }) => {
    const admin = getAdminCredentials();
    pm = new PomManager(page);
    await test.step("Setup: log in as admin and land on the Dashboard", async () => {
      await pm.loginPage.navigate();
      await pm.loginPage.login(admin.username, admin.password);
      await pm.loginPage.assertLoginValidation("Dashboard");
    });
  });

  test("TC_UCF_001: Create ESS User With Enabled Status", async () => {
    // Test data is generated up front, outside the steps, so the step titles
    // below can name the real values - when a run fails, the report says
    // which employee/username to look for in the app.
    //
    // A user must be attached to an existing employee, and this is a shared
    // public demo - so we create our OWN employee rather than borrow a seeded
    // one that someone else may have renamed or deleted. The random suffix
    // makes the last name unique, so the autocomplete can only ever match
    // this employee.
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName() + faker.string.alpha(4);
    const randomID = faker.string.alphanumeric(3);
    // The username must be unique. The password must contain a digit (the
    // form shows "Your password must contain minimum 1 number" otherwise -
    // confirmed live), so build it rather than trusting
    // faker.internet.password() to include one. Other limits (minimum
    // lengths) are NOT verified yet - planned cases TC_UCF_004/005 cover them.
    const username = "u" + faker.string.alphanumeric(8);
    const password = "Aa1" + faker.string.alphanumeric(8);

    await test.step(`Arrange: create employee "${firstName} ${lastName}" in PIM`, async () => {
      await pm.pimPage.navigatetoPIMPage();
      await pm.pimPage.navigateToAddEmployee();
      await pm.pimPage.addEmployee(firstName, lastName, null, randomID);
      await pm.pimPage.saveEmployeeDetails();
      await pm.pimPage.waitForEmployeeSaved();
    });

    await test.step("Act: open Admin > Add User form", async () => {
      await pm.adminPage.navigateToAdminPage();
      await pm.adminPage.navigateToAddUser();
    });

    await test.step(`Act: fill the form for user "${username}" (ESS, Enabled) and save`, async () => {
      await pm.adminPage.fillUserForm({
        role: "ESS",
        status: "Enabled",
        employeeSearchTerm: lastName,
        username,
        password,
      });
      await pm.adminPage.saveUser();
    });

    // The app confirms the save AND the user is really in the list with the
    // values we entered - a toast alone doesn't prove it persisted.
    await test.step("Assert: success toast \"Successfully Saved\" appears", async () => {
      await pm.adminPage.assertUserSaved();
    });

    await test.step(`Assert: user "${username}" is listed with the entered values`, async () => {
      await pm.adminPage.searchUserByUsername(username);
      await pm.adminPage.assertUserListed({
        username,
        role: "ESS",
        employeeName: `${firstName} ${lastName}`,
        status: "Enabled",
      });
    });
  });
});
