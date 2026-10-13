# Nou

**Weather for now.** A weather app focused entirely on the current day, inspired by the attached ivory, pale blue, citron, and native iOS interface references.

Next.js 16 App Router · React 19 · TypeScript · Tailwind CSS 4 · Motion · Three.js / React Three Fiber · Phosphor · MapLibre · oxfmt · oxlint. Dependencies are resolved in `pnpm-lock.yaml`; Node 24 and pnpm are required.

```sh
pnpm install
pnpm dev
```

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm start
```

## The experience

- Live local clock and current weather with an explicit provider update timestamp. Weather refreshes every five minutes, on reconnect, and when returning to the app.
- The automatic theme follows the selected location’s sunrise and sunset. Light and dark overrides persist on the device. The page, loading states, offline screen, browser chrome, and manifest share the same palette.
- Weather-responsive, physically lit 3D cloud, sun, moon, rain, and snow sculptures. Pointer interaction, reduced-motion support, and an SVG fallback for devices without WebGL.
- Only today’s remaining hours, temperature and rain charts, wind, humidity, UV, daylight, visibility, pressure, and air quality.
- Real city search, optional device geolocation, saved places, Celsius/Fahrenheit, native sharing, browser Back/Forward navigation, and home screen shortcuts.
- Installable PWA with standalone mode, maskable icons, safe-area support, bounded offline caches, last saved weather, and offline fallback. iOS installation uses Safari’s Share → Add to Home Screen. Browser and operating-system capabilities control install prompts and launch-screen updates.

## Data

Current conditions are **Open-Meteo weather model estimates**, generally updated in 15-minute intervals; they are not second-by-second thermometer measurements. The live clock is exact to the device clock. Hourly values are forecasts for the selected location’s current calendar day. Air quality comes from CAMS via Open-Meteo and may be unavailable in some places. No invented weather data is used.

- [Open-Meteo](https://open-meteo.com/) — weather, geocoding, and air quality. Its free endpoint is intended for non-commercial use. Use the appropriate paid service if operating commercially.
- [OpenStreetMap](https://www.openstreetmap.org/copyright) — real map tiles. [Nominatim](https://nominatim.org/) — reverse geocoding, requested only for device location.
- [RainViewer](https://www.rainviewer.com/) — latest available precipitation radar; timestamp displayed. Coverage and availability vary.
- [Manrope](https://github.com/sharanda/manrope) — self-hosted variable font, SIL Open Font License included in `public/fonts/OFL.txt`.

The supplied web.dev theming guide informed browser metadata and theme behavior. The supplied Google share link resolves to a background-matching query; its AI response and Mobbin’s authenticated iOS library were not accessible to automated research. Native iOS patterns and the supplied images informed the implementation directly.

Preferences, places, and last readings are stored locally on the user’s device. The server proxies public data sources without private API keys. Coordinates are validated before external requests. Geolocation is never requested automatically.

## Deployment

Import `thembaxx/nou` into Vercel, select Next.js and Node 24, and use `pnpm install --frozen-lockfile` with `pnpm build`. No environment variables are required for the public non-commercial data endpoints.

`pnpm assets` regenerates the logo icons and social card. `pnpm test:e2e` runs browser integration checks against an app started at `http://localhost:3000` (or `BASE_URL`). Run `pnpm exec playwright install chromium` first.

## Identity and discovery

Nou means “now” in Afrikaans. Its tagline is **Weather for now.** The custom n/sun/horizon symbol and outlined Manrope wordmark are shared across the interface, loading screen, favicon, PWA icons, and social preview. Downloadable SVG assets and a visual brand guide are in `public/brand/`; the brand rationale and motion guidance are in `docs/brand.md`.

Search metadata uses the verified production origin `https://nou-six.vercel.app`, canonical URLs, Open Graph/Twitter previews, and factual Brand, WebSite, and WebApplication JSON-LD. `/about` provides visible, server-rendered product and data-source information. `/robots.txt` and `/sitemap.xml` identify the indexable pages. `/llms.txt` follows the proposed Markdown format; `/llms-full.txt` provides expanded factual context. `/LLM.txt` and `/llm.txt` redirect to `/llms.txt`.

Mobile navigation is icon-only, retains accessible names, and uses a shared spring selection indicator. Mobile sheets slide from the bottom and support dragging the handle to dismiss. Spring timing, press feedback, and small page transitions follow iOS patterns and respect reduced-motion preferences.

## Touch, pointer and little discoveries

Swipe left or right on mobile to move between Today, Map, and Places. Pull down from the top of the page to request fresh weather. The map, interactive controls, chart, and sky retain their own gestures. Drag the hourly forecast with a mouse to scrub through readings; its focused hour buttons support arrow keys, Home, and End.

The sky tilts with the pointer, turns with horizontal dragging, settles with momentum, and spins on a double tap, double click, or Enter. Metric cards follow the mouse softly; saving a place adds a small burst. Temperature changes use a short spring transition. The scene pauses rendering outside the viewport and while the page is hidden. Reduced motion disables decorative movement.

Press `/` to search and `R` to refresh outside a text field. Keyboard shortcuts can be disabled in preferences. Type `now` or tap the Nou logo five times to discover a quiet 12-second breathing moment. Escape and the close controls return to the weather and restore focus. These interactions never alter the weather data.
