import { test } from "./fixtures";
import { getAdminCredentials } from "../src/config/credentials";

test.describe("Edit Employee", () => {
  test.beforeEach(async ({ pm }) => {
    const admin = getAdminCredentials();
    await test.step("Setup: log in as admin and land on the Dashboard", async () => {
      await pm.loginPage.navigate();
      await pm.loginPage.login(admin.username, admin.password);
      await pm.loginPage.assertLoginValidation("Dashboard");
    });
  });

  test("TC_EEF_001: Edit Employee Name Fields", async ({ pm, testData }) => {
    // The employee to edit is created through the API: this test is about
    // EDITING, so it must not depend on the Add Employee form working. It is
    // self-created (never a seeded record that someone else may be using) and
    // the fixture deletes it afterwards.
    const name = testData.employeeName();
    const empDetails = pm.employeePersonalDetailsPage;

    const employee = await test.step(`Arrange: create employee "${name.firstName} ${name.lastName}" via the API`, async () => {
      return testData.createEmployee(name);
    });
    const editedFirstName = `Edited${employee.firstName}`;
    const editedLastName = `Edited${employee.lastName}`;
    console.log("TC_EEF_001 editing empNumber:", employee.empNumber);

    await test.step("Act: open the employee's Personal Details page", async () => {
      await empDetails.navigateToEmployee(String(employee.empNumber));
    });

    await test.step(`Act: change the name to "${editedFirstName} ${editedLastName}" and save`, async () => {
      await empDetails.editName(editedFirstName, editedLastName);
      await empDetails.save();
    });

    await test.step('Assert: success toast "Successfully Updated" appears', async () => {
      await empDetails.assertSaveSucceeded();
    });

    // Reload and re-check from a fresh page load - proves the edit
    // actually persisted server-side, not just in client state.
    await test.step("Assert: after a reload the page shows the edited name", async () => {
      await empDetails.assertEmployeeNameIs(
        `${editedFirstName} ${editedLastName}`,
      );
    });
  });
});
