import { test, expect } from "./fixture";
import { readFile } from "node:fs/promises";

test("real neural voice installs, saves a spoken live summary, and works after an offline restart", async ({
  page,
  context,
}, info) => {
  test.setTimeout(400000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".app-shell")).toHaveAttribute("data-ready", "true");
  await expect(
    page.getByRole("button", { name: "Refresh current weather", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Open preferences" }).click();
  await page.getByRole("button", { name: /Voice & downloads/ }).click();
  await page.getByRole("button", { name: /Download Ember/ }).click();
  await expect(
    page.getByRole("button", { name: "Ember is ready offline", exact: true }),
  ).toBeVisible({ timeout: 120000 });
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: /Listen to today/ }).click();
  const save = page.getByRole("link", { name: "Save audio · WAV", exact: true });
  await expect(save).toBeVisible({ timeout: 100000 });
  await expect(
    page.getByRole("button", { name: "Pause daily summary", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause daily summary", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play daily summary", exact: true })).toBeVisible();
  const provider = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("nou-weather-london")!),
  );
  await expect(page.locator(".summary-transcript")).toContainText(
    `${provider.current.temperature_2m.toFixed(1)} degrees Celsius`,
  );
  const downloaded = page.waitForEvent("download");
  await save.click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toMatch(/^nou-london-\d{4}-\d{2}-\d{2}-ember\.wav$/);
  const path = await file.path();
  const bytes = await readFile(path!);
  expect(bytes.subarray(0, 4).toString()).toBe("RIFF");
  expect(bytes.subarray(8, 12).toString()).toBe("WAVE");
  expect(bytes.byteLength).toBeGreaterThan(24000);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() =>
      page.evaluate(async () => Boolean(await (await caches.open("nou-v5-pages")).match("/"))),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".temperature-value")).toBeVisible();
  await page.getByRole("button", { name: /Listen to today/ }).click();
  await expect(save).toBeVisible({ timeout: 200000 });
  await expect(page.locator(".summary-transcript")).toContainText(
    "You are offline. This is your last saved weather reading.",
  );
  expect(errors).toEqual([]);
  await context.setOffline(false);
  await file.saveAs(`/tmp/nou-voice-review/${info.project.name}-daily-summary.wav`);
});
