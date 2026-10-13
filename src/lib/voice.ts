import {
  compass,
  condition,
  hourIndex,
  localTime,
  temperature,
  type Place,
  type Unit,
  type Weather,
} from "./weather";

export const VOICES = [
  {
    id: "ember",
    name: "Ember",
    mood: "Warm · Friendly",
    accent: "American English",
    model: "af_heart",
  },
  {
    id: "luna",
    name: "Luna",
    mood: "Calm · Soothing",
    accent: "American English",
    model: "af_nicole",
  },
  {
    id: "nova",
    name: "Nova",
    mood: "Bright · Expressive",
    accent: "American English",
    model: "af_bella",
  },
  {
    id: "sage",
    name: "Sage",
    mood: "Clear · Grounded",
    accent: "British English",
    model: "bm_george",
  },
] as const;
export type VoiceId = (typeof VOICES)[number]["id"];
export const VOICE_CACHE = "nou-voice-v1";
export const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
export const MODEL_REVISION = "1939ad2a8e416c0acfeecc08a694d14ef25f2231";
export const MODEL_URL = `https://huggingface.co/${MODEL_ID}/resolve/${MODEL_REVISION}/onnx/model_quantized.onnx`;
export const RUNTIME_PATH = "/vendor/voice-runtime/v1/";
export const RUNTIME_FILES = [
  "voice-worker.js",
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm",
];
export function validVoice(value: unknown): value is VoiceId {
  return VOICES.some((voice) => voice.id === value);
}
export function voiceById(id: VoiceId) {
  return VOICES.find((voice) => voice.id === id)!;
}

export function dailyNarration(
  weather: Weather,
  place: Place,
  unit: Unit,
  now: number,
  offline: boolean,
) {
  const c = weather.current;
  const degrees = (value: number, precise = false) =>
    `${temperature(value, unit, precise)} degrees`;
  const wind = {
    N: "north",
    NE: "northeast",
    E: "east",
    SE: "southeast",
    S: "south",
    SW: "southwest",
    W: "west",
    NW: "northwest",
  }[compass(c.wind_direction_10m)];
  const dayKey = (time: number) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: weather.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(time));
  const forecastAt = weather.daily.time[0] * 1000;
  const sameDay = dayKey(forecastAt) === dayKey(now);
  const index = hourIndex(weather, now);
  const rain = Math.max(
    ...(sameDay
      ? weather.hourly.precipitation_probability.slice(index)
      : weather.hourly.precipitation_probability),
  );
  const age = now - c.time * 1000;
  const freshness = offline
    ? "You are offline. This is your last saved weather reading."
    : age > 3600000
      ? "This reading is over an hour old. Refresh for the latest weather."
      : "";
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: weather.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(forecastAt));
  return [
    freshness,
    `${place.name}, ${date}.`,
    `The model reading at ${localTime(c.time * 1000, weather.timezone)} local time is ${degrees(c.temperature_2m, true)} ${unit === "c" ? "Celsius" : "Fahrenheit"}, ${condition(c.weather_code).toLowerCase()}.`,
    `Feels like ${degrees(c.apparent_temperature)}. ${sameDay ? "Today’s" : "That day’s"} high: ${temperature(weather.daily.temperature_2m_max[0], unit)}. Low: ${temperature(weather.daily.temperature_2m_min[0], unit)}.`,
    `Rain chance in ${sameDay ? "the hours remaining today" : "that day’s forecast"} is ${rain} percent. Winds from the ${wind} at ${Math.round(c.wind_speed_10m)} kilometres per hour.`,
    "Just today.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function summaryFilename(place: Place, weather: Weather, voice: VoiceId) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: weather.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(weather.current.time * 1000));
  return `nou-${
    place.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "weather"
  }-${day}-${voice}.wav`;
}
