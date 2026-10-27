import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activityWindows,
  ACTIVITY_PRESETS,
  type ActivityForecast,
} from "../src/lib/activity-windows";

const now = Date.UTC(2026, 9, 26, 10, 30);
const hours = Array.from({ length: 24 }, (_, hour) => Date.UTC(2026, 9, 26, hour) / 1000);
function forecast(): ActivityForecast {
  return {
    timezone: "UTC",
    fetchedAt: now,
    current: { time: now / 1000 },
    hourly: {
      time: [...hours],
      precipitation_probability: hours.map(() => 10),
      uv_index: hours.map(() => 2),
      wind_speed_10m: hours.map(() => 15),
      weather_code: hours.map(() => 1),
    },
  };
}

test("windows include only the remaining part of today and explain model thresholds", () => {
  const result = activityWindows(forecast(), ACTIVITY_PRESETS.walk, { now });
  assert.equal(result.status, "ready");
  assert.equal(result.windows[0].start, now);
  assert.equal(result.windows[0].end, Date.UTC(2026, 9, 27));
  assert.equal(result.windows[0].durationMinutes, 810);
  assert.match(result.explanation, /20%.*25 km\/h.*UV up to 5/);
  assert.match(result.explanation, /not guarantees/);
});

test("a disqualifying hour splits contiguous windows and every threshold is enforced", () => {
  const weather = forecast();
  weather.hourly.precipitation_probability[12] = 50;
  weather.hourly.wind_speed_10m![14] = 40;
  weather.hourly.uv_index[16] = 9;
  const result = activityWindows(
    weather,
    { ...ACTIVITY_PRESETS.walk, durationMinutes: 90 },
    { now },
  );
  assert.deepEqual(
    result.windows.map((window) => [window.start, window.end]),
    [
      [now, Date.UTC(2026, 9, 26, 12)],
      [Date.UTC(2026, 9, 26, 17), Date.UTC(2026, 9, 27)],
    ],
  );
});

test("fresh local midnight readings do not reuse yesterday's forecast", () => {
  const afterMidnight = Date.UTC(2026, 9, 26, 22, 5);
  const weather = forecast();
  weather.timezone = "Africa/Johannesburg";
  weather.current.time = afterMidnight / 1000;
  weather.fetchedAt = afterMidnight;
  assert.equal(
    activityWindows(weather, ACTIVITY_PRESETS.walk, { now: afterMidnight }).status,
    "incomplete",
  );
});

test("the selected timezone, rather than UTC, bounds today's final window", () => {
  const nearMidnight = Date.UTC(2026, 9, 26, 21, 30);
  const weather = forecast();
  weather.timezone = "Africa/Johannesburg";
  weather.current.time = nearMidnight / 1000;
  weather.fetchedAt = nearMidnight;
  const result = activityWindows(
    weather,
    { ...ACTIVITY_PRESETS.walk, durationMinutes: 15 },
    { now: nearMidnight },
  );
  assert.equal(result.windows[0].end, Date.UTC(2026, 9, 26, 22));
  assert.equal(result.windows[0].durationMinutes, 30);
  assert.equal(
    activityWindows(weather, ACTIVITY_PRESETS.walk, { now: nearMidnight }).status,
    "no-window",
  );
});

test("DST fallback repeated local hours remain consecutive real forecast hours", () => {
  const changedClock = Date.UTC(2026, 9, 25, 0, 30);
  const weather = forecast();
  weather.timezone = "Europe/London";
  weather.current.time = changedClock / 1000;
  weather.fetchedAt = changedClock;
  weather.hourly.time = Array.from(
    { length: 25 },
    (_, hour) => Date.UTC(2026, 9, 24, 23) / 1000 + hour * 3600,
  );
  for (const key of ["precipitation_probability", "uv_index", "wind_speed_10m"] as const)
    weather.hourly[key] = weather.hourly.time.map(() => 2);
  const result = activityWindows(weather, ACTIVITY_PRESETS.walk, { now: changedClock });
  assert.equal(result.status, "ready");
  assert.equal(result.windows[0].start, changedClock);
  assert.equal(result.windows[0].end, Date.UTC(2026, 9, 26));
});

test("offline and stale readings suppress otherwise qualifying windows", () => {
  assert.equal(
    activityWindows(forecast(), ACTIVITY_PRESETS.walk, { now, offline: true }).status,
    "offline",
  );
  assert.equal(
    activityWindows(forecast(), ACTIVITY_PRESETS.walk, { now: now + 3_600_001 }).status,
    "stale",
  );
  assert.equal(
    activityWindows(forecast(), ACTIVITY_PRESETS.walk, { now, stale: true }).status,
    "stale",
  );
  const oldProvider = forecast();
  oldProvider.current.time -= 3601;
  assert.equal(activityWindows(oldProvider, ACTIVITY_PRESETS.walk, { now }).status, "stale");
});

test("missing future wind is incomplete even with a calm current wind", () => {
  const weather = { ...forecast(), current: { time: now / 1000, wind_speed_10m: 0 } };
  delete weather.hourly.wind_speed_10m;
  assert.equal(activityWindows(weather, ACTIVITY_PRESETS.walk, { now }).status, "incomplete");
  weather.hourly.wind_speed_10m = [0];
  assert.equal(activityWindows(weather, ACTIVITY_PRESETS.walk, { now }).status, "incomplete");
});

test("gaps, invalid values and invalid timezones cannot produce recommendations", () => {
  const missingHour = forecast();
  missingHour.hourly.time[14] += 3600;
  assert.equal(activityWindows(missingHour, ACTIVITY_PRESETS.walk, { now }).status, "incomplete");
  const missingUv = forecast();
  missingUv.hourly.uv_index[14] = Number.NaN;
  assert.equal(activityWindows(missingUv, ACTIVITY_PRESETS.walk, { now }).status, "incomplete");
  assert.equal(
    activityWindows({ ...forecast(), timezone: "invalid" }, ACTIVITY_PRESETS.walk, { now }).status,
    "incomplete",
  );
});

test("no matching hours, thunderstorm forecasts and invalid preferences are explicit", () => {
  const rainy = forecast();
  rainy.hourly.precipitation_probability.fill(100);
  assert.equal(activityWindows(rainy, ACTIVITY_PRESETS.walk, { now }).status, "no-window");
  const storms = forecast();
  storms.hourly.weather_code!.fill(95);
  assert.equal(activityWindows(storms, ACTIVITY_PRESETS.walk, { now }).status, "no-window");
  assert.equal(
    activityWindows(forecast(), { ...ACTIVITY_PRESETS.walk, durationMinutes: -1 }, { now }).status,
    "invalid",
  );
});
