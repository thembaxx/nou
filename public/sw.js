const VERSION = "nou-v2";
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const API = `${VERSION}-data`;
const PRECACHE = ["/offline.html", "/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png", "/manifest.webmanifest", "/fonts/manrope.woff2"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(STATIC).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("nou-") && ![STATIC, PAGES, API].includes(key)).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("message", event => {
  if (event.data?.type === "CACHE_ASSETS" && Array.isArray(event.data.assets)) {
    event.waitUntil((async () => {
      const cache = await caches.open(STATIC);
      await Promise.allSettled(event.data.assets.slice(0, 80).map(async value => {
        const url = new URL(value, self.location.origin);
        if (url.origin !== self.location.origin || !(url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/fonts/") || url.pathname.startsWith("/vendor/"))) return;
        if (await cache.match(url.href)) return;
        const response = await fetch(url.href); if (response.ok) await cache.put(url.href, response);
      }));
      await limit(cache, 120);
    })());
  }
  if (event.data?.type === "CACHE_PAGE") event.waitUntil(fetch("/", { headers: { Accept: "text/html" } }).then(async response => { if (response.ok) (await caches.open(PAGES)).put("/", response); }).catch(() => {}));
});
async function limit(cache, maximum) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - maximum)).map(key => cache.delete(key)));
}
self.addEventListener("fetch", event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) { const cache = await caches.open(PAGES); await cache.put(url.pathname === "/" ? "/" : request, response.clone()); await limit(cache, 8); }
        return response;
      } catch { return (await caches.match(request)) || (await caches.match("/")) || (await caches.match("/offline.html")); }
    })());
  } else if (url.pathname.startsWith("/api/weather")) {
    event.respondWith((async () => {
      try { const response = await fetch(request); if (response.ok) { const cache = await caches.open(API); await cache.put(request, response.clone()); await limit(cache, 15); } return response; }
      catch { return (await caches.match(request)) || new Response(JSON.stringify({ error: "You’re offline and no saved reading is available for this place." }), { status: 503, headers: { "Content-Type": "application/json" } }); }
    })());
  } else if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/vendor/") || PRECACHE.includes(url.pathname)) {
    event.respondWith((async () => {
      const cached = await caches.match(request); if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) { const cache = await caches.open(STATIC); await cache.put(request, response.clone()); await limit(cache, 120); }
      return response;
    })());
  }
});
