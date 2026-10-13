import { test, expect } from "./fixture";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function openApp(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".app-shell")).toHaveAttribute("data-ready", "true");
  await expect(page.locator(".temperature-value")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Refresh current weather", exact: true }),
  ).toBeEnabled();
}

async function touchDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
  for (let step = 1; step <= 10; step++) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: from.x + ((to.x - from.x) * step) / 10, y: from.y + ((to.y - from.y) * step) / 10 },
      ],
    });
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await session.detach();
}

test("touch swipes navigate, pulling refreshes real weather, and the sky keeps its own gesture", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile", "Touch navigation is intentionally mobile only.");
  await openApp(page);
  const heading = page.locator(".page-heading h1");
  const swipe = async (left: boolean) => {
    const box = await heading.boundingBox();
    const y = box!.y + box!.height / 2;
    await touchDrag(page, { x: left ? 290 : 85, y }, { x: left ? 85 : 290, y });
  };
  await swipe(true);
  await expect(page).toHaveURL(/view=map/);
  await swipe(true);
  await expect(page).toHaveURL(/view=places/);
  await swipe(false);
  await expect(page).toHaveURL(/view=map/);
  await swipe(false);
  await expect(page.locator(".weather-hero")).toBeVisible();
  await expect(page).not.toHaveURL(/view=/);
  const box = await heading.boundingBox();
  const response = page.waitForResponse((r) => r.url().includes("/api/weather?") && r.ok());
  await touchDrag(page, { x: 140, y: box!.y + 5 }, { x: 140, y: box!.y + 185 });
  const data = await (await response).json();
  await expect(page.locator(".temperature-value")).toContainText(
    String(Math.round(data.current.temperature_2m)),
  );
  await expect(page.locator(".gesture-main")).toHaveAttribute("data-gesture-phase", "idle");
  await expect(page.locator(".toast")).toContainText("freshly checked");
  const sky = page.locator(".sky-object");
  const skyBox = await sky.boundingBox();
  await touchDrag(
    page,
    { x: skyBox!.x + skyBox!.width * 0.7, y: skyBox!.y + skyBox!.height / 2 },
    { x: skyBox!.x + skyBox!.width * 0.3, y: skyBox!.y + skyBox!.height / 2 },
  );
  await expect(page).not.toHaveURL(/view=/);
  await expect(sky).toHaveAttribute("data-state", "idle");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("forecast mouse scrubbing and arrow keys select real hourly readings", async ({ page }) => {
  await openApp(page);
  const hours = page.locator(".hour-column");
  await hours.first().scrollIntoViewIfNeeded();
  const count = await hours.count();
  if (count > 1) {
    const first = await hours.first().boundingBox(),
      next = await hours.nth(1).boundingBox();
    await page.mouse.move(first!.x + first!.width / 2, first!.y + first!.height / 2);
    await page.mouse.down();
    await page.mouse.move(next!.x + next!.width / 2, next!.y + next!.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(hours.nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".forecast-footnote")).toContainText("Humidity");
  }
  await hours.first().focus();
  await page.keyboard.press("End");
  await expect(hours.last()).toBeFocused();
  await expect(hours.last()).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Home");
  await expect(hours.first()).toBeFocused();
  await expect(hours.first()).toHaveAttribute("aria-pressed", "true");
  await expect(page).not.toHaveURL(/view=/);
});

test("sky responds to dragging and spinning without changing the reading", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openApp(page);
  const sky = page.getByRole("button", { name: /Play with the .* sky/ });
  await sky.waitFor();
  const before = await page.locator(".precise-reading").textContent();
  const box = await sky.boundingBox();
  await page.mouse.move(box!.x + box!.width * 0.3, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.7, box!.y + box!.height / 2, { steps: 10 });
  await expect(sky).toHaveAttribute("data-state", "dragging");
  await page.mouse.up();
  await expect(sky).toHaveAttribute("data-state", "idle");
  await sky.dblclick();
  await expect(sky).toHaveAttribute("data-state", "spinning");
  await expect(sky).toHaveAttribute("data-state", "idle");
  await sky.focus();
  await page.keyboard.press("Enter");
  await expect(sky).toHaveAttribute("data-state", "spinning");
  await expect(page.locator(".precise-reading")).toHaveText(before!);
  expect(errors).toEqual([]);
});

test("keyboard discovery is focus-safe, accessible, and ignores search input", async ({ page }) => {
  await openApp(page);
  await page.keyboard.press("/");
  const input = page.getByRole("textbox", { name: "Search for a city" });
  await expect(input).toBeFocused();
  await input.fill("now");
  await expect(page.locator(".quiet-moment")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator("h1").click();
  await page.keyboard.type("now", { delay: 80 });
  const quiet = page.getByRole("dialog", { name: "Now is a good place to be." });
  await expect(quiet).toBeVisible();
  await expect(page.getByRole("button", { name: "Close quiet moment" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Back to your day" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Close quiet moment" })).toBeFocused();
  const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(
    audit.violations
      .filter((v) => v.impact === "critical" || v.impact === "serious")
      .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
  await expect(page.getByText("That was your little moment.", { exact: true })).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole("button", { name: "Again, if you like" }).click();
  await expect(page.getByText("Breathe in.", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(quiet).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});

test("logo discovery and reduced motion keep the experience calm", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openApp(page);
  const sky = page.getByRole("button", { name: /Play with the .* sky/ });
  await sky.dblclick();
  await expect(sky).toHaveAttribute("data-state", "idle");
  const brand = page.locator(info.project.name === "mobile" ? ".mobile-brand" : ".sidebar .brand");
  for (let tap = 0; tap < 5; tap++) await brand.click();
  await expect(page.locator(".quiet-moment")).toBeVisible();
  const scale = await page
    .locator(".breathing-sun")
    .evaluate((element) => getComputedStyle(element).transform);
  expect(scale).toBe("none");
  await page.getByRole("button", { name: "Back to your day" }).click();
  await expect(page.locator(".quiet-moment")).toHaveCount(0);
  await expect(brand).toBeFocused();
  await expect(page.locator(".weather-hero")).toBeVisible();
});

test("keyboard shortcuts can be disabled and the preference persists", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "Open preferences" }).click();
  const toggle = page.getByRole("switch", { name: "Keyboard shortcuts" });
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(
    audit.violations
      .filter((v) => v.impact === "critical" || v.impact === "serious")
      .map((v) => v.id),
  ).toEqual([]);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator("h1").click();
  await page.keyboard.press("/");
  await page.keyboard.type("now");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".app-shell")).toHaveAttribute("data-ready", "true");
  await page.getByRole("button", { name: "Open preferences" }).click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await toggle.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator("h1").click();
  const refreshed = page.waitForResponse(
    (response) => response.url().includes("/api/weather?") && response.ok(),
  );
  await page.keyboard.press("r");
  expect((await refreshed).ok()).toBe(true);
  await expect(page.locator(".toast")).toContainText("freshly checked");
});
