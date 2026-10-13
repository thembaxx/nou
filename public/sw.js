/* Pin every app chunk to this deployment, including lazy views. */
importScripts("/sw-assets.js");
const VERSION = `nou-v6-${self.__NOU_BUILD.id}`;
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const API = `${VERSION}-data`;
const PRECACHE = [
  ...self.__NOU_BUILD.assets,
  "/offline.html", "/icon.svg", "/favicon.svg", "/icons/icon-192.png",
  "/icons/icon-512.png", "/icons/maskable-512.png", "/icons/apple-touch-icon.png",
  "/fonts/manrope.woff2", "/manifest.webmanifest",
  "/api/manifest?theme=light", "/api/manifest?theme=dark",
  "/vendor/maplibre/maplibre-gl-worker.mjs",
  ...["ember", "luna", "nova", "sage"].flatMap(voice => [
    `/voices/notices/${voice}-offline.wav`, `/voices/previews/${voice}.mp3`,
  ]),
];
self.addEventListener("install", event => {
  // The client explicitly activates waiting updates without interrupting an open session.
  event.waitUntil(caches.open(STATIC).then(cache => cache.addAll(PRECACHE)));
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const previousStatic = keys.filter(key => /^nou-v\d+(?:-[a-f0-9]+)?-static$/.test(key) && key !== STATIC).at(-1);
    // Voice downloads and generated audio survive app updates.
    await Promise.all(keys.filter(key => /^nou-v\d+(?:-[a-f0-9]+)?-(static|pages|data)$/.test(key)
      && ![STATIC, PAGES, API, previousStatic].includes(key)).map(key => caches.delete(key)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});
async function savePage(request, response) {
  if (!response.ok || !response.headers.get("Content-Type")?.includes("text/html")) return;
  const cache = await caches.open(PAGES);
  await cache.put(new URL(request.url).pathname, response.clone());
  await limit(cache, 8);
}
self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") event.waitUntil(self.skipWaiting());
  if (event.data?.type === "CACHE_PAGES") {
    event.waitUntil(Promise.allSettled(["/", "/about"].map(async path => {
      const request = new Request(new URL(path, self.location.origin), { headers: { Accept: "text/html" } });
      await savePage(request, await fetch(request));
    })));
  }
});
async function limit(cache, maximum) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - maximum)).map(key => cache.delete(key)));
}
async function navigation(event) {
  const request = event.request;
  const path = new URL(request.url).pathname;
  const cache = await caches.open(PAGES);
  let timer;
  const network = (async () => (await event.preloadResponse) || fetch(request))();
  event.waitUntil(network.then(response => savePage(request, response)).catch(() => {}));
  try {
    const response = await Promise.race([
      network,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Offline timeout")), 5000); }),
    ]);
    if (response.status < 500) return response;
    return (await cache.match(path)) || response;
  } catch {
    // Do not substitute the home page for another route or a Server Component response.
    return (await cache.match(path)) || (await (await caches.open(STATIC)).match("/offline.html"));
  } finally { clearTimeout(timer); }
}
self.addEventListener("fetch", event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(navigation(event));
  } else if (url.pathname === "/api/weather") {
    event.respondWith((async () => {
      const cache = await caches.open(API);
      try {
        const response = await fetch(request);
        if (!response.ok) return (await cache.match(request)) || response;
        const headers = new Headers(response.headers);
        headers.set("X-Nou-Saved-Reading", "1");
        try {
          await cache.put(request, new Response(await response.clone().arrayBuffer(), {
            status: response.status, statusText: response.statusText, headers,
          }));
          await limit(cache, 15);
        } catch { /* Storage pressure must not discard a successful live reading. */ }
        return response;
      } catch {
        return (await cache.match(request)) || new Response(JSON.stringify({
          error: "You’re offline and no saved reading is available for this place.",
        }), { status: 503, headers: { "Content-Type": "application/json" } });
      }
    })());
  } else if (url.pathname.startsWith("/_next/static/") || PRECACHE.includes(url.pathname) || url.pathname === "/api/manifest") {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC);
      return (await cache.match(request)) || (url.pathname.startsWith("/_next/static/") && await caches.match(request)) || fetch(request);
    })());
  } else if (url.pathname.startsWith("/vendor/voice-runtime/")) {
    // Large optional speech binaries belong only to explicit voice downloads.
    event.respondWith((async () => (await (await caches.open("nou-voice-v1")).match(request)) || fetch(request))());
  }
});
