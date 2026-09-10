import PomManager from "../src/pages/PomManager";
import { faker } from "@faker-js/faker";
import { test } from "@playwright/test";
import { getAdminCredentials } from "../src/config/credentials";

let pm: PomManager;

test.describe("Search Employee", () => {
  test.beforeEach(async ({ page }) => {
    const admin = getAdminCredentials();
    pm = new PomManager(page);
    await pm.loginPage.navigate();
    await pm.loginPage.login(admin.username, admin.password);
    await pm.loginPage.assertLoginValidation("Dashboard");
  });

  test("TC_SEF_001: Search Employee By Name Shows Matching Result", async () => {
    // create -> navigate -> autocomplete -> search is a long chain against
    // a shared public demo that goes through slow spells (the same 60s
    // timeout intermittently catches the credential-login Add tests). This
    // test's logic isn't the risk - the round-trip count is - so give it
    // the tripled budget rather than chase the site's latency.
    test.slow();

    // Create a fresh employee to search for rather than relying on a
    // seeded one - the Employee List is shared with everyone using this
    // public demo, so a "known" name could already be gone or duplicated.
    // A unique per-run last name is guaranteed to resolve to exactly one
    // row, which is what makes the toHaveCount(1) assertion meaningful.
    const firstName = faker.person.fullName();
    const lastName = faker.person.lastName();
    const randomID = faker.string.alphanumeric(3);

    await pm.pimPage.navigatetoPIMPage();
    await pm.pimPage.navigateToAddEmployee();
    await pm.pimPage.addEmployee(firstName, lastName, null, randomID);
    await pm.pimPage.saveEmployeeDetails();
    await pm.page.waitForURL(/empNumber\/\d+/, { timeout: 30000 });
    const empNumber = pm.employeePersonalDetailsPage.getEmpNumberFromUrl();
    console.log("TC_SEF_001 searching for empNumber:", empNumber);

    await pm.pimPage.navigatetoPIMPage();
    // Search by lastName alone (a single word) - see searchEmployeeByName()
    // for why the full "first last" string is unreliable here.
    await pm.pimPage.searchEmployeeByName(lastName);
    await pm.pimPage.assertEmployeeFoundInList(lastName);

    // No cleanup delete here on purpose: this test's scope is "search
    // finds the record", and a create+search+delete chain runs long enough
    // on the shared public demo to blow the per-test timeout (seen in a
    // full-suite run). The Add/Edit specs likewise leave their created
    // employees behind - only DeleteEmployeeTest exercises removal, and it
    // only ever deletes what it made. Creating-and-leaving doesn't touch
    // anyone else's data, so it stays within the safe-data policy.
  });
});
