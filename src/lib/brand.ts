export const BRAND = {
  name: "Nou",
  wordmark: "nou.",
  tagline: "Weather for now.",
  title: "Nou — Today's Weather, Beautifully Simple",
  description:
    "Stay in the present with Nou. See current weather, today’s hourly forecast, air quality and rain radar in a calm, beautifully simple weather app.",
  origin: "https://nou-six.vercel.app",
  repository: "https://github.com/thembaxx/nou",
  story:
    "Nou is weather for the day you’re in. A clear reading, a little context, and a calmer way to step outside.",
  colors: {
    ivory: "#f5f4ef",
    ink: "#252922",
    citron: "#f0fa8c",
    mist: "#e2eae7",
    night: "#141614",
  },
} as const;

export const MARK_PATH = "M6 25V15.5a10 10 0 0 1 20 0V25h-6V15.5a4 4 0 0 0-8 0V25H6Z";

export function absoluteUrl(path = "/") {
  return new URL(path, BRAND.origin).toString();
}
