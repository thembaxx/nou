export type Place = {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  region?: string;
};

export const LONDON: Place = {
  id: "london",
  name: "London",
  country: "United Kingdom",
  latitude: 51.5074,
  longitude: -0.1278,
};
export const DISCOVER: Place[] = [
  LONDON,
  {
    id: "cape-town",
    name: "Cape Town",
    country: "South Africa",
    latitude: -33.9249,
    longitude: 18.4241,
  },
  { id: "tokyo", name: "Tokyo", country: "Japan", latitude: 35.6762, longitude: 139.6503 },
  {
    id: "new-york",
    name: "New York",
    country: "United States",
    latitude: 40.7128,
    longitude: -74.006,
  },
  { id: "lisbon", name: "Lisbon", country: "Portugal", latitude: 38.7223, longitude: -9.1393 },
];

export type Weather = {
  timezone: string;
  utc_offset_seconds: number;
  latitude: number;
  longitude: number;
  current: {
    time: number;
    interval: number;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    weather_code: number;
    cloud_cover: number;
    pressure_msl: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
  hourly: {
    time: number[];
    temperature_2m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    weather_code: number[];
    uv_index: number[];
    visibility: number[];
    relative_humidity_2m: number[];
  };
  daily: {
    time: number[];
    sunrise: number[];
    sunset: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
  air: { european_aqi: number; us_aqi: number; pm2_5: number } | null;
  fetchedAt: number;
};

export type Unit = "c" | "f";
export type Theme = "auto" | "light" | "dark";

export function temperature(value: number, unit: Unit, precise = false) {
  const converted = unit === "f" ? (value * 9) / 5 + 32 : value;
  return precise ? converted.toFixed(1) : Math.round(converted).toString();
}

export function condition(code: number) {
  if (code === 0) return "Clear skies";
  if (code === 1) return "Mostly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 57) return "Light drizzle";
  if (code >= 61 && code <= 67) return "Rainy";
  if (code >= 71 && code <= 77) return "Snowy";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorms";
  return "Cloudy";
}

export function skyKind(code: number): "clear" | "cloud" | "rain" | "snow" | "storm" {
  if (code <= 1) return "clear";
  if (code <= 48) return "cloud";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "rain";
}

export function isDaylight(weather: Weather, now = Date.now()) {
  const sunrise = weather.daily.sunrise[0] * 1000;
  const sunset = weather.daily.sunset[0] * 1000;
  if (!Number.isFinite(sunrise) || !Number.isFinite(sunset) || sunrise <= 0 || sunset <= sunrise)
    return weather.current.is_day === 1;
  return now >= sunrise && now < sunset;
}

export function hourIndex(weather: Weather, now = Date.now()) {
  let index = 0;
  for (let i = 0; i < weather.hourly.time.length; i++) {
    if (weather.hourly.time[i] * 1000 <= now) index = i;
  }
  return index;
}

export function localTime(time: number, timezone: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }).format(new Date(time));
}

export function compass(degrees: number) {
  return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(degrees / 45) % 8];
}

export function insight(weather: Weather, now = Date.now()) {
  const index = hourIndex(weather, now);
  const remaining = weather.hourly.precipitation_probability.slice(index);
  const rain = Math.max(...remaining);
  const uv = Math.max(...weather.hourly.uv_index.slice(index));
  if (!isDaylight(weather, now))
    return {
      title: "A little night air.",
      text: `${condition(weather.current.weather_code).toLowerCase()} tonight. ${rain >= 40 ? "Keep an umbrella close if you head out." : "A good moment to slow down and look up."}`,
      tag: "Your evening, considered",
      icon: "moon",
    };
  if (weather.current.weather_code >= 95)
    return {
      title: "Stay cozy inside.",
      text: "Thunderstorms in the area. Save the outdoor plans for a clearer spell.",
      tag: "A heads-up for today",
      icon: "rain",
    };
  if (rain >= 40)
    return {
      title: "Bring a little cover.",
      text: `Rain chances reach ${rain}% today. A light layer and an umbrella will come in handy.`,
      tag: "A heads-up for today",
      icon: "rain",
    };
  if (uv >= 6)
    return {
      title: "A little shade helps.",
      text: `UV will reach ${uv.toFixed(1)} today. Bring SPF and enjoy the sun with a little care.`,
      tag: "Your day, considered",
      icon: "sun",
    };
  if (weather.current.temperature_2m < 10)
    return {
      title: "Layer up. Head out.",
      text: "There's a little chill in the air. Grab your favorite layer before you go.",
      tag: "Your day, considered",
      icon: "sun",
    };
  return {
    title: "Make room for outside.",
    text: "A little fresh air goes a long way. Find a moment for a walk, a coffee, or simply being out.",
    tag: "Your day, considered",
    icon: "sun",
  };
}

export function validPlace(value: unknown): value is Place {
  if (!value || typeof value !== "object") return false;
  const p = value as Place;
  return (
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    typeof p.country === "string" &&
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude) &&
    Math.abs(p.latitude) <= 90 &&
    Math.abs(p.longitude) <= 180
  );
}

export function validWeather(value: unknown): value is Weather {
  if (!value || typeof value !== "object") return false;
  const w = value as Weather;
  return (
    typeof w.timezone === "string" &&
    Number.isFinite(w.current?.temperature_2m) &&
    Number.isFinite(w.current?.time) &&
    Array.isArray(w.hourly?.time) &&
    w.hourly.time.length > 0 &&
    Array.isArray(w.daily?.sunrise) &&
    Number.isFinite(w.fetchedAt)
  );
}
