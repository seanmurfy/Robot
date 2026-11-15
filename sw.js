// Winslow's service worker: just enough for Chrome to offer "Install app".
// Network-first, so a new index.html arrives as soon as it's published and the
// version.json update check keeps working; the cache is only an offline fallback.
// Only same-origin GETs are touched: OpenRouter, MediaPipe and every other
// cross-origin or API request goes straight to the network, never cached.
const CACHE = "winslow-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            // APIs, CDNs: untouched
  if (url.pathname.endsWith("/version.json")) return;         // update check always goes to the network
  const nav = req.mode === "navigate";
  // Pages are stored under one key, so ?v=…&t=… reload URLs don't pile up.
  const key = nav ? new URL("./", self.registration.scope).href : url.origin + url.pathname;
  e.respondWith((async () => {
    try {
      const res = await fetch(req, { cache: "no-store" });
      if (res.ok && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(key, copy)).catch(() => {});
      }
      return res;
    } catch (err) {
      const hit = await caches.match(key);
      if (hit) return hit;
      throw err;
    }
  })());
});
