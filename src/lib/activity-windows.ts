export type ActivityThresholds = {
  maxRainChance: number;
  maxWindKph: number;
  maxUv: number;
  durationMinutes: number;
};

export const ACTIVITY_PRESETS = {
  walk: { maxRainChance: 20, maxWindKph: 25, maxUv: 5, durationMinutes: 45 },
  errand: { maxRainChance: 30, maxWindKph: 30, maxUv: 6, durationMinutes: 30 },
  laundry: { maxRainChance: 10, maxWindKph: 35, maxUv: 8, durationMinutes: 120 },
} satisfies Record<string, ActivityThresholds>;

export const DEFAULT_ACTIVITY_THRESHOLDS: ActivityThresholds = ACTIVITY_PRESETS.walk;

export type ActivityForecast = {
  timezone: string;
  fetchedAt: number;
  current: { time: number };
  hourly: {
    time: number[];
    precipitation_probability: number[];
    uv_index: number[];
    wind_speed_10m?: number[];
    weather_code?: number[];
  };
};

export type ActivityWindow = {
  start: number;
  end: number;
  durationMinutes: number;
  maxRainChance: number;
  maxWindKph: number;
  maxUv: number;
};

export type ActivityWindowResult = {
  status: "ready" | "offline" | "stale" | "incomplete" | "no-window" | "invalid";
  windows: ActivityWindow[];
  explanation: string;
};

const HOUR = 3_600_000;
const FRESH_FOR = HOUR;
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

function settingsValid(settings: ActivityThresholds) {
  return (
    finite(settings.maxRainChance) &&
    settings.maxRainChance >= 0 &&
    settings.maxRainChance <= 100 &&
    finite(settings.maxWindKph) &&
    settings.maxWindKph >= 0 &&
    settings.maxWindKph <= 200 &&
    finite(settings.maxUv) &&
    settings.maxUv >= 0 &&
    settings.maxUv <= 30 &&
    finite(settings.durationMinutes) &&
    settings.durationMinutes >= 15 &&
    settings.durationMinutes <= 360
  );
}

const result = (
  status: ActivityWindowResult["status"],
  explanation: string,
): ActivityWindowResult => ({ status, explanation, windows: [] });

/**
 * Matches remaining hourly model forecasts against user-chosen thresholds.
 * It does not infer future wind from a current observation or guarantee conditions.
 * Times use epoch milliseconds; provider hourly/current timestamps use epoch seconds.
 */
export function activityWindows(
  weather: ActivityForecast | null,
  thresholds: ActivityThresholds = DEFAULT_ACTIVITY_THRESHOLDS,
  context: { now?: number; offline?: boolean; stale?: boolean } = {},
): ActivityWindowResult {
  const now = context.now ?? Date.now();
  if (!settingsValid(thresholds))
    return result("invalid", "Choose valid rain, wind, UV and duration limits.");
  if (context.offline)
    return result("offline", "Reconnect for fresh forecasts before choosing an activity window.");
  if (!weather || !finite(now) || !finite(weather.fetchedAt) || !finite(weather.current?.time)) {
    return result(
      "incomplete",
      "A complete, fresh hourly forecast is needed to suggest activity windows.",
    );
  }
  if (
    context.stale ||
    now - weather.fetchedAt > FRESH_FOR ||
    now - weather.current.time * 1000 > FRESH_FOR
  ) {
    return result(
      "stale",
      "Refresh this reading before using activity windows; its weather data is over an hour old.",
    );
  }
  if (weather.fetchedAt > now + 300_000 || weather.current.time * 1000 > now + 300_000) {
    return result(
      "incomplete",
      "The reading time could not be verified against this device's clock.",
    );
  }

  let dateAt: (timestamp: number) => string;
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: weather.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    dateAt = (timestamp) => formatter.format(new Date(timestamp));
    dateAt(now);
  } catch {
    return result("incomplete", "The selected location's timezone is unavailable.");
  }
  const today = dateAt(now);
  // Locate the actual next calendar boundary, including 23/25-hour DST days.
  let low = now;
  let midnight = now + 36 * HOUR;
  while (midnight - low > 1) {
    const middle = Math.floor((low + midnight) / 2);
    if (dateAt(middle) === today) low = middle;
    else midnight = middle;
  }

  const hourly = weather.hourly;
  if (
    !hourly ||
    !Array.isArray(hourly.time) ||
    !hourly.time.length ||
    !Array.isArray(hourly.precipitation_probability) ||
    !Array.isArray(hourly.uv_index) ||
    !Array.isArray(hourly.wind_speed_10m) ||
    hourly.precipitation_probability.length !== hourly.time.length ||
    hourly.uv_index.length !== hourly.time.length ||
    hourly.wind_speed_10m.length !== hourly.time.length
  ) {
    return result(
      "incomplete",
      "Hourly rain, wind and UV forecasts are required; current wind cannot stand in for future wind.",
    );
  }
  const slots: Array<ActivityWindow & { qualifies: boolean }> = [];
  let previous = -Infinity;
  for (let i = 0; i < hourly.time.length; i++) {
    const timestamp = hourly.time[i];
    if (!finite(timestamp) || timestamp <= previous)
      return result("incomplete", "The hourly forecast timeline is incomplete.");
    const start = timestamp * 1000;
    const gap = previous !== -Infinity && timestamp - previous !== 3600;
    previous = timestamp;
    if (start + HOUR <= now || start >= midnight || dateAt(start) !== today) continue;
    if (gap && slots.length)
      return result(
        "incomplete",
        "There is a gap in the remaining hourly forecast; refresh before planning.",
      );
    const rain = hourly.precipitation_probability[i];
    const wind = hourly.wind_speed_10m[i];
    const uv = hourly.uv_index[i];
    if (
      !finite(rain) ||
      rain < 0 ||
      rain > 100 ||
      !finite(wind) ||
      wind < 0 ||
      !finite(uv) ||
      uv < 0
    ) {
      return result(
        "incomplete",
        "Some remaining rain, wind or UV readings are unavailable; refresh before planning.",
      );
    }
    const from = Math.max(now, start);
    const to = Math.min(midnight, start + HOUR);
    const storm = finite(hourly.weather_code?.[i]) && hourly.weather_code![i] >= 95;
    slots.push({
      start: from,
      end: to,
      durationMinutes: (to - from) / 60_000,
      maxRainChance: rain,
      maxWindKph: wind,
      maxUv: uv,
      qualifies:
        !storm &&
        rain <= thresholds.maxRainChance &&
        wind <= thresholds.maxWindKph &&
        uv <= thresholds.maxUv,
    });
  }
  if (!slots.length)
    return result(
      "incomplete",
      "There are no remaining hourly forecasts for today at this location. Refresh for the new day.",
    );
  if (slots[0].start !== now || slots[slots.length - 1].end !== midnight) {
    return result(
      "incomplete",
      "The forecast does not cover the rest of today at this location. Refresh before planning.",
    );
  }

  const segments: ActivityWindow[] = [];
  for (const slot of slots) {
    if (!slot.qualifies) continue;
    const active = segments[segments.length - 1];
    if (active?.end === slot.start) {
      active.end = slot.end;
      active.maxRainChance = Math.max(active.maxRainChance, slot.maxRainChance);
      active.maxWindKph = Math.max(active.maxWindKph, slot.maxWindKph);
      active.maxUv = Math.max(active.maxUv, slot.maxUv);
    } else {
      segments.push({
        start: slot.start,
        end: slot.end,
        durationMinutes: slot.durationMinutes,
        maxRainChance: slot.maxRainChance,
        maxWindKph: slot.maxWindKph,
        maxUv: slot.maxUv,
      });
    }
  }
  const windows = segments
    .filter((segment) => segment.end - segment.start >= thresholds.durationMinutes * 60_000)
    .map((segment) => ({
      ...segment,
      durationMinutes: Math.floor((segment.end - segment.start) / 60_000),
    }));
  if (!windows.length)
    return result(
      "no-window",
      "No remaining window today meets all your limits for the chosen duration. You can adjust the limits.",
    );
  return {
    status: "ready",
    windows,
    explanation: `Hourly model forecasts meet your limits for at least ${thresholds.durationMinutes} minutes: rain chance up to ${thresholds.maxRainChance}%, wind up to ${thresholds.maxWindKph} km/h and UV up to ${thresholds.maxUv}. Forecasts can change; these windows are not guarantees.`,
  };
}
