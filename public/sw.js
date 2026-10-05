/* Static service worker — no build-time bundler required (Vercel-safe). */
const CACHE = "nilric-static-v1";

const NETWORK_ONLY = [
  /^\/api\//,
  /^\/admin/,
  /^\/$/,
  /^\/check-in$/,
  /^\/serwist/,
];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Online-only attendance + auth: never serve from cache.
  if (NETWORK_ONLY.some((re) => re.test(url.pathname))) {
    event.respondWith(fetch(request));
    return;
  }

  // Navigations: network first, offline fallback page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/offline").then((r) => r || Response.error()),
      ),
    );
    return;
  }

  // Same-origin static assets: cache-first with background refresh.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
