import { NextRequest, NextResponse } from "next/server";
import { appManifest } from "@/lib/manifest";

export async function GET(request: NextRequest) {
  return NextResponse.json(
    appManifest(request.nextUrl.searchParams.get("theme") === "dark" ? "dark" : "light"),
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
