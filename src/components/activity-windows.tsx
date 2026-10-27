"use client";

import { useState } from "react";
import type { Weather } from "@/lib/weather";
import { activityWindows, ACTIVITY_PRESETS, type ActivityThresholds } from "@/lib/activity-windows";

export function ActivityWindows({
  weather,
  now,
  offline,
  stale,
}: {
  weather: Weather;
  now: number;
  offline: boolean;
  stale: boolean;
}) {
  const [thresholds, setThresholds] = useState<ActivityThresholds>(ACTIVITY_PRESETS.walk);
  const result = activityWindows(weather, thresholds, { now, offline, stale });
  const time = (value: number) =>
    new Intl.DateTimeFormat("en", {
      timeZone: weather.timezone,
      hour: "numeric",
      minute: "2-digit",
    }).format(value);
  return (
    <section className="forecast-card" aria-labelledby="activity-window-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">PLAN A LITTLE MOMENT</span>
          <h2 id="activity-window-title">Best time today</h2>
        </div>
      </div>
      <p>
        Choose your limits for a walk, errand or laundry. These are model forecasts; check
        conditions before heading out.
      </p>
      <label>
        Activity{" "}
        <select
          onChange={(e) =>
            setThresholds({ ...ACTIVITY_PRESETS[e.target.value as keyof typeof ACTIVITY_PRESETS] })
          }
          defaultValue="walk"
        >
          <option value="walk">Walk</option>
          <option value="errand">Errand</option>
          <option value="laundry">Laundry</option>
        </select>
      </label>
      <div className="metric-grid">
        {(
          [
            ["maxRainChance", "Maximum rain chance (%)", 100],
            ["maxWindKph", "Maximum wind (km/h)", 200],
            ["maxUv", "Maximum UV index", 30],
            ["durationMinutes", "Time needed (minutes)", 360],
          ] as const
        ).map(([key, label, max]) => (
          <label key={key}>
            {label}
            <input
              type="number"
              min={key === "durationMinutes" ? 15 : 0}
              max={max}
              value={thresholds[key]}
              onChange={(e) => setThresholds((old) => ({ ...old, [key]: Number(e.target.value) }))}
            />
          </label>
        ))}
      </div>
      <p role="status">{result.explanation}</p>
      {result.windows.length > 0 && (
        <ul>
          {result.windows.slice(0, 3).map((window) => (
            <li key={window.start}>
              <strong>
                {time(window.start)}–{time(window.end)}
              </strong>{" "}
              · rain up to {window.maxRainChance}%, wind {window.maxWindKph} km/h, UV {window.maxUv}
              .
            </li>
          ))}
        </ul>
      )}
      <small>
        Times in {weather.timezone}. Rain chance, wind and UV must all fit your limits. Saved or
        incomplete forecasts cannot support a recommendation.
      </small>
    </section>
  );
}
