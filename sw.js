const CACHE = "hl-activity-v10-shell-v103";
const SHELL = [
  "/",
  "/home.css",
  "/home.js",
  "/home-v10.js?v=10",
  "/hl-v4.css?v=4",
  "/hl-v10.css?v=10",
  "/hl-v102.css?v=102",
  "/hl-v103.css?v=103",
  "/hl-pwa.js?v=10",
  "/logo-hl.png",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
  "/not-found.css"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("hl-activity-") && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.includes("/api/socket.io") || url.pathname.startsWith("/socket.io")) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone()).catch(() => {});
        return response;
      } catch {
        return (await caches.match(request)) || (await caches.match("/"));
      }
    })());
    return;
  }

  if (!/\.(?:css|js|png|svg|ico|webmanifest|wav)$/i.test(url.pathname)) return;
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) {
      event.waitUntil(fetch(request).then(response => response.ok ? caches.open(CACHE).then(cache => cache.put(request, response.clone())) : null).catch(() => {}));
      return cached;
    }
    const response = await fetch(request);
    if (response.ok) caches.open(CACHE).then(cache => cache.put(request, response.clone())).catch(() => {});
    return response;
  })());
});
