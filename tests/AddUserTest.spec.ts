import { test } from "./fixtures";
import { getAdminCredentials } from "../src/config/credentials";

test.describe("Add User", () => {
  test.beforeEach(async ({ pm }) => {
    const admin = getAdminCredentials();
    await test.step("Setup: log in as admin and land on the Dashboard", async () => {
      await pm.loginPage.navigate();
      await pm.loginPage.login(admin.username, admin.password);
      await pm.loginPage.assertLoginValidation("Dashboard");
    });
  });

  test("TC_UCF_001: Create ESS User With Enabled Status", async ({ pm, testData }) => {
    // A user must be attached to an existing employee, and this is a shared
    // public demo - so we create our OWN employee rather than borrow a seeded
    // one that someone else may have renamed or deleted. It is created through
    // the API because this test is about ADDING A USER, not the Add Employee
    // form. The fixture deletes the employee afterwards, and deleting an
    // employee also removes their user (verified live) - so the user this
    // test creates needs no clean-up of its own.
    //
    // Test data is generated up front, outside the steps, so the step titles
    // below can name the real values - when a run fails, the report says
    // which employee/username to look for in the app.
    const name = testData.employeeName();
    const username = testData.username();
    const password = testData.password();

    const employee = await test.step(`Arrange: create employee "${name.firstName} ${name.lastName}" via the API`, async () => {
      return testData.createEmployee(name);
    });

    await test.step("Act: open Admin > Add User form", async () => {
      await pm.adminPage.navigateToAdminPage();
      await pm.adminPage.navigateToAddUser();
    });

    await test.step(`Act: fill the form for user "${username}" (ESS, Enabled) and save`, async () => {
      await pm.adminPage.fillUserForm({
        role: "ESS",
        status: "Enabled",
        employeeSearchTerm: employee.lastName,
        username,
        password,
      });
      await pm.adminPage.saveUser();
    });

    // The app confirms the save AND the user is really in the list with the
    // values we entered - a toast alone doesn't prove it persisted.
    await test.step('Assert: success toast "Successfully Saved" appears', async () => {
      await pm.adminPage.assertUserSaved();
    });

    await test.step(`Assert: user "${username}" is listed with the entered values`, async () => {
      await pm.adminPage.searchUserByUsername(username);
      await pm.adminPage.assertUserListed({
        username,
        role: "ESS",
        employeeName: `${employee.firstName} ${employee.lastName}`,
        status: "Enabled",
      });
    });
  });

  test("TC_UCF_002: Create Admin User With Disabled Status", async ({ pm, testData }) => {
    // Same flow as TC_UCF_001 with the OTHER role and status: this proves the
    // form handles both dropdown values, not just the ones the first case
    // happened to pick. Deliberately written out in full instead of sharing
    // code with TC_UCF_001, so each test reads top to bottom and can be
    // understood (or deleted) on its own.
    //
    // Note this creates an account with ADMIN privileges on a shared public
    // demo. It is created Disabled (it can't log in), has a random password,
    // and belongs to an employee the fixture deletes afterwards - deleting
    // that employee also removes this user (verified live for an
    // Admin-role, Disabled user, not just for ESS).
    const name = testData.employeeName();
    const username = testData.username();
    const password = testData.password();

    const employee = await test.step(`Arrange: create employee "${name.firstName} ${name.lastName}" via the API`, async () => {
      return testData.createEmployee(name);
    });

    await test.step("Act: open Admin > Add User form", async () => {
      await pm.adminPage.navigateToAdminPage();
      await pm.adminPage.navigateToAddUser();
    });

    await test.step(`Act: fill the form for user "${username}" (Admin, Disabled) and save`, async () => {
      await pm.adminPage.fillUserForm({
        role: "Admin",
        status: "Disabled",
        employeeSearchTerm: employee.lastName,
        username,
        password,
      });
      await pm.adminPage.saveUser();
    });

    await test.step('Assert: success toast "Successfully Saved" appears', async () => {
      await pm.adminPage.assertUserSaved();
    });

    await test.step(`Assert: user "${username}" is listed as Admin / Disabled`, async () => {
      await pm.adminPage.searchUserByUsername(username);
      await pm.adminPage.assertUserListed({
        username,
        role: "Admin",
        employeeName: `${employee.firstName} ${employee.lastName}`,
        status: "Disabled",
      });
    });
  });

  test("TC_UCF_003: Add User Shows Required Field Errors When Form Is Blank", async ({ pm }) => {
    // No data: this test never fills the form, so it creates no employee and
    // no user and has nothing to clean up (it does not use `testData` at all).
    //
    // Messages verified live before writing this: five fields say "Required",
    // and Confirm Password says "Passwords do not match" - not "Required", as
    // the test plan first assumed. See AdminPage.assertBlankFormErrors().
    await test.step("Act: open Admin > Add User form", async () => {
      await pm.adminPage.navigateToAdminPage();
      await pm.adminPage.navigateToAddUser();
    });

    // Proves the messages below are caused by Save, not already on screen.
    await test.step("Assert: the untouched form shows no validation messages", async () => {
      await pm.adminPage.assertNoFieldErrors();
    });

    await test.step("Act: click Save with every field empty", async () => {
      await pm.adminPage.saveUser();
    });

    await test.step('Assert: five fields show "Required" and Confirm Password shows "Passwords do not match"', async () => {
      await pm.adminPage.assertBlankFormErrors();
    });

    await test.step("Assert: still on the Add User form and no success toast (nothing was saved)", async () => {
      await pm.adminPage.assertStillOnAddUserForm();
    });
  });

  test("TC_UCF_004: Password And Confirm Password Mismatch Is Rejected", async ({ pm, testData }) => {
    // A mismatch needs an otherwise VALID form (so the only thing wrong is the
    // mismatch), and a valid form needs a real employee. Created through the
    // API, as in TC_UCF_001/002, because this test is about the password
    // check, not the Add Employee form. The fixture deletes the employee
    // afterwards; if the app DID wrongly create the user, deleting the
    // employee would remove it too (verified live for other roles/statuses).
    //
    // Behaviour verified live before writing this: "Passwords do not match"
    // appears on Confirm Password only, as soon as the value is typed (not
    // just on Save); it is case-sensitive; Save does not send a create request.
    const name = testData.employeeName();
    const username = testData.username();
    const password = testData.password();
    const confirmPassword = `${password}x`;

    const employee = await test.step(`Arrange: create employee "${name.firstName} ${name.lastName}" via the API`, async () => {
      return testData.createEmployee(name);
    });

    await test.step("Act: open Admin > Add User form", async () => {
      await pm.adminPage.navigateToAdminPage();
      await pm.adminPage.navigateToAddUser();
    });

    await test.step(`Act: fill every field validly for "${username}", but a different Confirm Password`, async () => {
      await pm.adminPage.fillUserForm({
        role: "ESS",
        status: "Enabled",
        employeeSearchTerm: employee.lastName,
        username,
        password,
        confirmPassword,
      });
    });

    await test.step('Assert: only Confirm Password shows "Passwords do not match"; no other field errors', async () => {
      await pm.adminPage.assertOnlyConfirmPasswordMismatch();
    });

    await test.step("Act: click Save", async () => {
      await pm.adminPage.saveUser();
    });

    await test.step("Assert: still on the form, the message is still there, no success toast", async () => {
      await pm.adminPage.assertStillOnAddUserForm();
      await pm.adminPage.assertOnlyConfirmPasswordMismatch();
    });

    // The strongest evidence that nothing was created is the user list itself.
    await test.step(`Assert: no user "${username}" exists in the User Management list`, async () => {
      await pm.adminPage.navigateToAdminPage();
      await pm.adminPage.searchUserByUsername(username);
      await pm.adminPage.assertUserNotListed(username);
    });
  });

  test("TC_UCF_005: Username Shorter Than Minimum Length Is Rejected", async ({ pm, testData }) => {
    // Same shape as TC_UCF_004: an otherwise VALID form (so length is the only
    // thing wrong) needs a real employee, created through the API and deleted
    // by the fixture afterwards.
    //
    // Limits verified live before writing this: usernames of 1-4 characters
    // show "Should be at least 5 characters" (as soon as they are typed, not
    // just on Save); 5 is accepted; 40 is accepted and 41 shows "Should not
    // exceed 40 characters" - the maximum is NOT covered by this test.
    //
    // The 4- and 5-character values are cut from the random part of a
    // generated username, so they differ every run and cannot already belong to
    // an existing user (which would add an "Already exists" message).
    const name = testData.employeeName();
    const generated = testData.username();
    const tooShort = generated.slice(4, 8); // 4 characters
    const shortestValid = generated.slice(4, 9); // 5 characters
    const password = testData.password();

    const employee = await test.step(`Arrange: create employee "${name.firstName} ${name.lastName}" via the API`, async () => {
      return testData.createEmployee(name);
    });

    await test.step("Act: open Admin > Add User form", async () => {
      await pm.adminPage.navigateToAdminPage();
      await pm.adminPage.navigateToAddUser();
    });

    await test.step(`Act: fill every field validly, but use the 4-character username "${tooShort}"`, async () => {
      await pm.adminPage.fillUserForm({
        role: "ESS",
        status: "Enabled",
        employeeSearchTerm: employee.lastName,
        username: tooShort,
        password,
      });
    });

    await test.step('Assert: only Username shows "Should be at least 5 characters"; no other field errors', async () => {
      await pm.adminPage.assertOnlyFieldError("Username", "Should be at least 5 characters");
    });

    await test.step("Act: click Save", async () => {
      await pm.adminPage.saveUser();
    });

    await test.step("Assert: still on the form, the message is still there, no success toast", async () => {
      await pm.adminPage.assertStillOnAddUserForm();
      await pm.adminPage.assertOnlyFieldError("Username", "Should be at least 5 characters");
    });

    // The boundary: one more character and the same form has no errors at all.
    // This also proves the length was the ONLY thing wrong with the form.
    // The form is not submitted again, so no user is created.
    await test.step(`Assert: the 5-character username "${shortestValid}" clears the message (the minimum is exactly 5)`, async () => {
      await pm.adminPage.setUsername(shortestValid);
      await pm.adminPage.assertNoFieldErrors();
    });

    await test.step(`Assert: no user "${tooShort}" exists in the User Management list`, async () => {
      await pm.adminPage.navigateToAdminPage();
      await pm.adminPage.searchUserByUsername(tooShort);
      await pm.adminPage.assertUserNotListed(tooShort);
    });
  });

  test("TC_UCF_008: Create User With Minimum-Length 5-Character Username", async ({ pm, testData }) => {
    // The other half of TC_UCF_005's boundary: that test proves 4 characters
    // is rejected and that 5 clears the message, but never saves the 5. This
    // one saves it, so "the minimum is exactly 5" rests on a real save and not
    // only on the form's message. TC_UCF_001/002 use a 12-character username.
    //
    // Verified live before writing this: a 5-character username saves (the
    // create request goes out, the user is listed with the entered values),
    // and deleting the employee afterwards removes this user too - the list
    // then reports "No Records Found" for it. The employee is created through
    // the API and deleted by the fixture, so the user needs no cleanup of its
    // own.
    //
    // The username is cut from the random part of a generated one, so it
    // differs every run and cannot already belong to another user.
    const name = testData.employeeName();
    const username = testData.username().slice(4, 9); // 5 characters
    const password = testData.password();

    const employee = await test.step(`Arrange: create employee "${name.firstName} ${name.lastName}" via the API`, async () => {
      return testData.createEmployee(name);
    });

    await test.step("Act: open Admin > Add User form", async () => {
      await pm.adminPage.navigateToAdminPage();
      await pm.adminPage.navigateToAddUser();
    });

    await test.step(`Act: fill the form for the 5-character username "${username}" (ESS, Enabled) and save`, async () => {
      await pm.adminPage.fillUserForm({
        role: "ESS",
        status: "Enabled",
        employeeSearchTerm: employee.lastName,
        username,
        password,
      });
      await pm.adminPage.saveUser();
    });

    await test.step('Assert: success toast "Successfully Saved" appears', async () => {
      await pm.adminPage.assertUserSaved();
    });

    await test.step(`Assert: user "${username}" is listed with the entered values`, async () => {
      await pm.adminPage.searchUserByUsername(username);
      await pm.adminPage.assertUserListed({
        username,
        role: "ESS",
        employeeName: `${employee.firstName} ${employee.lastName}`,
        status: "Enabled",
      });
    });
  });

  test("TC_UCF_006: Duplicate Username Is Rejected", async ({ pm, testData }) => {
    // Needs a user that ALREADY exists, so the first user is created through
    // the API (the form is not what this test is about) for the first of two
    // self-created employees. Both employees are deleted by the fixture
    // afterwards, and deleting an employee removes their user (verified live).
    //
    // Behaviour verified live before writing this: typing a taken username
    // shows "Already exists" on Username straight away (the app asks the
    // server; Save is not needed), the same check is case-insensitive (the
    // upper-case form is also taken - not tested here), and Save sends no
    // create request. The first user is the only one that can ever hold this
    // username, so the list afterwards must show exactly ONE record, and it
    // must belong to the first employee.
    const first = testData.employeeName();
    const second = testData.employeeName();
    const username = testData.username();
    const password = testData.password();

    const firstEmployee = await test.step(`Arrange: create employee "${first.firstName} ${first.lastName}" via the API`, async () => {
      return testData.createEmployee(first);
    });
    const secondEmployee = await test.step(`Arrange: create employee "${second.firstName} ${second.lastName}" via the API`, async () => {
      return testData.createEmployee(second);
    });
    await test.step(`Arrange: create user "${username}" for the first employee via the API`, async () => {
      await testData.createUser(firstEmployee, { username, password });
    });

    await test.step("Act: open Admin > Add User form", async () => {
      await pm.adminPage.navigateToAdminPage();
      await pm.adminPage.navigateToAddUser();
    });

    await test.step(`Act: fill every field validly for the SECOND employee, but reuse the username "${username}"`, async () => {
      await pm.adminPage.fillUserForm({
        role: "ESS",
        status: "Enabled",
        employeeSearchTerm: secondEmployee.lastName,
        username,
        password,
      });
    });

    await test.step('Assert: only Username shows "Already exists"; no other field errors', async () => {
      await pm.adminPage.assertOnlyFieldError("Username", "Already exists");
    });

    await test.step("Act: click Save", async () => {
      await pm.adminPage.saveUser();
    });

    await test.step("Assert: still on the form, the message is still there, no success toast", async () => {
      await pm.adminPage.assertStillOnAddUserForm();
      await pm.adminPage.assertOnlyFieldError("Username", "Already exists");
    });

    // Exactly one record, and it is the FIRST employee's: no second user was
    // created, and the existing one was not taken over.
    await test.step(`Assert: the list shows exactly one user "${username}", belonging to the first employee`, async () => {
      await pm.adminPage.navigateToAdminPage();
      await pm.adminPage.searchUserByUsername(username);
      await pm.adminPage.assertUserListed({
        username,
        role: "ESS",
        employeeName: `${firstEmployee.firstName} ${firstEmployee.lastName}`,
        status: "Enabled",
      });
    });
  });
});
