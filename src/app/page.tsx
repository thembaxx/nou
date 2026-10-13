import NouApp from "@/components/nou-app";
import { LONDON } from "@/lib/weather";
import { getWeather } from "@/lib/weather-server";

export const dynamic = "force-dynamic";

export default async function Page() {
  const weather = await getWeather(LONDON.latitude, LONDON.longitude).catch(() => null);
  return <NouApp initialWeather={weather} />;
}
