import { BRAND } from "./brand";
import { THEME_COLORS } from "./theme";

export function appManifest(appearance: "light" | "dark" = "light") {
  const color = THEME_COLORS[appearance];
  return {
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
    launch_handler: { client_mode: "navigate-existing" },
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today’s weather", short_name: "Today", url: "/" },
      { name: "Weather map", short_name: "Map", url: "/?view=map" },
      { name: "Saved places", short_name: "Places", url: "/?view=places" },
    ].map((shortcut) => ({
      ...shortcut,
      icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    })),
  };
}
