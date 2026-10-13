import { test, expect } from "./fixture";
import AxeBuilder from "@axe-core/playwright";

test("canonical SEO, structured data and crawler discovery are publicly readable", async ({
  page,
  request,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".app-shell")).toHaveAttribute("data-ready", "true");
  await expect(page).toHaveTitle("Nou — Today's Weather, Beautifully Simple");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /^https:\/\/nou-six\.vercel\.app\/?$/,
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://nou-six.vercel.app/social.png",
  );
  const schema = await page.locator('script[type="application/ld+json"]').textContent();
  const graph = JSON.parse(schema!)["@graph"];
  expect(graph.map((node: { "@type": string }) => node["@type"])).toEqual([
    "Brand",
    "WebSite",
    "WebApplication",
  ]);
  expect(graph[2].offers.price).toBe("0");
  expect(graph[2].aggregateRating).toBeUndefined();
  const [robots, sitemap, index, full, alias, api] = await Promise.all([
    request.get("/robots.txt"),
    request.get("/sitemap.xml"),
    request.get("/llms.txt"),
    request.get("/llms-full.txt"),
    request.get("/LLM.txt", { maxRedirects: 0 }),
    request.get("/api/weather?lat=91&lon=0"),
  ]);
  expect(await robots.text()).toContain("Sitemap: https://nou-six.vercel.app/sitemap.xml");
  expect(await robots.text()).toContain("Disallow: /api/");
  expect(await sitemap.text()).toContain("<loc>https://nou-six.vercel.app/about</loc>");
  expect(index.status()).toBe(200);
  expect(await index.text()).toMatch(/^# Nou\s/);
  expect(await full.text()).toContain("15-minute intervals");
  expect(alias.status()).toBe(308);
  expect(alias.headers().location).toBe("/llms.txt");
  expect(api.status()).toBe(400);
  expect(api.headers()["x-robots-tag"]).toBe("noindex, nofollow");
});

test("icon-only navigation, spring selection and drag-to-dismiss sheets", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "mobile",
    "The bottom navigation and sheet gesture are mobile interactions.",
  );
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".app-shell")).toHaveAttribute("data-ready", "true");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  expect(await nav.locator("button").allTextContents()).toEqual(["", "", "", ""]);
  await nav.getByRole("button", { name: "Map", exact: true }).click();
  await expect(nav.getByRole("button", { name: "Map", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page).toHaveURL(/view=map/);
  await expect(nav.locator(".mobile-tab-indicator")).toHaveCount(1);
  await nav.getByRole("button", { name: "Search", exact: true }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  const handle = page.getByRole("button", { name: "Dismiss dialog", exact: true });
  await handle.hover();
  const box = await handle.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2 + 180, { steps: 15 });
  await page.mouse.up();
  await expect(sheet).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await nav.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.locator(".weather-hero")).toBeVisible();
});

test("the brand story is responsive, accessible and has its own canonical URL", async ({
  page,
  request,
}) => {
  await page.goto("/about", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Weather for now.", exact: true })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://nou-six.vercel.app/about",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByText("How do the daylight themes work?", { exact: true }).click();
  await expect(
    page.getByText("Nou uses the selected location’s sunrise", { exact: false }),
  ).toBeVisible();
  const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(
    audit.violations
      .filter((v) => v.impact === "critical" || v.impact === "serious")
      .map((v) => v.id),
  ).toEqual([]);
  const guide = await request.get("/brand/brand-guide.svg");
  expect(guide.status()).toBe(200);
  expect(guide.headers()["content-type"]).toContain("image/svg+xml");
  await page.getByRole("link", { name: "Back to today" }).click();
  await expect(page.locator(".weather-hero")).toBeVisible();
});
