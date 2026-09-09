import { Page, Locator } from "@playwright/test";

/**
 * The success/error toast that appears after most save/delete actions
 * across the app - same markup everywhere, so one shared locator instead
 * of each page redefining it (used by both the "Successfully Updated" and
 * "Successfully Deleted" flows).
 */
export type ToastLocators = {
  successMessage: Locator;
};

export function toastLocators(page: Page): ToastLocators {
  return {
    // Verified live: the success toast's message-specific class, scoped to
    // the success-styled toast container so it can never accidentally
    // match an error toast's message text instead.
    successMessage: page.locator(".oxd-toast--success .oxd-text--toast-message"),
  };
}
