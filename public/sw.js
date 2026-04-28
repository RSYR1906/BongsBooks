const CACHE = "bongs-library-v1";

// Static asset patterns that benefit from cache-first
const STATIC_PATTERNS = [
  /^\/_next\/static\//,
  /^\/icons\//,
  /^\/manifest\.json$/,
  /^\/apple-icon\.png$/,
  /^\/icon\.png$/,
];

self.addEventListener("install", () => {
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Remove stale caches from old SW versions
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin GET requests
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // Never intercept API routes — always go to network
  if (url.pathname.startsWith("/api/")) return;

  const isStatic = STATIC_PATTERNS.some((p) => p.test(url.pathname));

  if (isStatic) {
    // Cache-first: serve from cache, update in background
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(req).then(
          (cached) =>
            cached ||
            fetch(req).then((res) => {
              if (res.ok) cache.put(req, res.clone());
              return res;
            }),
        ),
      ),
    );
    return;
  }

  // Network-first for HTML navigation: fall back to cache on offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Cache successful navigations for offline fallback
          if (res.ok) {
            caches
              .open(CACHE)
              .then((cache) => cache.put(req, res.clone()))
              .catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((cached) => cached || caches.match("/"))
            .then((fallback) => fallback || new Response("Offline", { status: 503 })),
        ),
    );
  }
});
