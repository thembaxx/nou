import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compass,
  hourIndex,
  isDaylight,
  localTime,
  skyKind,
  temperature,
  validPlace,
  type Weather,
} from "../src/lib/weather";

const weather = {
  timezone: "Asia/Tokyo",
  current: { is_day: 1 },
  hourly: { time: [1000, 4600, 8200] },
  daily: { sunrise: [2000], sunset: [9000] },
} as Weather;

test("automatic theme changes at the selected location's sunrise and sunset", () => {
  assert.equal(isDaylight(weather, 1999000), false);
  assert.equal(isDaylight(weather, 2000000), true);
  assert.equal(isDaylight(weather, 8999000), true);
  assert.equal(isDaylight(weather, 9000000), false);
});
test("missing sunrise and sunset use the provider's polar day/night flag", () => {
  const polar = { ...weather, daily: { ...weather.daily, sunrise: [NaN], sunset: [NaN] } };
  assert.equal(isDaylight(polar, 2000000), true);
  assert.equal(isDaylight({ ...polar, current: { ...polar.current, is_day: 0 } }, 2000000), false);
});
test("current hour chooses the most recent hour without including tomorrow", () => {
  assert.equal(hourIndex(weather, 4600000), 1);
  assert.equal(hourIndex(weather, 8199000), 1);
  assert.equal(hourIndex(weather, 10000000), 2);
});
test("the live clock respects the selected timezone, including across midnight", () => {
  const time = Date.UTC(2026, 9, 13, 23, 30);
  assert.equal(localTime(time, "Asia/Tokyo"), "08:30");
  assert.equal(localTime(time, "America/New_York"), "19:30");
});
test("units convert precisely and wind directions wrap at north", () => {
  assert.equal(temperature(0, "f"), "32");
  assert.equal(temperature(-40, "f"), "-40");
  assert.equal(temperature(18.6, "c", true), "18.6");
  assert.equal(compass(360), "N");
  assert.equal(compass(234), "SW");
});
test("weather objects cover WMO snow, drizzle and thunderstorms", () => {
  assert.equal(skyKind(0), "clear");
  assert.equal(skyKind(3), "cloud");
  assert.equal(skyKind(51), "rain");
  assert.equal(skyKind(85), "snow");
  assert.equal(skyKind(95), "storm");
});
test("stored locations reject malformed and out-of-range coordinates", () => {
  assert.equal(validPlace({ id: "x", name: "X", country: "Y", latitude: 91, longitude: 0 }), false);
  assert.equal(
    validPlace({ id: "x", name: "X", country: "Y", latitude: 0, longitude: Infinity }),
    false,
  );
  assert.equal(validPlace({ id: "x", name: "X", country: "Y", latitude: 0, longitude: 0 }), true);
});
