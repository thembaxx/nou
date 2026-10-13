import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat"),
    lon = request.nextUrl.searchParams.get("lon");
  if (
    !lat ||
    !lon ||
    !Number.isFinite(Number(lat)) ||
    !Number.isFinite(Number(lon)) ||
    Math.abs(Number(lat)) > 90 ||
    Math.abs(Number(lon)) > 180
  )
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${new URLSearchParams({ lat, lon, format: "jsonv2", zoom: "10", "accept-language": "en" })}`,
      {
        headers: { "User-Agent": "NouWeather/1.0 (https://github.com/thembaxx/nou)" },
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!r.ok) throw new Error();
    const data = await r.json();
    const address = data.address ?? {};
    return NextResponse.json({
      name: address.city ?? address.town ?? address.village ?? address.county ?? "Your location",
      country: address.country ?? "",
    });
  } catch {
    return NextResponse.json({ name: "Your location", country: "" });
  }
}
