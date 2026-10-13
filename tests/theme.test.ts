import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { resolveTheme, THEME_BOOTSTRAP } from "../src/lib/theme";

const sunrise = Date.UTC(2026, 9, 13, 6);
const sunset = Date.UTC(2026, 9, 13, 18);
const context = { sunrise, sunset, timezone: "UTC" };

test("daylight theme honors sunrise/sunset boundaries and explicit device overrides", () => {
  assert.equal(resolveTheme("auto", context, sunrise - 1, false), "dark");
  assert.equal(resolveTheme("auto", context, sunrise, true), "light");
  assert.equal(resolveTheme("auto", context, sunset, false), "dark");
  assert.equal(resolveTheme("light", context, sunset, true), "light");
  assert.equal(resolveTheme("dark", context, sunrise, false), "dark");
  assert.equal(resolveTheme("system", context, sunrise, true), "dark");
  assert.equal(resolveTheme("system", context, sunset, false), "light");
});
test("a stale reading uses the selected timezone instead of remaining dark forever", () => {
  assert.equal(resolveTheme("auto", context, sunrise + 2 * 86400000 + 3600000, true), "light");
  assert.equal(resolveTheme("auto", { timezone: "Asia/Tokyo" }, sunrise, true), "light");
  assert.equal(resolveTheme("auto", { timezone: "invalid" }, sunrise, true), "dark");
});
test("fresh polar day/night readings use the provider flag without stale day boundaries", () => {
  const polar = { sunrise: 0, sunset: 0, isDay: true, observedAt: sunset, timezone: "UTC" };
  assert.equal(resolveTheme("auto", polar, sunset, false), "light");
  assert.equal(
    resolveTheme(
      "auto",
      { ...polar, isDay: false, observedAt: sunrise + 10800000 },
      sunrise + 10800000,
      true,
    ),
    "dark",
  );
});
test("the first-paint script runs without a module loader and tolerates unavailable storage", () => {
  for (const unavailable of [false, true]) {
    const root = { dataset: {} as Record<string, string>, style: {} as Record<string, string> };
    const meta = {
      setAttribute: (_key: string, value: string) => {
        root.style.meta = value;
      },
    };
    vm.runInNewContext(THEME_BOOTSTRAP, {
      Date,
      Intl,
      localStorage: {
        getItem: () => {
          if (unavailable) throw new Error("Storage blocked");
          return '"dark"';
        },
      },
      window: { matchMedia: () => ({ matches: true }) },
      document: {
        documentElement: root,
        querySelectorAll: () => [meta],
        querySelector: () => null,
      },
    });
    assert.ok(root.dataset.theme === "dark" || root.dataset.theme === "light");
    assert.equal(root.style.backgroundColor, root.dataset.theme === "dark" ? "#141614" : "#f5f4ef");
    if (!unavailable) assert.equal(root.dataset.theme, "dark");
  }
});
