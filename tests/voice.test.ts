import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyNarration, summaryFilename } from "../src/lib/voice";
import { LONDON, type Weather } from "../src/lib/weather";
const now = Date.UTC(2026, 9, 13, 14, 30);
const weather = {
  timezone: "Europe/London",
  current: {
    time: now / 1000,
    temperature_2m: 19.8,
    apparent_temperature: 17.2,
    weather_code: 2,
    wind_speed_10m: 22,
    wind_direction_10m: 225,
  },
  daily: {
    time: [Date.UTC(2026, 9, 13, 0) / 1000],
    sunrise: [Date.UTC(2026, 9, 13, 7) / 1000],
    sunset: [Date.UTC(2026, 9, 13, 18) / 1000],
    temperature_2m_max: [22],
    temperature_2m_min: [14],
  },
  hourly: {
    time: [now / 1000 - 3600, now / 1000, now / 1000 + 3600],
    precipitation_probability: [90, 20, 35],
    uv_index: [1, 2, 1],
  },
} as Weather;
test("spoken summary uses the selected units, actual provider time, and only remaining rain", () => {
  const text = dailyNarration(weather, LONDON, "f", now, false);
  assert.match(text, /67.6 degrees Fahrenheit/);
  assert.match(text, /at 15:30 local time/);
  assert.match(text, /today is 35 percent/);
  assert.match(text, /southwest at 22/);
  assert.doesNotMatch(text, /90 percent|offline|hour old/);
});
test("offline and stale narration identify saved readings without claiming another day is today", () => {
  const text = dailyNarration(weather, LONDON, "c", now + 86400000, true);
  assert.match(text, /You are offline/);
  assert.match(text, /19.8 degrees Celsius/);
  assert.match(text, /That day’s high/);
  assert.match(text, /that day’s forecast is 90 percent/);
  assert.doesNotMatch(text, /Today’s high|hours remaining today/);
  assert.match(dailyNarration(weather, LONDON, "c", now + 7200000, false), /over an hour old/);
});
test("audio filenames retain the reading date, place, and chosen voice", () => {
  assert.equal(summaryFilename(LONDON, weather, "sage"), "nou-london-2026-10-13-sage.wav");
});

test("a reading before midnight keeps the new day's forecast distinct", () => {
  const afterMidnight = Date.UTC(2026, 9, 14, 0, 5);
  const boundary = {
    ...weather,
    timezone: "UTC",
    current: { ...weather.current, time: Date.UTC(2026, 9, 13, 23, 45) / 1000 },
    daily: { ...weather.daily, time: [Date.UTC(2026, 9, 14, 0) / 1000] },
  };
  const text = dailyNarration(boundary, LONDON, "c", afterMidnight, false);
  assert.match(text, /Wednesday,? 14 October/);
  assert.match(text, /at 23:45 local time/);
  assert.match(text, /Today’s high/);
});
