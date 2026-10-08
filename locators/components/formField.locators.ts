import { Page, Locator } from "@playwright/test";

/**
 * Shared by every OrangeHRM form (PIM Add Employee, Admin Add User, the
 * list-page filters): the app's inputs have no name/id/placeholder worth
 * keying off (verified live), so each field is found through the <label>
 * text in its own .oxd-input-group wrapper instead of DOM position.
 */

/** The <input> inside the field whose label contains labelText. */
export function inputGroupByLabel(
  page: Page,
  labelText: string | RegExp,
): Locator {
  return page
    .locator(".oxd-input-group")
    .filter({ has: page.locator("label", { hasText: labelText }) })
    .locator("input");
}

/**
 * The validation message under the field whose label contains labelText.
 * Verified live on the Add User form: every field (including the custom
 * dropdowns and the Employee Name autocomplete) is its own .oxd-input-group
 * with at most one .oxd-input-field-error-message, which only exists after a
 * failed submit - so zero matches means "no error shown", not "wrong locator".
 */
export function fieldErrorByLabel(
  page: Page,
  labelText: string | RegExp,
): Locator {
  return page
    .locator(".oxd-input-group")
    .filter({ has: page.locator("label", { hasText: labelText }) })
    .locator(".oxd-input-field-error-message");
}

/**
 * The clickable box of a custom dropdown (User Role, Status, ...). These are
 * styled <div>s, not <select>s - selectOption() doesn't work on them. Click
 * this to open the list, then pick with optionByName().
 */
export function selectByLabel(
  page: Page,
  labelText: string | RegExp,
): Locator {
  return page
    .locator(".oxd-input-group")
    .filter({ has: page.locator("label", { hasText: labelText }) })
    .locator(".oxd-select-text");
}

/**
 * An entry in an OPEN custom dropdown. Verified live: the list is a
 * role="listbox" of role="option" items with clean accessible names (no
 * leading-space icon quirk like the buttons have), so exact matching is safe.
 * Page-wide on purpose - only one dropdown is open at a time.
 */
export function optionByName(page: Page, name: string): Locator {
  return page.getByRole("option", { name, exact: true });
}

/** A suggestion in an open autocomplete (e.g. Employee Name). */
export function autocompleteOptionByText(page: Page, text: string): Locator {
  return page.locator(".oxd-autocomplete-option", { hasText: text });
}
