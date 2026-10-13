import { test, expect } from "./fixture";

async function openApp(page: import("@playwright/test").Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".app-shell")).toHaveAttribute("data-ready", "true");
}
async function cachedPages(page: import("@playwright/test").Page) {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const name = (await caches.keys()).find((key) => /^nou-v6-.*-pages$/.test(key));
        if (!name) return false;
        const cache = await caches.open(name);
        return !!(await cache.match("/")) && !!(await cache.match("/about"));
      }),
    )
    .toBe(true);
}

test("stored dark appearance paints before app CSS or hydration", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("nou-theme", '"dark"'));
  await page.route("**/_next/static/**", (route) => route.abort());
  await page.goto("/about", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveCSS("background-color", "rgb(20, 22, 20)");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(20, 22, 20)");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#141614");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/api/manifest?theme=dark",
  );
});

test("device appearance tracks OS changes while an explicit override stays fixed", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await openApp(page);
  await page.getByRole("button", { name: "Open preferences" }).click();
  await page.getByRole("button", { name: "Device", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f5f4ef");
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await page.emulateMedia({ colorScheme: "dark" });
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("iOS installation instructions persist in an accessible dismissible sheet", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1",
    });
  });
  await openApp(page);
  await page.getByRole("button", { name: "Open preferences" }).click();
  await page.getByRole("button", { name: /A place on your home screen/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Add to Home Screen");
  await expect(dialog).toContainText("Safari");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test("a dismissed install prompt can be offered again and installation is detected by appinstalled", async ({
  page,
}) => {
  await openApp(page);
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    window.dispatchEvent(event);
  });
  await page.getByRole("button", { name: "Open preferences" }).click();
  await page.getByRole("button", { name: /A place on your home screen/ }).click();
  await expect(page.getByRole("button", { name: /A place on your home screen/ })).toBeEnabled();
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    window.dispatchEvent(event);
  });
  await page.getByRole("button", { name: /A place on your home screen/ }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(page.getByRole("button", { name: /Nou is on your home screen/ })).toBeDisabled();
});

test("all views and shortcut URLs work after an offline restart; unknown routes get the themed fallback", async ({
  page,
  context,
}) => {
  await page.addInitScript(() => localStorage.setItem("nou-theme", '"dark"'));
  await openApp(page);
  await cachedPages(page);
  // Intentionally do not open the Places view or /about before going offline.
  await context.setOffline(true);
  await page.goto("/?view=map", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".full-map-card")).toBeVisible();
  await page.goto("/?view=places", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".app-shell")).toHaveAttribute("data-ready", "true");
  await expect(page).toHaveURL(/view=places/);
  await expect(page.locator(".weather-hero")).toHaveCount(0);
  await page.goto("/about", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Weather for now.", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to today" }).click();
  await expect(page.locator(".weather-hero")).toBeVisible();
  await page.goto("/never-cached", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "A quiet moment." })).toBeVisible();
  await expect(page.locator("html")).toHaveCSS("background-color", "rgb(20, 22, 20)");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(20, 22, 20)");
  await context.setOffline(false);
  await expect(page.getByRole("heading", { name: "A little off the map." })).toBeVisible();
});

test("offline reload retains the newest locally saved reading instead of older page data", async ({
  page,
  context,
}) => {
  await openApp(page);
  await expect(page.locator(".temperature-value")).toBeVisible();
  await cachedPages(page);
  const latest = await page.evaluate(() => {
    const reading = JSON.parse(localStorage.getItem("nou-weather-london")!);
    reading.fetchedAt += 60000;
    reading.current.temperature_2m += 1;
    localStorage.setItem("nou-weather-london", JSON.stringify(reading));
    return reading;
  });
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".temperature-value")).toContainText(
    String(Math.round(latest.current.temperature_2m)),
  );
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("nou-weather-london")!)),
  ).toEqual(latest);
});

test("iOS standalone launches are already installed", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "standalone", { value: true }));
  await openApp(page);
  await page.getByRole("button", { name: "Open preferences" }).click();
  await expect(page.getByRole("button", { name: /Nou is on your home screen/ })).toBeDisabled();
});

test("a new service worker waits for the user to update and preserves downloaded voices", async ({
  page,
}) => {
  await openApp(page);
  await cachedPages(page);
  await page.evaluate(async () => {
    const cache = await caches.open("nou-voice-audio-v1");
    await cache.put("/voices/audio/test.wav", new Response("saved audio"));
    await navigator.serviceWorker.register("/sw.js?update-test", {
      scope: "/",
      updateViaCache: "none",
    });
  });
  const banner = page.getByRole("complementary", { name: "Nou update" });
  await expect(banner).toBeVisible();
  expect(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).not.toContain(
    "update-test",
  );
  await banner.getByRole("button", { name: "Update Nou", exact: true }).click();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-ready", "true");
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL))
    .toContain("update-test");
  expect(
    await page.evaluate(
      async () =>
        !!(await (await caches.open("nou-voice-audio-v1")).match("/voices/audio/test.wav")),
    ),
  ).toBe(true);
});

test("theme-colored manifest, icons, and worker headers are install-ready", async ({ request }) => {
  const light = await (await request.get("/api/manifest?theme=light")).json();
  const dark = await (await request.get("/api/manifest?theme=dark")).json();
  const fallback = await (await request.get("/manifest.webmanifest")).json();
  expect(light).toEqual(fallback);
  expect(dark.id).toBe(light.id);
  expect(dark.background_color).toBe("#141614");
  expect(light.launch_handler.client_mode).toBe("navigate-existing");
  for (const icon of light.icons) expect((await request.get(icon.src)).ok()).toBe(true);
  for (const path of ["/sw.js", "/sw-assets.js"]) {
    const response = await request.get(path);
    expect(response.ok()).toBe(true);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});
