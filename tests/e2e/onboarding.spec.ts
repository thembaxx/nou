import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("first visit previews voices, changes preferences, completes once, and replays from settings", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const tour = page.getByRole("dialog");
  await expect(tour).toHaveAttribute("aria-labelledby", "onboarding-title");
  await tour.getByRole("button", { name: "Make it yours", exact: true }).click();
  await expect(page.getByRole("radio")).toHaveCount(4);
  await page.getByRole("radio", { name: /Sage/ }).check();
  await expect(page.getByRole("radio", { name: /Sage/ })).toBeChecked();
  await page.getByRole("button", { name: "Preview Sage", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop Sage preview", exact: true })).toBeVisible();
  await expect(page.locator(".voice-waveform.active")).toHaveCount(1);
  const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(
    audit.violations
      .filter((v) => v.impact === "critical" || v.impact === "serious")
      .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator(".motion-preview")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reduced motion", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await page.getByRole("button", { name: "°F", exact: true }).last().click();
  await page.getByRole("button", { name: "Meet today", exact: true }).click();
  await expect(page.locator(".onboarding")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await expect(page.locator(".day-voice-button")).toContainText("Sage");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".app-shell")).toHaveAttribute("data-ready", "true");
  await expect(page.locator(".onboarding")).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("nou-unit")!))).toBe("f");
  await page.getByRole("button", { name: "Open preferences" }).click();
  await page.getByRole("button", { name: /Replay the welcome tour/ }).click();
  await expect(page.locator(".onboarding")).toBeVisible();
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(page.locator(".onboarding")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await page.getByRole("button", { name: "Open preferences" }).click();
  await page.getByRole("button", { name: /Voice & downloads/ }).click();
  await expect(page.getByRole("radio", { name: /Sage/ })).toBeChecked();
  await page.getByRole("radio", { name: /Luna/ }).check();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(page.locator(".day-voice-button")).toContainText("Luna");
});

test("welcome can be skipped with Escape and downloaded previews work offline", async ({
  page,
  context,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".onboarding")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".onboarding")).toHaveCount(0);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() =>
      page.evaluate(async () => Boolean(await caches.match("/voices/previews/ember.mp3"))),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Open preferences" }).click();
  await page.getByRole("button", { name: /Voice & downloads/ }).click();
  await page.getByRole("button", { name: "Preview Ember", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop Ember preview", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await context.setOffline(false);
});
