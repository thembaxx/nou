import { NextRequest, NextResponse } from "next/server";
import { BRAND } from "@/lib/brand";

export async function GET(request: NextRequest) {
  const dark = request.nextUrl.searchParams.get("theme") === "dark";
  const color = dark ? "#141614" : "#f5f4ef";
  return NextResponse.json(
    {
      id: "/",
      name: `${BRAND.name} · ${BRAND.tagline}`,
      short_name: BRAND.name,
      description: BRAND.description,
      lang: "en",
      start_url: "/",
      scope: "/",
      display: "standalone",
      display_override: ["standalone", "minimal-ui"],
      background_color: color,
      theme_color: color,
      orientation: "any",
      categories: ["weather", "lifestyle"],
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        {
          src: "/icons/maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
      shortcuts: [
        {
          name: "Today’s weather",
          short_name: "Today",
          url: "/",
          icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
        },
        {
          name: "Weather map",
          short_name: "Map",
          url: "/?view=map",
          icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
        },
        {
          name: "Saved places",
          short_name: "Places",
          url: "/?view=places",
          icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
