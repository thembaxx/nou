import { test as base } from "@playwright/test";
export { expect } from "@playwright/test";
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => localStorage.setItem("nou-onboarding-v1", "true"));
    await use(page);
  },
});
