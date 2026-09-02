import PomManager from "../src/pages/PomManager";
import { faker } from "@faker-js/faker";
import { test } from "@playwright/test";
import { getAdminCredentials } from "../src/config/credentials";

let pm: PomManager;

test.describe("Login Tests", () => {
  test.beforeEach(async ({ page }) => {
    const admin = getAdminCredentials();
    pm = new PomManager(page);
    await pm.loginPage.navigate();
    await pm.loginPage.login(admin.username, admin.password);
    await pm.loginPage.assertLoginValidation("Dashboard");
  });

  test("TC_CEF_001: Add Employee Without Middle Name", async () => {
    console.log("TC_CEF_001");
    const firstName = faker.person.fullName();
    const lastName = faker.person.lastName();
    const randomID = faker.string.alphanumeric(3);

    await pm.pimPage.navigatetoPIMPage();
    await pm.pimPage.assertPIMPage();
    await pm.pimPage.validatePIMPagePath("PIM");
    await pm.pimPage.navigateToAddEmployee();
    await pm.pimPage.addEmployee(firstName, lastName, null, randomID);
    await pm.pimPage.saveEmployeeDetails();
    await pm.page.waitForTimeout(10000);
    await pm.pimPage.validateAddedEmployeeDetails(firstName, lastName);
  });

  test("TC_CEF_002: Add Employee With Middle Name", async () => {
    console.log("TC_CEF_002");
    const firstName = faker.person.fullName();
    const lastName = faker.person.lastName();
    const middleName = faker.person.middleName();
    const randomID = faker.string.alphanumeric(3);

    await pm.pimPage.navigatetoPIMPage();
    await pm.pimPage.assertPIMPage();
    await pm.pimPage.validatePIMPagePath("PIM");
    await pm.pimPage.navigateToAddEmployee();
    await pm.pimPage.addEmployee(firstName, lastName, middleName, randomID);
    await pm.pimPage.saveEmployeeDetails();
    await pm.page.waitForTimeout(10000);
    await pm.pimPage.validateAddedEmployeeDetails(firstName, lastName);
  });

  test("TC_CEF_003: Create Employee With Enabled Login Credentials", async () => {
    console.log("TC_CEF_003");
    // Unique data per test - a shared username across tests risks a
    // duplicate-username collision with whatever another test in this same
    // file just created (this collision is exactly what was causing the
    // next test to log into THIS test's account instead of its own).
    const firstName = faker.person.fullName();
    const lastName = faker.person.lastName();
    const middleName = faker.person.middleName();
    const randomID = faker.string.alphanumeric(3);
    const userName = faker.internet.username();
    const passWord = faker.internet.password({ length: 7 });

    await pm.pimPage.navigatetoPIMPage();
    await pm.pimPage.assertPIMPage();
    await pm.pimPage.validatePIMPagePath("PIM");
    await pm.pimPage.navigateToAddEmployee();
    await pm.pimPage.addEmployee(firstName, lastName, middleName, randomID);
    await pm.pimPage.AddEmployeeLoginCredentials(userName, passWord);
    await pm.pimPage.DisableLoginCredentialStatus(false);
    await pm.pimPage.saveEmployeeDetails();
    await pm.page.waitForTimeout(5000);
    await pm.commonActions.isLoggedOut();
    await pm.loginPage.login(userName, passWord);
    await pm.pimPage.assertCreatedEmployeeCredential(firstName, lastName);
  });

  test("TC_CEF_004: Create Employee With Disabled Login Credentials", async () => {
    console.log("TC_CEF_004");
    const firstName = faker.person.fullName();
    const lastName = faker.person.lastName();
    const middleName = faker.person.middleName();
    const randomID = faker.string.alphanumeric(3);
    const userName = faker.internet.username();
    const passWord = faker.internet.password({ length: 7 });

    await pm.pimPage.navigatetoPIMPage();
    await pm.pimPage.assertPIMPage();
    await pm.pimPage.validatePIMPagePath("PIM");
    await pm.pimPage.navigateToAddEmployee();
    await pm.pimPage.addEmployee(firstName, lastName, middleName, randomID);
    await pm.pimPage.AddEmployeeLoginCredentials(userName, passWord);
    await pm.pimPage.DisableLoginCredentialStatus(true);
    await pm.pimPage.saveEmployeeDetails();
    await pm.page.waitForTimeout(5000);
    await pm.commonActions.isLoggedOut();
    await pm.loginPage.login(userName, passWord);
    await pm.pimPage.assertDisabledLogin("Account disabled");
  });
});
