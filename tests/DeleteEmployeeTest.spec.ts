import { test } from "./fixtures";
import { getAdminCredentials } from "../src/config/credentials";

test.describe("Delete Employee", () => {
  test.beforeEach(async ({ pm }) => {
    const admin = getAdminCredentials();
    await test.step("Setup: log in as admin and land on the Dashboard", async () => {
      await pm.loginPage.navigate();
      await pm.loginPage.login(admin.username, admin.password);
      await pm.loginPage.assertLoginValidation("Dashboard");
    });
  });

  test("TC_DEF_001: Delete Employee", async ({ pm, testData }) => {
    // The employee to delete is created through the API (this test is about
    // DELETING, not about the Add Employee form) and is always one this test
    // made itself: on a shared demo a "known" existing employee could belong
    // to someone else. The fixture's cleanup afterwards finds nothing left -
    // the UI delete below already removed it - which proves cleanup is safe
    // to run on data that is already gone.
    const name = testData.employeeName();

    const employee = await test.step(`Arrange: create employee "${name.firstName} ${name.lastName}" via the API`, async () => {
      return testData.createEmployee(name);
    });
    console.log("TC_DEF_001 deleting empNumber:", employee.empNumber);

    await test.step(`Act: find "${employee.lastName}" in the Employee List`, async () => {
      await pm.pimPage.navigatetoPIMPage();
      // Search by lastName alone (a single word) rather than the full
      // "firstName lastName" - see searchEmployeeByName()'s comment for why.
      await pm.pimPage.searchEmployeeByName(employee.lastName);
    });

    await test.step("Act: delete that employee and confirm the dialog", async () => {
      await pm.pimPage.deleteEmployee(employee.lastName);
      await pm.pimPage.confirmDelete();
    });

    await test.step('Assert: success toast "Successfully Deleted" appears', async () => {
      await pm.pimPage.assertDeleteSucceeded();
    });

    // Direct URL check rather than re-reading the Employee List - the list
    // showed a confusing stale record count immediately after a delete in
    // manual testing, while navigating straight to the (now gone)
    // employee's own URL gives an unambiguous "No Records Found".
    await test.step("Assert: the employee's own page now shows No Records Found", async () => {
      await pm.employeePersonalDetailsPage.assertEmployeeDoesNotExist(
        String(employee.empNumber),
      );
    });
  });
});
