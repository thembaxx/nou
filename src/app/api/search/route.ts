import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 100) return NextResponse.json({ places: [] });
  try {
    const r = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: q, count: "8", language: "en", format: "json" })}`,
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) },
    );
    if (!r.ok) throw new Error();
    const json = await r.json();
    return NextResponse.json({
      places: (json.results ?? []).map(
        (p: {
          id: number;
          name: string;
          country?: string;
          latitude: number;
          longitude: number;
          admin1?: string;
        }) => ({
          id: p.id.toString(),
          name: p.name,
          country: p.country ?? "",
          latitude: p.latitude,
          longitude: p.longitude,
          region: p.admin1,
        }),
      ),
    });
  } catch {
    return NextResponse.json(
      { error: "Search is unavailable. Try again in a moment." },
      { status: 502 },
    );
  }
}
