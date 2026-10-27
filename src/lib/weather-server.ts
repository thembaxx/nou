import "server-only";
import type { Weather } from "./weather";

export async function getWeather(latitude: number, longitude: number): Promise<Weather> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
    hourly:
      "temperature_2m,precipitation_probability,precipitation,weather_code,uv_index,visibility,relative_humidity_2m,wind_speed_10m",
    daily: "sunrise,sunset,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    forecast_days: "1",
    timeformat: "unixtime",
  });
  const airParams = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: "european_aqi,us_aqi,pm2_5",
    timezone: "auto",
    forecast_days: "1",
  });
  const [forecast, air] = await Promise.allSettled([
    fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(12000),
    }).then(async (r) => {
      if (!r.ok) throw new Error("Weather provider unavailable");
      return r.json();
    }),
    fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${airParams}`, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(6000),
    }).then(async (r) => (r.ok ? r.json() : null)),
  ]);
  if (forecast.status !== "fulfilled" || !Number.isFinite(forecast.value.current?.temperature_2m))
    throw new Error("Couldn't reach the weather service. Please try again.");
  return {
    ...forecast.value,
    air: air.status === "fulfilled" ? (air.value?.current ?? null) : null,
    fetchedAt: Date.now(),
  };
}
