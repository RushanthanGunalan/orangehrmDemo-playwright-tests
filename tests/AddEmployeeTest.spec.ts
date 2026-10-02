import { test } from "./fixtures";
import { getAdminCredentials } from "../src/config/credentials";

test.describe("Login Tests", () => {
  test.beforeEach(async ({ pm }) => {
    const admin = getAdminCredentials();
    await test.step("Setup: log in as admin and land on the Dashboard", async () => {
      await pm.loginPage.navigate();
      await pm.loginPage.login(admin.username, admin.password);
      await pm.loginPage.assertLoginValidation("Dashboard");
    });
  });

  // These tests ARE about the Add Employee form, so they create through the UI
  // (the API would skip the very thing under test). Their employees get a
  // tracked marker id from testData.employeeId(), and the fixture deletes
  // them when the test ends - even if it fails before the app answers.

  test("TC_CEF_001: Add Employee Without Middle Name", async ({ pm, testData }) => {
    console.log("TC_CEF_001");
    const { firstName, lastName } = testData.employeeName();
    const employeeId = testData.employeeId();

    await test.step("Act: open PIM and confirm the PIM page", async () => {
      await pm.pimPage.navigatetoPIMPage();
      await pm.pimPage.assertPIMPage();
      await pm.pimPage.validatePIMPagePath("PIM");
    });

    await test.step("Act: open the Add Employee form", async () => {
      await pm.pimPage.navigateToAddEmployee();
    });

    await test.step(`Act: fill "${firstName} ${lastName}" (no middle name) and save`, async () => {
      await pm.pimPage.addEmployee(firstName, lastName, null, employeeId);
      await pm.pimPage.saveEmployeeDetails();
      await pm.pimPage.waitForEmployeeSaved();
    });

    await test.step("Assert: the new employee's details show the entered name", async () => {
      await pm.pimPage.validateAddedEmployeeDetails(firstName, lastName);
    });
  });

  test("TC_CEF_002: Add Employee With Middle Name", async ({ pm, testData }) => {
    console.log("TC_CEF_002");
    const { firstName, middleName, lastName } = testData.employeeName();
    const employeeId = testData.employeeId();

    await test.step("Act: open PIM and confirm the PIM page", async () => {
      await pm.pimPage.navigatetoPIMPage();
      await pm.pimPage.assertPIMPage();
      await pm.pimPage.validatePIMPagePath("PIM");
    });

    await test.step("Act: open the Add Employee form", async () => {
      await pm.pimPage.navigateToAddEmployee();
    });

    await test.step(`Act: fill "${firstName} ${middleName} ${lastName}" and save`, async () => {
      await pm.pimPage.addEmployee(firstName, lastName, middleName, employeeId);
      await pm.pimPage.saveEmployeeDetails();
      await pm.pimPage.waitForEmployeeSaved();
    });

    await test.step("Assert: the new employee's details show the entered name", async () => {
      await pm.pimPage.validateAddedEmployeeDetails(firstName, lastName);
    });
  });

  test("TC_CEF_003: Create Employee With Enabled Login Credentials", async ({ pm, testData }) => {
    console.log("TC_CEF_003");
    // Unique data per test - a shared username across tests risks a
    // duplicate-username collision with whatever another test just created.
    const { firstName, middleName, lastName } = testData.employeeName();
    const employeeId = testData.employeeId();
    const userName = testData.username();
    const passWord = testData.password();

    await test.step("Act: open PIM and confirm the PIM page", async () => {
      await pm.pimPage.navigatetoPIMPage();
      await pm.pimPage.assertPIMPage();
      await pm.pimPage.validatePIMPagePath("PIM");
    });

    await test.step("Act: open the Add Employee form", async () => {
      await pm.pimPage.navigateToAddEmployee();
    });

    await test.step(`Act: fill the employee plus login "${userName}" (Enabled) and save`, async () => {
      await pm.pimPage.addEmployee(firstName, lastName, middleName, employeeId);
      await pm.pimPage.AddEmployeeLoginCredentials(userName, passWord);
      await pm.pimPage.DisableLoginCredentialStatus(false);
      await pm.pimPage.saveEmployeeDetails();
      await pm.pimPage.waitForEmployeeSaved();
    });

    await test.step(`Act: log out and log back in as "${userName}"`, async () => {
      await pm.commonActions.isLoggedOut();
      await pm.loginPage.login(userName, passWord);
    });

    await test.step("Assert: the profile shows the new employee's name", async () => {
      await pm.pimPage.assertCreatedEmployeeCredential(firstName, lastName);
    });
  });

  test("TC_CEF_004: Create Employee With Disabled Login Credentials", async ({ pm, testData }) => {
    console.log("TC_CEF_004");
    const { firstName, middleName, lastName } = testData.employeeName();
    const employeeId = testData.employeeId();
    const userName = testData.username();
    const passWord = testData.password();

    await test.step("Act: open PIM and confirm the PIM page", async () => {
      await pm.pimPage.navigatetoPIMPage();
      await pm.pimPage.assertPIMPage();
      await pm.pimPage.validatePIMPagePath("PIM");
    });

    await test.step("Act: open the Add Employee form", async () => {
      await pm.pimPage.navigateToAddEmployee();
    });

    await test.step(`Act: fill the employee plus login "${userName}" (Disabled) and save`, async () => {
      await pm.pimPage.addEmployee(firstName, lastName, middleName, employeeId);
      await pm.pimPage.AddEmployeeLoginCredentials(userName, passWord);
      await pm.pimPage.DisableLoginCredentialStatus(true);
      await pm.pimPage.saveEmployeeDetails();
      await pm.pimPage.waitForEmployeeSaved();
    });

    await test.step(`Act: log out and try to log in as "${userName}"`, async () => {
      await pm.commonActions.isLoggedOut();
      await pm.loginPage.login(userName, passWord);
    });

    await test.step('Assert: the login is rejected with "Account disabled"', async () => {
      await pm.pimPage.assertDisabledLogin("Account disabled");
    });
  });

  test("TC_CEF_005: Add Employee Shows Required Field Errors When Name Is Blank", async ({ pm }) => {
    console.log("TC_CEF_005");
    // No data - this test never fills the form, so it never creates an
    // employee and needs no cleanup. It only submits it blank and checks the
    // client-side validation fires.
    await test.step("Act: open PIM and confirm the PIM page", async () => {
      await pm.pimPage.navigatetoPIMPage();
      await pm.pimPage.validatePIMPagePath("PIM");
    });

    await test.step("Act: open the Add Employee form", async () => {
      await pm.pimPage.navigateToAddEmployee();
    });

    await test.step('Act + Assert: submit blank and see "Required" under First and Last Name', async () => {
      await pm.pimPage.assertRequiredFieldErrorsShown();
    });
  });

  test("TC_CEF_006: Cancel Add Employee Returns To Employee List", async ({ pm }) => {
    console.log("TC_CEF_006");
    // Also creates nothing - opens the Add Employee form, cancels out of
    // it, and confirms we land back on the Employee List.
    await test.step("Act: open PIM and confirm the PIM page", async () => {
      await pm.pimPage.navigatetoPIMPage();
      await pm.pimPage.validatePIMPagePath("PIM");
    });

    await test.step("Act: open the Add Employee form", async () => {
      await pm.pimPage.navigateToAddEmployee();
    });

    await test.step("Act: click Cancel", async () => {
      await pm.pimPage.cancelAddEmployee();
    });

    await test.step("Assert: back on the Employee List", async () => {
      await pm.pimPage.assertOnEmployeeList();
    });
  });
});
