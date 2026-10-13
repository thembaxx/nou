import { NextRequest, NextResponse } from "next/server";
import { getWeather } from "@/lib/weather-server";

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lon = request.nextUrl.searchParams.get("lon");
  const latitude = Number(lat),
    longitude = Number(lon);
  if (
    !lat ||
    !lon ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    return NextResponse.json(
      { error: "A valid latitude and longitude are required." },
      { status: 400 },
    );
  try {
    return NextResponse.json(await getWeather(latitude, longitude), {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" },
    });
  } catch {
    return NextResponse.json(
      { error: "Weather is taking a moment. Please try again." },
      { status: 502 },
    );
  }
}
