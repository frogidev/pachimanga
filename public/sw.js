const CACHE_VERSION = "pachimanga-pwa-v5-auth";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const ACTIVE_CACHES = new Set([SHELL_CACHE, RUNTIME_CACHE]);
const RUNTIME_CACHE_LIMIT = 250;
const PUBLIC_SHELL = [
  "/offline",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
  "/apple-touch-icon.png",
];

async function trimRuntimeCache(cache) {
  const keys = await cache.keys();
  const excess = keys.length - RUNTIME_CACHE_LIMIT;
  if (excess <= 0) return;
  await Promise.all(keys.slice(0, excess).map((request) => cache.delete(request)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(PUBLIC_SHELL)));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("pachimanga-") && !ACTIVE_CACHES.has(key))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.open(SHELL_CACHE).then((cache) => cache.match("/offline"))),
    );
    return;
  }

  if (request.destination === "image" || url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response.clone());
          await trimRuntimeCache(cache);
        }
        return response;
      }),
    );
  }
});
