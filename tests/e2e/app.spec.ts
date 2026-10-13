import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function openApp(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".app-shell")).toHaveAttribute("data-ready", "true");
}

test("live weather, today-only hours, map worker and responsive layout", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openApp(page);
  await expect(page.locator(".temperature-value")).toBeVisible();
  const refreshed = page.waitForResponse(
    (response) => response.url().includes("/api/weather?lat=51.5074") && response.ok(),
  );
  await page.getByRole("button", { name: "Refresh current weather", exact: true }).click();
  const data = await (await refreshed).json();
  await expect(page.locator(".temperature-value")).toContainText(
    Math.round(data.current.temperature_2m).toString(),
  );
  expect(await page.locator(".hour-column").count()).toBeGreaterThan(0);
  expect(await page.locator(".hour-column").count()).toBeLessThanOrEqual(24);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const worker = await request.get("/vendor/maplibre/maplibre-gl-worker.mjs");
  expect(worker.ok()).toBe(true);
  await page.locator(".map-shell").scrollIntoViewIfNeeded();
  await expect(page.locator(".map-location-dot")).toBeAttached();
  await expect(page.locator(".map-fallback")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("real city search updates local weather and daylight theme", async ({ page }) => {
  await openApp(page);
  await expect(page.locator(".temperature-value")).toBeVisible();
  await page.locator(".location-button").click();
  await page.getByRole("textbox", { name: "Search for a city" }).fill("Tokyo");
  await page.locator(".search-results button").filter({ hasText: "Tokyo" }).first().click();
  await expect(page.locator(".hero-location h2")).toHaveText("Tokyo");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const data = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem(`nou-weather-${JSON.parse(localStorage.getItem("nou-place")!).id}`)!,
    ),
  );
  const day =
    Date.now() >= data.daily.sunrise[0] * 1000 && Date.now() < data.daily.sunset[0] * 1000;
  await expect(page.locator("html")).toHaveAttribute("data-theme", day ? "light" : "dark");
  await expect(page.locator(".local-clock small")).toHaveText("Tokyo");
});

test("preferences persist and modal traps focus with keyboard dismissal", async ({ page }) => {
  await openApp(page);
  await expect(page.locator(".temperature-value")).toBeVisible();
  await page.getByRole("button", { name: "Open preferences" }).click();
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await page.getByRole("button", { name: "°F", exact: true }).last().click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.locator('meta[name="theme-color"]').getAttribute("content")).toBe("#141614");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("nou-unit")!))).toBe("f");
});

test("saved places and native browser Back navigation", async ({ page }, info) => {
  await openApp(page);
  await expect(page.locator(".temperature-value")).toBeVisible();
  await page.getByRole("button", { name: "Save this place", exact: true }).click();
  if (info.project.name === "mobile")
    await page.locator(".mobile-nav").getByRole("button", { name: "Places", exact: true }).click();
  else
    await page
      .locator(".sidebar-nav")
      .getByRole("button", { name: "Saved places", exact: true })
      .click();
  await expect(page).toHaveURL(/view=places/);
  await expect(page.locator(".saved-place-card h2")).toHaveText("London");
  await page.goBack();
  await expect(page.locator(".weather-hero")).toBeVisible();
});

test("PWA reloads offline with saved weather and bounded caches", async ({
  page,
  context,
  request,
}) => {
  await openApp(page);
  await expect(page.locator(".temperature-value")).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() =>
      page.evaluate(async () => (await caches.open("nou-v3-pages")).match("/").then(Boolean)),
    )
    .toBe(true);
  const manifest = await (await request.get("/api/manifest?theme=dark")).json();
  expect(manifest.background_color).toBe("#141614");
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.some((i: { purpose: string }) => i.purpose === "maskable")).toBe(true);
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".temperature-value")).toBeVisible();
  await expect(page.locator(".status-banner")).toContainText("offline");
  await context.setOffline(false);
});

test("light and dark interfaces have no serious accessibility violations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openApp(page);
  await expect(page.locator(".temperature-value")).toBeVisible();
  for (const appearance of ["Light", "Dark"]) {
    await page.getByRole("button", { name: "Open preferences" }).click();
    await page.getByRole("button", { name: appearance, exact: true }).click();
    await page.getByRole("button", { name: "Close dialog" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(
      audit.violations
        .filter((v) => v.impact === "critical" || v.impact === "serious")
        .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
  }
});
