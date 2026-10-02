import PomManager from "../src/pages/PomManager";
import { faker } from "@faker-js/faker";
import { test } from "@playwright/test";
import { getAdminCredentials } from "../src/config/credentials";

let pm: PomManager;

test.describe("Edit Employee", () => {
  test.beforeEach(async ({ page }) => {
    const admin = getAdminCredentials();
    pm = new PomManager(page);
    await test.step("Setup: log in as admin and land on the Dashboard", async () => {
      await pm.loginPage.navigate();
      await pm.loginPage.login(admin.username, admin.password);
      await pm.loginPage.assertLoginValidation("Dashboard");
    });
  });

  test("TC_EEF_001: Edit Employee Name Fields", async () => {
    // Create a fresh employee for this test to edit, rather than an
    // existing/seeded one - this is a public demo site shared with anyone,
    // so a "known" existing employee could be renamed, deleted, or edited
    // concurrently by someone else. Self-created data with a unique
    // per-run name has no such dependency and is safe to mutate freely.
    const firstName = faker.person.fullName();
    const lastName = faker.person.lastName();
    const randomID = faker.string.alphanumeric(3);
    const editedFirstName = `Edited${firstName}`;
    const editedLastName = `Edited${lastName}`;
    const empDetails = pm.employeePersonalDetailsPage;

    await test.step(`Arrange: create employee "${firstName} ${lastName}" in PIM`, async () => {
      await pm.pimPage.navigatetoPIMPage();
      await pm.pimPage.navigateToAddEmployee();
      await pm.pimPage.addEmployee(firstName, lastName, null, randomID);
      await pm.pimPage.saveEmployeeDetails();

      // The Add Employee form redirects straight to the new employee's
      // Personal Details page - no need to search the Employee List for it.
      // saveEmployeeDetails() only clicks submit and doesn't wait for that
      // redirect itself (other Add Employee tests mask this with a fixed
      // sleep instead) - wait for the URL explicitly rather than adding
      // another arbitrary sleep here.
      await pm.page.waitForURL(/empNumber\/\d+/);
      const empNumber = empDetails.getEmpNumberFromUrl();
      console.log("TC_EEF_001 editing empNumber:", empNumber);
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
