import PomManager from "../pages/PomManager";
import { faker } from "@faker-js/faker";
import { expect, test } from "@playwright/test";
import CommonActions from "../utils/commonActions";
import PIMPage from "./../pages/PIMPage";
import LoginPage from "./../pages/LoginPage";

let pm;

test.describe("Login Tests", () => {
  test.beforeEach(async ({ page }) => {
    pm = new PomManager(page);
    await pm.loginPage.navigate();
    await pm.loginPage.login("Admin", "admin123");
    await pm.loginPage.assertLoginValidation("Dashboard");
  });

  test.afterEach(async ({ page }) => {
    await page.close();
  });

  const firstName = faker.person.fullName();
  const lastName = faker.person.lastName();
  const middleName = faker.person.middleName();
  const randomID = faker.string.alphanumeric(6);
  const userName = faker.internet.username();
  const passWord = faker.internet.password(7);

  test("Add Employee Details with optional Fields", async () => {
    await pm.pimPage.navigatetoPIMPage();
    await pm.pimPage.assertPIMPage();
    await pm.pimPage.validatePIMPagePath("PIM");
    await pm.pimPage.navigateToAddEmployee();
    await pm.pimPage.addEmployee(firstName, lastName, middleName, randomID);
    await pm.pimPage.saveEmployeeDetails();
    await pm.page.waitForTimeout(10000);
    await pm.pimPage.validateAddedEmployeeDetails(firstName, lastName);
  });

  test("Creating Employee with Login Credentials", async () => {
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

  test.only("Creating Employee with disabled Login Credentials", async () => {
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
