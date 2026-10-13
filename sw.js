const APP_VERSION = "12.0.1";
const CACHE = `hl-activity-${APP_VERSION}`;
const SHELL = [
  "/", "/home.css", "/home.js", "/frontend/home/home-enhancements.js",
  "/styles/tokens.css", "/styles/components.css", "/styles/product.css",
  "/styles/social.css", "/styles/v12-overrides.css",
  "/frontend/core/app-version.js", "/frontend/social/social-runtime.js",
  "/frontend/pwa/pwa.js", "/logo-hl.webp", "/icon-192.png", "/icon-512.png",
  "/manifest.webmanifest", "/not-found.css"
];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil((async()=>{ const keys=await caches.keys(); await Promise.all(keys.filter(k=>k.startsWith("hl-activity-")&&k!==CACHE).map(k=>caches.delete(k))); await self.clients.claim(); })()));
self.addEventListener("message", event => { if(event.data?.type === "SKIP_WAITING") self.skipWaiting(); });
self.addEventListener("fetch", event => {
  const request=event.request; if(request.method!=="GET") return; const url=new URL(request.url); if(url.origin!==self.location.origin) return;
  if(url.pathname.startsWith("/api/")||url.pathname.startsWith("/socket.io")||url.pathname.includes("/api/socket.io")||url.pathname==="/client-config.js") return;
  if(request.mode==="navigate"){ event.respondWith((async()=>{ try{ const response=await fetch(request); const cache=await caches.open(CACHE); cache.put(request,response.clone()).catch(()=>{}); return response; }catch{ return (await caches.match(request))||(await caches.match("/")); } })()); return; }
  if(!/\.(?:css|js|png|webp|svg|ico|webmanifest|wav)$/i.test(url.pathname)) return;
  event.respondWith((async()=>{ const cached=await caches.match(request); const network=fetch(request).then(response=>{ if(response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone())).catch(()=>{}); return response; }); if(cached){ event.waitUntil(network.catch(()=>{})); return cached; } return network; })());
});
