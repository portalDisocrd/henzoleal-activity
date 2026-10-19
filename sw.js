const APP_VERSION = "12.0.7-foundation.8";
const CACHE_PREFIX = "hl-activity-";
const CACHE = `${CACHE_PREFIX}${APP_VERSION}`;

const SHELL = [
  "/",
  "/home.css",
  "/home.js",
  "/styles/home-product.css",
  "/styles/tokens.css",
  "/styles/components.css",
  "/styles/product.css",
  "/frontend/core/app-version.js",
  "/frontend/core/version-guard.js",
  "/frontend/pwa/pwa.js",
  "/frontend/home/home-enhancements.js",
  "/logo-hl.webp",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
  "/not-found.css"
];

function isRealtimeOrDynamic(url) {
  return url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/socket.io") ||
    url.pathname.includes("/api/socket.io") ||
    url.pathname === "/client-config.js";
}

function isStaticAsset(url) {
  return /\.(?:css|js|png|webp|svg|ico|webmanifest|wav)$/i.test(url.pathname);
}

async function fetchFresh(request) {
  return fetch(request, { cache: "no-store" });
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      await cache.addAll(SHELL);
    } catch (error) {
      await caches.delete(CACHE).catch(() => {});
      throw error;
    }
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isRealtimeOrDynamic(url)) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        return await fetchFresh(request);
      } catch {
        return (await caches.match("/")) || Response.error();
      }
    })());
    return;
  }

  if (!isStaticAsset(url)) return;

  // Online: sempre retorna a resposta do servidor.
  // O cache de uma release fica imutavel depois do install, evitando
  // misturar JS/CSS de releases diferentes sob URLs estaveis.
  event.respondWith((async () => {
    try {
      return await fetchFresh(request);
    } catch {
      return (await caches.match(request)) || Response.error();
    }
  })());
});
