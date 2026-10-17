# Nou

A current-day weather experience with location-aware timing and a visual, interactive interface.

[Browse the source](https://github.com/thembaxx/nou)

## Engineering highlights

Explicit provider update timestamps, reconnect refresh, persisted theme overrides and on-demand visual tooling. Forecasts depend on upstream providers.

## Technology

Declared in [package.json](package.json): Next.js `^16.4.0` · React `^19.3.0` · TypeScript `^7.0.2` · Tailwind CSS `^4.3.3` · Three.js `^0.186.1` · Motion `^14.1.1` · React Three Fiber `^9.8.1` · MapLibre `^6.14.0` · Transformers.js `3.8.1`.

**Quality tooling:** `lint`, `format:check`, `typecheck`, `test`, `test:e2e` scripts are available. See the setup guide below for prerequisites; this documentation pass does not assert that those checks were run.

---

## Project guide

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
- **Device** appearance follows the operating system, including changes while Nou is open. Startup and offline pages resolve the saved appearance before hydration; stale daylight readings use the selected timezone.
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

`pnpm assets` regenerates the logo icons and social card. `pnpm test:e2e` runs browser integration checks against an app started at `http://localhost:3000` (or `BASE_URL`). Run `pnpm exec playwright install --with-deps chromium webkit` first. PWA checks use desktop/mobile Chromium and mobile WebKit; test offline behavior against `pnpm build` followed by `pnpm start`.

## PWA lifecycle

`pnpm build` also generates `/sw-assets.js` from the finished Next.js build. It pins all JavaScript and CSS, including lazy-loaded views, to the deployment. Always run the full build command before serving production. Development does not register a service worker.

The worker precaches the app assets, font, icons, voice previews, themed manifests, and offline fallback. After activation, it saves the home and About pages. Offline shortcuts retain their requested view; uncached routes show the offline page instead of silently returning home-page HTML. React Server Component requests are never answered with cached HTML. Navigation prefers the network, falling back to a saved page after five seconds on a stalled connection. Weather falls back to saved responses with an explicit saved-reading label, then refreshes on reconnect.

Updates wait until **Update Nou** is chosen or existing app windows close. One previous deployment’s static cache is retained for other open tabs; page and weather caches are limited to 8 and 15 entries. Explicit voice downloads and generated audio survive app updates. Home screen installation requests persistent storage where supported; browsers can still evict offline data.

Installation instructions adapt to iPhone/iPad, Android, and desktop. Standalone detection includes iOS home screen launches. Supported browsers reuse the existing app window when launching a shortcut. Browser chrome, page backgrounds, and manifest launch colors follow the chosen appearance. Installed splash screens and iOS status-bar updates are controlled by the browser and operating system and may retain launch-time settings. Live weather and uncached map tiles require a connection.

## Identity and discovery

Nou means “now” in Afrikaans. Its tagline is **Weather for now.** The custom n/sun/horizon symbol and outlined Manrope wordmark are shared across the interface, loading screen, favicon, PWA icons, and social preview. Downloadable SVG assets and a visual brand guide are in `public/brand/`; the brand rationale and motion guidance are in `docs/brand.md`.

Search metadata uses the verified production origin `https://nou-six.vercel.app`, canonical URLs, Open Graph/Twitter previews, and factual Brand, WebSite, and WebApplication JSON-LD. `/about` provides visible, server-rendered product and data-source information. `/robots.txt` and `/sitemap.xml` identify the indexable pages. `/llms.txt` follows the proposed Markdown format; `/llms-full.txt` provides expanded factual context. `/LLM.txt` and `/llm.txt` redirect to `/llms.txt`.

Mobile navigation is icon-only, retains accessible names, and uses a shared spring selection indicator. Mobile sheets slide from the bottom and support dragging the handle to dismiss. Spring timing, press feedback, and small page transitions follow iOS patterns and respect reduced-motion preferences.

## Touch, pointer and little discoveries

Swipe left or right on mobile to move between Today, Map, and Places. Pull down from the top of the page to request fresh weather. The map, interactive controls, chart, and sky retain their own gestures. Drag the hourly forecast with a mouse to scrub through readings; its focused hour buttons support arrow keys, Home, and End.

The sky tilts with the pointer, turns with horizontal dragging, settles with momentum, and spins on a double tap, double click, or Enter. Metric cards follow the mouse softly; saving a place adds a small burst. Temperature changes use a short spring transition. The scene pauses rendering outside the viewport and while the page is hidden. Reduced motion disables decorative movement.

Press `/` to search and `R` to refresh outside a text field. Keyboard shortcuts can be disabled in preferences. Type `now` or tap the Nou logo five times to discover a quiet 12-second breathing moment. Escape and the close controls return to the weather and restore focus. These interactions never alter the weather data.

## Voice and first-visit onboarding

The four-step welcome tour appears on a first visit and remembers completion or Skip on this device. **Preferences → Replay the welcome tour** opens it again. Voice previews and the interactive weather sculpture follow the attached pastel, pill-shaped, native interface references. The final step applies the app's existing appearance and temperature preferences.

Choose **Ember** (Kokoro af_heart), **Luna** (af_nicole), **Nova** (af_bella), or **Sage** (bm_george) in onboarding or **Preferences → Voice & downloads**. The checked-in preview MP3s are actual Kokoro-generated recordings. The waveform reads the audio analyser, and preview playback is always initiated by a visitor.

**Listen to today** reads a deterministic summary of the selected place's actual weather response, chosen units, model reading time, and remaining daily forecast. It identifies offline/stale readings. Speech runs locally in a dedicated Web Worker with Kokoro-82M, Transformers.js, and a ONNX WebAssembly runtime using up to two threads in browsers that support isolation. Weather text is never sent to a speech service. WAV audio can be saved after generation. A microphone and API credentials are not required.

The first offline voice downloads a shared engine of approximately **110 MB**; additional styles are approximately **0.5 MB** each. These files are explicitly downloaded into persistent browser caches, separate from versioned PWA app caches. Download progress, cancellation, removal, pause/replay, errors, and a readable transcript are provided. The last six generated audio summaries are cached by their exact text and voice. Offline replay prefixes a real recording in that same voice identifying the saved reading. Browser storage eviction can remove downloaded voices or audio. Audio generation time depends on the device. First Listen performs the same setup when the chosen voice is not already downloaded; its size is shown on the homepage button.

`pnpm voice:runtime` builds the browser worker, copies the matching WASM runtime and voice styles from installed packages, and copies the Apache license. It also runs before `pnpm dev` and `pnpm build`. Generated runtime binaries are ignored by Git. Model weights are downloaded from the pinned Hugging Face revision `1939ad2a8e416c0acfeecc08a694d14ef25f2231`. `pnpm voice:previews` generates source WAV recordings in `/tmp/nou-voice-previews`; the checked-in MP3s are compressed with FFmpeg.

Kokoro and its model weights are Apache-2.0 licensed. [Kokoro](https://github.com/hexgrad/kokoro) · [Pinned ONNX model](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX). The branded names identify synthetic voices, not real individuals.
