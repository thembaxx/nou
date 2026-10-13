import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("https://api.rainviewer.com/public/weather-maps.json", {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) throw new Error();
    const json = await response.json();
    const frame = json.radar?.past?.at(-1);
    if (
      !frame ||
      typeof json.host !== "string" ||
      !json.host.startsWith("https://tilecache.rainviewer.com")
    )
      throw new Error();
    return NextResponse.json({ host: json.host, path: frame.path, time: frame.time });
  } catch {
    return NextResponse.json({ error: "Radar is temporarily unavailable." }, { status: 502 });
  }
}
