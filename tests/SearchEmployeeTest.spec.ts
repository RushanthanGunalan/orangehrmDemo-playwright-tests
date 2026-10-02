import { test } from "./fixtures";
import { getAdminCredentials } from "../src/config/credentials";

test.describe("Search Employee", () => {
  test.beforeEach(async ({ pm }) => {
    const admin = getAdminCredentials();
    await test.step("Setup: log in as admin and land on the Dashboard", async () => {
      await pm.loginPage.navigate();
      await pm.loginPage.login(admin.username, admin.password);
      await pm.loginPage.assertLoginValidation("Dashboard");
    });
  });

  test("TC_SEF_001: Search Employee By Name Shows Matching Result", async ({ pm, testData }) => {
    // The employee to find is created through the API (this test is about
    // SEARCH, not the Add Employee form) rather than relying on a seeded one
    // - the Employee List is shared with everyone using this public demo, so
    // a "known" name could already be gone or duplicated. The generated last
    // name carries a random suffix (see TestData.employeeName), which is what
    // makes "exactly one match" a fair assertion on a list with hundreds of
    // other people's employees. The fixture deletes the employee afterwards,
    // so no clean-up step is needed here.
    const name = testData.employeeName();

    const employee = await test.step(`Arrange: create employee "${name.firstName} ${name.lastName}" via the API`, async () => {
      return testData.createEmployee(name);
    });
    console.log("TC_SEF_001 searching for empNumber:", employee.empNumber);

    await test.step(`Act: search the Employee List for "${employee.lastName}"`, async () => {
      await pm.pimPage.navigatetoPIMPage();
      // Search by lastName alone (a single word) - see searchEmployeeByName()
      // for why the full "first last" string is unreliable here.
      await pm.pimPage.searchEmployeeByName(employee.lastName);
    });

    await test.step("Assert: exactly one matching row is shown", async () => {
      await pm.pimPage.assertEmployeeFoundInList(employee.lastName);
    });
  });
});
