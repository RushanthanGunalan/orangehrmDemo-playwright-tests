import PomManager from "../src/pages/PomManager";
import { faker } from "@faker-js/faker";
import { test } from "@playwright/test";
import { getAdminCredentials } from "../src/config/credentials";

let pm: PomManager;

test.describe("Delete Employee", () => {
  test.beforeEach(async ({ page }) => {
    const admin = getAdminCredentials();
    pm = new PomManager(page);
    await pm.loginPage.navigate();
    await pm.loginPage.login(admin.username, admin.password);
    await pm.loginPage.assertLoginValidation("Dashboard");
  });

  test("TC_DEF_001: Delete Employee", async () => {
    // Create a fresh employee for this test to delete, rather than an
    // existing/seeded one - same reasoning as Edit Employee: this is a
    // public demo site shared with anyone, so a "known" existing employee
    // could already be gone, renamed, or in use by someone else. Deleting
    // only what this test itself created is always safe.
    const firstName = faker.person.fullName();
    const lastName = faker.person.lastName();
    const randomID = faker.string.alphanumeric(3);

    await pm.pimPage.navigatetoPIMPage();
    await pm.pimPage.navigateToAddEmployee();
    await pm.pimPage.addEmployee(firstName, lastName, null, randomID);
    await pm.pimPage.saveEmployeeDetails();

    // saveEmployeeDetails() only clicks submit and doesn't wait for the
    // resulting redirect itself - wait for the URL explicitly so
    // getEmpNumberFromUrl() below doesn't read a stale one.
    await pm.page.waitForURL(/empNumber\/\d+/, { timeout: 30000 });
    const empNumber = pm.employeePersonalDetailsPage.getEmpNumberFromUrl();
    console.log("TC_DEF_001 deleting empNumber:", empNumber);

    await pm.pimPage.navigatetoPIMPage();
    // Search by lastName alone (a single word) rather than the full
    // "firstName lastName" - see searchEmployeeByName()'s comment for why.
    await pm.pimPage.searchEmployeeByName(lastName);
    await pm.pimPage.deleteEmployee(lastName);
    await pm.pimPage.confirmDelete();
    await pm.pimPage.assertDeleteSucceeded();

    // Direct URL check rather than re-reading the Employee List - the list
    // showed a confusing stale record count immediately after a delete in
    // manual testing, while navigating straight to the (now gone)
    // employee's own URL gives an unambiguous "No Records Found".
    await pm.employeePersonalDetailsPage.assertEmployeeDoesNotExist(
      empNumber,
    );
  });
});
