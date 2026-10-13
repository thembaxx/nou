import type { Theme, Weather } from "./weather";

export const THEME_COLORS = { light: "#f5f4ef", dark: "#141614" } as const;
export type ThemeContext = {
  sunrise?: number;
  sunset?: number;
  timezone?: string;
  observedAt?: number;
  isDay?: boolean;
};

export function weatherThemeContext(weather: Weather): ThemeContext {
  return {
    sunrise: weather.daily.sunrise[0] * 1000,
    sunset: weather.daily.sunset[0] * 1000,
    timezone: weather.timezone,
    observedAt: weather.current.time * 1000,
    isDay: weather.current.is_day === 1,
  };
}

// Self-contained so exactly the same resolver can run before hydration and offline.
export function resolveTheme(
  preference: Theme | unknown,
  context: ThemeContext | null,
  now: number,
  systemDark: boolean,
): "light" | "dark" {
  if (preference === "light" || preference === "dark") return preference;
  if (preference === "system") return systemDark ? "dark" : "light";
  if (
    context &&
    Number.isFinite(context.sunrise) &&
    Number.isFinite(context.sunset) &&
    context.sunrise! > 0 &&
    context.sunset! > context.sunrise! &&
    now >= context.sunrise! - 43200000 &&
    now < context.sunset! + 43200000
  ) {
    return now >= context.sunrise! && now < context.sunset! ? "light" : "dark";
  }
  if (
    context &&
    typeof context.isDay === "boolean" &&
    Number.isFinite(context.observedAt) &&
    Math.abs(now - context.observedAt!) < 21600000 &&
    !(context.sunrise! > 0 && context.sunset! > context.sunrise!)
  ) {
    return context.isDay ? "light" : "dark";
  }
  try {
    const hour = context?.timezone
      ? Number(
          new Intl.DateTimeFormat("en-GB", {
            timeZone: context.timezone,
            hour: "numeric",
            hourCycle: "h23",
          }).format(now),
        )
      : new Date(now).getHours();
    return hour >= 7 && hour < 19 ? "light" : "dark";
  } catch {
    return systemDark ? "dark" : "light";
  }
}

export function applyTheme(appearance: "light" | "dark") {
  const root = document.documentElement;
  root.dataset.theme = appearance;
  root.style.colorScheme = appearance;
  root.style.backgroundColor = THEME_COLORS[appearance];
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute("content", THEME_COLORS[appearance]);
  });
  document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", appearance);
  document
    .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    ?.setAttribute("content", appearance === "dark" ? "black-translucent" : "default");
  const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (manifest) manifest.setAttribute("href", `/api/manifest?theme=${appearance}`);
}

function bootstrapTheme(resolve: typeof resolveTheme, colors: typeof THEME_COLORS) {
  let preference: unknown = "auto";
  let context = null;
  try {
    preference = JSON.parse(localStorage.getItem("nou-theme") || '"auto"');
    context = JSON.parse(localStorage.getItem("nou-theme-context") || "null");
  } catch {
    // Storage restrictions must never prevent the first paint from being themed.
  }
  const appearance = resolve(
    preference,
    context,
    Date.now(),
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const root = document.documentElement;
  root.dataset.theme = appearance;
  root.style.colorScheme = appearance;
  root.style.backgroundColor = colors[appearance];
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute("content", colors[appearance]);
  });
  document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", appearance);
  document
    .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    ?.setAttribute("content", appearance === "dark" ? "black-translucent" : "default");
  const manifest = document.querySelector('link[rel="manifest"]');
  manifest?.setAttribute("href", `/api/manifest?theme=${appearance}`);
}

export const THEME_BOOTSTRAP = `(${bootstrapTheme.toString()})(${resolveTheme.toString()},${JSON.stringify(THEME_COLORS)});`;
